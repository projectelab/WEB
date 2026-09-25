import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const services = [
  {
    path: '/produccio-audiovisual/',
    title: 'Producció audiovisual i vídeo a Catalunya | DESORDEN',
    description: 'Vídeo vertical, esdeveniments, dron i peces visuals per a marques, negocis i projectes del Bages i de tot Catalunya.',
    h1: 'Producció audiovisual que fa que et triïn.',
    links: ['/produccio-audiovisual/dron-video-aeri/', '/projectes/pugnator-nox-bellum/', '/projectes/nutrikom/', '/projectes/federacio-catalana-esgrima/'],
  },
  {
    path: '/produccio-audiovisual/dron-video-aeri/',
    title: 'Gravació amb dron i vídeo aeri a Catalunya | DESORDEN',
    description: 'Preses aèries per a esdeveniments, esport, patrimoni i projectes visuals al Bages i Catalunya.',
    h1: 'Preses aèries amb dron per elevar la teva història.',
    links: ['/produccio-audiovisual/', '/projectes/ajuntament-sant-vicenc/', '/projectes/pugnator-nox-bellum/'], faq: 3,
  },
  {
    path: '/automatitzacio-sistemes/',
    title: 'Automatització de processos i sistemes digitals | DESORDEN',
    description: 'Redueix tasques manuals connectant formularis, eines i processos comercials amb sistemes simples i útils.',
    h1: 'MENYS FEINA MANUAL. MÉS CONTROL DEL TEU NEGOCI.',
    links: ['/disseny-web/', '/projectes/producte-digital/'],
  },
  {
    path: '/disseny-web/',
    title: 'Disseny web ràpid i a mida a Catalunya | DESORDEN',
    description: 'Webs ràpides, directes i pensades per convertir. Disseny i desenvolupament web sense plantilles pesades ni elements innecessaris.',
    h1: 'Webs d’impacte construïdes per carregar a l’instant.',
    links: ['/automatitzacio-sistemes/', '/projectes/viu-svc/', '/projectes/producte-digital/'],
  },
];

test('service routes have unique SEO metadata, canonical URLs and one exact H1', async () => {
  const sitemap = await read('public/sitemap.xml');
  const home = await read('public/index.html');
  for (const page of services) assert(home.includes(`href="${page.path}"`), `home footer: ${page.path}`);
  for (const page of services) {
    const html = await read(`public${page.path}index.html`);
    assert.match(html, /<html lang="ca">/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, page.path);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</title>`));
    assert.match(html, new RegExp(`<meta name="description" content="${page.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
    assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.desorden\\.cat${page.path.replaceAll('/', '\\/')}">`));
    assert.match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/);
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    assert.equal(heading.toLocaleUpperCase('ca'), page.h1.toLocaleUpperCase('ca'), page.path);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card"/);
    const footer = html.slice(html.lastIndexOf('<footer'));
    for (const service of services) assert(footer.includes(`href="${service.path}"`), `${page.path}: footer ${service.path}`);
    if (page.faq) assert.equal((html.match(/class="service-faq-item"/g) || []).length, page.faq, `${page.path}: visible FAQ`);
    assert.equal((sitemap.match(new RegExp(`<loc>https://www\\.desorden\\.cat${page.path.replaceAll('/', '\\/')}</loc>`, 'g')) || []).length, 1, page.path);

    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(jsonLd.length, 1, `${page.path}: structured data block`);
    const graph = JSON.parse(jsonLd[0][1])['@graph'];
    assert(graph.some(node => node['@type'] === 'Service' && node.provider['@id'] === 'https://www.desorden.cat/#organization'), page.path);
    assert(graph.some(node => node['@type'] === 'BreadcrumbList'), page.path);

    for (const href of page.links) assert(html.includes(`href="${href}"`), `${page.path}: ${href}`);
    for (const [, href] of html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)) {
      const target = href.endsWith('/') ? `${href}index.html` : href;
      assert((await stat(new URL(`../public${target}`, import.meta.url))).isFile(), `${page.path}: ${href}`);
    }
  }
  assert.doesNotMatch(sitemap, /https:\/\/www\.desorden\.cat\/automatizacion\//);
  assert.equal((sitemap.match(/<loc>https:\/\/www\.desorden\.cat\/(?:automatitzacio-sistemes|produccio-audiovisual|disseny-web)(?:\/dron-video-aeri)?\/<\/loc>/g) || []).length, 4);
});
