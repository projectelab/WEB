import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/automatizacion.js', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../src/worker.js', import.meta.url), 'utf8');
const response = (ok = true, body = { ok: true }) => ({ ok, json: async () => body });
function setup(result = response()) {
  let listener, resets = 0, release;
  const calls = [];
  const fields = ['client','company','phone','email','service','description','priority','notes'].map(id => ({
    id, value: id === 'client' ? ' Demo ' : ` ${id} `, required: id === 'client', minLength: 2,
    setCustomValidity(message) { this.validationMessage = message; },
    checkValidity() { return !this.validationMessage; },
    setAttribute() {}, removeAttribute() {}, addEventListener() {}, focus() { this.focused = true; }
  }));
  const status = { dataset: {} }, button = {};
  const form = { action: '', querySelector: () => button, querySelectorAll: () => fields,
    addEventListener(type, fn) { if (type === 'submit') listener = fn; },
    setAttribute() {}, reset() { resets++; fields.forEach(field => { field.value = ''; }); } };
  vm.runInNewContext(source, {
    document: { querySelector: selector => ({ '#automation-form': form, '#form-status': status, '#year': {} })[selector],
      querySelectorAll: () => [], getElementById: () => ({}) },
    AbortController, setTimeout, clearTimeout,
    IntersectionObserver: class { observe() {} },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (result === 'pending') return new Promise(resolve => { release = resolve; });
      if (result instanceof Error) throw result;
      return result;
    }
  });
  return { fields, status, button, form, calls, send: () => listener({ preventDefault() {} }),
    resets: () => resets, release: value => release(value) };
}

test('form targets same-origin gateway with named JSON fields and no no-cors', async () => {
  const app = setup(); await app.send();
  assert.equal(app.form.action, '/automatizacion/submit');
  assert.equal(app.calls[0].url, '/automatizacion/submit');
  assert.equal(app.calls[0].options.mode, 'same-origin');
  assert.equal(app.calls[0].options.method, 'POST');
  assert.equal(app.calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(app.calls[0].options.body), {
    cliente: 'Demo', empresa: 'company', telefono: 'phone', email: 'email',
    servicio: 'service', descripcion: 'description', prioridad: 'priority', observaciones: 'notes'
  });
  assert.doesNotMatch(source, /no-cors|docs\.google\.com|iframe/);
});
test('invalid input never sends or changes entered data', async () => {
  const app = setup(); app.fields[0].value = ' ';
  await app.send(); assert.equal(app.calls.length, 0); assert.equal(app.status.dataset.state, 'error');
  assert.equal(app.fields[0].focused, true); assert.equal(app.fields[0].value, ' ');
});
test('double submit is blocked and reset waits for real ok:true JSON', async () => {
  const app = setup('pending'); const pending = app.send();
  assert.equal(app.button.disabled, true); assert.equal(app.status.dataset.state, 'sending');
  assert.equal(app.resets(), 0); await app.send(); assert.equal(app.calls.length, 1);
  app.release(response()); await pending;
  assert.equal(app.status.dataset.state, 'sent'); assert.equal(app.resets(), 1); assert.equal(app.button.disabled, false);
});
test('all failures preserve every field exactly and allow retry', async () => {
  for (const result of [new Error('offline'), response(false), response(true, { ok: false }),
    response(true, { ok: 'true' }), response(true, null),
    { ok: true, json: async () => { throw new Error('invalid JSON'); } }]) {
    const app = setup(result); const before = app.fields.map(field => field.value);
    await app.send(); assert.equal(app.resets(), 0); assert.equal(app.status.dataset.state, 'error');
    assert.deepEqual(app.fields.map(field => field.value), before); assert.equal(app.button.disabled, false);
    await app.send(); assert.equal(app.calls.length, 2);
  }
});
function workerWith(fetch) {
  // Node's Request requires duplex for streams; Workers accepts them directly.
  class WorkerRequest extends Request {
    constructor(input, init) {
      super(input, init?.body ? { ...init, duplex: 'half' } : init);
    }
  }
  const executableWorkerSource = workerSource
    .replace(/^import .*$/m, '')
    .replace('export class ContactLeadStore', 'class ContactLeadStore')
    .replace('export default', 'globalThis.worker =');
  class DurableObject {
    constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  }
  return vm.runInNewContext(executableWorkerSource, {
    URL, URLSearchParams, Request: WorkerRequest, Response, Headers, AbortSignal, fetch, Set, DurableObject
  });
}
const data = { cliente: 'Demo', empresa: 'Empresa Demo', telefono: '640925788', email: 'demo@example.com',
  servicio: 'Aerotermia', descripcion: 'Solicitud demo', prioridad: 'MEDIA', observaciones: 'Notas demo' };
