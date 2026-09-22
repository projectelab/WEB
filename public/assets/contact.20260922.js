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
    if (firstInvalid) {
      status.textContent = 'Revisa els camps indicats.';
      firstInvalid.focus();
      return;
    }
    const value = (id) => document.getElementById(id).value.trim();
    const message = `Hola DESORDEN,\n\nNom: ${value('name')}\nContacte: ${value('contact')}\n\n${value('objective')}`;
    const email = event.submitter?.dataset.channel === 'email';
    const url = email
      ? `mailto:desorden.help@gmail.com?subject=${encodeURIComponent('Nou projecte — DESORDEN')}&body=${encodeURIComponent(message)}`
      : `https://wa.me/34640925788?text=${encodeURIComponent(message)}`;
    status.textContent = email
      ? 'Obrint el correu amb el missatge preparat. Encara no s’ha enviat.'
      : 'Obrint WhatsApp amb el missatge preparat. Encara no s’ha enviat.';
    // Same-tab navigation avoids duplicate windows when noopener returns null.
    window.location.href = url;
  });
  for (const [id] of rules) {
    document.getElementById(id).addEventListener('input', () => {
      document.getElementById(id).removeAttribute('aria-invalid');
      document.getElementById(`${id}-error`).textContent = '';
      status.textContent = '';
    });
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
