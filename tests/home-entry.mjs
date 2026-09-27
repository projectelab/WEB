import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/home-entry.20260927.js', import.meta.url), 'utf8');
const CONSENT_KEY = 'desorden:consent:v1';
const SESSION_KEY = 'desorden:intro:v1';
const NOW = 1800000000000;
const savedChoice = choice => JSON.stringify({ version: 1, choice, savedAt: NOW - 1000, services: [] });
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function setup({ consent = null, seen = false, reduced = false, frames = true, blocked = false, storageDenied = false, interactive = false } = {}) {
  const timers = new Map(), callbacks = new Map(), images = [];
  let nextTimer = 0, nextFrame = 0, focused = null, revealCount = 0, fontsReady;
  const local = new Map(consent === null ? [] : [[CONSENT_KEY, consent]]);
  const session = new Map(seen ? [[SESSION_KEY, 'seen']] : []);
  const storage = values => ({
    getItem(key) { if (storageDenied) throw new Error('Storage denied'); return values.get(key) ?? null; },
    setItem(key, value) { if (storageDenied) throw new Error('Storage denied'); values.set(key, value); }
  });
  class Element extends EventTarget {
    constructor() {
      super();
      this.hidden = false;
      this.inert = false;
      this.isConnected = true;
      this.dataset = {};
      this.selectors = {};
      const classes = new Set();
      this.classList = { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) };
    }
    querySelector(selector) { return this.selectors[selector]; }
    querySelectorAll(selector) { return this.selectors[selector] || []; }
    focus() { focused = this; }
    showModal() { this.open = true; }
    close() { this.open = false; this.dispatchEvent(new Event('close')); }
    remove() { this.isConnected = false; }
    removeAttribute(name) { delete this[name]; }
  }
  class Video extends Element {
    constructor() {
      super();
      Object.assign(this, { paused: true, plays: 0, loads: 0, pauses: 0, currentTime: 0, duration: NaN, readyState: 0 });
    }
    load() { this.loads++; }
    play() { this.plays++; if (blocked) return Promise.reject(new Error('Autoplay blocked')); this.paused = false; return Promise.resolve(); }
    pause() { this.pauses++; this.paused = true; }
  }
  const root = new Element(), layer = new Element(), main = new Element(), shell = new Element(), skip = new Element();
  const hero = new Video(), intro = new Video(), still = new Element(), progress = new Element();
  const choices = new Element(), preferences = new Element(), review = new Element(), closePreferences = new Element();
  const choiceButtons = ['accepted', 'rejected'].map(choice => Object.assign(new Element(), { dataset: { cookieChoice: choice } }));
  const preferenceButtons = ['accepted', 'rejected'].map(choice => Object.assign(new Element(), { dataset: { cookieChoice: choice } }));
  Object.assign(hero, { poster: 'hero-poster.webp', dataset: { src: 'hero.mp4', still: 'hero-last.webp' } });
  intro.dataset.src = 'intro.mp4';
  still.hidden = true;
  layer.hidden = true;
  review.hidden = true;
  progress.textContent = '0%';
  if (frames) {
    intro.requestVideoFrameCallback = callback => { callbacks.set(++nextFrame, callback); return nextFrame; };
    intro.cancelVideoFrameCallback = id => callbacks.delete(id);
  }
  layer.selectors = { video: intro, '.entry-still': still, '.entry-progress': progress, '.entry-consent': choices };
  choices.selectors = { button: choiceButtons[0], '[data-cookie-choice]': choiceButtons };
  preferences.selectors = { '[data-cookie-choice]': preferenceButtons, '[data-cookie-close]': closePreferences };
  // querySelector and querySelectorAll return the appropriate view of the same buttons.
  preferences.querySelector = selector => selector === '[data-cookie-choice]' ? preferenceButtons[0] : preferences.selectors[selector];
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const document = Object.assign(new EventTarget(), {
    documentElement: root,
    readyState: 'loading',
    fonts: { ready: new Promise(resolve => { fontsReady = resolve; }) },
    getElementById: id => ({ entry: layer, main, 'cookie-preferences': preferences, 'cookie-review': review })[id],
    querySelector: selector => ({ '.shell': shell, '.skip': skip, '[data-hero-video]': hero })[selector]
  });
  document.addEventListener('desorden:entry-reveal', () => revealCount++);
  const window = {};
  vm.runInNewContext(source, {
    document, window, Event,
    matchMedia: () => preference,
    localStorage: storage(local), sessionStorage: storage(session),
    Date: class extends Date { static now() { return NOW; } },
    Image: class extends Element { constructor() { super(); this.complete = false; images.push(this); } },
    setTimeout(callback, delay) { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); }
  });
  if (interactive) {
    document.readyState = 'interactive';
    document.dispatchEvent(new Event('readystatechange'));
  }
  const beforeDOMContentLoadedLoads = intro.loads;
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return {
    root, layer, main, shell, skip, hero, intro, still, progress, choices, preferences, review, preference, local, session, timers, beforeDOMContentLoadedLoads,
    get active() { return window.desordenEntry.active; },
    get focused() { return focused; },
    get reveals() { return revealCount; },
    get pendingFrames() { return callbacks.size; },
    choose(choice) { choiceButtons[choice === 'accepted' ? 0 : 1].dispatchEvent(new Event('click')); },
    revise(choice) { preferenceButtons[choice === 'accepted' ? 0 : 1].dispatchEvent(new Event('click')); },
    async resourcesReady() {
      fontsReady();
      images.forEach(image => image.dispatchEvent(new Event('load')));
      hero.readyState = 2;
      hero.dispatchEvent(new Event('loadeddata'));
      await settle();
    },
    frame(time, duration) {
      intro.currentTime = time;
      intro.duration = duration;
      if (frames) {
        const [id, callback] = callbacks.entries().next().value;
        callbacks.delete(id);
        callback(0, {});
      } else intro.dispatchEvent(new Event('timeupdate'));
    },
    async fireTimer(delay) {
      const entry = [...timers].find(([, timer]) => timer.delay === delay);
      assert.ok(entry, `Expected a pending ${delay} ms timer`);
      timers.delete(entry[0]);
      entry[1].callback();
      await settle();
    }
  };
}

