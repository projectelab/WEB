import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const home = await read('public/index.html');
const automation = await read('public/automatizacion/index.html');
const activeScript = (html, name) => html.match(new RegExp(`src="(/assets/${name}[^\"]+\\.js)"`))[1];
const contactSource = await read(`public${activeScript(home, 'contact')}`);
const homeSource = await read(`public${activeScript(home, 'home')}`);
const demoSource = await read(`public${activeScript(automation, 'automatizacion')}`);

function element() {
  const listeners = {}, attrs = {}, classes = new Set();
  return {
    listeners, attrs, style: {}, dataset: {}, value: '', textContent: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x),
      toggle: (x, on) => on ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) },
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    addEventListener(k, fn) { listeners[k] = fn; }, focus() { this.focused = true; },
    checkValidity() { return this.value.length <= 2000; }
  };
}

test('both public pages use the shared contact, valid local resources and canonical SEO', async () => {
  for (const [html, path] of [[home, '/'], [automation, '/automatizacion/']]) {
    assert.match(html, /<html lang="ca">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, new RegExp(`rel="canonical" href="https://www.desorden.cat${path}"`));
    assert.match(html, /name="twitter:card"/);
    assert.equal(activeScript(html, 'contact'), activeScript(home, 'contact'));
    assert.doesNotMatch(html, /HVAC|Aerotermia|VRF|formResponse|automation-form|PASOS/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, value] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!value.startsWith('/') || value === '/' || value.includes('#')) continue;
      const file = value.endsWith('/') ? `${value}index.html` : value;
      assert((await stat(new URL(`../public${file}`, import.meta.url))).isFile(), value);
    }
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), id);
  }
  for (let n = 1; n <= 97; n++) {
    const frame = await readFile(new URL(`../public/frames/v1/frame_${String(n).padStart(4, '0')}.webp`, import.meta.url));
    assert.equal(frame.toString('ascii', 8, 12), 'WEBP');
  }
});

function contact() {
  const nodes = Object.fromEntries(['contact-form','status','need','name','contact','objective','need-error','name-error','contact-error','objective-error','year'].map(id => [id, element()]));
  const location = { href: '' };
  vm.runInNewContext(contactSource, {
    document: { querySelector: s => nodes[s.slice(1)], getElementById: id => nodes[id] },
    window: { location }, encodeURIComponent, Date
  });
  return { nodes, location, send(channel) { nodes['contact-form'].listeners.submit({ preventDefault() {}, submitter: { dataset: { channel } } }); } };
}

test('contact validation focuses the first invalid field without opening a channel', () => {
  const app = contact(); app.send('whatsapp');
  assert.equal(app.nodes.need.focused, true);
  assert.equal(app.nodes['need-error'].textContent, 'Tria què necessites.');
  app.nodes.need.value = 'Visual'; app.nodes.need.listeners.change(); app.send('whatsapp');
  assert.equal(app.location.href, ''); assert.equal(app.nodes.name.focused, true);
  assert.equal(app.nodes.name.attrs['aria-invalid'], 'true');
  app.nodes.name.value = 'Anna'; app.nodes.name.listeners.input();
  assert.equal(app.nodes['name-error'].textContent, '');
  assert.equal(app.nodes.name.attrs['aria-invalid'], undefined);
});

test('WhatsApp and email prepare encoded Catalan drafts, retain fields and never claim delivery', () => {
  for (const channel of ['whatsapp', 'email']) {
    const app = contact();
    app.nodes.need.value = 'Web / producte digital';
    app.nodes.name.value = ' Anna & Pau ';
    app.nodes.contact.value = 'anna@example.com';
    app.nodes.objective.value = 'Vull ordenar peticions.\nVídeo, web & pressupostos?';
    app.send(channel);
    const url = new URL(app.location.href);
    assert.equal(url.protocol, channel === 'email' ? 'mailto:' : 'https:');
    if (channel === 'whatsapp') { assert.equal(url.hostname, 'wa.me'); assert.equal(url.pathname, '/34640925788'); }
    else assert.equal(url.pathname, 'desorden.help@gmail.com');
    const message = url.searchParams.get(channel === 'email' ? 'body' : 'text');
    assert.match(message, /Necessitat: Web \/ producte digital/);
    assert.match(message, /Nom: Anna & Pau/); assert(message.endsWith(app.nodes.objective.value));
    assert.match(app.nodes.status.textContent, /Encara no s’ha enviat/);
    assert.equal(app.nodes.name.value, ' Anna & Pau ');
  }
});

test('home follows the editorial sequence with real featured projects', () => {
  const ids = ['hero','projectes','que-faig','lab','desorden','contacte'];
  let previous = -1;
  for (const id of ids) {
    const position = home.indexOf(`id="${id}"`);
    assert(position > previous, id);
    previous = position;
  }
  const featured = home.split('<div class="work-grid">')[1].split('<div class="more-work">')[0];
  for (const slug of ['nutrikom','pugnator-nox-bellum','federacio-catalana-esgrima']) {
    assert(featured.includes(`/projectes/${slug}/`), slug);
  }
  assert.equal((featured.match(/<strong>Objectiu\.<\/strong>/g) || []).length, 3);
  for (const label of ['01 / VISUAL','02 / DIGITAL','03 / SISTEMES']) assert(home.includes(label));
  assert.match(home, /href="\/automatizacion\/"/);
  assert.match(home, /href="\/laboratori\/"/);
  assert.match(home, /href="\/projectes\/producte-digital\/"/);
  for (const anchor of ['automatitzacio','rnd','com-treballem','qui-soc']) assert(home.includes(`id="${anchor}"`));
  assert.match(home, /<label for="need">Què necessites\?<\/label>/);
});

