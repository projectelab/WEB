(() => {
  'use strict';
  const button = document.querySelector('#menu-btn');
  const menu = document.querySelector('#nav-menu');
  const main = document.querySelector('.shell');
  const links = [...document.querySelectorAll('.nav-link')];
  if (!button || !menu) return;
  button.hidden = false;
  const label = button.querySelector('.thumb-dock-label');
  const mobile = matchMedia('(max-width:699px)');
  let open = false;
  function setMenu(next, restoreFocus = false) {
    open = next;
    menu.classList.toggle('open', next);
    menu.setAttribute('aria-hidden', String(!next));
    menu.inert = !next;
    if (main) main.inert = next && !mobile.matches;
    button.setAttribute('aria-expanded', String(next));
    button.setAttribute('aria-label', next ? 'Tancar menú' : 'Obrir menú');
    if (label) label.textContent = next ? 'TANCAR' : 'MENÚ';
    document.body.classList.toggle('menu-open', next && !mobile.matches);
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
  function closeOutside(event) {
    if (open && mobile.matches && !menu.contains(event.target) && !button.contains(event.target)) setMenu(false);
  }
  document.addEventListener('click', closeOutside);
  document.addEventListener('focusin', closeOutside);
  mobile.addEventListener('change', () => setMenu(false, open));
  addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); return; }
    if (event.key !== 'Tab' || mobile.matches) return;
    const focusable = [button, ...links];
    const index = focusable.indexOf(document.activeElement);
    event.preventDefault();
    focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  });
})();
