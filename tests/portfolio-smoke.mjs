import assert from 'node:assert/strict';
import {readFile,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
const read = path => readFile(new URL(`../${path}`, import.meta.url),'utf8');
const routes=['/','/projectes/','/laboratori/','/automatizacion/','/avis-legal/','/privadesa/','/cookies/',...['nutrikom','pugnator-nox-bellum','the-club-padel','pata-negra','federacio-catalana-esgrima','viu-svc','ajuntament-sant-vicenc','producte-digital','percussio'].map(x=>`/projectes/${x}/`),...['suro','marina','territori','ia-visual','lip-sync','experiments'].map(x=>`/laboratori/${x}/`)];
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
test('sitemap exposes lastmod for every URL and Percussió is linked from the project index',async()=>{
 const sitemap=await read('public/sitemap.xml');
 const urls=[...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(x=>x[1]);
 assert(urls.length>0);
 for(const entry of urls) assert.match(entry,/<lastmod>2026-09-24<\/lastmod>/);
 assert.match(sitemap,/<loc>https:\/\/www\.desorden\.cat\/projectes\/percussio\/<\/loc>/);
 const projects=await read('public/projectes/index.html');
 assert.match(projects,/href="\/projectes\/percussio\/"[^>]*>PERCUSSIÓ/);
 const page=await read('public/projectes/percussio/index.html');
 assert.match(page,/data-src|esdeveniment-percussio\.mp4/);
});

test('home links to LAB and its index retains all six lines with HQ opt-in',async()=>{
  const home=await read('public/index.html');
  assert(home.includes('href="/laboratori/"'));
  assert(home.includes('href="/laboratori/suro/"'));
  assert(home.includes('href="/laboratori/marina/"'));
  assert.match(home,/data-src="\/media\/portfolio\/suro-retrat\.mp4"/);
  assert.match(home,/data-src="\/media\/portfolio\/marina-retrat\.mp4"/);
  const labIndex=await read('public/laboratori/index.html');
  for(const slug of labs) assert(labIndex.includes(`href="/laboratori/${slug}/"`),slug);
 for(const route of ['/','/projectes/','/laboratori/']){
  const html=await read(`public${route}index.html`);
  assert.doesNotMatch(html,/\/media\/portfolio\/hq\//);
  for(const [tag] of html.matchAll(/<video\b[^>]*class="[^"]*\bpreview\b[^"]*"[^>]*>/g)){
   assert.match(tag,/data-src="\/media\/portfolio\//);
   assert.match(tag,/poster="/);assert.match(tag,/preload="none"/);
   assert.doesNotMatch(tag,/(?<!data-)src="|autoplay/);
  }
 }
});
test('current portfolio clips preserve designated pages, posters and user-initiated playback',async()=>{
 const designated={'projectes/nutrikom':['ntk-runners-cursa'],'projectes/pugnator-nox-bellum':['nox-bellum-entrada'],'projectes/federacio-catalana-esgrima':['esgrima-accio','esgrima-retrat'],'projectes/viu-svc':['territori-rotonda-drone'],'projectes/ajuntament-sant-vicenc':['territori-esglesia-drone'],'projectes/percussio':['esdeveniment-percussio'],'laboratori/suro':['suro-retrat'],'laboratori/marina':['marina-retrat'],'laboratori/territori':['territori-esglesia-drone','territori-rotonda-drone'],'laboratori/ia-visual':['hq/ia-visual-01'],'laboratori/lip-sync':['hq/lip-sync-01']};
 for(const [route,clips]of Object.entries(designated)){
  const html=await read(`public/${route}/index.html`);
  for(const clip of clips)assert(html.includes(`/media/portfolio/${clip}.mp4`),clip);
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
 const contact=await read('public/assets/contact.20260924-native.js');
 const jsonLd=home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
 assert.equal(jsonLd?.length,1);
 const structuredData=JSON.parse(jsonLd[0].replace(/^<script[^>]*>|<\/script>$/g,''));
 assert.equal(structuredData['@context'],'https://schema.org');
 assert(Array.isArray(structuredData['@graph']));
 const organization=structuredData['@graph'].find(item=>item['@type']==='Organization');
 const person=structuredData['@graph'].find(item=>item['@type']==='Person');
 assert.equal(organization?.['@id'],'https://www.desorden.cat/#organization');
 assert.equal(organization?.founder?.['@id'],'https://www.desorden.cat/#david-milla');
 assert.deepEqual(organization.hasOfferCatalog.itemListElement.map(offer=>offer.itemOffered.name),
  ['Producció audiovisual','Vídeo','Fotografia','Dron','Web','Producte digital','Automatització','IA visual']);
 assert.equal(person?.name,'David Milla');
 assert.equal(person?.email,'mailto:lab@desorden.cat');
 assert.equal(person?.brand?.['@id'],'https://www.desorden.cat/#organization');
 assert.equal(person?.worksFor?.['@id'],'https://www.desorden.cat/#organization');
 assert.equal(person?.address?.addressLocality,'Sant Vicenç de Castellet');
 assert.equal(person?.address?.addressRegion,'Barcelona');
 assert.equal(person?.address?.addressCountry,'ES');
 assert.match(home,/id="privacy-consent"/);
 assert.match(home,/href="\/privadesa\/"/);
 assert.match(home,/href="\/cookies\/"/);
 assert.match(home,/wa\.me\/34640925788\?text=/);
 assert.match(contact,/privacy-consent/);
});

test('client logo marquee links five real project pages and excludes Pata Negra',async()=>{
 const home=await read('public/index.html');
 const marquee=home.match(/<div class="logo-marquee"[\s\S]*?<div class="work-grid">/)?.[0];
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

test('client logos and new portfolio videos replace legacy previews',async()=>{
 const home=await read('public/index.html');
 const projects=await read('public/projectes/index.html');
 assert.match(home,/\/media\/portfolio\/logo-ntk\.png/);
 assert.match(home,/\/media\/portfolio\/logo-viu-svc\.png/);
 assert.match(home,/\/media\/portfolio\/logo-the-club-padel\.png/);
 assert.doesNotMatch(home,/previews-v2\/(?:viu-svc|the-club-padel|nutrikom-ntk-runners)\.(?:mp4|webp)/);
 for(const html of [home,projects]){
  assert.match(html,/\/media\/portfolio\/ntk-runners-cursa\.mp4/);
  assert.match(html,/\/media\/portfolio\/ntk-runners-cursa\.webp/);
 }
 assert.match(projects,/\/media\/portfolio\/esgrima-accio\.mp4/);
 assert.match(projects,/\/media\/portfolio\/territori-esglesia-drone\.mp4/);
 assert.match(projects,/\/media\/portfolio\/territori-rotonda-drone\.mp4/);
 assert.doesNotMatch(home.match(/<div class="logo-marquee"[\s\S]*?<div class="work-grid">/)?.[0]||'',/pata-negra/i);
 assert.match(home,/portfolio\.20260924-v4\.css/);
 const viu=await read('public/projectes/viu-svc/index.html');
 assert.match(viu,/\/media\/portfolio\/territori-rotonda-drone\.mp4/);
 assert.doesNotMatch(viu,/\/media\/portfolio\/territori-esglesia-drone\.mp4/);
 assert.match(viu,/\/media\/portfolio\/logo-viu-svc\.png/);
 const town=await read('public/projectes/ajuntament-sant-vicenc/index.html');
 assert.match(town,/\/media\/portfolio\/territori-esglesia-drone\.mp4/);
 assert.doesNotMatch(town,/\/media\/portfolio\/territori-rotonda-drone\.mp4/);
 assert.match(town,/\/media\/portfolio\/logo-ajuntament-svc\.png/);
 const ntk=await read('public/projectes/nutrikom/index.html');
 assert.match(ntk,/\/media\/portfolio\/logo-ntk\.png/);
 const pugnator=await read('public/projectes/pugnator-nox-bellum/index.html');
 assert.match(pugnator,/\/media\/portfolio\/logo-pugnator\.png/);
 const fencing=await read('public/projectes/federacio-catalana-esgrima/index.html');
 assert.match(fencing,/\/media\/portfolio\/logo-fce\.png/);
 assert.doesNotMatch(fencing,/https:\/\/esgrima\.cat\/wp-content\/uploads\/2024\/08\/FCELogo\.png/);
 await readFile(new URL('../public/media/portfolio/logo-fce.png',import.meta.url));
 const pata=await read('public/projectes/pata-negra/index.html');
 assert.doesNotMatch(pata,/previews-v2\/pata-negra\.webp/);
});

test('portfolio videos use responsive three-quarter frames',async()=>{
 const css=await read('public/assets/portfolio.20260923-v3.css');
 assert.match(css,/\.work-media\{[^}]*width:100%[^}]*aspect-ratio:3\/4/);
 assert.match(css,/\.case-media\{[^}]*max-width:none[^}]*width:100%/);
 assert.match(css,/\.case-media video\{[^}]*width:100%[^}]*aspect-ratio:3\/4[^}]*object-fit:cover/);
});

test('home featured videos stay compact at 3:4 and use the amber DESORDEN wordmark',async()=>{
 const home=await read('public/index.html');
 const css=await read('public/assets/home-portfolio.20260924-v1.css');
 assert.match(home,/home-portfolio\.20260924-v1\.css/);
 assert.match(home,/<span class="brand-wordmark">DESORDEN<\/span>/);
 assert.doesNotMatch(home,/desorden-logo-original-v2\.png/);
 assert.match(css,/\.projects>\.inner>\.work-grid \.work-media\{[^}]*width:100%[^}]*aspect-ratio:3\/4/);
 assert.match(css,/\.brand-wordmark\{[^}]*color:var\(--o\)/);
});

test('all public pages prevent horizontal overflow and project logos stay inside the viewport',async()=>{
 const css=await read('public/assets/viewport-lock.20260924-v1.css');
 assert.match(css,/html,body\{[^}]*overflow-x:hidden[^}]*overflow-x:clip/);
 assert.match(css,/body\{touch-action:pan-y pinch-zoom\}/);
 assert.match(css,/\.project-brand img\{[^}]*max-width:min\(68vw,280px\)!important/);
 for(const route of routes){
  const html=await read(`public${route}index.html`);
  assert.match(html,/viewport-lock\.20260924-v1\.css/,`${route}: viewport lock stylesheet`);
 }
});

test('automation uses native contact flow and commercial project CTAs avoid mailto',async()=>{
 const automation=await read('public/automatizacion/index.html');
 assert.match(automation,/contact-native\.20260924-v1\.css/);
 assert.match(automation,/contact\.20260924-native\.js/);
 assert.match(automation,/name="need" value="Automatització" checked hidden/);
 assert.match(automation,/id="privacy-consent"/);
 assert.match(automation,/id="contact-success"/);
 assert.match(automation,/ENVIAR CONSULTA/);
 assert.doesNotMatch(automation,/data-channel="email"|data-channel="whatsapp"/);

 for(const slug of ['nutrikom','pugnator-nox-bellum','the-club-padel','pata-negra','federacio-catalana-esgrima','viu-svc','ajuntament-sant-vicenc','producte-digital']){
  const html=await read(`public/projectes/${slug}/index.html`);
  assert.match(html,/href="\/#contacte">ENVIAR CONSULTA ›<\/a>/,slug);
  assert.doesNotMatch(html,/<a class="channel" href="mailto:lab@desorden\.cat">CORREU ›<\/a>/,slug);
 }
 for(const legal of ['avis-legal','privadesa']){
  const html=await read(`public/${legal}/index.html`);
  assert.match(html,/mailto:lab@desorden\.cat/,legal);
 }
});

test('public markup is compatible with strict CSP without unsafe-inline or unsafe-eval',async()=>{
 const worker=await read('src/worker.js');
 assert.match(worker,/Content-Security-Policy/);
 assert.match(worker,/"script-src 'self'"/);
 assert.match(worker,/"style-src 'self' https:\/\/fonts\.googleapis\.com"/);
 assert.match(worker,/"font-src 'self' https:\/\/fonts\.gstatic\.com"/);
 assert.match(worker,/"connect-src 'self'"/);
 assert.match(worker,/"frame-ancestors 'none'"/);
 assert.match(worker,/"frame-src 'none'"/);
 assert.match(worker,/Strict-Transport-Security/);
 assert.match(worker,/max-age=63072000; includeSubDomains; preload/);
 assert.doesNotMatch(worker,/unsafe-inline|unsafe-eval/);

 for(const route of routes){
  const html=await read(`public${route}index.html`);
  assert.doesNotMatch(html,/<style\b/i,`${route}: inline <style>`);
  assert.doesNotMatch(html,/\sstyle="/i,`${route}: inline style attribute`);
  const inlineScripts=[...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)];
  for(const script of inlineScripts)
   assert.match(script[1],/type="application\/ld\+json"/i,`${route}: unexpected inline script`);
 }
 const automation=await read('public/automatizacion/index.html');
 assert.match(automation,/automation-csp\.20260924-v1\.css/);
 assert.match(automation,/automatizacion\.20260924-csp-v1\.js/);
 const automationJs=await read('public/assets/automatizacion.20260924-csp-v1.js');
 assert.doesNotMatch(automationJs,/\.style\./);
 assert.match(automationJs,/demo-meter-step-/);
});

test('native contact flow persists leads before optional WhatsApp',async()=>{
 const home=await read('public/index.html');
 const contact=await read('public/assets/contact.20260924-native.js');
 const worker=await read('src/worker.js');
 const wrangler=JSON.parse(await read('wrangler.jsonc'));
 const privacy=await read('public/privadesa/index.html');

 assert.match(home,/contact-native\.20260924-v1\.css/);
 assert.match(home,/contact\.20260924-native\.js/);
 assert.match(home,/name="need" value="Visual \/ vídeo"/);
 assert.match(home,/name="need" value="Web & digital"/);
 assert.match(home,/ENVIAR CONSULTA/);
 assert.match(home,/id="contact-success"/);
 assert.match(home,/OBRIR WHATSAPP AMB DAVID/);
 assert.doesNotMatch(home,/data-channel="email"/);

 assert.match(contact,/fetch\('\/api\/contact'/);
 assert.match(contact,/successWhatsApp\.href = whatsapp/);
 assert.match(contact,/form\.hidden = true/);

 assert.match(worker,/url\.pathname === '\/api\/contact'/);
 assert.match(worker,/CONTACT_RATE_LIMITER\.limit/);
 assert.match(worker,/class ContactLeadStore extends DurableObject/);
 assert.match(worker,/INSERT INTO leads/);
 assert.match(worker,/CONTACT_MAX_AGE_MS/);

 assert.equal(wrangler.durable_objects.bindings[0].name,'CONTACT_LEADS');
 assert.deepEqual(wrangler.migrations[0].new_sqlite_classes,['ContactLeadStore']);
 assert.equal(wrangler.ratelimits[0].name,'CONTACT_RATE_LIMITER');
 assert.equal(wrangler.ratelimits[0].simple.limit,5);
 assert.equal(wrangler.send_email[0].name,'LEAD_EMAIL');
 assert.match(worker,/LEAD_EMAIL_FROM = 'leads@desorden\.cat'/);
 assert.match(worker,/LEAD_EMAIL_TO = 'lab@desorden\.cat'/);
 assert.match(worker,/sendLeadNotification\(env/);
 assert.match(worker,/ctx\?\.waitUntil/);
 assert.match(worker,/replyTo = lead\.contact/);
 assert.match(worker,/Lead email notification failed/);

 assert.match(privacy,/infraestructura tècnica de Cloudflare/);
 assert.match(privacy,/180 dies/);
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
