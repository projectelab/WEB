(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map();
  const previews = [...document.querySelectorAll('video[data-preview]')];
  function stop(video) { video.pause(); }
  function play(video) {
    const state = states.get(video);
    if (!video.getAttribute('src')) { video.src = video.dataset.src; video.load(); }
    video.play().then(() => {
      // A slow download must not restart a video after it leaves the viewport.
      if (!state.visible || document.hidden || state.userPaused || (preference.matches && !state.userStarted)) stop(video);
    }).catch(() => { state.button.textContent = 'REPRODUIR'; });
  }
  function update(video) {
    const state = states.get(video);
    if (state.visible && !document.hidden && !state.userPaused && (!preference.matches || state.userStarted)) play(video);
    else stop(video);
  }
  previews.forEach(video => {
    const button = video.parentElement.querySelector('.media-toggle');
    const state = { button, visible: false, userPaused: false, userStarted: false };
    states.set(video, state);
    button.hidden = false;
    const name = video.getAttribute('aria-label').replace('Previsualització de ', '');
    const label = () => {
      button.textContent = video.paused ? 'REPRODUIR' : 'PAUSAR';
      button.setAttribute('aria-label', `${video.paused ? 'Reproduir' : 'Pausar'} previsualització de ${name}`);
      button.setAttribute('aria-pressed', String(!video.paused));
    };
    video.addEventListener('play', label);
    video.addEventListener('pause', label);
    video.addEventListener('error', () => { button.hidden = true; video.removeAttribute('src'); video.load(); });
    button.addEventListener('click', () => {
      if (!video.paused) { state.userPaused = true; stop(video); }
      else { state.userPaused = false; state.userStarted = true; play(video); }
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      states.get(entry.target).visible = entry.isIntersecting;
      update(entry.target);
    }), { threshold: .2 });
    previews.forEach(video => observer.observe(video));
  } else {
    // Without observation, keep posters and allow deliberate playback only.
    states.forEach(state => { state.visible = true; });
  }
  preference.addEventListener('change', () => {
    states.forEach((state, video) => { state.userStarted = false; update(video); });
  });
  document.addEventListener('visibilitychange', () => previews.forEach(update));
  const details = [...document.querySelectorAll('video[controls]')];
  details.forEach(video => video.addEventListener('play', () => details.forEach(other => {
    if (other !== video) other.pause();
  })));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) details.forEach(stop);
  });
})();
