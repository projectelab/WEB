const SAT_API_ORIGIN = 'https://panasonic-sat-api.desorden-help-76b.workers.dev';

const LAB_OPERATOR_NAME_BOOTSTRAP = `
// LAB compatibility bootstrap. Remove once lab.js contains its own helper.
globalThis.operatorName = globalThis.operatorName || function operatorName(operatorId) {
  if (!operatorId) return '—';
  try {
    const options = document.querySelectorAll('#job-operator option');
    for (const option of options) {
      if (option.value === operatorId) return option.textContent || operatorId;
    }
  } catch (_) {}
  return operatorId;
};
`;

const AUTOMATION_SERVICES = new Set([
  'Avería aire acondicionado',
  'Aerotermia',
  'Mantenimiento',
  'VRF/VRV',
  'Instalación',
  'Consulta técnica',
]);
const AUTOMATION_PRIORITIES = new Set(['ALTA', 'MEDIA', 'BAJA']);
const CANONICAL_WEB_SOURCE = 'projectelab/WEB@main';

function withCanonicalHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('X-Desorden-Source', CANONICAL_WEB_SOURCE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/automatizacion/submit') {
      const reply = (body, status = 200) => Response.json(body, {
        status, headers: { 'Cache-Control': 'no-store' },
      });
      let data;
      try {
        data = await request.json();
      } catch {
        return reply({ ok: false, error: 'Solicitud no válida.' }, 400);
      }
      const mapping = {
        cliente: 'entry.1956448208', empresa: 'entry.422548789',
        telefono: 'entry.512369928', email: 'entry.1767839008',
        servicio: 'entry.275310617', descripcion: 'entry.843397814',
        prioridad: 'entry.292079787', observaciones: 'entry.987142518',
      };
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return reply({ ok: false, error: 'Solicitud no válida.' }, 400);
      }
      const values = {};
      for (const key of Object.keys(mapping)) {
        if (data[key] !== undefined && typeof data[key] !== 'string') {
          return reply({ ok: false, error: 'Campos no válidos.' }, 400);
        }
        values[key] = (data[key] || '').trim();
        if (values[key].length > 4000) {
          return reply({ ok: false, error: 'Campo demasiado largo.' }, 400);
        }
      }
      if (!values.cliente || (!values.telefono && !values.email) ||
          !values.servicio || !values.descripcion || !values.prioridad) {
        return reply({ ok: false, error: 'Faltan campos obligatorios.' }, 400);
      }
      if (!AUTOMATION_SERVICES.has(values.servicio)) {
        return reply({ ok: false, error: 'Servicio no válido.' }, 400);
      }
      if (!AUTOMATION_PRIORITIES.has(values.prioridad)) {
        return reply({ ok: false, error: 'Prioridad no válida.' }, 400);
      }
      const body = new URLSearchParams();
      for (const [key, entry] of Object.entries(mapping)) body.set(entry, values[key]);
      try {
        const upstream = await fetch('https://docs.google.com/forms/d/e/1FAIpQLScx9iV2di1SzOfF1R-NsLiI8MN5gF1fygM1-b3U1Y5uRbCLfw/formResponse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body, redirect: 'manual', signal: AbortSignal.timeout(15000),
        });
        // Surface only the HTTP status for diagnostics; never expose Google's response body.
        if (upstream.status !== 200) {
          return reply({
            ok: false,
            error: 'No se pudo confirmar la recepción.',
            upstreamStatus: upstream.status,
          }, 502);
        }
        return reply({ ok: true });
      } catch {
        return reply({
          ok: false,
          error: 'No se pudo contactar con el servicio de recepción.',
          upstreamStatus: null,
        }, 502);
      }
    }

    // Always serve the canonical website HTML directly from this repository's
    // public/ assets. Disable intermediary/browser caching for HTML so production
    // cannot keep showing an older landing after a deploy.
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      (url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname === '/automatizacion/' ||
        url.pathname === '/automatizacion/index.html')
    ) {
      const asset = await env.ASSETS.fetch(request);
      return withCanonicalHeaders(asset);
    }

    // Proxy LAB and SAT API requests directly to the Worker origin. The custom
    // sat-api.desorden.cat hostname is currently behind a managed challenge
    // that can block non-browser API traffic before it reaches the Worker.
    if (
      url.pathname === '/lab/api' ||
      url.pathname.startsWith('/lab/api/') ||
      url.pathname === '/api' ||
      url.pathname.startsWith('/api/')
    ) {
      const targetUrl = new URL(url.pathname + url.search, SAT_API_ORIGIN);
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('Host');

      const proxyReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: 'manual',
      });

      const upstream = await fetch(proxyReq);
      const headers = new Headers(upstream.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }

    // Serve lab.js with a tiny compatibility bootstrap so stale/static LAB
    // clients cannot crash on the previously missing operatorName helper.
    if (url.pathname === '/lab/lab.js') {
      const asset = await env.ASSETS.fetch(request);
      if (!asset.ok) return asset;
      const source = await asset.text();
      const headers = new Headers(asset.headers);
      headers.set('Content-Type', 'application/javascript; charset=utf-8');
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return new Response(`${LAB_OPERATOR_NAME_BOOTSTRAP}\n${source}`, {
        status: asset.status,
        headers,
      });
    }

    // Avoid stale LAB HTML after production fixes.
    if (url.pathname === '/lab/' || url.pathname === '/lab/index.html') {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return new Response(asset.body, {
        status: asset.status,
        statusText: asset.statusText,
        headers,
      });
    }

    // Serve static assets from public/ (including /lab/).
    return env.ASSETS.fetch(request);
  },
};
