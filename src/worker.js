import { DurableObject } from 'cloudflare:workers';

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
const CONTACT_SERVICES = new Set([
  'Visual / vídeo',
  'Web & digital',
  'Automatització',
  'Combinació',
  'No ho tinc clar',
]);
const CONTACT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const LEAD_EMAIL_FROM = 'leads@desorden.cat';
const LEAD_EMAIL_TO = 'lab@desorden.cat';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "script-src-attr 'none'",
  "style-src 'self'",
  "style-src-attr 'none'",
  "font-src 'self'",
  "img-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function withAssetCaching(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  const path = new URL(request.url).pathname;
  const headers = new Headers(response.headers);
  const versionedFile = /\.20\d{6}(?:[-.])/.test(path);

  if (path.startsWith('/frames/v1/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (path.startsWith('/assets/') || path.startsWith('/media/')) {
    headers.set(
      'Cache-Control',
      versionedFile
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400, stale-while-revalidate=604800'
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function sendLeadNotification(env, lead) {
  if (!env.LEAD_EMAIL?.send) return;
  const subject = `Nou lead DESORDEN — ${lead.service} — ${lead.name}`;
  const lines = [
    'Nou lead rebut des de desorden.cat',
    '',
    `Nom: ${lead.name}`,
    `Contacte: ${lead.contact}`,
    `Servei: ${lead.service}`,
    `ID: ${lead.id}`,
    '',
    'Projecte:',
    lead.objective,
  ];
  const message = {
    to: LEAD_EMAIL_TO,
    from: { email: LEAD_EMAIL_FROM, name: 'DESORDEN Leads' },
    subject,
    text: lines.join('\n'),
  };
  if (isEmail(lead.contact)) message.replyTo = lead.contact;
  try {
    await env.LEAD_EMAIL.send(message);
  } catch (error) {
    console.error('Lead email notification failed', {
      code: error?.code || 'UNKNOWN',
      message: error?.message || String(error),
      leadId: lead.id,
    });
  }
}


async function handleRequest(request, env, ctx) {
    const url = new URL(request.url);

    if (url.hostname === 'desorden.cat') {
      url.hostname = 'www.desorden.cat';
      return Response.redirect(url.toString(), 301);
    }

    if (
      ['GET', 'HEAD'].includes(request.method) &&
      ['/automatizacion', '/automatizacion/', '/automatizacion/index.html'].includes(url.pathname)
    ) {
      const canonicalUrl = new URL('/automatitzacio-sistemes/', url.origin);
      canonicalUrl.search = url.search;
      return Response.redirect(canonicalUrl, 301);
    }

    if (request.method === 'POST' && url.pathname === '/api/contact') {
      const reply = (body, status = 200) => Response.json(body, {
        status,
        headers: { 'Cache-Control': 'no-store' },
      });
      const origin = request.headers.get('Origin');
      if (origin) {
        try {
          if (new URL(origin).hostname !== url.hostname) {
            return reply({ ok: false, error: 'Origen no permès.' }, 403);
          }
        } catch {
          return reply({ ok: false, error: 'Origen no permès.' }, 403);
        }
      }
      const contentLength = Number(request.headers.get('Content-Length') || 0);
      if (contentLength > 8192) {
        return reply({ ok: false, error: 'Sol·licitud massa gran.' }, 413);
      }
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const rate = await env.CONTACT_RATE_LIMITER.limit({ key: ip });
      if (!rate.success) return reply({ ok: false, error: 'Massa intents. Torna-ho a provar d’aquí a un minut.' }, 429);

      let data;
      try {
        data = await request.json();
      } catch {
        return reply({ ok: false, error: 'Sol·licitud no vàlida.' }, 400);
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return reply({ ok: false, error: 'Sol·licitud no vàlida.' }, 400);
      }
      if (typeof data.website === 'string' && data.website.trim()) {
        return reply({ ok: true });
      }
      const values = {};
      for (const [key, max] of [['name',150],['contact',254],['service',80],['objective',2000]]) {
        if (typeof data[key] !== 'string') return reply({ ok: false, error: 'Camps no vàlids.' }, 400);
        values[key] = data[key].trim();
        if (!values[key] || values[key].length > max) return reply({ ok: false, error: 'Camps no vàlids.' }, 400);
      }
      if (values.name.length < 2 || values.contact.length < 5 || values.objective.length < 10) {
        return reply({ ok: false, error: 'Revisa els camps obligatoris.' }, 400);
      }
      if (!CONTACT_SERVICES.has(values.service)) {
        return reply({ ok: false, error: 'Servei no vàlid.' }, 400);
      }
      if (data.consent !== true) {
        return reply({ ok: false, error: 'Cal acceptar la política de privadesa.' }, 400);
      }

      const id = env.CONTACT_LEADS.idFromName('desorden-contact-leads');
      const store = env.CONTACT_LEADS.get(id);
      const stored = await store.fetch('https://contact.internal/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          source: 'web',
          consentAt: Date.now(),
        }),
      });
      if (!stored.ok) return reply({ ok: false, error: 'No s’ha pogut guardar la consulta.' }, 502);
      const result = await stored.json();
      const notification = sendLeadNotification(env, {
        id: result.id,
        ...values,
      });
      if (ctx?.waitUntil) ctx.waitUntil(notification);
      else await notification;
      return reply({ ok: true, id: result.id });
    }

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
}

export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env, ctx);
    return withSecurityHeaders(withAssetCaching(request, response));
  },
};

export class ContactLeadStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        name TEXT NOT NULL,
        contact TEXT NOT NULL,
        service TEXT NOT NULL,
        objective TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        consent_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS leads_created_at ON leads(created_at);
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/store') {
      return new Response('Not found', { status: 404 });
    }
    const data = await request.json();
    const id = crypto.randomUUID();
    const now = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO leads (id, created_at, name, contact, service, objective, source, status, consent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
      id, now, data.name, data.contact, data.service, data.objective, data.source, data.consentAt
    );
    await this.ctx.storage.setAlarm(now + 24 * 60 * 60 * 1000);
    return Response.json({ ok: true, id });
  }

  async alarm() {
    const cutoff = Date.now() - CONTACT_MAX_AGE_MS;
    this.ctx.storage.sql.exec('DELETE FROM leads WHERE created_at < ?', cutoff);
    const row = this.ctx.storage.sql.exec('SELECT COUNT(*) AS count FROM leads').one();
    if (Number(row.count) > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}
