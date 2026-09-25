(() => {
  'use strict';

  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#status');
  if (!form || !status) return;

  const submit = form.querySelector('button[type="submit"]');
  const fields = {
    name: document.querySelector('#name'),
    contact: document.querySelector('#contact'),
    objective: document.querySelector('#objective'),
    consent: document.querySelector('#privacy-consent'),
  };

  const clearError = (id) => {
    const field = id === 'need'
      ? form.querySelector('input[name="need"]:checked')
      : id === 'privacy'
        ? fields.consent
        : fields[id];
    field?.removeAttribute('aria-invalid');
    const error = document.querySelector(`#${id}-error`);
    if (error) error.textContent = '';
  };

  const setError = (id, message, field) => {
    field?.setAttribute('aria-invalid', 'true');
    const error = document.querySelector(`#${id}-error`);
    if (error) error.textContent = message;
  };

  const validate = () => {
    let firstInvalid = null;
    const need = form.querySelector('input[name="need"]:checked');
    if (!need) {
      const firstNeed = form.querySelector('input[name="need"]');
      setError('need', 'Tria què necessites.', firstNeed);
      firstInvalid ||= firstNeed;
    } else {
      clearError('need');
    }

    const rules = [
      ['name', 2, 'Escriu el teu nom.'],
      ['contact', 5, 'Indica un email o un telèfon.'],
      ['objective', 10, 'Explica breument què vols fer o millorar.'],
    ];
    for (const [id, min, message] of rules) {
      const field = fields[id];
      const valid = field.value.trim().length >= min && field.checkValidity();
      if (!valid) {
        setError(id, message, field);
        firstInvalid ||= field;
      } else {
        clearError(id);
      }
    }

    if (!fields.consent.checked) {
      setError('privacy', 'Has d’acceptar la política de privadesa per enviar la consulta.', fields.consent);
      firstInvalid ||= fields.consent;
    } else {
      clearError('privacy');
    }

    return { valid: !firstInvalid, firstInvalid, need };
  };

  const messageForWhatsApp = ({ service, name, contact, objective }) =>
    `Hola David,\n\nNecessitat: ${service}\nNom: ${name}\nContacte: ${contact}\n\n${objective}`;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const check = validate();
    if (!check.valid) {
      status.textContent = 'Revisa els camps indicats.';
      check.firstInvalid?.focus();
      return;
    }

    const payload = {
      service: check.need.value,
      name: fields.name.value.trim(),
      contact: fields.contact.value.trim(),
      objective: fields.objective.value.trim(),
    };

    const whatsapp = `https://wa.me/34640925788?text=${encodeURIComponent(messageForWhatsApp(payload))}`;
    status.textContent = 'Obrint WhatsApp…';
    window.location.href = whatsapp;
  });

  form.querySelectorAll('input[name="need"]').forEach((field) => {
    field.addEventListener('change', () => {
      clearError('need');
      status.textContent = '';
    });
  });

  for (const id of ['name', 'contact', 'objective']) {
    fields[id].addEventListener('input', () => {
      clearError(id);
      status.textContent = '';
    });
  }

  fields.consent.addEventListener('change', () => {
    clearError('privacy');
    status.textContent = '';
  });

  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