test('entry starts at interactive readiness and DOMContentLoaded does not initialize it twice', async () => {
  const page = setup({ interactive: true });
  assert.equal(page.beforeDOMContentLoadedLoads, 1);
  assert.equal(page.intro.loads, 1);
  assert.equal(page.intro.plays, 1);
  page.choose('rejected');
  page.intro.dispatchEvent(new Event('ended'));
  await page.resourcesReady();
  assert.equal(page.reveals, 1);
});

test('valid acceptance and rejection skip an introduction already completed in this session', () => {
  for (const choice of ['accepted', 'rejected']) {
    const page = setup({ consent: savedChoice(choice), seen: true });
    assert.equal(page.active, false);
    assert.equal(page.layer.isConnected, false);
    assert.equal(page.intro.loads, 0);
    assert.equal(page.hero.loads, 0);
    assert.equal(page.shell.inert, false);
    assert.equal(page.review.hidden, false);
  }
});

test('missing, malformed, expired, future and unsupported choices require an explicit decision', () => {
  const invalid = [null, 'not json', 'null', '{}',
    JSON.stringify({ version: 1, choice: 'accepted', savedAt: NOW - 180 * 86400000 }),
    JSON.stringify({ version: 1, choice: 'rejected', savedAt: NOW + 1 }),
    JSON.stringify({ version: 2, choice: 'accepted', savedAt: NOW }),
    JSON.stringify({ version: 1, choice: 'continue', savedAt: NOW }),
    JSON.stringify({ version: 1, choice: 'accepted', savedAt: String(NOW) })];
  for (const consent of invalid) {
    const page = setup({ consent, seen: true });
    assert.equal(page.active, true, `Invalid record bypassed consent: ${consent}`);
    assert.equal(page.choices.hidden, false);
    assert.equal(page.intro.loads, 0, 'Already-seen animation should remain skipped');
    assert.equal(page.still.hidden, false);
    assert.equal(page.shell.inert, true);
  }
});

test('a saved decision hides the choices but starts the introduction in a new session', async () => {
  const page = setup({ consent: savedChoice('rejected') });
  assert.equal(page.choices.hidden, true);
  assert.equal(page.intro.plays, 1);
  assert.equal(page.hero.plays, 0);
  await page.resourcesReady();
  assert.equal(page.reveals, 0);
  page.intro.dispatchEvent(new Event('ended'));
  assert.equal(page.reveals, 1);
  assert.equal(page.session.get(SESSION_KEY), 'seen');
});

test('an early choice waits for the completed introduction and critical resources', async () => {
  for (const choice of ['accepted', 'rejected']) {
    const page = setup();
    page.choose(choice);
    assert.equal(JSON.parse(page.local.get(CONSENT_KEY)).choice, choice);
    assert.deepEqual(JSON.parse(page.local.get(CONSENT_KEY)).services, []);
    assert.equal(page.choices.hidden, true);
    assert.equal(page.intro.paused, false);
    assert.equal(page.reveals, 0);
    page.intro.dispatchEvent(new Event('ended'));
    assert.equal(page.reveals, 0, 'Media completion alone must not reveal an unprepared home');
    assert.equal(page.hero.plays, 0, 'Preparing the hidden hero must not play it');
    await page.resourcesReady();
    assert.equal(page.reveals, 1);
    assert.equal(page.active, false);
    assert.equal(page.progress.textContent, '100%');
    assert.equal(page.layer.classList.contains('entry-leaving'), true);
    await page.fireTimer(650);
    assert.equal(page.layer.isConnected, false);
    assert.equal(page.shell.inert, false);
    assert.equal(page.skip.inert, false);
    assert.equal(page.root.classList.contains('entry-locked'), false);
    assert.equal(page.focused, page.main);
  }
});

