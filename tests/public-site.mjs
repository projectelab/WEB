import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const home = await read('public/index.html');
const automation = await read('public/automatitzacio-sistemes/index.html');
const activeScript = (html, name) => html.match(new RegExp(`src="(/assets/${name}[^\"]+\\.js)"`))[1];
const contactSource = await read(`public${activeScript(home, 'contact')}`);
const demoSource = await read(`public${activeScript(automation, 'automatizacion')}`);

function element() {
  const listeners = {}, attrs = {}, classes = new Set();
  return {
    listeners, attrs, style: {}, dataset: {}, value: '', textContent: '',
    classList: { add: x => classes.add(x), remove: x => classes.delete(x),
      toggle: (x, on) => on ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) },
    setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; },
    addEventListener(k, fn) { listeners[k] = fn; }, focus() { this.focused = true; },
    checkValidity() { return this.value.length <= 2000; }
  };
}

test('both public pages use the shared contact, valid local resources and canonical SEO', async () => {
  for (const [html, path] of [[home, '/'], [automation, '/automatitzacio-sistemes/']]) {
    assert.match(html, /<html lang="ca">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, new RegExp(`rel="canonical" href="https://www.desorden.cat${path}"`));
    assert.match(html, /name="twitter:card"/);
    assert.match(activeScript(html, 'contact'), /^\/assets\/contact\./);
    assert.doesNotMatch(html, /HVAC|Aerotermia|VRF|formResponse|automation-form|PASOS/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
    assert.equal(ids.length, new Set(ids).size);
    for (const [, value] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (!value.startsWith('/') || value === '/' || value.includes('#')) continue;
      const file = value.endsWith('/') ? `${value}index.html` : value;
      assert((await stat(new URL(`../public${file}`, import.meta.url))).isFile(), value);
    }
    for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(id), id);
  }
  for (let n = 1; n <= 97; n++) {
    const frame = await readFile(new URL(`../public/frames/v1/frame_${String(n).padStart(4, '0')}.webp`, import.meta.url));
    assert.equal(frame.toString('ascii', 8, 12), 'WEBP');
  }
});

test('home contact validates locally and opens WhatsApp directly', () => {
  assert.equal(activeScript(home, 'contact'), '/assets/contact.20260924-native.js');
  assert.match(home, /<fieldset class="field wide service-choice"><legend>Què necessites\?<\/legend>/);
  assert.match(home, /<button class="submit contact-submit" type="submit">/);
  assert.doesNotMatch(home, /data-channel="email"/);
  assert.match(contactSource, /messageForWhatsApp/);
  assert.match(contactSource, /https:\/\/wa\.me\/34640925788/);
  assert.match(contactSource, /window\.location\.href = whatsapp/);
  assert.doesNotMatch(contactSource, /fetch\('\/api\/contact'/);
});

test('home keeps three areas, legacy anchors and the complete contact flow', () => {
  const ids = ['hero','desorden','videos','modernitzat','labs','contacte'];
  let previous = -1;
  for (const id of ids) {
    const position = home.indexOf(`id="${id}"`);
    assert(position > previous, id);
    previous = position;
  }
  for (const anchor of ['projectes','que-faig','automatitzacio','rnd','com-treballem','qui-soc','lab'])
    assert(home.includes(`id="${anchor}"`));
  for (const url of ['/automatitzacio-sistemes/','/laboratori/','/projectes/producte-digital/','/disseny-web/'])
    assert(home.includes(`href="${url}"`));
  assert.doesNotMatch(home, /project-stack|projects-inline|brand-wordmark/);
  assert.match(home, /Descobrir · Ordenar · Denotar/);
});

test('demo keyboard navigation updates its panel label and playback can be stopped', () => {
  const nodes = Object.fromEntries(['demo-run','demo-screen-label','demo-screen-status','demo-screen-body','demo-meter','demo-panel'].map(id => [id,element()]));
  const tabs = [0,1,2].map(i => Object.assign(element(), { dataset: { demoStep: String(i) } }));
  const timers = new Map();
  vm.runInNewContext(demoSource, {
    document: { querySelector: s => nodes[s.slice(1)], querySelectorAll: () => tabs, addEventListener() {} },
    setInterval: fn => { timers.set(1, fn); return 1; }, clearInterval: id => timers.delete(id)
  });
  tabs[0].listeners.keydown({key:'End',preventDefault(){}});
  assert.equal(tabs[2].tabIndex, 0); assert.equal(tabs[2].focused, true);
  assert.equal(nodes['demo-panel'].attrs['aria-labelledby'], 'demo-tab-2');
  assert.match(nodes['demo-screen-body'].innerHTML, /Preparar el pressupost/);
  nodes['demo-run'].listeners.click(); assert.equal(timers.size,1);
  timers.get(1)(); assert.match(nodes['demo-screen-label'].textContent,/02/);
  nodes['demo-run'].listeners.click(); assert.equal(timers.size,0);
});
