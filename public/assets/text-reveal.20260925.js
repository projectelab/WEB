(() => {
  'use strict';
  const enabled = matchMedia('(max-width:699px) and (prefers-reduced-motion:no-preference)');
  if (!enabled.matches || !('IntersectionObserver' in window)) return;

  const headings = [...document.querySelectorAll('.hero h1, h2.display')];
  if (!headings.length) return;

  const pending = new Set(headings);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || !pending.has(entry.target)) return;
      entry.target.classList.replace('text-reveal-pending', 'text-reveal-visible');
      pending.delete(entry.target);
      observer.unobserve(entry.target);
    });
    if (!pending.size) observer.disconnect();
  }, { threshold: 0 });

  headings.forEach(heading => {
    heading.classList.add('text-reveal-pending');
    observer.observe(heading);
  });

  // Switching to reduced motion or desktop leaves every heading visible.
  enabled.addEventListener('change', () => {
    observer.disconnect();
    pending.clear();
    headings.forEach(heading => heading.classList.remove('text-reveal-pending', 'text-reveal-visible'));
  }, { once: true });
})();
