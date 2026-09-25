(() => {
  'use strict';
  if (!('HTMLDialogElement' in window) || !HTMLDialogElement.prototype.showModal) return;
  const cards = [...document.querySelectorAll('#projectes > .inner > .work-grid > .work-card')];
  if (!cards.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:699px)');
  const dialog = document.createElement('dialog');
  dialog.className = 'card-fullscreen';
  const bar = document.createElement('div');
  bar.className = 'card-fullscreen-bar';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'card-fullscreen-close';
  close.textContent = 'TANCAR ×';
  close.setAttribute('aria-label', 'Tancar projecte ampliat');
  close.autofocus = true;
  bar.append(close);
  dialog.append(bar);
  document.body.append(dialog);
  let active = null;
  let animation = null;
  let closing = false;

  function animate(reverse = false) {
    animation?.cancel();
    if (motion.matches || !dialog.animate) return Promise.resolve();
    const frames = [{ clipPath: active.clip }, { clipPath: 'inset(0px)' }];
    animation = dialog.animate(reverse ? frames.reverse() : frames, {
      duration: reverse ? 180 : 280,
      easing: 'cubic-bezier(.2,.7,.2,1)'
    });
    return animation.finished.catch(() => {});
  }

  function restore() {
    if (!active) return;
    animation?.cancel();
    const { card, placeholder, trigger, x, y, styles } = active;
    active = null;
    placeholder.replaceWith(card);
    Object.entries(styles).forEach(([name, value]) => { document.body.style[name] = value; });
    const root = document.documentElement;
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(x, y);
    root.style.scrollBehavior = behavior;
    trigger.focus({ preventScroll: true });
    closing = false;
  }

  async function dismiss() {
    if (!active || closing) return;
    closing = true;
    await animate(true);
    dialog.close();
  }

  cards.forEach(card => {
    const media = card.querySelector('.work-media');
    const title = card.querySelector('h3');
    if (!media || !title) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'card-expand';
    trigger.textContent = 'AMPLIAR';
    trigger.setAttribute('aria-label', `Ampliar ${title.textContent.trim()}`);
    trigger.setAttribute('aria-haspopup', 'dialog');
    media.append(trigger);
    trigger.addEventListener('click', () => {
      if (active || !mobile.matches) return;
      const bounds = card.getBoundingClientRect();
      const rect = media.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      const clamp = (value, max) => Math.max(0, Math.min(value, max));
      const placeholder = document.createElement('div');
      placeholder.className = 'work-card';
      placeholder.style.height = `${bounds.height}px`;
      placeholder.setAttribute('aria-hidden', 'true');
      const styles = {};
      ['position', 'top', 'left', 'width', 'overflow'].forEach(name => { styles[name] = document.body.style[name]; });
      active = { card, placeholder, trigger, styles, x: window.scrollX, y: window.scrollY,
        clip: `inset(${clamp(rect.top, h)}px ${clamp(w - rect.right, w)}px ${clamp(h - rect.bottom, h)}px ${clamp(rect.left, w)}px)` };
      card.replaceWith(placeholder);
      dialog.append(card);
      dialog.setAttribute('aria-label', title.textContent.trim());
      dialog.showModal();
      Object.assign(document.body.style, { position: 'fixed', top: `${-active.y}px`, left: `${-active.x}px`, width: '100%', overflow: 'hidden' });
      dialog.scrollTop = 0;
      close.focus({ preventScroll: true });
      animate();
    });
  });
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('close', restore);
  motion.addEventListener('change', () => { if (motion.matches) animation?.finish(); });
})();
