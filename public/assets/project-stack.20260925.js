(() => {
  'use strict';

  const stack = document.querySelector('[data-project-stack]');
  if (!stack) return;
  const cards = [...stack.children];
  const enabled = matchMedia('(max-width:699px) and (prefers-reduced-motion:no-preference)');
  let observer;

  function sync() {
    observer?.disconnect();
    cards.forEach(card => {
      card.style.removeProperty('--stack-depth');
      window.desordenMedia?.setActive(card.querySelector('video'), true);
    });
    if (!enabled.matches || !('IntersectionObserver' in window)) return;

    const reached = new Set();
    // The top strip contains all five sticky offsets (24, 36, 48, 60, 72px).
    // Observing their entry/exit avoids running JavaScript on every scroll frame.
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const index = cards.indexOf(entry.target);
        if (entry.isIntersecting) reached.add(index);
        else reached.delete(index);
      });
      const active = reached.size ? Math.max(...reached) : -1;
      cards.forEach((card, index) => {
        card.style.setProperty('--stack-depth', Math.max(0, active - index));
        window.desordenMedia?.setActive(card.querySelector('video'), active < 0 || index === active);
      });
    }, { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - 80)}px 0px`, threshold: 0 });
    cards.forEach(card => observer.observe(card));
  }

  enabled.addEventListener('change', sync);
  addEventListener('resize', sync);
  sync();
})();
