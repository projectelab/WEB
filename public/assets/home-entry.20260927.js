(() => {
  'use strict';
  const CONSENT_KEY = 'desorden:consent:v1';
  const SESSION_KEY = 'desorden:intro:v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function readConsent() {
    try {
      const value = JSON.parse(localStorage.getItem(CONSENT_KEY));
      return value?.version === 1 && ['accepted', 'rejected'].includes(value.choice)
        && Number.isFinite(value.savedAt) && value.savedAt <= Date.now()
        && Date.now() - value.savedAt < MAX_AGE ? value : null;
    } catch { return null; }
  }
  let consent = readConsent();
  let seen = false;
  try { seen = sessionStorage.getItem(SESSION_KEY) === 'seen'; } catch { /* Storage is optional. */ }
  const state = window.desordenEntry = { active: !consent || !seen };
  if (state.active) root.classList.add('entry-pending');

  let initialized = false;
  function initialize() {
    if (initialized) return;
    initialized = true;
    const layer = document.getElementById('entry');
    const main = document.getElementById('main');
    const shell = document.querySelector('.shell');
    const skip = document.querySelector('.skip');
    const hero = document.querySelector('[data-hero-video]');
    const video = layer.querySelector('video');
    const still = layer.querySelector('.entry-still');
    const progress = layer.querySelector('.entry-progress');
    const choices = layer.querySelector('.entry-consent');
    const preferences = document.getElementById('cookie-preferences');
    const review = document.getElementById('cookie-review');
    let mediaDone = false, resourcesDone = false, leaving = false;
    let frameId = null, percent = 0, mediaTimer, resourceTimer;
    const cleanups = [];

    function keepFocus(event) {
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget;
      const buttons = [...dialog.querySelectorAll('button')].filter(button => button.getClientRects().length);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first || !buttons.includes(document.activeElement)
        || (event.shiftKey && document.activeElement === first)
        || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last || dialog : first || dialog).focus({ preventScroll: true });
      }
    }
    layer.addEventListener('keydown', keepFocus);
    preferences.addEventListener('keydown', keepFocus);

    function save(choice) {
      // No optional analytics services are configured. A future service requires a new consent version.
      consent = { version: 1, choice, savedAt: Date.now(), services: [] };
      try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* Honor this visit's choice. */ }
    }
    review.hidden = false;
    review.addEventListener('click', () => {
      preferences.showModal();
      preferences.querySelector('[data-cookie-choice]').focus();
    });
    preferences.querySelectorAll('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => {
      save(button.dataset.cookieChoice);
      preferences.close();
    }));
    preferences.querySelector('[data-cookie-close]').addEventListener('click', () => preferences.close());
    preferences.addEventListener('close', () => review.focus({ preventScroll: true }));

    if (!state.active) { layer.remove(); return; }
    shell.inert = true;
    skip.inert = true;
    layer.hidden = false;
    layer.showModal();
    choices.hidden = !!consent;
    (consent ? layer : choices.querySelector('button')).focus({ preventScroll: true });
    layer.addEventListener('cancel', event => event.preventDefault());
    choices.querySelectorAll('[data-cookie-choice]').forEach(button => button.addEventListener('click', () => {
      save(button.dataset.cookieChoice);
      choices.hidden = true;
      layer.focus({ preventScroll: true });
      reveal();
    }));

    function showProgress(value) {
      percent = Math.max(percent, Math.min(100, value));
      progress.textContent = `${percent}%`;
    }
    function tick() {
      if (mediaDone || leaving) return;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        showProgress(Math.min(99, Math.floor(video.currentTime / video.duration * 100)));
      }
      if (video.requestVideoFrameCallback) frameId = video.requestVideoFrameCallback(tick);
    }
    function finishMedia() {
      if (mediaDone) return;
      mediaDone = true;
      clearTimeout(mediaTimer);
      if (frameId !== null) video.cancelVideoFrameCallback?.(frameId);
      video.removeEventListener('timeupdate', tick);
      video.pause();
      video.hidden = true;
      still.hidden = false;
      showProgress(100);
      try { sessionStorage.setItem(SESSION_KEY, 'seen'); } catch { /* Session playback still finishes. */ }
      reveal();
    }
    function heroFallback() {
      hero.dataset.entryFallback = 'true';
      hero.pause();
      hero.removeAttribute('src');
      hero.load();
      hero.poster = hero.dataset.still;
    }
    function readyEvent(target, success, failure) {
      return new Promise(resolve => {
        const done = () => { cleanup(); resolve(); };
        const failed = () => { failure?.(); done(); };
        const cleanup = () => { target.removeEventListener(success, done); target.removeEventListener('error', failed); };
        cleanups.push(cleanup);
        target.addEventListener(success, done, { once: true });
        target.addEventListener('error', failed, { once: true });
      });
    }
    function imageReady(src) {
      const img = new Image();
      const ready = readyEvent(img, 'load');
      img.src = src;
      return img.complete ? Promise.resolve() : ready;
    }
    function finishResources(timedOut = false) {
      if (resourcesDone) return;
      resourcesDone = true;
      clearTimeout(resourceTimer);
      if (timedOut && !reduced.matches && hero.readyState < 2) heroFallback();
      cleanups.splice(0).forEach(cleanup => cleanup());
      reveal();
    }
    function reveal() {
      if (!consent || !mediaDone || !resourcesDone || leaving) return;
      leaving = true;
      clearTimeout(mediaTimer);
      clearTimeout(resourceTimer);
      if (frameId !== null) video.cancelVideoFrameCallback?.(frameId);
      root.classList.remove('entry-pending');
      // The home is visible under the fading black layer; playback begins at this point.
      state.active = false;
      layer.classList.add('entry-leaving');
      document.dispatchEvent(new Event('desorden:entry-reveal'));
      const remove = () => {
        if (!layer.isConnected) return;
        layer.close();
        layer.remove();
        root.classList.remove('entry-locked');
        shell.inert = false;
        skip.inert = false;
        main.focus({ preventScroll: true });
      };
      layer.addEventListener('transitionend', event => { if (event.target === layer) remove(); }, { once: true });
      setTimeout(remove, reduced.matches ? 120 : 650);
    }

    root.classList.add('entry-locked');
    resourceTimer = setTimeout(() => finishResources(true), 10000);
    const critical = [document.fonts?.ready || Promise.resolve(), imageReady(hero.poster)];
    if (!reduced.matches) {
      critical.push(readyEvent(hero, 'loadeddata', heroFallback));
      hero.muted = true;
      hero.playsInline = true;
      hero.preload = 'auto';
      hero.src = hero.dataset.src;
      hero.load();
    }
    Promise.all(critical).then(() => finishResources());
    if (seen || reduced.matches) {
      finishMedia();
    } else {
      mediaTimer = setTimeout(finishMedia, 12000);
      video.addEventListener('ended', finishMedia, { once: true });
      video.addEventListener('error', finishMedia, { once: true });
      if (!video.requestVideoFrameCallback) video.addEventListener('timeupdate', tick);
      video.src = video.dataset.src;
      video.muted = true;
      video.load();
      tick();
      video.play().catch(finishMedia);
    }
    reduced.addEventListener('change', () => { if (reduced.matches) finishMedia(); });
  }
  // Start as soon as the markup exists; unrelated deferred scripts must not block consent.
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') initialize();
  });
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
