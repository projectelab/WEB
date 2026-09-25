(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new Map();
  let observer;

  function stop(video) {
    video.pause();
  }

  function setButtonState(video) {
    const state = states.get(video);
    if (!state) return;
    const paused = video.paused;
    state.button.dataset.state = paused ? 'paused' : 'playing';
    state.button.setAttribute('aria-pressed', String(paused));
    state.button.setAttribute('aria-label', paused ? 'Reanudar vídeo' : 'Pausar vídeo');
  }

  function prepare(video) {
    video.muted = true;
    video.playsInline = true;
    video.removeAttribute('controls');
    if (!video.getAttribute('src') && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  function play(video, userStarted = false) {    const state = states.get(video);
    if (!state) return;
    if (userStarted) state.userStarted = true;
    state.userPaused = false;
    prepare(video);
    const playback = video.play();
    playback?.then(() => {
      if (!state.visible || document.hidden || state.userPaused ||
          (preference.matches && !state.userStarted)) stop(video);
      setButtonState(video);
    }).catch(() => {
      stop(video);
      setButtonState(video);
    });
  }

  function update(video) {
    const state = states.get(video);
    if (!state) return;
    if (state.visible && !document.hidden && !state.userPaused &&
        (!preference.matches || state.userStarted)) play(video);
    else stop(video);
    setButtonState(video);
  }

  function ensureButton(video) {
    const host = video.parentElement;
    let button = host?.querySelector(':scope > .media-toggle');
    if (!button) {      button = document.createElement('button');
      button.type = 'button';
      button.className = 'media-toggle';
      host?.append(button);
    }
    button.hidden = false;
    button.textContent = '';
    button.classList.add('media-dot');
    return button;
  }

  function mountVideo(video) {
    if (states.has(video) || video.matches('[data-hero-video]')) return;
    const button = ensureButton(video);
    const state = {
      button,
      visible: false,
      userPaused: false,
      userStarted: false
    };
    states.set(video, state);
    video.parentElement?.classList.add('video-control-host');
    video.classList.add('content-video');
    video.removeAttribute('controls');
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('play', () => setButtonState(video));
    video.addEventListener('pause', () => setButtonState(video));
    video.addEventListener('error', () => {
      button.hidden = true;
      stop(video);
    });    button.addEventListener('click', () => {
      if (!video.paused) {
        state.userPaused = true;
        stop(video);
        setButtonState(video);
      } else {
        play(video, true);
      }
    });

    observer?.observe(video);
    setButtonState(video);
  }

  function mount(root = document) {
    root.querySelectorAll?.('video:not([data-hero-video])').forEach(mountVideo);
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      const state = states.get(entry.target);
      if (!state) return;
      state.visible = entry.isIntersecting;
      update(entry.target);
    }), { threshold: .2 });
  }

  mount();
  if (!observer) {
    states.forEach((state, video) => {
      state.visible = true;
      update(video);
    });
  }  preference.addEventListener?.('change', () => {
    states.forEach((state, video) => {
      state.userStarted = false;
      update(video);
    });
  });

  document.addEventListener('visibilitychange', () => {
    states.forEach((state, video) => update(video));
  });

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches?.('video:not([data-hero-video])')) mountVideo(node);
      mount(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  window.desordenMedia = { mount };
})();