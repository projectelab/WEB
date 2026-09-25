import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const home=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../public/assets/project-stack.20260925-v2.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/assets/project-stack.20260925-v2.css',import.meta.url),'utf8');
const featured=home.split('data-project-stack>')[1].split('<div class="more-work">')[0];
const urls=[...featured.matchAll(/<h3><a href="([^"]+)"/g)].map(match=>match[1]);

function setup(enabled=true){
 let callback,options;const playing=new Set(),calls=[],events={};
 const preference={matches:enabled,addEventListener(){}};
 const cards=urls.map((url,index)=>{
  const video={index};const host={children:[],append(node){this.children.push(node);}};
  const title={textContent:`project ${index}`,getAttribute(){return url;}};
  return {video,host,top:200,depth:0,style:{removeProperty(){},setProperty(key,value){cards[index].depth=value;}},
   getBoundingClientRect(){return {top:this.top};},
   querySelector(selector){return selector==='video'?video:selector==='.work-heading a'?title:host;}};
 });
 vm.runInNewContext(source,{
  document:{querySelector(){return {children:cards};},createElement(tag){return {tag,setAttribute(key,value){this[key]=value;}};}},
  matchMedia:()=>preference,addEventListener:(type,fn)=>{events[type]=fn;},
  window:{innerHeight:844,IntersectionObserver:true,desordenMedia:{setActive(video,active,looping){
   calls.push({index:video.index,active,looping});
   if(active)playing.add(video.index);else playing.delete(video.index);
   if(enabled)assert(playing.size<=1,'never briefly activate two previews');
  }}},
  IntersectionObserver:class{constructor(fn,opts){callback=fn;options=opts;}observe(){}disconnect(){}}
 });
 return {cards,calls,playing,options,events,enter(indices){callback(indices.map(index=>({target:cards[index],isIntersecting:true})));}};
}

test('existing observer controls all five previews, including reverse navigation and resize',()=>{
 const a=setup();
 assert.equal(a.options.rootMargin,'0px 0px -764px 0px');
 assert.equal(a.playing.size,1);assert(a.playing.has(0));
 a.enter([0,1,2,3,4]);assert(a.playing.has(4));
 assert.deepEqual(a.cards.map(card=>card.depth),[4,3,2,1,0]);
 a.events.resize();assert(a.playing.has(4));
 a.enter([1]);assert(a.playing.has(1));
 assert.doesNotMatch(source,/addEventListener\(['"]scroll/);
});

test('video overlays use the five existing title URLs and are independent of controls',()=>{
 const a=setup();
 assert.equal(urls.length,5);
 assert.deepEqual(a.cards.map(card=>card.host.children[0].href),urls);
 assert(a.cards.every(card=>card.host.children[0].tag==='a'));
 assert.match(css,/\.stack-video-link\{display:none\}/);
 assert.match(css,/width:44px;\s*height:44px/);
 assert.match(css,/width:18px;\s*height:18px/);
 assert.match(css,/position:sticky;\s*top:calc\(24px \+ var\(--stack-index\) \* 12px\)/);
 assert.match(css,/aspect-ratio:3\/4/);
});

test('desktop and reduced-motion use the existing non-loop media policy',()=>{
 const a=setup(false);
 assert.equal(a.playing.size,5);
 assert(a.calls.every(call=>call.looping===undefined));
});
