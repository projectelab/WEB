(() => {
  'use strict';
  const form = document.querySelector('#automation-form');
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('[type=submit]');
  const fields = [...form.querySelectorAll('input,textarea,select')];
  let busy = false;
  const names = { client: 'cliente', company: 'empresa', phone: 'telefono',
    email: 'email', service: 'servicio', description: 'descripcion',
    priority: 'prioridad', notes: 'observaciones' };
  form.action = '/automatizacion/submit';
  submit.disabled = false;
  const setStatus = (state, message) => {
    status.dataset.state = state;
    status.textContent = message;
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    let firstInvalid;
    fields.forEach((field) => {
      field.setCustomValidity('');
      if (field.required && !field.value.trim()) {
        field.setCustomValidity('Completa este campo.');
      } else if (field.minLength > 0 && field.value.trim().length < field.minLength && field.required) {
        field.setCustomValidity(`Escribe al menos ${field.minLength} caracteres.`);
      }
      const valid = field.checkValidity();
      field.setAttribute('aria-invalid', String(!valid));
      document.getElementById(`${field.id}-error`).textContent = valid ? '' : field.validationMessage;
      if (!valid && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      setStatus('error', 'Revisa los campos indicados.');
      firstInvalid.focus();
      return;
    }
    const payload = Object.fromEntries(fields.map(field => [names[field.id], field.value.trim()]));
    busy = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    setStatus('sending', 'Enviando solicitud…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', mode: 'same-origin', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal
      });
      const result = await response.json();
      if (response.ok && result?.ok === true) {
        form.reset();
        setStatus('sent', 'Solicitud enviada. Revisa tu email para el seguimiento.');
      } else {
        throw new Error('Submission rejected');
      }
    } catch {
      setStatus('error', 'No hemos podido confirmar el envío. Tus datos siguen aquí. Comprueba tu conexión y si has recibido el email antes de reintentar.');
    } finally {
      clearTimeout(timeout);
      busy = false;
      submit.disabled = false;
      form.setAttribute('aria-busy', 'false');
    }
  });
  fields.forEach((field) => field.addEventListener('input', () => {
    field.setCustomValidity('');
    field.removeAttribute('aria-invalid');
    document.getElementById(`${field.id}-error`).textContent = '';
  }));
  document.querySelector('#year').textContent = new Date().getFullYear();
  const sections = [...document.querySelectorAll('[data-n]')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      document.querySelector('#current').textContent = entry.target.dataset.n;
      document.querySelector('#progress').style.height = `${Number(entry.target.dataset.n) / sections.length * 100}%`;
    });
  }, { rootMargin: '-30% 0px -30%', threshold: 0 });
  sections.forEach((section) => observer.observe(section));
})();
