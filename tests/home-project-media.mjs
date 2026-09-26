import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source=await readFile(new URL('../public/assets/home-project-media.20260927.js',import.meta.url),'utf8');
function setup({reduced=false,reject=false}={}){
 let intersect,unobserved=false;
 const events={},preference={matches:reduced,addEventListener(k,fn){this.change=fn;}};
 const video={paused:true,currentTime:0,loads:0,plays:0,dataset:{src:'project.mp4'},
  getAttribute(){return this.src;},load(){this.loads++;},
  play(){this.plays++;if(reject)return Promise.reject(new Error('autoplay blocked'));this.paused=false;return Promise.resolve();},
  pause(){throw new Error('Project playback must not be paused by page code');}};
 vm.runInNewContext(source,{matchMedia:()=>preference,document:{querySelectorAll(){return [video];},addEventListener(k,fn){events[k]=fn;}},
  window:{IntersectionObserver:true},IntersectionObserver:class{constructor(fn){intersect=fn;}observe(){}unobserve(){unobserved=true;}}});
 return {video,events,preference,get unobserved(){return unobserved;},enter(visible){intersect([{isIntersecting:visible}]);}};
}

test('project loops load lazily on first entry and keep playing after leaving',async()=>{
 const a=setup();assert.equal(a.video.loads,0);a.enter(false);assert.equal(a.video.plays,0);
 a.enter(true);await Promise.resolve();assert.equal(a.video.loads,1);assert.equal(a.video.loop,true);assert(a.unobserved);
 a.video.currentTime=2;a.enter(false);await Promise.resolve();assert.equal(a.video.paused,false);assert.equal(a.video.currentTime,2);
 a.enter(true);await Promise.resolve();assert.equal(a.video.plays,1);assert.equal(a.video.loads,1);
 assert.equal(a.events.visibilitychange,undefined);
});

test('late playback is not cancelled by scrolling away',async()=>{
 const a=setup();a.enter(true);a.enter(false);await Promise.resolve();assert.equal(a.video.paused,false);
});

test('initial reduced motion keeps project posters without an automatic download',()=>{
 const a=setup({reduced:true});a.enter(true);a.events.pointerdown();assert.equal(a.video.loads,0);
});

test('a blocked autoplay can retry after interaction without controls or reloading',async()=>{
 const a=setup({reject:true});a.enter(true);await Promise.resolve();await Promise.resolve();
 a.events.pointerdown();assert.equal(a.video.plays,2);assert.equal(a.video.loads,1);
});
