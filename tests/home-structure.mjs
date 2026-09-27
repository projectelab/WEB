import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const home=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../public/assets/home.once.20260927.js',import.meta.url),'utf8');

test('each looping video and project name share one native disclosure target',()=>{
 const projects=[...home.matchAll(/<article class="video-project" id="video-([^"]+)">([\s\S]*?)<\/article>/g)];
 assert.deepEqual(projects.map(p=>p[1]),['nutrikom','pucnator','the-club-padel','esgrima','marina','suro']);
 for(const p of projects){
  const content=p[2], tag=content.match(/<video[^>]+>/)[0];
  assert(content.indexOf('<summary')<content.indexOf('<video'));
  assert(content.indexOf('</video>')<content.indexOf('</summary>'));
  assert.match(content,/<details class="project-details"><summary aria-labelledby="project-title-[^"]+"><h3[^>]*><span class="project-video">/);
  assert.match(content,/<span class="project-title" id="project-title-[^"]+">[^<]+<\/span><\/h3><\/summary>/);
  assert.doesNotMatch(content,/<details[^>]+\bopen\b|<button|disclosure-mark/);
  assert.match(tag,/data-src="\/media\/portfolio\/[A-Z_0-9]+\.h264\.mp4"/);
  assert.match(tag,/preload="none"/);
  assert.match(tag,/\bloop\b/);
  assert.doesNotMatch(tag,/(?<!data-)src="|\bcontrols\b/);
 }
 assert.doesNotMatch(home,/project-stack|drive\.google\.com|<iframe/);
 assert.equal((home.match(/Veure el vídeo complet a Instagram/g)||[]).length,4);
});

test('hero and epilogue have no controls or loop; epilogue is the final page content',()=>{
 const once=[...home.matchAll(/<video[^>]+data-once-video="([^"]+)"[^>]*>/g)];
 assert.deepEqual(once.map(m=>m[1]),['load','viewport']);
 once.forEach(([tag])=>{
  assert.match(tag,/\bmuted\b/);assert.match(tag,/\bplaysinline\b/);
  assert.doesNotMatch(tag,/\bcontrols\b|\bloop\b/);
 });
 assert.match(home,/<div class="home-epilogue"><video[^>]+SURO_TANCAMENT_WEB[^>]+><\/video><\/div>\s*<\/body><\/html>\s*$/);
 assert(home.lastIndexOf('</footer>')<home.indexOf('class="home-epilogue"'));
});

test('each new browser MP4 is local, faststart, H264 and below the asset limit',async()=>{
 for(const [,path] of home.matchAll(/data-src="([^\"]+\.mp4)"/g)){
  const bytes=await readFile(new URL(`../public${path}`,import.meta.url));
  assert(bytes.length<25*1024*1024,path);
  assert(bytes.includes(Buffer.from('avc1')),path);
  const atoms=[];let offset=0;
  while(offset+8<=bytes.length){
   let size=bytes.readUInt32BE(offset);atoms.push(bytes.toString('ascii',offset+4,offset+8));
   if(size===1)size=Number(bytes.readBigUInt64BE(offset+8));
   if(!size)break;offset+=size;
  }
  assert(atoms.indexOf('moov')<atoms.indexOf('mdat'),path);
 }
});

function setup({reduced=false,reject=false,observer=true}={}){
 const listeners={},observers=[],events={};
 const preference={matches:reduced,addEventListener(k,fn){listeners[k]=fn;}};
 const videos=['load','viewport'].map(trigger=>{
  const handlers={};
  return {handlers,paused:true,currentTime:0,plays:0,loads:0,poster:'first.webp',
   dataset:{onceVideo:trigger,src:trigger+'.mp4',still:'last.webp'},
   getAttribute(k){return k==='src'?this.src:null;},load(){this.loads++;},
   addEventListener(k,fn){handlers[k]=fn;},pause(){this.paused=true;},
   play(){this.plays++;if(reject)return Promise.reject(new Error('blocked'));this.paused=false;return Promise.resolve();},
   getBoundingClientRect(){return {top:1000,bottom:2000};},
   end(){this.currentTime=5;this.paused=true;handlers.ended();}
  };
 });
 const document={hidden:false,querySelectorAll(){return videos;},addEventListener(k,fn){(events[k]??=[]).push(fn);}};
 vm.runInNewContext(source,{document,matchMedia:()=>preference,window:observer?{IntersectionObserver:true}:{},innerHeight:844,
  addEventListener(k,fn){events[k]=[fn];},
  IntersectionObserver:class{constructor(fn){observers.push(fn);}observe(){}}
 });
 return {videos,document,preference,enter(on){observers[0]([{isIntersecting:on,intersectionRatio:on?1:0}]);},
  event(type){events[type]?.forEach(fn=>fn());},reduce(on){preference.matches=on;listeners.change?.();}};
}

test('hero autoplays on load while the epilogue waits; neither replays after ending',async()=>{
 const a=setup(),[hero,end]=a.videos;await Promise.resolve();
 assert.equal(hero.plays,1);assert.equal(end.loads,0);
 hero.end();a.event('pointerdown');a.event('keydown');
 assert.equal(hero.plays,1);assert.equal(hero.currentTime,5);
 a.enter(true);await Promise.resolve();assert.equal(end.plays,1);
 end.end();a.enter(false);a.enter(true);a.event('pointerdown');
 assert.equal(end.plays,1);assert.equal(end.currentTime,5);
});

test('epilogue resumes in place and a late promise cannot play it outside the viewport',async()=>{
 const a=setup(),v=a.videos[1];a.enter(true);v.currentTime=2;
 a.enter(false);await Promise.resolve();assert.equal(v.paused,true);
 a.enter(true);await Promise.resolve();assert.equal(v.currentTime,2);assert.equal(v.paused,false);
 a.document.hidden=true;a.event('visibilitychange');assert.equal(v.paused,true);
 a.document.hidden=false;a.event('visibilitychange');await Promise.resolve();
 assert.equal(v.currentTime,2);assert.equal(v.paused,false);
});

test('reduced motion shows final stills without downloading either once-only video',()=>{
 const a=setup({reduced:true});a.enter(true);a.event('pointerdown');
 for(const v of a.videos){assert.equal(v.loads,0);assert.equal(v.poster,'last.webp');assert.equal(v.paused,true);}
});

test('blocked autoplay is recoverable and browsers without observers do not preload the epilogue',async()=>{
 const a=setup({reject:true});await Promise.resolve();await Promise.resolve();
 assert.equal(a.videos[0].paused,true);assert.equal(a.videos[1].loads,0);
 a.event('pointerdown');assert.equal(a.videos[0].plays,2);
 const b=setup({observer:false});assert.equal(b.videos[1].loads,0);
 b.event('scroll');assert.equal(b.videos[1].loads,0);
});
