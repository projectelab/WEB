(()=>{
  'use strict';

  const video = document.querySelector('[data-hero-video]');
  const hero = document.querySelector('#hero');
  if (!video || !hero) return;

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference.matches;
  let started = false;
  let finished = false;
  let touchStartY = null;

  const navigationKeys = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);
  const entryLimit = () => Math.max(120, Math.min(360, (window.innerHeight || 800) * 0.45));

  function prepare() {
    if (reduceMotion || video.getAttribute('src')) return;
    video.src = video.dataset.src;
    video.load();
  }

  function holdLastFrame() {
    video.pause();
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.max(0, video.duration - (1 / 24));
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    holdLastFrame();
  }

  function nearHeroStart() {
    return window.scrollY <= entryLimit();
  }

  function start() {
    if (reduceMotion || started || finished || !nearHeroStart()) return false;
    started = true;
    prepare();
    video.currentTime = 0;
    const playback = video.play();
    playback?.catch?.(() => { started = false; });
    return true;
  }

  function onWheel(event) {
    if (event.deltaY > 0) start();
  }

  function onTouchStart(event) {
    touchStartY = event.touches?.[0]?.clientY ?? null;
  }

  function onTouchMove(event) {
    const y = event.touches?.[0]?.clientY;
    if (touchStartY == null || y == null) return;
    if (touchStartY - y > 8) start();
  }

  function onKeyDown(event) {
    if (navigationKeys.has(event.key)) start();
  }

  function onScroll() {
    if (reduceMotion || started || finished) return;
    if (window.scrollY > 2 && nearHeroStart()) start();
  }

  function syncMotion() {
    reduceMotion = motionPreference.matches;
    if (reduceMotion) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }
    if (!started && !finished) prepare();
  }

  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: true });
  addEventListener('keydown', onKeyDown);
  addEventListener('scroll', onScroll, { passive: true });
  motionPreference.addEventListener?.('change', syncMotion);

  syncMotion();
})();