const request = value => new Request('https://www.desorden.cat/automatizacion/submit', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value)
});
test('gateway validates required fields and maps all eight canonical Google Form entries', async () => {
  const calls = [];
  const worker = workerWith(async (url, options) => { calls.push({ url, options }); return new Response('confirmation'); });
  for (const value of [null, [], { ...data, cliente: '' }, { ...data, telefono: '', email: '' },
    { ...data, servicio: ' ' }, { ...data, servicio: 'Servicio inventado' },
    { ...data, descripcion: '' }, { ...data, prioridad: '' }, { ...data, prioridad: 'URGENTE' },
    { ...data, empresa: 42 }]) {
    const result = await worker.fetch(request(value), {});
    assert.equal(result.status, 400); assert.equal((await result.json()).ok, false);
  }
  const malformed = await worker.fetch(new Request('https://www.desorden.cat/automatizacion/submit', { method: 'POST', body: '{' }), {});
  assert.equal(malformed.status, 400); assert.equal(calls.length, 0);
  const result = await worker.fetch(request(data), {});
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { ok: true });
  assert.equal(calls[0].url, 'https://docs.google.com/forms/d/e/1FAIpQLScx9iV2di1SzOfF1R-NsLiI8MN5gF1fygM1-b3U1Y5uRbCLfw/formResponse');
  assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.redirect, 'manual');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/x-www-form-urlencoded;charset=UTF-8');
  assert.deepEqual(Object.fromEntries(calls[0].options.body), {
    'entry.1956448208': data.cliente, 'entry.422548789': data.empresa,
    'entry.512369928': data.telefono, 'entry.1767839008': data.email,
    'entry.275310617': data.servicio, 'entry.843397814': data.descripcion,
    'entry.292079787': data.prioridad, 'entry.987142518': data.observaciones
  });
  for (const contact of [{ telefono: '' }, { email: '' }]) {
    assert.equal((await worker.fetch(request({ ...data, ...contact }), {})).status, 200);
  }
});
test('gateway returns JSON errors for rejected, redirected and failed upstream requests', async () => {
  for (const status of [302, 400, 403, 429, 500, 'offline']) {
    const worker = workerWith(async () => { if (status === 'offline') throw Error('private upstream detail'); return new Response('private upstream HTML', { status }); });
    const result = await worker.fetch(request(data), {});
    assert.equal(result.status, 502); const body = await result.json();
    assert.equal(body.ok, false); assert.equal(typeof body.error, 'string'); assert.doesNotMatch(body.error, /private/);
    if (typeof status === 'number') assert.equal(body.upstreamStatus, status);
    else assert.equal(body.upstreamStatus, null);
  }
});
test('specific POST route precedes SAT proxy; existing static and proxy contracts remain intact', async () => {
  assert(workerSource.indexOf("url.pathname === '/automatizacion/submit'") < workerSource.indexOf("url.pathname === '/lab/api'"));
  const proxied = [], assets = [];
  const worker = workerWith(async request => { proxied.push(request); return new Response('proxy'); });
  const env = { ASSETS: { fetch: async request => { assets.push(new URL(request.url).pathname); return new Response('asset'); } } };
  const paths = ['/', '/automatizacion/', '/automatizacion/submit', '/lab/'];
  for (const path of paths) assert.equal(await (await worker.fetch(new Request(`https://www.desorden.cat${path}`), env)).text(), 'asset');
  const labScript = await worker.fetch(new Request('https://www.desorden.cat/lab/lab.js'), env);
  const labSource = await labScript.text();
  assert.match(labScript.headers.get('Content-Type'), /^application\/javascript\b/);
  assert.match(labSource, /globalThis\.operatorName = globalThis\.operatorName \|\| function operatorName/);
  assert(labSource.endsWith('asset'));
  assert(labSource.indexOf('globalThis.operatorName') < labSource.lastIndexOf('asset'));
  assert.deepEqual(proxied, []);
  paths.push('/lab/lab.js');
  assert.deepEqual(assets, paths);
  for (const path of ['/lab/api', '/lab/api/agenda', '/api', '/api/agenda']) {
    for (const method of ['GET', 'POST']) {
      await worker.fetch(new Request(`https://www.desorden.cat${path}?example=1`, {
        method, headers: { 'X-Test': 'retained' }, ...(method === 'POST' ? { body: 'original body' } : {})
      }), env);
      const forwarded = proxied.at(-1);
      assert.equal(forwarded.url, `https://panasonic-sat-api.desorden-help-76b.workers.dev${path}?example=1`);
      assert.equal(forwarded.method, method); assert.equal(forwarded.redirect, 'manual');
      assert.equal(forwarded.headers.get('X-Test'), 'retained');
      if (method === 'POST') assert.equal(await forwarded.text(), 'original body');
    }
  }
});

