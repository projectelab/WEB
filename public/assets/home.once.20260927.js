(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('[data-once-video]').forEach(video => {
    let visible = video.dataset.onceVideo === 'load';
    let finished = false;
    let pending = false;
    const poster = video.poster;

    function update() {
      if (finished) return;
      if (video.dataset.entryFallback === 'true') {
        finished = true;
        video.pause();
        video.poster = video.dataset.still;
        return;
      }
      if (window.desordenEntry?.active || preference.matches || document.hidden || !visible) {
        video.pause();
        if (!video.getAttribute('src') && preference.matches) video.poster = video.dataset.still;
        return;
      }
      if (pending || !video.paused) return;
      if (!video.getAttribute('src')) {
        video.poster = poster;
        video.muted = true;
        video.playsInline = true;
        video.src = video.dataset.src;
        video.load();
      }
      pending = true;
      // Resume the same playback after visibility changes; never seek back to zero.
      video.play().then(() => {
        pending = false;
        if (window.desordenEntry?.active || video.dataset.entryFallback === 'true' || preference.matches || document.hidden || !visible) video.pause();
      }).catch(() => { pending = false; });
    }

    video.addEventListener('ended', () => {
      finished = true;
      video.pause();
      // Native ended playback keeps the final decoded frame on screen.
    });
    video.addEventListener('error', () => {
      finished = true;
      video.pause();
      video.poster = video.dataset.still;
    });
    if (video.dataset.onceVideo === 'viewport') {
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
          update();
        }, { threshold: [0, .15] }).observe(video);
      } else {
        // Old browsers still wait for the epilogue to enter the viewport.
        const checkViewport = () => {
          const rect = video.getBoundingClientRect();
          visible = rect.top < innerHeight && rect.bottom > 0;
          update();
        };
        addEventListener('scroll', checkViewport, { passive: true });
        addEventListener('resize', checkViewport, { passive: true });
        checkViewport();
      }
    }
    preference.addEventListener('change', update);
    document.addEventListener('desorden:entry-reveal', update);
    document.addEventListener('visibilitychange', update);
    // A browser that blocks autoplay can retry on the next user interaction.
    document.addEventListener('pointerdown', update, { passive: true });
    document.addEventListener('keydown', update);
    update();
  });
})();
