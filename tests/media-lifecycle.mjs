import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source=await readFile(new URL('../public/assets/media.20260925-v6.js',import.meta.url),'utf8');

function setup(reduced=false){
 const events={},pref={matches:reduced,addEventListener(k,f){this.change=f;}},buttons=[],videos=[];let observe;
 for(let i=0;i<2;i++){
  const listeners={},attrs={},classes=new Set();
  const button={hidden:true,textContent:'',dataset:{},classList:{add(v){classes.add(v);}},
   setAttribute(k,v){attrs[k]=v;},addEventListener(k,f){this[k]=f;}};
  buttons.push(button);
  const host={querySelector(){return button;},classList:{add(){}},append(){}};
  const v={paused:true,loop:true,currentTime:0,dataset:{src:`clip-${i}.mp4`},loads:0,plays:0,
   parentElement:host,classList:{add(){}},matches(){return false;},
   removeAttribute(k){if(k==='loop')this.loop=false;},addEventListener(k,f){listeners[k]=f;},
   getAttribute(k){return k==='src'?this.src:null;},load(){this.loads++;},
   play(){this.plays++;this.paused=false;listeners.play?.();return Promise.resolve();},
   pause(){this.paused=true;listeners.pause?.();},
   end(){this.paused=true;this.currentTime=9;listeners.ended?.();}
  };
  videos.push(v);
 } const doc={hidden:false,body:{},querySelectorAll(sel){return sel.startsWith('video:not')?videos:[];},
  createElement(){return buttons[0];},addEventListener(k,f){(events[k] ||= []).push(f);}};
 const MutationObserver=class{constructor(fn){this.fn=fn;}observe(){}};
 const window={IntersectionObserver:true};
 vm.runInNewContext(source,{matchMedia:()=>pref,document:doc,window,
  IntersectionObserver:class{constructor(fn){observe=fn;}observe(){}},MutationObserver,Map});
 return {videos,buttons,pref,doc,media:window.desordenMedia,
  enter(i,visible){observe([{target:videos[i],isIntersecting:visible}]);},
  hide(on){doc.hidden=on;events.visibilitychange.forEach(f=>f());}};
}

test('videos autoplay once, hold the final frame and restart only on button press',async()=>{
 const a=setup();
 a.enter(0,true);await Promise.resolve();
 assert.equal(a.videos[0].loads,1);
 assert.equal(a.videos[0].plays,1);
 assert.equal(a.videos[0].loop,false);
 assert.equal(a.buttons[0].dataset.state,'playing');

 a.videos[0].end();
 assert.equal(a.videos[0].currentTime,9);
 assert.equal(a.buttons[0].dataset.state,'ended');
 a.enter(0,false);a.enter(0,true);await Promise.resolve();
 assert.equal(a.videos[0].plays,1);
 assert.equal(a.videos[0].currentTime,9); a.buttons[0].click();await Promise.resolve();
 assert.equal(a.videos[0].currentTime,0);
 assert.equal(a.videos[0].plays,2);
 assert.equal(a.buttons[0].dataset.state,'playing');
});

test('explicit pause stays paused across viewport changes until the button is pressed',async()=>{
 const a=setup();a.enter(0,true);await Promise.resolve();
 a.buttons[0].click();
 a.enter(0,false);a.enter(0,true);await Promise.resolve();
 assert.equal(a.videos[0].paused,true);
 assert.equal(a.buttons[0].dataset.state,'paused');
 a.buttons[0].click();await Promise.resolve();
 assert.equal(a.videos[0].paused,false);
});

test('reduced motion keeps posters until deliberate playback',async()=>{
 const a=setup(true);a.enter(0,true);
 assert.equal(a.videos[0].loads,0);
 assert.equal(a.videos[0].paused,true);
 a.buttons[0].click();await Promise.resolve();
 assert.equal(a.videos[0].paused,false);
});

test('a pending play promise cannot restart media after a rapid scroll away',async()=>{
 const a=setup();a.enter(0,true);a.enter(0,false);await Promise.resolve();
 assert.equal(a.videos[0].paused,true);
});

test('covered stack videos pause, resume in place and never replay a completed clip',async()=>{
 const a=setup();a.enter(0,true);
 a.videos[0].currentTime=4;
 a.media.setActive(a.videos[0],false);
 await Promise.resolve();
 assert.equal(a.videos[0].paused,true);
 a.enter(0,true);
 assert.equal(a.videos[0].paused,true);
 a.media.setActive(a.videos[0],true);
 await Promise.resolve();
 assert.equal(a.videos[0].paused,false);
 assert.equal(a.videos[0].currentTime,4);
 a.videos[0].end();
 a.media.setActive(a.videos[0],false);
 a.media.setActive(a.videos[0],true);
 assert.equal(a.videos[0].paused,true);
 assert.equal(a.videos[0].currentTime,9);
});

test('mobile previews loop only while active, and manual pause survives repeated activation', async()=>{
 const a=setup();
 a.media.setActive(a.videos[0],true,true);
 a.media.setActive(a.videos[1],false,true);
 a.enter(0,true);a.enter(1,true);await Promise.resolve();
 assert.equal(a.videos[0].loop,true);
 assert.equal(a.videos[0].paused,false);
 assert.equal(a.videos[1].paused,true);
 assert.equal(a.videos[1].loads,0);
 let stopped=false;
 a.buttons[0].click({stopPropagation(){stopped=true;}});
 assert.equal(stopped,true);
 a.media.setActive(a.videos[0],true,true);
 a.enter(0,true);
 assert.equal(a.videos[0].paused,true);
 a.media.setActive(a.videos[0],false,true);
 a.media.setActive(a.videos[1],true,true);
 await Promise.resolve();
 assert.equal(a.videos[0].paused,true);
 assert.equal(a.videos[1].paused,false);
 a.media.setActive(a.videos[1],false,true);
 a.media.setActive(a.videos[0],true,true);
 await Promise.resolve();
 assert.equal(a.videos[0].paused,false);
 assert.equal(a.videos[1].paused,true);
});

test('late preview playback cannot revive an inactive card; desktop remains one-shot',async()=>{
 const a=setup();
 a.media.setActive(a.videos[0],true,true);a.enter(0,true);
 a.media.setActive(a.videos[0],false,true);
 a.buttons[0].click();
 await Promise.resolve();
 assert.equal(a.videos[0].paused,true);
 a.media.setActive(a.videos[0],true);
 assert.equal(a.videos[0].loop,false);
});
