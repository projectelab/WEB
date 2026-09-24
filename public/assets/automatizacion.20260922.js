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
        label: '01 / EL CLIENT ENVIA',
        status: 'SOL·LICITUD REBUDA',
        html: '<h3>1. EL CLIENT ENVIA.</h3><p class="demo-copy">Una botiga demana pressupost. La petició arriba amb la informació que necessites.</p><div class="demo-simple"><p><small>CLIENT</small><strong>Botiga de mostra</strong></p><p><small>NECESSITA</small><strong>Pressupost per a un encàrrec</strong></p><p><small>ESTAT</small><strong>Nou</strong></p></div>'
      },
      {
        label: '02 / EL SISTEMA HO ORDENA',
        status: 'TOT ORDENAT',
        html: '<h3>2. EL SISTEMA HO ORDENA.</h3><p class="demo-copy">Desa la petició, envia un avís i prepara el seguiment. Sense copiar dades d’un lloc a un altre.</p><div class="demo-checks"><p><b>✓</b>Desa les dades</p><p><b>✓</b>Envia un avís</p><p><b>✓</b>Prepara la propera acció</p></div>'
      },
      {
        label: '03 / TU REPS EL QUE CAL',
        status: 'PROPERA ACCIÓ',
        html: '<h3>3. JA SAPS QUÈ TOCA FER.</h3><p class="demo-copy">Reps la petició ordenada i el següent pas, al correu o al teu tauler.</p><div class="demo-result"><small>ARA ET TOCA</small><strong>Preparar el pressupost</strong><span>Pressupost per a un encàrrec</span><em>DEMÀ · 10:30</em></div>'
      }
    ];

    function renderDemo(index) {
      demoIndex = Math.max(0, Math.min(demo.length - 1, index));
      const step = demo[demoIndex];
      demoLabel.textContent = step.label;
      demoStatus.textContent = step.status;
      demoBody.innerHTML = step.html;
      document.querySelector('#demo-panel').setAttribute('aria-labelledby', `demo-tab-${demoIndex}`);
      demoMeter.className = `demo-meter-step-${demoIndex + 1}`;
      demoSteps.forEach((button, position) => {
        const active = position === demoIndex;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
    }

    function stopDemo() {
      if (demoTimer) clearInterval(demoTimer);
      demoTimer = null;
      if (demoRun) demoRun.innerHTML = 'REPRODUIR <span aria-hidden="true">▶</span>';
    }

    function playDemo() {
      if (!demoRun) return;
      stopDemo();
      renderDemo(0);
      demoRun.innerHTML = 'ATURAR <span aria-hidden="true">■</span>';
      demoTimer = setInterval(() => {
        if (demoIndex >= demo.length - 1) {
          stopDemo();
          return;
        }
        renderDemo(demoIndex + 1);
      }, 5000);
    }

    demoSteps.forEach((button) => button.addEventListener('click', () => {
      stopDemo();
      renderDemo(Number(button.dataset.demoStep));
    }));
    demoSteps.forEach((button, index) => button.addEventListener('keydown', event => {
      const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2
        : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      stopDemo();
      renderDemo(next);
      demoSteps[next].focus();
    }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopDemo(); });
    demoRun?.addEventListener('click', () => demoTimer ? stopDemo() : playDemo());
    renderDemo(0);
  }

  initDemo();
})();
