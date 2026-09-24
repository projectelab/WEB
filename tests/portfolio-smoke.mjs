import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
const read = path => readFile(new URL(`../${path}`, import.meta.url),'utf8');
const routes=['/','/projectes/','/laboratori/','/automatizacion/','/avis-legal/','/privadesa/','/cookies/',...['nutrikom','pugnator-nox-bellum','the-club-padel','pata-negra','federacio-catalana-esgrima','viu-svc','ajuntament-sant-vicenc','producte-digital'].map(x=>`/projectes/${x}/`),...['suro','marina','territori','ia-visual','lip-sync','experiments'].map(x=>`/laboratori/${x}/`)];
const labs=['suro','marina','territori','ia-visual','lip-sync','experiments'];
test('public routes expose matching social metadata and valid heading order',async()=>{
 for(const route of routes){
  const html=await read(`public${route}index.html`);
  const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description=html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert(title&&description&&canonical,route);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,route);
  const tag=(kind,key)=>html.match(new RegExp(`<meta ${kind}="${key}" content="([^"]+)"`))?.[1];
  for(const [key,value] of Object.entries({'og:type':'website','og:locale':'ca_ES','og:site_name':'DESORDEN','og:url':canonical,'og:title':title,'og:description':description}))
   assert.equal(tag('property',key),value,`${route}: ${key}`);
  const image=tag('property','og:image');
  assert(image?.startsWith('https://www.desorden.cat/'),`${route}: og:image`);
  assert(tag('property','og:image:alt'),`${route}: og:image:alt`);
  assert.equal(tag('name','twitter:card'),'summary_large_image',route);
  assert.equal(tag('name','twitter:title'),title,route);
  assert.equal(tag('name','twitter:description'),description,route);
  assert.equal(tag('name','twitter:image'),image,route);
  assert((await stat(new URL(`../public${new URL(image).pathname}`,import.meta.url))).isFile(),`${route}: social image`);
 }
 for(const route of ['/projectes/','/laboratori/']){
  const html=await read(`public${route}index.html`);
  const headings=[...html.matchAll(/<h([1-6])\b/g)].map(match=>Number(match[1]));
  assert.equal(headings[0],1,route);
  assert.equal(headings[1],2,`${route}: H1 must be followed by H2`);
 }
});
test('all public routes have valid local assets, unique headings, accessible main and canonical SEO',async()=>{
 const sitemap=await read('public/sitemap.xml');
 for(const route of routes){
  const html=await read(`public${route}index.html`);
  assert.equal((html.match(/<h1\b/g)||[]).length,1,route);
  assert(html.includes(`rel="canonical" href="https://www.desorden.cat${route}"`),route);
  assert.match(html,/<main id="main" tabindex="-1">/);
  assert.match(html,/class="skip"/);
  assert(sitemap.includes(`https://www.desorden.cat${route}`));
  assert.doesNotMatch(html,/href="\/lab\//);
  for(const [,ref]of html.matchAll(/(?:src|href|poster)="(\/[^"#]*)"/g)){
   const target=ref.endsWith('/')?`${ref}index.html`:ref;
   assert((await stat(new URL(`../public${target}`,import.meta.url))).isFile(),`${route}: ${ref}`);
  }
 }
 assert.match(await read('public/robots.txt'),/Disallow: \/lab\//);
 assert.doesNotMatch(sitemap,/<loc>https:\/\/www.desorden.cat\/lab\//);
});
test('home links to LAB and its index retains all six lines with HQ opt-in',async()=>{
  const home=await read('public/index.html');
  assert(home.includes('href="/laboratori/"'));
  const labIndex=await read('public/laboratori/index.html');
  for(const slug of labs) assert(labIndex.includes(`href="/laboratori/${slug}/"`),slug);
 for(const route of ['/','/projectes/','/laboratori/']){
  const html=await read(`public${route}index.html`);
  assert.doesNotMatch(html,/\/media\/portfolio\/hq\//);
  for(const [tag] of html.matchAll(/<video\b[^>]*>/g)){
   assert.match(tag,/data-src="\/media\/portfolio\/previews-v2\//);
   assert.match(tag,/poster="/);assert.match(tag,/preload="none"/);
   assert.doesNotMatch(tag,/(?<!data-)src="|autoplay/);
  }
 }
});
test('all HQ clips preserve designated pages, posters and user-initiated playback',async()=>{
 const designated={'projectes/nutrikom':['nutrikom-ntk-runners'],'projectes/pugnator-nox-bellum':['boxing-event-01'],'projectes/federacio-catalana-esgrima':['esgrima-masculina-01','esgrima-masculina-02','esgrima-femenina-01','esgrima-femenina-02'],'laboratori/suro':['suro-poble-01','suro-poble-02'],'laboratori/territori':['territori-muntanya-01-v2','territori-historic-01'],'laboratori/ia-visual':['ia-visual-01'],'laboratori/lip-sync':['lip-sync-01']};
 for(const [route,clips]of Object.entries(designated)){
  const html=await read(`public/${route}/index.html`);
  for(const clip of clips)assert(html.includes(`/hq/${clip}.mp4`),clip);
  for(const [tag]of html.matchAll(/<video\b[^>]*>/g)){
   assert.match(tag,/controls/);assert.match(tag,/poster="/);assert.match(tag,/preload="none"/);assert.doesNotMatch(tag,/autoplay/);
  }
 }
 const staticBrandPages={'the-club-padel':'logo-the-club-padel.png'};
 for(const [route,asset] of Object.entries(staticBrandPages)){
  const html=await read(`public/projectes/${route}/index.html`);
  assert.doesNotMatch(html,/<video/);assert(html.includes(`/media/portfolio/${asset}`));
 }
 assert.match(await read('public/laboratori/ia-visual/index.html'),/sense col·laboració comercial ni aval/);
});
test('audited media is unchanged, compatible, faststart and under the Cloudflare asset limit',async()=>{
 const rows=JSON.parse(await read('docs/media-audit-20260922.json'));
 assert.equal(rows.filter(x=>x.path.includes('/hq/')).length,12);
 assert.equal(rows.filter(x=>x.path.includes('/previews-v2/')).length,8);
 for(const row of rows){
  const bytes=await readFile(new URL(`../public${row.path}`,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
  assert.equal(bytes.length,row.bytes);assert(bytes.length<25*1024*1024);
  const atoms=[];let offset=0;
  while(offset+8<=bytes.length){let size=bytes.readUInt32BE(offset);const tag=bytes.toString('ascii',offset+4,offset+8);if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));atoms.push(tag);if(!size)break;offset+=size;}
  assert(atoms.indexOf('moov')<atoms.indexOf('mdat'),row.path);
  assert.equal(row.codec_name,'h264');assert.equal(row.pix_fmt,'yuv420p');
  if(row.path.includes('/previews-v2/')){assert(row.width>=480);assert(row.duration>=4&&row.duration<=8);}
 }
 async function assets(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())await assets(p);else assert((await stat(p)).size<25*1024*1024,p.pathname);}}
 await assets(new URL('../public/',import.meta.url));
});

test('audit hardening exposes privacy consent and richer semantic metadata',async()=>{
 const home=await read('public/index.html');
 const contact=await read('public/assets/contact.20260923-editorial.js');
 const jsonLd=home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
 assert.equal(jsonLd?.length,1);
 const structuredData=JSON.parse(jsonLd[0].replace(/^<script[^>]*>|<\/script>$/g,''));
 assert.equal(structuredData['@context'],'https://schema.org');
 assert.equal(structuredData['@type'],'Organization');
 assert.equal(structuredData.founder.name,'David Milla');
 assert.deepEqual(structuredData.hasOfferCatalog.itemListElement.map(offer=>offer.itemOffered.name),
  ['Producció audiovisual','Vídeo','Fotografia','Dron','Web','Producte digital','Automatització','IA visual']);
 assert.match(home,/id="privacy-consent"/);
 assert.match(home,/href="\/privadesa\/"/);
 assert.match(home,/href="\/cookies\/"/);
 assert.match(home,/wa\.me\/34640925788\?text=/);
 assert.match(contact,/privacy-consent/);
});

test('client logo marquee links five real project pages and excludes Pata Negra',async()=>{
 const home=await read('public/index.html');
 const marquee=home.match(/<div class="logo-marquee"[\s\S]*?<div class="work-grid featured-work">/)?.[0];
 assert.ok(marquee,'Home exposes the client logo marquee');
 assert.doesNotMatch(marquee,/pata-negra/i);
 for(const [logo,route]of [
  ['ntk','nutrikom'],
  ['viu-svc','viu-svc'],
  ['the-club-padel','the-club-padel'],
  ['pugnator','pugnator-nox-bellum'],
  ['ajuntament-svc','ajuntament-sant-vicenc'],
 ]){
  assert.match(marquee,new RegExp(`href="/projectes/${route}/"[^>]*><img src="/media/portfolio/logo-${logo}\\.png"`));
  await readFile(new URL(`../public/media/portfolio/logo-${logo}.png`,import.meta.url));
  await read(`public/projectes/${route}/index.html`);
 }
 const sets=[...marquee.matchAll(/<div class="logo-marquee-set"[^>]*>([\s\S]*?)<\/div>/g)];
 assert.equal(sets.length,2);
 assert.deepEqual([...sets[0][1].matchAll(/href="([^"]+)"/g)].map(x=>x[1]),[...sets[1][1].matchAll(/href="([^"]+)"/g)].map(x=>x[1]));
 const css=await read('public/assets/portfolio.20260923-v3.css');
 assert.match(css,/\.logo-marquee-set img\{[^}]*object-fit:contain/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('new amber-on-black client logos replace legacy identity previews',async()=>{
 const home=await read('public/index.html');
 const projects=await read('public/projectes/index.html');
 assert.match(home,/\/media\/portfolio\/logo-ntk\.png/);
 for(const html of [home,projects]){
  assert.match(html,/\/media\/portfolio\/logo-viu-svc\.png/);
  assert.match(html,/\/media\/portfolio\/logo-the-club-padel\.png/);
  assert.doesNotMatch(html,/previews-v2\/(?:viu-svc|the-club-padel)\.webp/);
  assert.match(html,/previews-v2\/nutrikom-ntk-runners\.mp4/);
  assert.match(html,/previews-v2\/nutrikom-ntk-runners\.webp/);
 }
 assert.doesNotMatch(home.match(/<div class="logo-marquee"[\s\S]*?<div class="work-grid featured-work">/)?.[0]||'',/pata-negra/i);
 assert.match(home,/portfolio\.20260923-v3\.css/);
 assert.match(projects,/logo-ajuntament-svc\.png/);
 const town=await read('public/projectes/ajuntament-sant-vicenc/index.html');
 assert.doesNotMatch(town,/<(?:img|video)\b/i);
 const pata=await read('public/projectes/pata-negra/index.html');
 assert.doesNotMatch(pata,/previews-v2\/pata-negra\.webp/);
});

test('public routes expose permanent legal navigation and explicit contact consent',async()=>{
 for(const route of routes){
  const html=await read(`public${route}index.html`);
  for(const href of ['/avis-legal/','/privadesa/','/cookies/'])
   assert(html.includes(`href="${href}"`),`${route}: missing ${href}`);
 }
 const home=await read('public/index.html');
 assert.match(home,/consent que DESORDEN tracti les dades que facilito per atendre aquesta consulta/);
 assert.match(home,/legitimació: consentiment i, quan correspongui, mesures precontractuals a petició teva/);
});
