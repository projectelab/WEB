(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.video-project').forEach(disclosure => {
    const video = disclosure.querySelector('video');
    const button = disclosure.querySelector('.media-toggle');
    if (!video || !button) return;
    let visible = false;
    let completed = false;
    let userPaused = false;
    let userStarted = false;
    let pending = false;
    button.hidden = false;

    function reflect() {
      const state = completed ? 'ended' : video.paused ? 'paused' : 'playing';
      button.dataset.state = state;
      button.setAttribute('aria-pressed', String(state !== 'playing'));
      button.setAttribute('aria-label', completed ? 'Reproduir vídeo de nou' : video.paused ? 'Reprendre vídeo' : 'Pausar vídeo');
    }

    function update() {
      if (!disclosure.open || !visible || document.hidden || userPaused || completed || (preference.matches && !userStarted)) {
        video.pause();
        reflect();
        return;
      }
      if (pending || !video.paused) return;
      if (!video.getAttribute('src')) {
        video.muted = true;
        video.playsInline = true;
        video.src = video.dataset.src;
        video.load();
      }
      pending = true;
      video.play().then(() => {
        pending = false;
        if (!disclosure.open || !visible || document.hidden || userPaused || (preference.matches && !userStarted)) video.pause();
        reflect();
      }).catch(() => { pending = false; reflect(); });
    }

    button.addEventListener('click', () => {
      if (!video.paused) {
        userPaused = true;
      } else {
        userPaused = false;
        userStarted = true;
        if (completed) { video.currentTime = 0; completed = false; }
      }
      update();
    });
    video.addEventListener('ended', () => { completed = true; reflect(); });
    video.addEventListener('play', reflect);
    video.addEventListener('pause', reflect);
    video.addEventListener('error', () => { video.pause(); button.hidden = true; });
    disclosure.addEventListener('toggle', update);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        update();
      }, { threshold: .2 }).observe(video);
    } else {
      const checkViewport = () => {
        const rect = video.getBoundingClientRect();
        visible = rect.top < innerHeight && rect.bottom > 0;
        update();
      };
      addEventListener('scroll', checkViewport, { passive: true });
      addEventListener('resize', checkViewport, { passive: true });
      disclosure.addEventListener('toggle', checkViewport);
      checkViewport();
    }
    reflect();
  });
})();
