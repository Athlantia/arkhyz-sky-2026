import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {D,DEFAULT,END,eqVector,dot,starToHorizontal,makeFrame,tickClock} from '../src/astro.js';
import {atlasBlend,starAppearance,approachZoom,figureAnchors} from '../src/sky-style.js';
import {SHOWERS,meteorAppearance,MeteorClock} from '../src/meteors.js';
import {STAR_STORIES} from '../src/star-stories.js';
const json=name=>JSON.parse(fs.readFileSync(new URL('../src/data/'+name,import.meta.url)));
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

test('zoom and faint-star appearance are continuous, monotonic and independent of frame rate',()=>{
 assert.equal(atlasBlend(1),0);assert.equal(atlasBlend(4),1);
 for(const mag of [0,2,4.5,5.5,6.3,6.8,7.3,7.8]){
  let last=starAppearance(mag,6.5,1);
  for(let z=1.001;z<=4;z+=.001){const next=starAppearance(mag,6.5,z);assert(next.alpha>=last.alpha-1e-12);assert(Math.abs(next.alpha-last.alpha)<.008);assert(Math.abs(next.radius-last.radius)<.002);last=next;}
 }
 assert(starAppearance(5.5,6.5,1).alpha>.45,'Faint naked-eye stars are restored without overpowering bright stars');
 assert.equal(starAppearance(7,6.5,1).alpha,0);assert(starAppearance(7,6.5,4).alpha>.9);
 const motion=hz=>{let z=1;for(let i=0;i<hz;i++)z=approachZoom(z,4,1/hz);return z;};
 assert(Math.abs(motion(30)-motion(120))<1e-10);assert(motion(60)>3.99);
});

test('constellation labels follow actual figures, including Delphinus and RA-zero crossings',()=>{
 const cons=json('constellations.json').features,lines=json('constellations.lines.json').features,anchors=figureAnchors(cons,lines);
 const ids=['Del','Cas','Cyg','Lyr','Aql','And','Peg','Per','Cep','Dra','UMa','UMi','Her','Oph','Sge','Vul','Sgr','Sco','Boo','CrB'];
 for(let i=0;i<cons.length;i++){
  assert(Math.abs(dot(anchors[i],anchors[i])-1)<1e-12);
  const points=lines.filter(x=>x.id===cons[i].id).flatMap(x=>x.geometry.coordinates.flat()).map(p=>eqVector(...p));
  if(!points.length)continue;
  const nearest=Math.min(...points.map(v=>Math.acos(Math.min(1,dot(v,anchors[i])))/D));
  assert(nearest<13,cons[i].id+' anchor too far from its own figure: '+nearest);
  if(cons[i].id==='Del')assert(nearest<2.5);
 }
 // Review the principal August figures at multiple nights and evening/morning times.
 for(const day of [1,12,25])for(const hour of [20,23,2,4]){
  const rotation=makeFrame(Date.UTC(2026,7,day,hour-3)).rotation;
  for(const id of ids){const i=cons.findIndex(x=>x.id===id);assert(i>=0);const h=starToHorizontal(anchors[i],rotation);assert(Number.isFinite(h.az)&&Number.isFinite(h.alt));}
 }
 console.log('Figure anchors checked for 88 constellations; 20 principal August constellations reviewed across 12 local dates/times.');
});

test('meteor illustration has predominantly neutral faint events and only rare colored/trained bright events',()=>{
 const random=seeded(459),n=100000;let green=0,white=0,train=0;
 for(let i=0;i<n;i++){
  const m=meteorAppearance(SHOWERS[0],6.5,random);
  assert(m.magnitude>=-4&&m.magnitude<=6.5);
  if(m.tint==='green')green++;if(m.tint==='white')white++;if(m.trainMs)train++;
  if(m.magnitude>2)assert.equal(m.tint,'white');
  if(m.trainMs){assert(m.magnitude<1);assert(m.trainMs>=1200&&m.trainMs<=2400);}
 }
 assert(white/n>.96);assert(green/n>.002&&green/n<.015);assert(train/n<.02);
 console.log(`Illustrative palette only, not observing statistics: white ${(white/n*100).toFixed(2)}%, green ${(green/n*100).toFixed(2)}%, trains ${(train/n*100).toFixed(2)}% (Perseid r, dark sky).`);
});

test('×8 and ×16 preserve elapsed time, pause, range boundaries and automatic event rates',()=>{
 let baseline;
 for(const speed of [1,2,4,8,16]){
  assert.equal(tickClock(DEFAULT,2500,speed,true).ms,DEFAULT+2500*speed);
  assert.equal(tickClock(DEFAULT,2500,speed,false).ms,DEFAULT);
  assert.deepEqual(tickClock(END-1,1000,speed,true),{ms:END,playing:false});
  const clock=new MeteorClock(seeded(31));let events=0;
  for(let i=0;i<3600/speed*40;i++)events+=clock.advance(speed/40,120);
  assert(events>100&&events<145,'Same simulated hour gives the same event count at every speed');
  if(speed===1)baseline=events;else assert.equal(events,baseline);
 }
});

test('star histories are tied to real HIP entries and cover Cassiopeia and Delphinus without generic filler',()=>{
 const stars=json('stars.json');assert.equal(Object.keys(STAR_STORIES).length,35);
 for(const [id,s] of Object.entries(STAR_STORIES)){
  const star=stars.find(x=>x[0]===+id);assert(star);assert(s.text.length===2&&s.text.every(t=>t.length>40));
  assert(s.url.startsWith('https://'));assert(!s.text.some(t=>t.includes('HYG')));
 }
 for(const hip of [746,2920,3179,3821,4427,6686,8886,101769,101958])assert(STAR_STORIES[hip]);
 const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert(!main.includes("t('starCopy')"));
});
