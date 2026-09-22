(() => {
  'use strict';
  const button = document.querySelector('#menu-btn');
  const menu = document.querySelector('#nav-menu');
  const main = document.querySelector('.shell');
  const links = [...document.querySelectorAll('.nav-link')];
  if (!button || !menu) return;
  let open = false;
  function setMenu(next, restoreFocus = false) {
    open = next;
    menu.classList.toggle('open', next);
    menu.setAttribute('aria-hidden', String(!next));
    menu.inert = !next;
    if (main) main.inert = next;
    button.setAttribute('aria-expanded', String(next));
    button.setAttribute('aria-label', next ? 'Tancar menú' : 'Obrir menú');
    document.body.classList.toggle('menu-open', next);
    if (next) links[0]?.focus({ preventScroll: true });
    else if (restoreFocus) button.focus({ preventScroll: true });
  }
  button.addEventListener('click', () => setMenu(!open, open));
  links.forEach(link => link.addEventListener('click', () => {
    setMenu(false);
    const url = new URL(link.href);
    if (url.pathname === location.pathname && url.hash) {
      const section = document.getElementById(url.hash.slice(1));
      section?.setAttribute('tabindex', '-1');
      section?.focus({ preventScroll: true });
    }
  }));
  menu.addEventListener('click', event => { if (event.target === menu) setMenu(false, true); });
  addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') setMenu(false, true);
    if (event.key !== 'Tab') return;
    const focusable = [button, ...links];
    const index = focusable.indexOf(document.activeElement);
    event.preventDefault();
    focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  });
})();
