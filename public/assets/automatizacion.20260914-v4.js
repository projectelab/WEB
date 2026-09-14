(() => {
  'use strict';

  function initDemo() {
    const demoSteps = [...document.querySelectorAll('[data-demo-step]')];
    const demoRun = document.querySelector('#demo-run');
    const demoLabel = document.querySelector('#demo-screen-label');
    const demoStatus = document.querySelector('#demo-screen-status');
    const demoBody = document.querySelector('#demo-screen-body');
    const demoMeter = document.querySelector('#demo-meter');
    if (!demoBody || !demoLabel || !demoStatus || !demoMeter) return;

    let demoIndex = 0;
    let demoTimer = null;
    const demo = [
      {
        label: '01 / CLIENTE ENVÍA',
        status: 'SOLICITUD RECIBIDA',
        html: '<h3>1. EL CLIENTE ENVÍA EL FORMULARIO.</h3><p class="demo-copy">Ejemplo: Clima BCN necesita revisar la producción de ACS. Los datos llegan ordenados y tú no copias nada.</p><div class="demo-simple"><p><small>CLIENTE</small><strong>Clima BCN</strong></p><p><small>NECESITA</small><strong>Revisar producción de ACS</strong></p><p><small>PRIORIDAD</small><strong>Media</strong></p></div>'
      },
      {
        label: '02 / SISTEMA ACTÚA',
        status: 'AUTOMÁTICO',
        html: '<h3>2. EL SISTEMA HACE LO REPETITIVO.</h3><p class="demo-copy">Sin intervención manual, guarda la solicitud, confirma al cliente y prepara el seguimiento.</p><div class="demo-checks"><p><b>✓</b>Guarda los datos</p><p><b>✓</b>Envía la confirmación</p><p><b>✓</b>Crea la próxima acción</p></div>'
      },
      {
        label: '03 / TÚ RECIBES',
        status: 'SIGUIENTE ACCIÓN',
        html: '<h3>3. TÚ VES DIRECTAMENTE QUÉ HACER.</h3><p class="demo-copy">En vez de buscar correos o revisar filas, recibes una acción concreta.</p><div class="demo-result"><small>AHORA TE TOCA</small><strong>Llamar a Clima BCN</strong><span>Revisar producción de ACS</span><em>MAÑANA · 10:30</em></div>'
      }
    ];

    function renderDemo(index) {
      demoIndex = Math.max(0, Math.min(demo.length - 1, index));
      const step = demo[demoIndex];
      demoLabel.textContent = step.label;
      demoStatus.textContent = step.status;
      demoBody.innerHTML = step.html;
      demoMeter.style.width = `${((demoIndex + 1) / demo.length) * 100}%`;
      demoSteps.forEach((button, position) => {
        const active = position === demoIndex;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
      });
    }

    function stopDemo() {
      if (demoTimer) clearInterval(demoTimer);
      demoTimer = null;
      if (demoRun) demoRun.innerHTML = 'REPRODUCIR <span aria-hidden="true">▶</span>';
    }

    function playDemo() {
      if (!demoRun) return;
      stopDemo();
      renderDemo(0);
      demoRun.innerHTML = 'REPRODUCIENDO <span aria-hidden="true">■</span>';
      demoTimer = setInterval(() => {
        if (demoIndex >= demo.length - 1) {
          stopDemo();
          return;
        }
        renderDemo(demoIndex + 1);
      }, 2000);
    }

    demoSteps.forEach((button) => button.addEventListener('click', () => {
      stopDemo();
      renderDemo(Number(button.dataset.demoStep));
    }));
    demoRun?.addEventListener('click', () => demoTimer ? stopDemo() : playDemo());
    renderDemo(0);
  }

  function initForm() {
    const form = document.querySelector('#automation-form');
    if (!form) return;
    const status = document.querySelector('#form-status');
    const submit = form.querySelector('[type=submit]');
    if (!status || !submit) return;
    const fields = [...form.querySelectorAll('input,textarea,select')];
    let busy = false;
    const names = { client: 'cliente', company: 'empresa', phone: 'telefono', email: 'email', service: 'servicio', description: 'descripcion', priority: 'prioridad', notes: 'observaciones' };
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
        if (field.required && !field.value.trim()) field.setCustomValidity('Completa este campo.');
        else if (field.minLength > 0 && field.value.trim().length < field.minLength && field.required) field.setCustomValidity(`Escribe al menos ${field.minLength} caracteres.`);
        const valid = field.checkValidity();
        field.setAttribute('aria-invalid', String(!valid));
        const error = document.getElementById(`${field.id}-error`);
        if (error) error.textContent = valid ? '' : field.validationMessage;
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
        const response = await fetch(form.action, { method: 'POST', mode: 'same-origin', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
        const result = await response.json();
        if (response.ok && result?.ok === true) {
          form.reset();
          setStatus('sent', 'Solicitud enviada. Revisa tu email para el seguimiento.');
        } else throw new Error('Submission rejected');
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
      const error = document.getElementById(`${field.id}-error`);
      if (error) error.textContent = '';
    }));
  }

  function initPageChrome() {
    const year = document.querySelector('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  initDemo();
  initForm();
  initPageChrome();
})();
