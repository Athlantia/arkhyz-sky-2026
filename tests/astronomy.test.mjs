import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {A,OBS,START,END,bodyAt,horizontalVector,angularDistance,eqVector,makeFrame,starToHorizontal,fromLocal,localParts,tickClock,moonViewingTime,limitingMagnitude,extinction} from '../src/astro.js';
import {SHOWERS,meteorShowers,chooseShower,MeteorClock} from '../src/meteors.js';
import {parseOrbits,nearestOrbits} from '../src/satellites.js';
import {STORIES,BODY_INFO} from '../src/content.js';
const data=JSON.parse(fs.readFileSync(new URL('./fixtures/horizons.json',import.meta.url)));
test('459 independent JPL Horizons positions: separation < 1 arcminute, airless topocentric',()=>{
 assert.equal(data.cases.length,459);let worst=0;for(const row of data.cases){const p=bodyAt(row.body,row.ms,false);const error=angularDistance(p.v,horizontalVector(row.az,row.alt))*60;worst=Math.max(worst,error);assert.ok(error<1,`${row.body} ${new Date(row.ms).toISOString()}: ${error} arcmin`);}console.log(`Maximum JPL separation ${worst.toFixed(6)} arcmin`);
});
test('J2000 -> horizon matrix preserves orientation at wrap, pole and southern declinations',()=>{
 for(const ms of [START,fromLocal(8,43000),END])for(const [ra,dec]of [[0,0],[359,30],[37.95,89.2641],[279.235,38.784],[-80,-45]]){
  const frame=makeFrame(ms),v=eqVector(ra,dec);const rotated=A.RotateVector(A.Rotation_EQJ_EQD(frame.time),new A.Vector(...v,frame.time)),eq=A.EquatorFromVector(rotated),h=A.Horizon(frame.time,OBS,eq.ra,eq.dec);
  const ours=starToHorizontal(v,frame.rotation,false);assert.ok(angularDistance(ours.v,horizontalVector(h.azimuth,h.altitude))<.000003);
 }
});
test('local calendar boundaries are fixed UTC+3, dates never escape 1–25 August',()=>{
 assert.equal(new Date(START).toISOString(),'2026-07-31T21:00:00.000Z');assert.equal(new Date(END).toISOString(),'2026-08-25T20:59:59.999Z');
 for(let day=1;day<=25;day++)for(let sec of [0,12345,43200,86399])assert.deepEqual([localParts(fromLocal(day,sec)).day,localParts(fromLocal(day,sec)).secondOfDay],[day,sec]);
 assert.equal(fromLocal(26,0),fromLocal(25,0));assert.equal(fromLocal(0,0),START);
 assert.equal(tickClock(END-1000,4000,4,true).ms,END);assert.equal(tickClock(END-1000,4000,4,true).playing,false);
 assert.equal(tickClock(START,1000,4,true).ms,START+4000);assert.equal(tickClock(START,1000,4,false).ms,START);
 assert.equal(tickClock(fromLocal(12,82800),-20,1,true).ms,fromLocal(12,82800));
});
test('catalog has all 110 unique Messier entries and all 88 constellation stories',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../src/data/messier.json',import.meta.url))).features;
 assert.equal(m.length,110);for(let n=1;n<=110;n++)assert.equal(m.filter(o=>o.id==='M'+n).length,1);
 for(const o of m)assert.ok(o.geometry.coordinates.every(Number.isFinite));
 const c=JSON.parse(fs.readFileSync(new URL('../src/data/constellations.json',import.meta.url))).features;assert.equal(new Set(c.map(c=>c.id)).size,88);for(const con of c)assert.ok(STORIES[con.id]?.every(s=>s.length>30),con.id);
 assert.equal(m.find(o=>o.id==='M40').properties.type,'pos');assert.equal(Object.keys(BODY_INFO).length,9);
});
test('catalog stars are real finite entries and Polaris appears near the observer latitude',()=>{
 const s=JSON.parse(fs.readFileSync(new URL('../src/data/stars.json',import.meta.url)));assert.equal(s.length,41487);assert.ok(s.every(r=>r.slice(0,6).every(Number.isFinite)&&r[3]<=8&&Math.abs(r[2])<=90));
 const polaris=s.find(r=>r[0]===11767),f=makeFrame(fromLocal(12,82800)),p=starToHorizontal(eqVector(polaris[1],polaris[2]),f.rotation,false);assert.ok(Math.abs(p.alt-OBS.latitude)<1);assert.ok(p.az<2||p.az>358);
});
test('five shower model: active dates, peak reference, local visibility and lunar suppression',()=>{
 for(const s of SHOWERS){const at=meteorShowers(s.peak).showers.find(x=>x.id===s.id);assert.equal(at.zhr,s.zhr);assert.equal(meteorShowers(s.end).showers.find(x=>x.id===s.id).zhr,0);assert.equal(meteorShowers(s.start-1).showers.find(x=>x.id===s.id).rate,0);}
 for(let d=1;d<=25;d++)for(const sec of [0,10800,43200,82800]){const ms=fromLocal(d,sec),sun=bodyAt('Sun',ms),moon=bodyAt('Moon',ms),limit=limitingMagnitude(sun.alt,moon),model=meteorShowers(ms,limit,sun.alt);assert.ok(Number.isFinite(model.rate));assert.equal(model.rate,model.showers.reduce((n,s)=>n+s.rate,0));for(const s of model.showers){assert.ok(s.rate>=0&&s.rate<=s.zhr);if(s.alt<0)assert.equal(s.rate,0);}if(sun.alt>=-6)assert.equal(model.rate,0);}
 const ms=fromLocal(13,7200);assert.ok(meteorShowers(ms,4).rate<meteorShowers(ms,6.5).rate);assert.ok(extinction(5)>extinction(60));
 assert.equal(chooseShower([{id:'a',rate:0},{id:'b',rate:5}],()=>.3).id,'b');assert.equal(chooseShower([{rate:0}]),null);
});
test('automatic meteor timing: Poisson count, pause, rate and speed invariance',()=>{
 let seed=76;const random=()=>((seed=(1664525*seed+1013904223)>>>0)+.5)/4294967296;
 const clock=new MeteorClock(random);let count=0;for(let second=0;second<3600*100;second++)count+=clock.advance(1,60);assert.ok(Math.abs(count-6000)<350,`${count} vs 6000 expected`);
 const normal=new MeteorClock(()=>.5),fast=new MeteorClock(()=>.5);let n=0,f=0;for(let sec=0;sec<900;sec++)f+=fast.advance(4,60);for(let sec=0;sec<3600;sec++)n+=normal.advance(1,60);assert.equal(f,n);assert.equal(normal.advance(0,100),0);assert.equal(normal.advance(9,0),0);assert.equal(normal.advance(3600,100),0);
});
test('Moon shortcut finds a genuinely dark time above the horizon within the date range',()=>{
 const initial=fromLocal(12,82800);assert.ok(bodyAt('Moon',initial).phase<.01);assert.ok(bodyAt('Moon',initial).alt<0);
 for(const ms of [START,initial,END]){const target=moonViewingTime(ms);assert.ok(target>=START&&target<=END);const moon=bodyAt('Moon',target);assert.ok(moon.alt>=15&&moon.phase>=.08);assert.ok(bodyAt('Sun',target).alt<=-10);}
});
test('every deep-sky object has a real photograph with credits and a working-source URL scheme',()=>{
 const media=JSON.parse(fs.readFileSync(new URL('../src/data/dso-media.json',import.meta.url))),extra=JSON.parse(fs.readFileSync(new URL('../src/data/caldwell.json',import.meta.url)));
 assert.equal(Object.keys(media).length,146);assert.equal(extra.length,36);assert.equal(new Set(extra.map(o=>o.id)).size,36);
 for(let n=1;n<=110;n++)assert.ok(media['M'+n]);for(const o of extra){assert.ok(Number.isFinite(o.ra)&&o.ra>=0&&o.ra<=360);assert.ok(Number.isFinite(o.dec)&&Math.abs(o.dec)<=90);assert.ok(o.name.every(n=>n.length>0));assert.ok(media[o.id]);}
 for(const [id,m] of Object.entries(media)){for(const field of [m.article,m.articleRu,m.photo.url,m.photo.page,m.photo.licenseUrl,m.survey.url].filter(Boolean)){assert.equal(new URL(field).protocol,'https:',id);assert.ok(!field.includes('seds.org'));}assert.ok(m.photo.credit&&m.photo.license);assert.ok(!/\.svg$/i.test(m.photo.file||''));}
 assert.match(media.M40.photo.file,/M40|Winnecke/i);assert.match(media.M30.photo.file,/M30/i);
});
// Synthetic orbital elements are confined to this unit test. None ship as a sky archive.
test('orbital import rejects wrong dates and selects nearest epoch within 24 h',()=>{
 const base={OBJECT_NAME:'UNIT TEST — SYNTHETIC',NORAD_CAT_ID:25544,EPOCH:'2026-08-12T00:00:00.000000',MEAN_MOTION:15.5,ECCENTRICITY:.0005,INCLINATION:51.6,RA_OF_ASC_NODE:100,ARG_OF_PERICENTER:45,MEAN_ANOMALY:10,BSTAR:.0001,MEAN_MOTION_DOT:.00001,MEAN_MOTION_DDOT:0,EPHEMERIS_TYPE:0,CLASSIFICATION_TYPE:'U',ELEMENT_SET_NO:999,REV_AT_EPOCH:12345};
 const old={...base,EPOCH:'2024-01-01T00:00:00.000000'},newer={...base,EPOCH:'2026-08-13T00:00:00.000000'};
 const parsed=parseOrbits(JSON.stringify([base,newer,old]));assert.equal(parsed.records.length,2);assert.equal(parsed.rejected,1);assert.equal(nearestOrbits(parsed.records,Date.parse('2026-08-13T01:00:00Z')).length,1);assert.equal(nearestOrbits(parsed.records,Date.parse('2026-08-15T00:00:01Z')).length,0);assert.equal(nearestOrbits(parsed.records,Date.parse('2026-08-13T01:00:00Z'))[0].epoch,Date.parse(newer.EPOCH+'Z'));
 assert.throws(()=>parseOrbits(JSON.stringify([old])));assert.throws(()=>parseOrbits('1 25544 invalid\n2 25544 invalid'));assert.throws(()=>parseOrbits(JSON.stringify([{...base,MEAN_MOTION:'garbage'}])));
});
