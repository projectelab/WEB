(() => {
  'use strict';
  const enable = () => {
    document.querySelectorAll('link[data-noncritical-css]').forEach((link) => {
      link.media = 'all';
      link.removeAttribute('data-noncritical-css');
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enable, { once: true });
  } else {
    enable();
  }
})();