test('a late decision keeps the final still and never restarts the completed introduction', async () => {
  const page = setup();
  await page.resourcesReady();
  page.intro.dispatchEvent(new Event('ended'));
  assert.equal(page.progress.textContent, '100%');
  assert.equal(page.still.hidden, false);
  assert.equal(page.intro.hidden, true);
  assert.equal(page.choices.hidden, false);
  assert.equal(page.local.has(CONSENT_KEY), false);
  assert.equal(page.active, true);
  assert.equal(page.pendingFrames, 0);
  page.choose('rejected');
  page.intro.dispatchEvent(new Event('ended'));
  assert.equal(page.reveals, 1);
  assert.equal(page.intro.plays, 1);
});

test('blocked storage still honors this visit choice and allows entry', async () => {
  const page = setup({ storageDenied: true });
  page.choose('rejected');
  await page.resourcesReady();
  page.intro.dispatchEvent(new Event('ended'));
  assert.equal(page.reveals, 1);
  assert.equal(page.local.size, 0);
  assert.equal(page.session.size, 0);
});

test('resource and media timeouts provide fallbacks without inventing consent', async () => {
  const page = setup();
  await page.fireTimer(10000);
  assert.equal(page.hero.dataset.entryFallback, 'true');
  assert.equal(page.hero.poster, 'hero-last.webp');
  assert.equal(page.hero.src, undefined);
  assert.equal(page.hero.plays, 0);
  assert.equal(page.reveals, 0);
  await page.fireTimer(12000);
  assert.equal(page.still.hidden, false);
  assert.equal(page.progress.textContent, '100%');
  assert.equal(page.choices.hidden, false);
  assert.equal(page.local.has(CONSENT_KEY), false);
  assert.equal(page.active, true);
  page.choose('accepted');
  assert.equal(page.reveals, 1);
});

test('media errors and blocked autoplay keep consent available and permit either choice', async () => {
  for (const blocked of [false, true]) {
    const page = setup({ blocked });
    if (!blocked) page.intro.dispatchEvent(new Event('error'));
    await settle();
    await page.resourcesReady();
    assert.equal(page.still.hidden, false);
    assert.equal(page.progress.textContent, '100%');
    assert.equal(page.choices.hidden, false);
    assert.equal(page.reveals, 0);
    page.choose(blocked ? 'accepted' : 'rejected');
    assert.equal(page.reveals, 1);
    assert.equal(page.intro.plays, 1);
  }
});

test('video-frame progress remains bounded and monotonic until the final 100 percent', () => {
  const page = setup();
  page.frame(0, NaN);
  assert.equal(page.progress.textContent, '0%');
  page.frame(0, 4);
  assert.equal(page.progress.textContent, '0%');
  page.frame(2, 4);
  assert.equal(page.progress.textContent, '50%');
  page.frame(1, 4);
  assert.equal(page.progress.textContent, '50%');
  page.frame(5, 4);
  assert.equal(page.progress.textContent, '99%');
  page.intro.dispatchEvent(new Event('ended'));
  assert.equal(page.progress.textContent, '100%');
  assert.equal(page.pendingFrames, 0);
  page.intro.currentTime = 1;
  page.intro.dispatchEvent(new Event('timeupdate'));
  assert.equal(page.progress.textContent, '100%');
});

test('timeupdate supplies progress without requestVideoFrameCallback and stops at completion', () => {
  const page = setup({ frames: false });
  page.frame(1, 4);
  assert.equal(page.progress.textContent, '25%');
  page.frame(3, 4);
  assert.equal(page.progress.textContent, '75%');
  page.intro.dispatchEvent(new Event('ended'));
  page.frame(0, 4);
  assert.equal(page.progress.textContent, '100%');
});

test('reduced motion presents a still, retains consent and uses a brief transition', async () => {
  const page = setup({ reduced: true });
  assert.equal(page.intro.loads, 0);
  assert.equal(page.intro.plays, 0);
  assert.equal(page.hero.loads, 0);
  assert.equal(page.hero.plays, 0);
  assert.equal(page.still.hidden, false);
  assert.equal(page.choices.hidden, false);
  await page.resourcesReady();
  assert.equal(page.reveals, 0);
  page.choose('rejected');
  assert.equal(page.reveals, 1);
  await page.fireTimer(120);
  assert.equal(page.layer.isConnected, false);
  assert.equal(page.focused, page.main);
});

test('enabling reduced motion ends the active animation while preserving the decision gate', async () => {
  const page = setup();
  page.preference.matches = true;
  page.preference.dispatchEvent(new Event('change'));
  await page.resourcesReady();
  assert.equal(page.intro.paused, true);
  assert.equal(page.still.hidden, false);
  assert.equal(page.pendingFrames, 0);
  assert.equal(page.reveals, 0);
  page.choose('rejected');
  assert.equal(page.reveals, 1);
});

test('the footer review can change a saved decision and restore focus', () => {
  const page = setup({ consent: savedChoice('accepted'), seen: true });
  page.review.dispatchEvent(new Event('click'));
  assert.equal(page.preferences.open, true);
  assert.equal(page.focused.dataset.cookieChoice, 'accepted');
  page.revise('rejected');
  assert.equal(page.preferences.open, false);
  assert.equal(page.focused, page.review);
  assert.equal(JSON.parse(page.local.get(CONSENT_KEY)).choice, 'rejected');
  assert.equal(page.intro.loads, 0);
});
