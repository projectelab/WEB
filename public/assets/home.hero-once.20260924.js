(()=>{
  'use strict';

  const video = document.querySelector('[data-hero-video]');
  const hero = document.querySelector('#hero');
  if (!video || !hero) return;

  const root = document.documentElement;
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference.matches;
  let started = false;
  let playing = false;
  let finished = false;
  let touchStartY = null;

  const navigationKeys = new Set(['ArrowDown', 'PageDown', ' ', 'Spacebar']);
  const entryLimit = () => Math.max(120, Math.min(360, (window.innerHeight || 800) * 0.45));

  function prepare() {
    if (reduceMotion || video.getAttribute('src')) return;
    video.src = video.dataset.src;
    video.load();
  }

  function lock() {
    playing = true;
    root.classList.add('hero-playback-lock');
  }

  function unlock() {
    playing = false;
    root.classList.remove('hero-playback-lock');
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
    unlock();
  }

  function nearHeroStart() {
    return window.scrollY <= entryLimit();
  }

  function consume(event) {
    if (event?.cancelable) event.preventDefault();
  }

  function start(event, restoreTop = false) {
    if (reduceMotion || started || finished || !nearHeroStart()) return false;
    consume(event);
    started = true;
    prepare();
    if (restoreTop && window.scrollY > 0) window.scrollTo(0, 0);
    video.currentTime = 0;
    lock();
    const playback = video.play();
    playback?.catch?.(() => {
      started = false;
      unlock();
    });
    return true;
  }

  function onWheel(event) {
    if (playing) {
      consume(event);
      return;
    }
    if (event.deltaY > 0) start(event);
  }

  function onTouchStart(event) {
    touchStartY = event.touches?.[0]?.clientY ?? null;
  }

  function onTouchMove(event) {
    if (playing) {
      consume(event);
      return;
    }
    const y = event.touches?.[0]?.clientY;
    if (touchStartY == null || y == null) return;
    if (touchStartY - y > 8) start(event);
  }

  function onKeyDown(event) {
    if (!navigationKeys.has(event.key)) return;
    if (playing) {
      consume(event);
      return;
    }
    start(event);
  }

  function onScroll() {
    if (playing) {
      if (window.scrollY > 0) window.scrollTo(0, 0);
      return;
    }
    if (reduceMotion || started || finished) return;
    if (window.scrollY > 2 && nearHeroStart()) start(null, true);
  }

  function syncMotion() {
    reduceMotion = motionPreference.matches;
    if (reduceMotion) {
      video.pause();
      unlock();
      video.removeAttribute('src');
      video.load();
      return;
    }
    if (!started && !finished) prepare();
  }

  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('keydown', onKeyDown);
  addEventListener('scroll', onScroll, { passive: true });
  motionPreference.addEventListener?.('change', syncMotion);

  syncMotion();
})();
