import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const home = await read('public/index.html');
const automation = await read('public/automatitzacio-sistemes/index.html');
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
  for (const [html, path] of [[home, '/'], [automation, '/automatitzacio-sistemes/']]) {
    assert.match(html, /<html lang="ca">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, new RegExp(`rel="canonical" href="https://www.desorden.cat${path}"`));
    assert.match(html, /name="twitter:card"/);
    assert.match(activeScript(html, 'contact'), /^\/assets\/contact\./);
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

test('home contact validates locally and opens WhatsApp directly', () => {
  assert.equal(activeScript(home, 'contact'), '/assets/contact.20260924-native.js');
  assert.match(home, /<fieldset class="field wide service-choice"><legend>Què necessites\?<\/legend>/);
  assert.match(home, /<button class="submit contact-submit" type="submit">/);
  assert.doesNotMatch(home, /data-channel="email"/);
  assert.match(contactSource, /messageForWhatsApp/);
  assert.match(contactSource, /https:\/\/wa\.me\/34640925788/);
  assert.match(contactSource, /window\.location\.href = whatsapp/);
  assert.doesNotMatch(contactSource, /fetch\('\/api\/contact'/);
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
  for (const href of ['/projectes/viu-svc/','/projectes/federacio-catalana-esgrima/','/laboratori/suro/','/projectes/ajuntament-sant-vicenc/','/laboratori/marina/']) {
    assert(featured.includes(href), href);
  }
  assert.equal((featured.match(/<article\b/g) || []).length, 5);
  const compactArea = home.split('<div class="more-work">')[1].split('<a class="submit projects-all"')[0];
  const compact = compactArea.split('<div class="work-grid">')[1];
  for (const href of ['/projectes/nutrikom/','/projectes/pugnator-nox-bellum/','/projectes/the-club-padel/','/projectes/pata-negra/','/projectes/percussio/','/projectes/producte-digital/']) {
    assert(compact.includes(href), href);
  }
  assert.equal((compact.match(/<article\b/g) || []).length, 6);
  assert.doesNotMatch(compact, /<video\b|<img\b/);
  assert(home.indexOf('David Milla · un únic interlocutor') < home.indexOf('id="projectes"'));
  assert.equal((home.match(/id="que-faig"/g) || []).length, 1);
  for (const label of ['01 / VISUAL','02 / DIGITAL','03 / SISTEMES']) assert(home.includes(label));
  assert.match(home, /href="\/automatitzacio-sistemes\/"/);
  assert.match(home, /href="\/laboratori\/"/);
  assert.match(home, /href="\/projectes\/producte-digital\/"/);
  for (const anchor of ['automatitzacio','rnd','com-treballem','qui-soc']) assert(home.includes(`id="${anchor}"`));
  assert.match(home, /<fieldset class="field wide service-choice"><legend>Què necessites\?<\/legend>/);
  assert.match(home, /\/assets\/home\.hero-once\.20260925\.js/);
  assert.match(home, /\/assets\/home-extras\.20260925-v2\.css/);
  assert.doesNotMatch(home, /vertical-story|card-fullscreen\.20260925|card-expand/);
  assert.match(home, /<div class="product-grid">/);
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
    scrollY() { return window.scrollY; },
    end() { videoListeners.ended(); },
    setReduced(value) { media.matches = value; mediaListeners.change?.({ matches: value }); }
  };
}

test('first downward scroll plays once without blocking and holds the final frame', async () => {
  const app = heroVideo();
  assert.equal(app.video.src, '/media/hero/venda-once.mp4');
  assert.equal(app.video.loadCount, 1);
  assert.equal(app.video.playCount, 0);

  const first = app.wheel(120);
  assert.equal(first.prevented, false);
  assert.equal(app.video.playCount, 1);

  const during = app.wheel(120);
  assert.equal(during.prevented, false);
  assert.equal(app.video.playCount, 1);

  app.end();
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
  assert.equal(swipe.prevented, false);
  assert.equal(touch.video.playCount, 1);

  const keyboard = heroVideo();
  const key = keyboard.key('ArrowDown');
  assert.equal(key.prevented, false);
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
  assert.equal(blocked.video.playCount, 1);
});

test('native scroll fallback triggers the hero on mobile without resetting scroll position', () => {
  const app = heroVideo();
  app.scrollTo(48);
  assert.equal(app.video.playCount, 1);
  assert.equal(app.scrollY(), 48);
});

test('hero trigger only applies near the top of the page', () => {
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
