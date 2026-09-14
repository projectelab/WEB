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
        label: '01 / ENTRADA', status: 'RECIBIDA',
        html: '<h3>NUEVA SOLICITUD.</h3><p class="demo-copy">Un cliente completa un formulario desde móvil o web. La información entra estructurada desde el primer segundo.</p><div class="demo-grid"><div class="demo-cell"><small>CLIENTE</small><strong>Clima BCN</strong></div><div class="demo-cell"><small>SERVICIO</small><strong>Aerotermia</strong></div><div class="demo-cell"><small>PRIORIDAD</small><strong class="accent">MEDIA</strong></div><div class="demo-cell"><small>CONTACTO</small><strong>600 123 456</strong></div><div class="demo-cell"><small>ORIGEN</small><strong>Formulario web</strong></div><div class="demo-cell"><small>MENSAJE</small><strong>Revisar producción de ACS</strong></div></div>'
      },
      {
        label: '02 / REGISTRO', status: 'CREADO',
        html: '<h3>UNA FILA. UN ID.</h3><p class="demo-copy">El sistema guarda la solicitud en la base operativa y genera una referencia única. Nadie tiene que copiar y pegar datos.</p><div class="demo-grid"><div class="demo-cell"><small>ID</small><strong class="accent">SOL-260914-005</strong></div><div class="demo-cell"><small>FECHA</small><strong>14/09/2026 · 17:30</strong></div><div class="demo-cell"><small>BASE</small><strong>Google Sheets</strong></div><div class="demo-cell"><small>CLIENTE</small><strong>Clima BCN</strong></div><div class="demo-cell"><small>SERVICIO</small><strong>Aerotermia</strong></div><div class="demo-cell"><small>ORIGEN</small><strong>Formulario web</strong></div></div>'
      },
      {
        label: '03 / ORDEN', status: 'CLASIFICADA',
        html: '<h3>YA SABES QUÉ TOCA.</h3><p class="demo-copy">La solicitud nace con estado, prioridad, responsable y contexto. El equipo ve la misma información sin perseguir mensajes.</p><div class="demo-grid"><div class="demo-cell"><small>ESTADO</small><strong class="accent">NUEVO</strong></div><div class="demo-cell"><small>PRIORIDAD</small><strong>MEDIA</strong></div><div class="demo-cell"><small>RESPONSABLE</small><strong>David</strong></div><div class="demo-cell"><small>CANAL</small><strong>Web</strong></div><div class="demo-cell"><small>SEGUIMIENTO</small><strong>Activo</strong></div><div class="demo-cell"><small>DATOS</small><strong>Completos</strong></div></div>'
      },
      {
        label: '04 / AVISOS', status: 'ENVIADOS',
        html: '<h3>EL SISTEMA AVISA.</h3><p class="demo-copy">Las comunicaciones salen cuando corresponde. El cliente recibe confirmación y el equipo recibe el aviso interno.</p><div class="demo-log"><div class="demo-log-row"><b>17:30:03</b><span>Confirmación al cliente</span><em>OK</em></div><div class="demo-log-row"><b>17:30:04</b><span>Aviso interno a responsable</span><em>OK</em></div><div class="demo-log-row"><b>17:30:04</b><span>Registro de actividad</span><em>OK</em></div></div>'
      },
      {
        label: '05 / ACCIÓN', status: 'PROGRAMADA',
        html: '<h3>NADA SE QUEDA ATRÁS.</h3><p class="demo-copy">La solicitud no termina en una bandeja. Se le asigna una siguiente acción para que el seguimiento sea visible.</p><div class="demo-grid"><div class="demo-cell"><small>PRÓXIMA ACCIÓN</small><strong class="accent">Contactar cliente</strong></div><div class="demo-cell"><small>CUÁNDO</small><strong>15/09/2026 · 10:30</strong></div><div class="demo-cell"><small>RESPONSABLE</small><strong>David</strong></div><div class="demo-cell"><small>ESTADO</small><strong>NUEVO</strong></div><div class="demo-cell"><small>CONTROL</small><strong>Seguimiento activo</strong></div><div class="demo-cell"><small>HISTORIAL</small><strong>Registrado</strong></div></div>'
      },
      {
        label: '06 / DASHBOARD', status: 'ACTUALIZADO',
        html: '<h3>TODO A LA VISTA.</h3><p class="demo-copy">El dashboard resume el trabajo y permite detectar nuevas solicitudes, pendientes y seguimientos sin revisar fila por fila.</p><div class="demo-kpis"><div class="demo-kpi"><b>10</b><span>TOTAL</span></div><div class="demo-kpi"><b>3</b><span>NUEVAS</span></div><div class="demo-kpi"><b>6</b><span>PENDIENTES</span></div><div class="demo-kpi"><b>1</b><span>EN PROCESO</span></div></div>'
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
      if (demoRun) demoRun.innerHTML = 'REPRODUCIR DEMO <span aria-hidden="true">▶</span>';
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
      }, 1300);
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
