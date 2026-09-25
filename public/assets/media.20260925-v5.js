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
    const value = state.completed ? 'ended' : (video.paused ? 'paused' : 'playing');
    state.button.dataset.state = value;
    state.button.setAttribute('aria-pressed', String(value !== 'playing'));
    state.button.setAttribute(
      'aria-label',
      state.completed ? 'Reproduir vídeo de nou' : (video.paused ? 'Reanudar vídeo' : 'Pausar vídeo')
    );
  }

  function prepare(video) {
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.removeAttribute('loop');    video.removeAttribute('controls');
    if (!video.getAttribute('src') && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
    }
  }

  function play(video, userStarted = false) {
    const state = states.get(video);
    if (!state) return;
    if (state.completed) {
      if (!userStarted) return;
      video.currentTime = 0;
      state.completed = false;
    }
    if (userStarted) state.userStarted = true;
    state.userPaused = false;
    prepare(video);

    const playback = video.play();
    playback?.then(() => {
      if (!state.visible || state.active === false || document.hidden || state.userPaused ||
          (preference.matches && !state.userStarted)) stop(video);
      setButtonState(video);
    }).catch(() => {
      stop(video);
      setButtonState(video);
    });
  }

  function update(video) {    const state = states.get(video);
    if (!state) return;
    if (state.visible && state.active !== false && !document.hidden && !state.userPaused && !state.completed &&
        (!preference.matches || state.userStarted)) {
      play(video);
    } else {
      stop(video);
    }
    setButtonState(video);
  }

  function ensureButton(video) {
    const host = video.parentElement;
    let button = host?.querySelector(':scope > .media-toggle');
    if (!button) {
      button = document.createElement('button');
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
      userStarted: false,
      completed: false
    };    states.set(video, state);
    video.parentElement?.classList.add('video-control-host');
    video.classList.add('content-video');

    video.addEventListener('play', () => setButtonState(video));
    video.addEventListener('pause', () => setButtonState(video));
    video.addEventListener('ended', () => {
      state.completed = true;
      state.userPaused = true;
      setButtonState(video);
    });
    video.addEventListener('error', () => {
      button.hidden = true;
      stop(video);
    });

    button.addEventListener('click', () => {
      if (!video.paused) {
        state.userPaused = true;
        stop(video);
        setButtonState(video);
        return;
      }
      play(video, true);
    });

    observer?.observe(video);
    setButtonState(video);
  }

  function mount(root = document) {
    root.querySelectorAll?.('video:not([data-hero-video])').forEach(mountVideo);
  }  if ('IntersectionObserver' in window) {
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
  }

  preference.addEventListener?.('change', () => {
    states.forEach((state, video) => update(video));
  });

  document.addEventListener('visibilitychange', () => {
    states.forEach((state, video) => update(video));
  });

  new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {      if (node.nodeType !== 1) return;
      if (node.matches?.('video:not([data-hero-video])')) mountVideo(node);
      mount(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  // A local presentation may cover a video while it is still inside the viewport.
  function setActive(video, active) {
    const state = states.get(video);
    if (!state || state.active === active) return;
    state.active = active;
    update(video);
  }

  window.desordenMedia = { mount, setActive };
})();
