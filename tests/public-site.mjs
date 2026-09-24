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
    else assert.equal(url.pathname, 'lab@desorden.cat');
    const message = url.searchParams.get(channel === 'email' ? 'body' : 'text');
    assert.match(message, /Necessitat: Web \/ producte digital/);
    assert.match(message, /Nom: Anna & Pau/); assert(message.endsWith(app.nodes.objective.value));
    assert.match(app.nodes.status.textContent, /Encara no s’ha enviat/);
    assert.equal(app.nodes.name.value, ' Anna & Pau ');
  }
});

test('home follows the editorial sequence with real featured projects', () => {
  const ids = ['hero','que-faig','projectes','lab','desorden','contacte'];
  let previous = -1;
  for (const id of ids) {
    const position = home.indexOf(`id="${id}"`);
    assert(position > previous, id);
    previous = position;
  }
  const featured = home.split('<div class="work-grid">')[1].split('<div class="more-work">')[0];
  for (const slug of ['nutrikom','pugnator-nox-bellum']) {
    assert(featured.includes(`/projectes/${slug}/`), slug);
  }
  assert.equal((featured.match(/<article\b/g) || []).length, 2);
  assert.equal((featured.match(/<strong>Objectiu\.<\/strong>/g) || []).length, 2);
  const compact = home.split('<div class="more-work">')[1].split('<a class="submit projects-all"')[0];
  for (const slug of ['pata-negra','viu-svc','federacio-catalana-esgrima','the-club-padel']) {
    assert(compact.includes(`/projectes/${slug}/`), slug);
  }
  assert.doesNotMatch(compact, /<video\b/);
  assert(home.indexOf('David Milla · un únic interlocutor') < home.indexOf('id="projectes"'));
  assert.equal((home.match(/id="que-faig"/g) || []).length, 1);
  for (const label of ['01 / VISUAL','02 / DIGITAL','03 / SISTEMES']) assert(home.includes(label));
  assert.match(home, /href="\/automatizacion\/"/);
  assert.match(home, /href="\/laboratori\/"/);
  assert.match(home, /href="\/projectes\/producte-digital\/"/);
  for (const anchor of ['automatitzacio','rnd','com-treballem','qui-soc']) assert(home.includes(`id="${anchor}"`));
  assert.match(home, /<label for="need">Què necessites\?<\/label>/);
  assert.match(home, /\/assets\/home\.hero-once\.20260924\.js/);
  assert.match(home, /\/assets\/hero-once\.20260924\.css/);
});

test('home hero uses one lightweight one-shot video with the original still as fallback', async () => {
  const tag = home.match(/<video class="hero-video"[^>]*>/)?.[0];
  assert.ok(tag, 'hero video exists');
  assert.match(tag, /data-src="\/media\/hero\/venda-once\.mp4"/);
  assert.match(tag, /poster="\/frames\/v1\/frame_0001\.webp"/);
  assert.match(tag, /\bmuted\b/);
  assert.match(tag, /\bplaysinline\b/);
  assert.match(tag, /preload="auto"/);
  assert.doesNotMatch(tag, /\bautoplay\b|\bloop\b/);
  assert.doesNotMatch(home, /<canvas\b|id="frame"/);
  const bytes = await readFile(new URL('../public/media/hero/venda-once.mp4', import.meta.url));
  assert(bytes.length < 25 * 1024 * 1024);
  const atoms = []; let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    const atom = bytes.toString('ascii', offset + 4, offset + 8);
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
    atoms.push(atom);
    if (!size) break;
    offset += size;
  }
  assert(atoms.indexOf('moov') < atoms.indexOf('mdat'));
});

