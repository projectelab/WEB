(() => {
  'use strict';

  const stack = document.querySelector('[data-project-stack]');
  if (!stack) return;
  const cards = [...stack.children];
  const enabled = matchMedia('(max-width:699px) and (prefers-reduced-motion:no-preference)');
  let observer;
  let activePreview = 0;

  cards.forEach(card => {
    const title = card.querySelector('.work-heading a');
    const host = card.querySelector('.work-media');
    if (!title || !host) return;
    const link = document.createElement('a');
    link.className = 'stack-video-link';
    link.href = title.getAttribute('href');
    link.setAttribute('aria-label', title.textContent.trim());
    host.append(link);
  });

  function activate(active) {
    activePreview = active;
    // Pause every outgoing card before allowing the incoming preview to play.
    cards.forEach((card, index) => {
      if (index !== active) window.desordenMedia?.setActive(card.querySelector('video'), false, true);
    });
    if (active >= 0) window.desordenMedia?.setActive(cards[active].querySelector('video'), true, true);
  }

  function sync() {
    observer?.disconnect();
    cards.forEach(card => {
      card.style.removeProperty('--stack-depth');
    });
    if (!enabled.matches || !('IntersectionObserver' in window)) {
      cards.forEach(card => window.desordenMedia?.setActive(card.querySelector('video'), true));
      return;
    }

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
      });
      activate(active < 0 && cards[0].getBoundingClientRect().top >= 80 ? 0 : active);
    }, { rootMargin: `0px 0px -${Math.max(0, window.innerHeight - 80)}px 0px`, threshold: 0 });
    cards.forEach(card => observer.observe(card));
    activate(activePreview);
  }

  enabled.addEventListener('change', sync);
  addEventListener('resize', sync);
  sync();
})();
