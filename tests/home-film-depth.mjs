import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/home-film-depth.20260927.js', import.meta.url), 'utf8');

function setup({ reduced = false, entryActive = false, supported = true, mutableEffect = true } = {}) {
  class Target {
    listeners = new Map();
    addEventListener(type, callback, options) {
      const listeners = this.listeners.get(type) || new Map();
      listeners.set(callback, options);
      this.listeners.set(type, listeners);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    dispatch(type) { this.listeners.get(type)?.forEach((_, callback) => callback({ currentTarget: this })); }
    count(type) { return this.listeners.get(type)?.size || 0; }
  }
  const window = new Target(), document = new Target();
  const preference = Object.assign(new Target(), { matches: reduced });
  const details = Object.assign(new Target(), { open: false });
  const animations = [], frames = new Map(), observers = [];
  const entry = window.desordenEntry = { active: entryActive };
  const rect = { top: 0, bottom: 350, height: 350 };
  const video = {
    get style() { throw new Error('Motion must not write inline styles'); },
    play() { throw new Error('Motion must not alter video playback'); },
    pause() { throw new Error('Motion must not alter video playback'); }
  };
  if (supported) video.animate = keyframes => {
    const animation = {
      active: true, keyframes,
      cancel() { this.active = false; },
      pause() { this.active = true; },
      effect: mutableEffect ? { setKeyframes(value) { animation.keyframes = value; } } : {}
    };
    animations.push(animation);
    return animation;
  };
  const frame = { querySelector: () => video, getBoundingClientRect: () => rect };
  const project = { querySelector: selector => selector === '.project-video' ? frame : details };
  document.querySelectorAll = () => [project];
  document.hidden = false;
  window.IntersectionObserver = true;
  let nextFrame = 0;
  const context = {
    window, document, innerWidth: 390, innerHeight: 844,
    matchMedia: () => preference,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    }
  };
  vm.runInNewContext(source, context);
  return {
    window, document, preference, entry, details, rect, frame, animations, frames, observers, context,
    flush() {
      const queued = Array.from(frames);
      frames.clear();
      queued.forEach(([, callback]) => callback());
    },
    reduce(value) { preference.matches = value; preference.dispatch('change'); },
    intersect(value) { observers.at(-1).callback([{ target: frame, isIntersecting: value }]); }
  };
}

test('reduced motion removes pending work and listeners and can safely restore the effect', () => {
  const page = setup({ reduced: true });
  assert.equal(page.window.count('scroll'), 0);
  assert.equal(page.document.count('visibilitychange'), 0);
  assert.equal(page.details.count('toggle'), 0);
  assert.equal(page.frames.size, 0);
  assert.equal(page.observers.length, 0);
  page.reduce(false);
  page.flush();
  assert.equal(page.animations.length, 1);
  page.window.dispatch('scroll');
  page.window.dispatch('scroll');
  assert.equal(page.frames.size, 1, 'Scroll events share one scheduled frame');
  page.reduce(true);
  assert.equal(page.frames.size, 0);
  assert.equal(page.window.count('scroll'), 0);
  assert.equal(page.window.count('resize'), 0);
  assert.equal(page.document.count('visibilitychange'), 0);
  assert.equal(page.details.count('toggle'), 0);
  assert.equal(page.animations[0].active, false);
  assert.equal(page.observers[0].disconnected, true);
  page.intersect(true);
  assert.equal(page.frames.size, 0, 'A stale observer cannot restart motion');
  page.reduce(false);
  page.flush();
  assert.equal(page.animations.length, 1, 'Restoring motion reuses the effect');
  assert.equal(page.animations[0].active, true);
});

test('opening a native disclosure clears depth without changing playback or recreating the effect', () => {
  const page = setup();
  page.flush();
  page.details.open = true;
  page.details.dispatch('toggle');
  assert.equal(page.animations[0].active, false);
  page.flush();
  assert.equal(page.animations[0].active, false);
  page.details.open = false;
  page.details.dispatch('toggle');
  page.flush();
  assert.equal(page.animations[0].active, true);
  assert.equal(page.animations.length, 1);
  assert.equal(page.frames.size, 0, 'The effect does not run an idle frame loop');
});

test('introduction and document visibility gate motion and release it safely', () => {
  const page = setup({ entryActive: true });
  assert.equal(page.frames.size, 0);
  assert.equal(page.window.count('scroll'), 0);
  page.entry.active = false;
  page.document.dispatch('desorden:entry-reveal');
  page.flush();
  assert.equal(page.animations[0].active, true);
  page.document.hidden = true;
  page.document.dispatch('visibilitychange');
  assert.equal(page.animations[0].active, false);
  assert.equal(page.window.count('scroll'), 0);
  assert.equal(page.frames.size, 0);
  page.document.hidden = false;
  page.document.dispatch('visibilitychange');
  page.flush();
  assert.equal(page.animations[0].active, true);
  assert.equal(page.animations.length, 1);
});

test('centered media is flat and offscreen media releases its transform', () => {
  const page = setup();
  page.rect.top = (844 - page.rect.height) / 2;
  page.rect.bottom = page.rect.top + page.rect.height;
  page.flush();
  assert.equal(page.animations[0].keyframes[0].transform, 'rotateX(0.000deg) scale(1.00000)');
  page.rect.top = 900;
  page.rect.bottom = 1250;
  page.window.dispatch('scroll');
  page.flush();
  assert.equal(page.animations[0].active, false, 'Viewport bounds work before the observer callback');
  page.intersect(false);
  page.flush();
  assert.equal(page.animations[0].active, false);
});

test('missing or incomplete Web Animations support leaves a static fallback', () => {
  const absent = setup({ supported: false });
  assert.equal(absent.frames.size, 0);
  assert.equal(absent.window.count('scroll'), 0);
  assert.equal(absent.preference.count('change'), 0);
  const partial = setup({ mutableEffect: false });
  partial.flush();
  assert.equal(partial.animations[0].active, false);
  partial.window.dispatch('scroll');
  partial.flush();
  assert.equal(partial.animations.length, 1, 'Incomplete support is not repeatedly retried');
});