function sequence({ reduced = false, fail = false, deferred = false } = {}) {
  const nodes = Object.fromEntries(['canvas','hero','boot','boot-copy','frame'].map(id => [id, element()]));
  const listeners = {}, draws = [], fetches = [], waiting = [], timers = [], frames = [];
  let scroll = 0, active = 0, peak = 0, decoded = 0, live = 0, peakLive = 0;
  const context = { drawImage(image) { assert(!image.closed); draws.push(image.index); } };
  nodes.canvas.getContext = () => context;
  nodes.canvas.getBoundingClientRect = () => ({ width: 390, height: 844 });
  nodes.hero.offsetHeight = 2844;
  nodes.hero.querySelector = () => ({ offsetHeight: 844 });
  nodes.hero.getBoundingClientRect = () => ({ top: -scroll, bottom: 2844 - scroll });
  const fetch = async url => {
    const index = Number(url.match(/(\d{4})\.webp/)[1]) - 1;
    fetches.push(index); active++; peak = Math.max(peak, active);
    if (deferred) await new Promise(resolve => waiting.push(resolve));
    active--;
    return { ok: !fail, status: fail ? 404 : 200, blob: async () => ({ index }) };
  };
  const createImageBitmap = async ({ index }) => {
    decoded++; live++; peakLive = Math.max(live, peakLive);
    return { width:1080,height:1920,index,closed:false,close() { this.closed = true; live--; } };
  };
  vm.runInNewContext(homeSource, {
    document: { querySelector: s => nodes[s.slice(1)] }, matchMedia: () => ({ matches: reduced }),
    window: { createImageBitmap }, createImageBitmap, fetch, innerHeight:844, devicePixelRatio:1,
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
    addEventListener: (k, fn) => { listeners[k] = fn; }, setTimeout: fn => { timers.push(fn); }
  });
  return { nodes, draws, fetches, timers,
    scrollTo(y) { scroll = y; listeners.scroll(); }, resize() { listeners.resize(); },
    step() { frames.splice(0).forEach(fn => fn()); },
    async drain() {
      for (let pass = 0; pass < 40; pass++) {
        waiting.splice(0).forEach(fn => fn());
        frames.splice(0).forEach(fn => fn());
        await new Promise(resolve => setImmediate(resolve));
        if (!waiting.length && !frames.length && !active) return;
      }
      assert.fail('Frame queue did not settle');
    }, peak: () => peak, live: () => live, decoded: () => decoded, peakLive: () => peakLive
  };
}

test('active portrait loader prioritizes the latest fast scroll, caps in-flight work and releases bitmaps', async () => {
  const app = sequence({ deferred: true }); await app.drain();
  assert.equal(app.draws.at(-1), 0);
  for (const frame of [10, 35, 80, 50, 96]) {
    app.scrollTo(frame / 96 * 2000); await app.drain();
    assert.equal(app.draws.at(-1), frame);
  }
  app.scrollTo(1500); app.step(); app.step();
  app.scrollTo(100); app.step(); app.step();
  app.scrollTo(2000); await app.drain();
  assert.equal(app.draws.at(-1), 96); assert(app.peak() <= 4);
  assert(app.live() <= 8); assert(app.decoded() > 8);
  app.resize(); await app.drain(); assert.equal(app.draws.at(-1), 96);
  app.scrollTo(0); await app.drain(); assert.equal(app.draws.at(-1), 0);
});

test('missing frames retain the fallback, stop retry storms and release the loading overlay', async () => {
  const app = sequence({ fail: true }); await app.drain();
  app.scrollTo(1000); await app.drain();
  app.scrollTo(1000); await app.drain();
  app.scrollTo(1000); await app.drain();
  assert.equal(app.fetches.length, new Set(app.fetches).size); assert.equal(app.draws.length, 0);
  app.timers.forEach(fn => fn());
  assert(app.nodes.boot.classList.contains('off'));
  assert(!app.nodes.hero.classList.contains('ready'));
});

test('reduced motion avoids frame fetches', async () => {
  const reduced = sequence({ reduced: true }); await reduced.drain();
  assert.equal(reduced.fetches.length, 0); assert(reduced.nodes.boot.classList.contains('off'));
});

test('demo keyboard navigation updates its panel label and playback can be stopped', () => {
  const nodes = Object.fromEntries(['demo-run','demo-screen-label','demo-screen-status','demo-screen-body','demo-meter','demo-panel'].map(id => [id,element()]));
  const tabs = [0,1,2].map(i => Object.assign(element(), { dataset: { demoStep: String(i) } }));
  const timers = new Map();
  vm.runInNewContext(demoSource, {
    document: { querySelector: s => nodes[s.slice(1)], querySelectorAll: () => tabs, addEventListener() {} },
    setInterval: fn => { timers.set(1, fn); return 1; }, clearInterval: id => timers.delete(id)
  });
  tabs[0].listeners.keydown({key:'End',preventDefault(){}});
  assert.equal(tabs[2].tabIndex, 0); assert.equal(tabs[2].focused, true);
  assert.equal(nodes['demo-panel'].attrs['aria-labelledby'], 'demo-tab-2');
  assert.match(nodes['demo-screen-body'].innerHTML, /Preparar el pressupost/);
  nodes['demo-run'].listeners.click(); assert.equal(timers.size,1);
  timers.get(1)(); assert.match(nodes['demo-screen-label'].textContent,/02/);
  nodes['demo-run'].listeners.click(); assert.equal(timers.size,0);
});
