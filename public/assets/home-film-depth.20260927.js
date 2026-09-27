(() => {
  'use strict';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const projects = Array.from(document.querySelectorAll('.video-project'), project => {
    const frame = project.querySelector('.project-video');
    const video = frame?.querySelector('video');
    const details = project.querySelector('details');
    return { frame, video, details, animation: null, supported: typeof video?.animate === 'function' };
  }).filter(item => item.frame && item.details && item.supported);
  if (!projects.length) return;

  const byFrame = new Map(projects.map(item => [item.frame, item]));
  const visible = new Set();
  let enabled = false;
  let tracking = false;
  let observer = null;
  let pendingFrame = null;

  function reset(item) {
    item.animation?.cancel();
  }

  function update() {
    pendingFrame = null;
    if (!tracking || preference.matches || document.hidden || window.desordenEntry?.active) {
      projects.forEach(reset);
      return;
    }
    const mobile = innerWidth < 768;
    const height = innerHeight;
    // Read the stable frames first so transformed corners never affect the next measurement.
    const measurements = Array.from(visible, item => [item, item.frame.getBoundingClientRect()]);
    measurements.forEach(([item, rect]) => {
      if (!item.supported || item.details.open || rect.bottom <= 0 || rect.top >= height || !rect.height) {
        reset(item);
        return;
      }
      const distance = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - height / 2) / (height / 2)));
      const angle = distance * (mobile ? 5 : 2);
      const scale = 1 - Math.abs(distance) * (mobile ? .045 : .025);
      const transform = `rotateX(${angle.toFixed(3)}deg) scale(${scale.toFixed(5)})`;
      const keyframes = [{ transform }, { transform }];
      if (!item.animation) {
        item.animation = item.video.animate(keyframes, { duration: 1, fill: 'both' });
        if (typeof item.animation?.effect?.setKeyframes !== 'function') {
          reset(item);
          item.supported = false;
          return;
        }
      } else item.animation.effect.setKeyframes(keyframes);
      // The animation is a paused compositor effect, not a permanent animation loop.
      item.animation.pause();
      item.animation.currentTime = 0;
    });
  }

  function schedule() {
    if (tracking && pendingFrame === null) pendingFrame = requestAnimationFrame(update);
  }

  function stopTracking() {
    tracking = false;
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    observer?.disconnect();
    observer = null;
    visible.clear();
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
    projects.forEach(reset);
  }

  function syncTracking() {
    if (!enabled || document.hidden || window.desordenEntry?.active) {
      stopTracking();
      return;
    }
    if (tracking) return;
    tracking = true;
    projects.forEach(item => visible.add(item));
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule, { passive: true });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (!tracking) return;
        entries.forEach(entry => {
          const item = byFrame.get(entry.target);
          if (!item) return;
          if (entry.isIntersecting) visible.add(item);
          else {
            visible.delete(item);
            reset(item);
          }
        });
        schedule();
      });
      projects.forEach(item => observer.observe(item.frame));
    }
    schedule();
  }

  function onToggle(event) {
    const item = projects.find(project => project.details === event.currentTarget);
    if (item?.details.open) reset(item);
    schedule();
  }

  function syncPreference() {
    if (preference.matches) {
      enabled = false;
      stopTracking();
      document.removeEventListener('visibilitychange', syncTracking);
      document.removeEventListener('desorden:entry-reveal', syncTracking);
      projects.forEach(item => item.details.removeEventListener('toggle', onToggle));
      return;
    }
    if (!enabled) {
      enabled = true;
      document.addEventListener('visibilitychange', syncTracking);
      document.addEventListener('desorden:entry-reveal', syncTracking);
      projects.forEach(item => item.details.addEventListener('toggle', onToggle));
    }
    syncTracking();
  }

  preference.addEventListener('change', syncPreference);
  syncPreference();
})();
