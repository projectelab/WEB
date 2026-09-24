(() => {
  'use strict';

  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#status');
  const success = document.querySelector('#contact-success');
  const successName = document.querySelector('#contact-success-name');
  const successWhatsApp = document.querySelector('#contact-success-whatsapp');
  if (!form || !status || !success || !successName || !successWhatsApp) return;

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

  form.addEventListener('submit', async (event) => {
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
      consent: true,
      website: document.querySelector('#website')?.value || '',
    };

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.classList.add('is-loading');
    status.textContent = 'Enviant la consulta…';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error(data.error || 'No s’ha pogut enviar la consulta.');
      }

      const whatsapp = `https://wa.me/34640925788?text=${encodeURIComponent(messageForWhatsApp(payload))}`;
      successName.textContent = payload.name;
      successWhatsApp.href = whatsapp;
      form.hidden = true;
      document.querySelector('#contact-help')?.setAttribute('hidden', '');
      success.hidden = false;
      success.focus();
      status.textContent = '';
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'La connexió ha trigat massa. Torna-ho a provar.'
        : (error.message || 'No s’ha pogut enviar la consulta.');
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.classList.remove('is-loading');
    }
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
