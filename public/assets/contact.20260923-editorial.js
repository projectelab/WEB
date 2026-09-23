(() => {
  'use strict';
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#status');
  if (!form || !status) return;
  const rules = [
    ['name', 2, 'Escriu el teu nom.'],
    ['contact', 5, 'Indica un correu, un telèfon o el teu Instagram.'],
    ['objective', 10, 'Explica breument què vols fer o millorar.']
  ];
  if (document.getElementById('need')) rules.unshift(['need', 1, 'Tria què necessites.']);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let firstInvalid;
    for (const [id, min, message] of rules) {
      const field = document.getElementById(id);
      const valid = field.value.trim().length >= min && field.checkValidity();
      field.setAttribute('aria-invalid', String(!valid));
      document.getElementById(`${id}-error`).textContent = valid ? '' : message;
      if (!valid && !firstInvalid) firstInvalid = field;
    }
    const consent = document.getElementById('privacy-consent');
    const consentError = document.getElementById('privacy-error');
    if (consent && !consent.checked) {
      consent.setAttribute('aria-invalid', 'true');
      if (consentError) consentError.textContent = 'Has d’acceptar la política de privadesa per continuar.';
      if (!firstInvalid) firstInvalid = consent;
    } else if (consent) {
      consent.removeAttribute('aria-invalid');
      if (consentError) consentError.textContent = '';
    }
    if (firstInvalid) {
      status.textContent = 'Revisa els camps indicats.';
      firstInvalid.focus();
      return;
    }
    const value = (id) => document.getElementById(id).value.trim();
    const need = document.getElementById('need') ? `Necessitat: ${value('need')}\n` : '';
    const message = `Hola DESORDEN,\n\n${need}Nom: ${value('name')}\nContacte: ${value('contact')}\n\n${value('objective')}`;
    const email = event.submitter?.dataset.channel === 'email';
    const url = email
      ? `mailto:lab@desorden.cat?subject=${encodeURIComponent('Nou projecte — DESORDEN')}&body=${encodeURIComponent(message)}`
      : `https://wa.me/34640925788?text=${encodeURIComponent(message)}`;
    status.textContent = email
      ? 'Obrint el correu amb el missatge preparat. Encara no s’ha enviat.'
      : 'Obrint WhatsApp amb el missatge preparat. Encara no s’ha enviat.';
    // Same-tab navigation avoids duplicate windows when noopener returns null.
    window.location.href = url;
  });
  for (const [id] of rules) {
    document.getElementById(id).addEventListener(id === 'need' ? 'change' : 'input', () => {
      document.getElementById(id).removeAttribute('aria-invalid');
      document.getElementById(`${id}-error`).textContent = '';
      status.textContent = '';
    });
  }
  const consent = document.getElementById('privacy-consent');
  consent?.addEventListener('change', () => {
    consent.removeAttribute('aria-invalid');
    const error = document.getElementById('privacy-error');
    if (error) error.textContent = '';
    status.textContent = '';
  });
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
