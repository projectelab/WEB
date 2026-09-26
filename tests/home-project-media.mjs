import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(new URL('../public/assets/home-project-media.20260927.js',import.meta.url),'utf8');
function setup({open=true,reduced=false}={}){
 const handlers={},events={},buttonEvents={};let intersect;
 const preference={matches:reduced,addEventListener(k,fn){this.change=fn;}};
 const button={dataset:{},hidden:true,setAttribute(){},addEventListener(k,fn){buttonEvents[k]=fn;}};
 const video={paused:true,currentTime:0,plays:0,loads:0,dataset:{src:'project.mp4'},
  addEventListener(k,fn){handlers[k]=fn;},getAttribute(k){return k==='src'?this.src:null;},
  load(){this.loads++;},play(){this.plays++;this.paused=false;handlers.play?.();return Promise.resolve();},
  pause(){this.paused=true;handlers.pause?.();},end(){this.currentTime=5;this.paused=true;handlers.ended();}};
 const disclosure={open,querySelector(s){return s==='video'?video:button;},addEventListener(k,fn){this[k]=fn;}};
 const document={hidden:false,querySelectorAll(){return [disclosure];},addEventListener(k,fn){events[k]=fn;}};
 vm.runInNewContext(source,{document,matchMedia:()=>preference,window:{IntersectionObserver:true},
  IntersectionObserver:class{constructor(fn){intersect=fn;}observe(){}}});
 return {video,button,document,preference,enter(visible){intersect([{isIntersecting:visible}]);},
  toggle(open){disclosure.open=open;disclosure.toggle();},click(){buttonEvents.click();},
  hide(hidden){document.hidden=hidden;events.visibilitychange();}};
}

test('clean project media loads only when open and visible',async()=>{
 const a=setup({open:false});a.enter(true);await Promise.resolve();
 assert.equal(a.video.loads,0);assert.equal(a.video.plays,0);
 a.toggle(true);await Promise.resolve();assert.equal(a.video.loads,1);assert.equal(a.video.paused,false);
 a.video.currentTime=2;a.toggle(false);await Promise.resolve();
 assert.equal(a.video.paused,true);assert.equal(a.video.currentTime,2);
 a.toggle(true);await Promise.resolve();assert.equal(a.video.currentTime,2);
});

test('clean project media holds its final frame until deliberate replay',async()=>{
 const a=setup();a.enter(true);await Promise.resolve();a.video.end();
 a.enter(false);a.enter(true);a.toggle(false);a.toggle(true);await Promise.resolve();
 assert.equal(a.video.currentTime,5);assert.equal(a.video.plays,1);assert.equal(a.button.dataset.state,'ended');
 a.click();await Promise.resolve();assert.equal(a.video.currentTime,0);assert.equal(a.video.plays,2);
});

test('manual pause and reduced motion survive viewport changes',async()=>{
 const a=setup({reduced:true});a.enter(true);assert.equal(a.video.loads,0);
 a.click();await Promise.resolve();assert.equal(a.video.paused,false);
 a.click();a.enter(false);a.enter(true);await Promise.resolve();assert.equal(a.video.paused,true);
 a.click();await Promise.resolve();assert.equal(a.video.paused,false);
});

test('late playback is stopped after a disclosure closes or document becomes hidden',async()=>{
 const a=setup();a.enter(true);a.toggle(false);await Promise.resolve();assert.equal(a.video.paused,true);
 a.toggle(true);a.hide(true);await Promise.resolve();assert.equal(a.video.paused,true);
 a.hide(false);await Promise.resolve();assert.equal(a.video.paused,false);
});
