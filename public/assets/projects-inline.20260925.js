(() => {
  'use strict';

  function safeId(value) {
    return 'project-' + value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  }

  function projectSlug(href) {
    const url = new URL(href, location.href);
    const match = url.pathname.match(/^\/projectes\/([^/]+)\/?$/);
    return match?.[1] || null;
  }

  function cloneProjectContent(doc, includeMedia) {
    const fragment = document.createDocumentFragment();
    const lead = doc.querySelector('.page-hero .lead');
    const meta = doc.querySelector('.page-hero .case-meta');
    if (lead) fragment.append(lead.cloneNode(true));
    if (meta) fragment.append(meta.cloneNode(true));

    if (includeMedia) {
      doc.querySelectorAll('.case-media').forEach(media => {
        fragment.append(media.cloneNode(true));
      });
    }

    doc.querySelectorAll('.case-detail').forEach(section => {
      const clone = section.cloneNode(true);
      clone.classList.add('project-inline-detail');
      fragment.append(clone);
    });
    return fragment;
  }  function setExpanded(trigger, panel, expanded) {
    trigger.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    panel.classList.toggle('open', expanded);
    const marker = trigger.querySelector('[aria-hidden="true"]');
    if (marker) marker.textContent = expanded ? ' −' : ' +';
  }

  async function loadPanel(trigger, panel, href, includeMedia) {
    if (panel.dataset.loaded === 'true') return;
    panel.dataset.loading = 'true';
    try {
      const response = await fetch(href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      panel.replaceChildren(cloneProjectContent(doc, includeMedia));
      panel.dataset.loaded = 'true';
      window.desordenMedia?.mount(panel);
    } catch {
      panel.innerHTML = '<p class="project-inline-error">No s’ha pogut carregar el projecte.</p>';
    } finally {
      delete panel.dataset.loading;
    }
  }

  function enhanceCard(card) {
    const trigger = card.querySelector('.work-heading h3 a[href^="/projectes/"]');
    if (!trigger) return;
    const slug = projectSlug(trigger.href);
    if (!slug) return;    const panel = document.createElement('div');
    panel.className = 'project-inline';
    panel.id = safeId(slug);
    panel.hidden = true;
    card.append(panel);

    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    const marker = trigger.querySelector('[aria-hidden="true"]');
    if (marker) marker.textContent = ' +';

    const pathname = new URL(trigger.href).pathname;
    const relatedLinks = [...card.querySelectorAll('a[href]')].filter(link => new URL(link.href).pathname === pathname);
    relatedLinks.forEach(link => link.addEventListener('click', async event => {
      event.preventDefault();
      const next = trigger.getAttribute('aria-expanded') !== 'true';
      if (next) await loadPanel(trigger, panel, trigger.href, !card.querySelector('video'));
      setExpanded(trigger, panel, next);
    }));
  }

  function enhanceStandalone(link) {
    const slug = projectSlug(link.href);
    if (!slug || link.closest('.work-card')) return;
    const panel = document.createElement('div');
    panel.className = 'project-inline project-inline-standalone';
    panel.id = safeId(slug);
    panel.hidden = true;
    link.insertAdjacentElement('afterend', panel);
    link.setAttribute('role', 'button');
    link.setAttribute('aria-controls', panel.id);
    link.setAttribute('aria-expanded', 'false');    link.addEventListener('click', async event => {
      event.preventDefault();
      const next = link.getAttribute('aria-expanded') !== 'true';
      if (next) await loadPanel(link, panel, link.href, true);
      setExpanded(link, panel, next);
    });
  }

  document.querySelectorAll('.work-card').forEach(enhanceCard);
  document.querySelectorAll('a.case-link[href^="/projectes/"]').forEach(enhanceStandalone);
})();