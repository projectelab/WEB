import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const source=await readFile(new URL('../public/assets/media.20260922.js',import.meta.url),'utf8');
function setup(reduced=false){
 const events={},pref={matches:reduced,addEventListener(k,f){this.change=f;}}, buttons=[],videos=[];let observe;
 for(let i=0;i<2;i++){
  const listeners={}, attrs={}, button={hidden:true,textContent:'',setAttribute(k,v){attrs[k]=v;},addEventListener(k,f){this[k]=f;}};buttons.push(button);
  const v={paused:true,dataset:{src:`clip-${i}.mp4`},loads:0,plays:0,addEventListener(k,f){listeners[k]=f;},getAttribute(k){return k==='aria-label'?'Previsualització de SURO':k==='src'?this.src:null;},parentElement:{querySelector(){return button;}},load(){this.loads++;},play(){this.plays++;this.paused=false;listeners.play();return Promise.resolve();},pause(){this.paused=true;listeners.pause?.();}};videos.push(v);
 }
 const doc={hidden:false,querySelectorAll(sel){return sel.includes('data-preview')?videos:[];},addEventListener(k,f){(events[k] ||= []).push(f);}};
 vm.runInNewContext(source,{matchMedia:()=>pref,document:doc,window:{IntersectionObserver:true},IntersectionObserver:class{constructor(fn){observe=fn;}observe(){}},Map});
 return {videos,buttons,pref,doc,enter(i,visible){observe([{target:videos[i],isIntersecting:visible}]);},hide(on){doc.hidden=on;events.visibilitychange.forEach(f=>f());}};
}
test('previews load only in view, pause offscreen and preserve an explicit pause',async()=>{
 const a=setup();assert(a.videos.every(v=>v.loads===0));a.enter(0,true);await Promise.resolve();assert.equal(a.videos[0].loads,1);assert.equal(a.videos[1].loads,0);assert.equal(a.videos[0].paused,false);
 a.buttons[0].click();a.enter(0,false);a.enter(0,true);assert.equal(a.videos[0].paused,true);
 a.buttons[0].click();await Promise.resolve();assert.equal(a.videos[0].paused,false);a.hide(true);assert.equal(a.videos[0].paused,true);
 a.hide(false);await Promise.resolve();assert.equal(a.videos[0].paused,false);a.enter(0,false);assert.equal(a.videos[0].paused,true);
});
test('reduced motion keeps posters, permits deliberate play and stops on a preference change',async()=>{
 const a=setup(true);a.enter(0,true);assert.equal(a.videos[0].loads,0);assert.equal(a.videos[0].paused,true);
 a.buttons[0].click();await Promise.resolve();assert.equal(a.videos[0].paused,false);a.pref.change();assert.equal(a.videos[0].paused,true);
});
test('a pending play promise cannot restart media after a rapid scroll away',async()=>{
 const a=setup();a.enter(0,true);a.enter(0,false);await Promise.resolve();assert.equal(a.videos[0].paused,true);
});
