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
        label: '01 / SOLICITUD',
        status: 'ENTRA',
        html: '<h3>1. EL CLIENTE PIDE AYUDA.</h3><p class="demo-copy">Completa un formulario. Tú recibes los datos ya ordenados, sin copiar mensajes ni apuntarlos a mano.</p><div class="demo-simple"><p><small>CLIENTE</small><strong>Clima BCN</strong></p><p><small>NECESITA</small><strong>Revisar producción de ACS</strong></p><p><small>PRIORIDAD</small><strong>Media</strong></p></div>'
      },
      {
        label: '02 / AUTOMATIZACIÓN',
        status: 'TRABAJA SOLA',
        html: '<h3>2. EL SISTEMA HACE LO REPETITIVO.</h3><p class="demo-copy">En segundos crea el registro, avisa a quien toca y deja una siguiente acción preparada.</p><div class="demo-checks"><p><b>✓</b>Crea el registro SOL-260914-005</p><p><b>✓</b>Envía confirmación al cliente</p><p><b>✓</b>Programa: llamar mañana a las 10:30</p></div>'
      },
      {
        label: '03 / RESULTADO',
        status: 'LISTO',
        html: '<h3>3. TÚ SOLO VES QUÉ TOCA.</h3><p class="demo-copy">No buscas correos ni revisas filas. Ves la próxima acción directamente.</p><div class="demo-result"><small>CLIENTE</small><strong>Clima BCN</strong><span>Revisar producción de ACS</span><em>PRÓXIMA ACCIÓN · LLAMAR MAÑANA 10:30</em></div>'
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
      }, 1800);
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
    const sections = [...document.querySelectorAll('[data-n]')];
    const current = document.querySelector('#current');
    const progress = document.querySelector('#progress');
    if (!('IntersectionObserver' in window) || !current || !progress) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        current.textContent = entry.target.dataset.n;
        progress.style.height = `${Number(entry.target.dataset.n) / sections.length * 100}%`;
      });
    }, { rootMargin: '-30% 0px -30%', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }

  initDemo();
  initForm();
  initPageChrome();
})();