test('worker applies strict security headers centrally to static and API responses', async () => {
  const worker = workerWith(async () => new Response('confirmation'));
  const env = {
    ASSETS: { fetch: async () => new Response('<!doctype html><title>ok</title>', { headers: { 'Content-Type': 'text/html' } }) }
  };
  const page = await worker.fetch(new Request('https://www.desorden.cat/'), env);
  const csp = page.headers.get('Content-Security-Policy');
  assert(csp);
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.match(csp, /font-src 'self'/);
  assert.match(csp, /connect-src 'self' https:\/\/cloudflareinsights\.com/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /frame-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  assert.equal(page.headers.get('Strict-Transport-Security'), 'max-age=63072000; includeSubDomains; preload');
  assert.equal(page.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(page.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(page.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(page.headers.get('Permissions-Policy'), 'camera=(), microphone=(), geolocation=()');

  const api = await worker.fetch(request({ ...data, cliente: '' }), {});
  assert.equal(api.status, 400);
  assert.equal(api.headers.get('X-Frame-Options'), 'DENY');
  assert.match(api.headers.get('Content-Security-Policy'), /connect-src 'self' https:\/\/cloudflareinsights\.com/);
});

test('worker gives immutable cache only to versioned assets and versioned frame directory', async () => {
  const worker = workerWith(async () => new Response('upstream'));
  const env = { ASSETS: { fetch: async () => new Response('asset') } };
  const immutable = 'public, max-age=31536000, immutable';
  const shortCache = 'public, max-age=86400, stale-while-revalidate=604800';

  for (const url of [
    'https://www.desorden.cat/assets/site.20260925-v3.css',
    'https://www.desorden.cat/assets/fonts/anton-latin.20260925.woff2',
    'https://www.desorden.cat/media/portfolio/logo-ntk.20260925.webp',
    'https://www.desorden.cat/frames/v1/frame_0001.webp'
  ]) {
    const response = await worker.fetch(new Request(url), env);
    assert.equal(response.headers.get('Cache-Control'), immutable, url);
  }

  const legacy = await worker.fetch(new Request('https://www.desorden.cat/media/portfolio/ntk-runners-cursa.webp'), env);
  assert.equal(legacy.headers.get('Cache-Control'), shortCache);
});

