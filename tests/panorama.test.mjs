import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {A,D,DEFAULT,START,END,rotate,eqVector,horizontalVector,makeFrame,dot} from '../src/astro.js';
import {encounterAt,horseHerdsAt,ObserverDirector} from '../src/forest-life.js';
import {PHOTO_ROTATION,galacticTextureUV,galacticViewBasis} from '../src/milky-way.js';

test('a rare bear, frequent dogs and continuous horse pairs occupy fixed sectors around 360°',()=>{
 for(const kind of ['bear','dogs','horses']){
  const sectors=new Set();let present=0,absent=0,returns=0;
  for(let ms=DEFAULT;ms<DEFAULT+12*3600000;ms+=1000){
   const actor=encounterAt(kind,ms);if(!actor){absent++;continue;}
   present++;sectors.add(actor.sector);if(actor.direction!==actor.outward)returns++;
   assert(actor.az>=0&&actor.az<360);assert(actor.az<45||actor.az>90);
   assert(actor.depth>.8);assert(actor.alpha>=0&&actor.alpha<=1);
   assert.deepEqual(actor,encounterAt(kind,ms));
  }
  assert.equal(sectors.size,7);assert(present>0&&returns>0);
  if(kind==='bear')assert(present/(present+absent)<.035);
  if(kind==='dogs')assert(present/(present+absent)>.78);
 }
 assert.equal(encounterAt('bear',DEFAULT),null);
 for(let ms=DEFAULT-300000;ms<DEFAULT+3600000;ms+=250){
  assert(horseHerdsAt(ms).some(a=>a.alpha>.99),'At least one fully visible pair remains somewhere in the panorama');
 }
 for(const ms of [START,END])for(const kind of ['bear','dogs','horses']){
  const a=encounterAt(kind,ms);if(a)assert(Number.isFinite(a.az)&&a.sector>=0&&a.sector<7);
 }
});

test('observer walks in, sets up, observes, packs, leaves; pause, date jumps and daylight behave correctly',()=>{
 const director=new ObserverDirector(),seen=new Set(),aims=new Set();let last,previous;
 for(let sec=0;sec<=300;sec++){
  const a=director.at(DEFAULT+sec*1000,-25);if(a){seen.add(a.stage);assert(a.height<=3.2);assert(a.depth>.8);}
  if(a?.stage==='observe'){aims.add(a.aim.toFixed(2));if(previous?.stage==='observe')assert(Math.abs(a.aim-previous.aim)<.085);}
  previous=a;
  if(sec===48)last=a;
  if(sec===250)assert.equal(a,null);
 }
 assert.deepEqual([...seen],['arrive','setup','observe','pack','leave']);
 assert.equal(last.stage,'observe');
 assert(aims.size>12,'The telescope gently moves between several observing directions');
 const frozen=director.at(DEFAULT+300000,-25);assert.deepEqual(director.at(DEFAULT+300000,-25),frozen);
 assert.equal(director.at(DEFAULT+7200000,-25).stage,'arrive');
 assert.equal(director.at(DEFAULT+7200000,15),null);
 assert.equal(director.at(DEFAULT+7201000,-11),null);
 assert.equal(director.at(DEFAULT+7202000,-25).stage,'arrive');
});

test('photographic sky transform tracks date, horizon, camera rotation and projection seam',()=>{
 for(const ms of [START,DEFAULT,END])for(const az of [0,90,180,270,359.9])for(const alt of [0,45,85]){
  const a=az*D,h=alt*D,forward=horizontalVector(az,alt),right=[Math.cos(a),0,-Math.sin(a)],up=[-Math.sin(a)*Math.sin(h),Math.cos(h),-Math.cos(a)*Math.sin(h)];
  const frame=makeFrame(ms),basis=galacticViewBasis({frame,forward,right,up});
  for(let i=0;i<3;i++){assert(Math.abs(dot(basis[i],basis[i])-1)<1e-10);for(let j=0;j<i;j++)assert(Math.abs(dot(basis[i],basis[j]))<1e-10);}
  const source=rotate(PHOTO_ROTATION,rotate(A.Rotation_EQJ_GAL().rot,eqVector(83.1,23.7)));
  const hor=rotate(frame.rotation,eqVector(83.1,23.7)),v=[-hor[1],hor[2],hor[0]];
  const recovered=basis[0].map((_,i)=>basis[0][i]*dot(v,forward)+basis[1][i]*dot(v,right)+basis[2][i]*dot(v,up));
  assert(Math.hypot(...recovered.map((n,i)=>n-source[i]))<1e-10);
 }
 const left=galacticTextureUV(eqVector(179.999,0)),right=galacticTextureUV(eqVector(-179.999,0));
 assert(Math.min(Math.abs(left[0]-right[0]),1-Math.abs(left[0]-right[0]))<.00001);
});

test('photo registration: eight stars excluded from the fit align within 0.35°',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../src/data/milky-way-registration.json',import.meta.url)));
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/assets/milky-way-eso.jpg',import.meta.url))).digest('hex'),data.assetSha256);
 assert.equal(data.validation.length,8);
 let max=0;
 for(const s of data.validation){
  const v=rotate(PHOTO_ROTATION,rotate(A.Rotation_EQJ_GAL().rot,eqVector(s.ra,s.dec)));
  const observed=eqVector((.5-s.photoX/data.width)*360,(.5-s.photoY/data.height)*180);
  const error=Math.acos(Math.max(-1,Math.min(1,dot(v,observed))))/D;
  max=Math.max(max,error);assert(error<.35,`${s.name}: ${error}°`);
 }
 console.log(`Maximum held-out photographic alignment error: ${max.toFixed(3)}°; individual star astrometry is independent.`);
});