function heroVideo({ reduced = false, rejectPlay = false, scrollY = 0 } = {}) {
  const attrs = {};
  const globalListeners = {};
  const videoListeners = {};
  const mediaListeners = {};
  const root = element();
  const hero = element();
  hero.getBoundingClientRect = () => ({ top: scrollY ? -scrollY : 0 });
  const media = {
    matches: reduced,
    addEventListener(type, listener) { mediaListeners[type] = listener; }
  };
  const video = {
    dataset: { src: '/media/hero/venda-once.mp4' },
    duration: 4.041667,
    currentTime: 0,
    loadCount: 0,
    pauseCount: 0,
    playCount: 0,
    getAttribute(name) { return attrs[name]; },
    removeAttribute(name) { delete attrs[name]; },
    get src() { return attrs.src || ''; },
    set src(value) { attrs.src = value; },
    load() { this.loadCount++; },
    pause() { this.pauseCount++; },
    play() {
      this.playCount++;
      return rejectPlay ? Promise.reject(new Error('blocked')) : Promise.resolve();
    },
    addEventListener(type, listener) { videoListeners[type] = listener; }
  };
  const window = {
    scrollY,
    innerHeight: 844,
    scrollTo(x, y) { this.scrollY = y; }
  };
  vm.runInNewContext(homeSource, {
    document: {
      documentElement: root,
      querySelector: selector => selector === '[data-hero-video]' ? video : selector === '#hero' ? hero : null
    },
    window,
    matchMedia: () => media,
    addEventListener: (type, listener) => { globalListeners[type] = listener; },
    Set
  });
  const event = extra => ({ cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, ...extra });
  return {
    video, root, media,
    wheel(deltaY) { const e = event({ deltaY }); globalListeners.wheel(e); return e; },
    touchStart(y) { globalListeners.touchstart(event({ touches: [{ clientY: y }] })); },
    touchMove(y) { const e = event({ touches: [{ clientY: y }] }); globalListeners.touchmove(e); return e; },
    key(key) { const e = event({ key }); globalListeners.keydown(e); return e; },
    scrollTo(y) { window.scrollY = y; globalListeners.scroll?.(); },
    end() { videoListeners.ended(); },
    setReduced(value) { media.matches = value; mediaListeners.change?.({ matches: value }); }
  };
}

test('first downward scroll plays once, blocks scrolling, holds the final frame and then releases the page', async () => {
  const app = heroVideo();
  assert.equal(app.video.src, '/media/hero/venda-once.mp4');
  assert.equal(app.video.loadCount, 1);
  assert.equal(app.video.playCount, 0);

  const first = app.wheel(120);
  assert.equal(first.prevented, true);
  assert.equal(app.video.playCount, 1);
  assert(app.root.classList.contains('hero-playback-lock'));

  const during = app.wheel(120);
  assert.equal(during.prevented, true);
  assert.equal(app.video.playCount, 1);

  app.end();
  assert.equal(app.root.classList.contains('hero-playback-lock'), false);
  assert.equal(app.video.pauseCount, 1);
  assert(Math.abs(app.video.currentTime - (app.video.duration - 1 / 24)) < 1e-6);

  const after = app.wheel(120);
  assert.equal(after.prevented, false);
  assert.equal(app.video.playCount, 1);
});

test('touch and keyboard can trigger the one-shot hero while reduced motion never traps scrolling', async () => {
  const touch = heroVideo();
  touch.touchStart(700);
  const swipe = touch.touchMove(620);
  assert.equal(swipe.prevented, true);
  assert.equal(touch.video.playCount, 1);

  const keyboard = heroVideo();
  const key = keyboard.key('ArrowDown');
  assert.equal(key.prevented, true);
  assert.equal(keyboard.video.playCount, 1);

  const reduced = heroVideo({ reduced: true });
  assert.equal(reduced.video.src, '');
  assert.equal(reduced.video.playCount, 0);
  const reducedScroll = reduced.wheel(120);
  assert.equal(reducedScroll.prevented, false);
  assert.equal(reduced.video.playCount, 0);

  const blocked = heroVideo({ rejectPlay: true });
  blocked.wheel(120);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(blocked.root.classList.contains('hero-playback-lock'), false);
});

test('native scroll fallback triggers the hero on mobile even if touch interception is bypassed', () => {
  const app = heroVideo();
  app.scrollTo(48);
  assert.equal(app.video.playCount, 1);
  assert(app.root.classList.contains('hero-playback-lock'));
});

test('hero interception only applies near the top of the page', () => {
  const app = heroVideo({ scrollY: 500 });
  const event = app.wheel(120);
  assert.equal(event.prevented, false);
  assert.equal(app.video.playCount, 0);
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
