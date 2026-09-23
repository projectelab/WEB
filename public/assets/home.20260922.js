(()=>{
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference.matches;

  const canvas = $('#canvas');
  const context = canvas?.getContext?.('2d', { alpha: false }) || null;
  const hero = $('#hero');
  const boot = $('#boot');
  const frameElement = $('#frame');
  const TOTAL_FRAMES = 97;
  const cache = new Map();
  const pending = new Map();
  const failed = new Set();
  let target = 0;
  let last = -1;
  let animationFrame = 0;
  let objectPixelRatio = 1;

  const frameUrl = (index) =>
    `/frames/v1/frame_${String(index + 1).padStart(4, '0')}.webp`;

  function resizeCanvas() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    objectPixelRatio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * objectPixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * objectPixelRatio));
    if (cache.has(last)) drawCover(cache.get(last));
    else hero?.classList.remove('ready');
    drawFrame(target);
  }

  function drawCover(image) {
    if (!context || !canvas || !image) return;
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(
      image,
      (canvas.width - width) / 2,
      (canvas.height - height) / 2,
      width,
      height
    );
  }

  function touchCache(index, bitmap) {
    cache.delete(index);
    cache.set(index, bitmap);
    while (cache.size > 8) {
      const [key, value] = cache.entries().next().value;
      if (Math.abs(key - target) <= 2) {
        cache.delete(key);
        cache.set(key, value);
        continue;
      }
      value.close?.();
      cache.delete(key);
    }
  }

  async function loadFrame(index) {
    if (index < 0 || index >= TOTAL_FRAMES) return null;
    if (cache.has(index)) {
      const bitmap = cache.get(index);
      touchCache(index, bitmap);
      return bitmap;
    }
    if (pending.has(index)) return pending.get(index);
    if (failed.has(index) || pending.size >= 4) return null;

    const request = fetch(frameUrl(index), { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Frame ${index + 1}: HTTP ${response.status}`);
        return response.blob();
      })
      .then(async (blob) => {
        if ('createImageBitmap' in window) {
          try { return await createImageBitmap(blob); } catch { /* Try the image decoder. */ }
        }
        return new Promise((resolve, reject) => {
          const image = new Image();
          const objectUrl = URL.createObjectURL(blob);
          image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error(`No s'ha pogut decodificar el fotograma ${index + 1}`));
          };
          image.src = objectUrl;
        });
      })
      .then((bitmap) => {
        touchCache(index, bitmap);
        return bitmap;
      })
      .catch(() => { failed.add(index); return null; })
      .finally(() => {
        pending.delete(index);
        if (index !== target && last !== target && !failed.has(target)) queueFrame(target);
      });

    pending.set(index, request);
    return request;
  }

  async function drawFrame(index) {
    if (!context) return;
    try {
      const bitmap = await loadFrame(index);
      if (index !== target || !bitmap) return;
      drawCover(bitmap);
      last = index;
      if (frameElement) frameElement.textContent = String(index + 1).padStart(3, '0');
      hero?.classList.add('ready');
    } catch {
      if (last < 0) hero?.classList.remove('ready');
    }
  }

  function queueFrame(index) {
    if (reduceMotion) return;
    target = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
    if (animationFrame) return;
    animationFrame = requestAnimationFrame(() => {
      animationFrame = 0;
      drawFrame(target);
      [-2, -1, 1, 2, 3].forEach((offset) => loadFrame(target + offset).catch(() => {}));
    });
  }

  function updateHero() {
    if (reduceMotion || !hero) return;
    const rect = hero.getBoundingClientRect();
    const distance = Math.max(1, hero.offsetHeight - hero.querySelector('.sticky').offsetHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    if (rect.bottom > 0 && rect.top < innerHeight) queueFrame(Math.round(progress * (TOTAL_FRAMES - 1)));
  }

  async function bootUp() {
    setTimeout(() => boot?.classList.add('off'), 2500);
    if (!context) {
      if ($('#boot-copy')) $('#boot-copy').textContent = 'MODE DE RESERVA ACTIVAT';
      setTimeout(() => boot?.classList.add('off'), 220);
      return;
    }
    try {
      await loadFrame(target);
      drawFrame(target);
      for (let index = 1; index < 4; index += 1) loadFrame(index);
      const warmOpeningFrames = () => {
        let index = 4;
        const next = async () => {
          if (index >= 12 || document.hidden) return;
          await loadFrame(index);
          index += 1;
          if ('requestIdleCallback' in window) requestIdleCallback(next, { timeout: 800 });
          else setTimeout(next, 120);
        };
        next();
      };
      if ('requestIdleCallback' in window) requestIdleCallback(warmOpeningFrames, { timeout: 1200 });
      else setTimeout(warmOpeningFrames, 800);
      if ($('#boot-copy')) $('#boot-copy').textContent = 'EXPERIÈNCIA PREPARADA';
    } catch {
      if ($('#boot-copy')) $('#boot-copy').textContent = 'MODE DE RESERVA ACTIVAT';
    } finally {
      setTimeout(() => boot?.classList.add('off'), 220);
    }
  }

  const services = ['VÍDEO', 'FOTOGRAFIA', 'DRON', 'IA VISUAL', 'WEB'];
  const serviceSection = $('#que-faig');
  const cube = $('#cube');
  const front = $('#front');
  const top = $('#top');
  const serviceIndex = $('#service-index');

  function updateServices() {
    if (reduceMotion || !serviceSection || !cube || !front || !top) return;
    const rect = serviceSection.getBoundingClientRect();
    const distance = Math.max(1, serviceSection.offsetHeight - serviceSection.querySelector('.sticky').offsetHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / distance));
    const raw = progress * (services.length - 1);
    const index = Math.floor(raw);
    const fraction = raw - index;
    front.textContent = services[index];
    top.textContent = services[Math.min(index + 1, services.length - 1)];
    cube.style.transform = `rotateX(${-90 * fraction}deg) translateZ(${8 * Math.sin(Math.PI * fraction)}px)`;
    if (serviceIndex) serviceIndex.textContent = String(index + 1).padStart(2, '0');
  }

  let ticking = false;
  addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        updateHero();
        updateServices();
        ticking = false;
      });
      ticking = true;
    },
    { passive: true }
  );
  addEventListener('resize', () => {
    if (reduceMotion) return;
    resizeCanvas();
    updateHero();
    updateServices();
  }, { passive: true });
  motionPreference.addEventListener?.('change', event => {
    reduceMotion = event.matches;
    if (reduceMotion) boot?.classList.add('off');
    else { resizeCanvas(); updateHero(); updateServices(); }
  });

  if (!reduceMotion) {
    resizeCanvas();
    bootUp();
    updateHero();
    updateServices();
  } else {
    boot?.classList.add('off');
  }
})();
