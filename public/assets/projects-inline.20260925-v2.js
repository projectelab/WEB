(() => {
  'use strict';

  const defaultExpanded = new Set(['viu-svc']);

  function contentRef(href) {
    const url = new URL(href, location.href);
    const match = url.pathname.match(/^\/(projectes|laboratori)\/([^/]+)\/?$/);
    return match ? { type: match[1], slug: match[2], path: url.pathname } : null;
  }

  function safeId(type, slug) {
    return 'inline-' + type + '-' + slug.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  }

  function cloneContent(doc, includeMedia) {
    const fragment = document.createDocumentFragment();
    const lead = doc.querySelector('.page-hero .lead');
    const meta = doc.querySelector('.page-hero .case-meta');
    const brand = doc.querySelector('.project-brand');

    if (lead) fragment.append(lead.cloneNode(true));
    if (meta) fragment.append(meta.cloneNode(true));

    if (brand) {
      const clone = brand.cloneNode(true);
      clone.classList.add('project-inline-brand');
      fragment.append(clone);
    }

    if (includeMedia) {
      doc.querySelectorAll('.case-media').forEach(media => fragment.append(media.cloneNode(true)));
    }    doc.querySelectorAll('.case-detail').forEach(section => {
      const clone = section.cloneNode(true);
      clone.classList.add('project-inline-detail');
      fragment.append(clone);
    });

    return fragment;
  }

  function setExpanded(card, trigger, panel, expanded) {
    card?.classList.toggle('inline-expanded', expanded);
    trigger.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
    panel.classList.toggle('open', expanded);
    const marker = trigger.querySelector('[aria-hidden="true"]');
    if (marker) marker.textContent = expanded ? ' −' : ' +';
  }

  async function loadPanel(panel, href, includeMedia) {
    if (panel.dataset.loaded === 'true') return;
    panel.dataset.loading = 'true';
    try {
      const response = await fetch(href, { credentials: 'same-origin' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      panel.replaceChildren(cloneContent(doc, includeMedia));
      panel.dataset.loaded = 'true';
      window.desordenMedia?.mount(panel);
    } catch {
      panel.innerHTML = '<p class="project-inline-error">No s’ha pogut carregar el contingut.</p>';
    } finally {
      delete panel.dataset.loading;
    }
  }  async function enhanceCard(card) {
    const trigger = card.querySelector(
      '.work-heading h3 a[href^="/projectes/"], .work-heading h3 a[href^="/laboratori/"]'
    );
    if (!trigger) return;

    const ref = contentRef(trigger.href);
    if (!ref) return;

    card.dataset.inlineType = ref.type;
    card.dataset.inlineSlug = ref.slug;

    const panel = document.createElement('div');
    panel.className = 'project-inline';
    panel.id = safeId(ref.type, ref.slug);
    panel.hidden = true;
    card.append(panel);

    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    const marker = trigger.querySelector('[aria-hidden="true"]');
    if (marker) marker.textContent = ' +';

    const relatedLinks = [...card.querySelectorAll('a[href]')].filter(link => {
      try {
        return new URL(link.href).pathname === ref.path;
      } catch {
        return false;
      }
    });    const toggle = async event => {
      event.preventDefault();
      const next = trigger.getAttribute('aria-expanded') !== 'true';
      if (next) {
        const includeMedia = ref.slug !== 'viu-svc' && !card.querySelector('video');
        await loadPanel(panel, trigger.href, includeMedia);
      }
      setExpanded(card, trigger, panel, next);
    };

    relatedLinks.forEach(link => link.addEventListener('click', toggle));

    if (defaultExpanded.has(ref.slug)) {
      await loadPanel(panel, trigger.href, false);
      setExpanded(card, trigger, panel, true);
    }
  }

  function enhanceStandalone(link) {
    const ref = contentRef(link.href);
    if (!ref || link.closest('.work-card')) return;

    const panel = document.createElement('div');
    panel.className = 'project-inline project-inline-standalone';
    panel.id = safeId(ref.type, ref.slug);
    panel.hidden = true;
    link.insertAdjacentElement('afterend', panel);

    link.setAttribute('role', 'button');
    link.setAttribute('aria-controls', panel.id);
    link.setAttribute('aria-expanded', 'false');

    link.addEventListener('click', async event => {      event.preventDefault();
      const next = link.getAttribute('aria-expanded') !== 'true';
      if (next) await loadPanel(panel, link.href, true);
      link.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
      panel.classList.toggle('open', next);
    });
  }

  document.querySelectorAll('.work-card').forEach(card => {
    enhanceCard(card);
  });

  document.querySelectorAll(
    'a.case-link[href^="/projectes/"], a.case-link[href^="/laboratori/"]'
  ).forEach(enhanceStandalone);
})();