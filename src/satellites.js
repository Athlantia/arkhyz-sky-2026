import * as S from 'satellite.js';
import {A,D,OBS,SITE,START,END,wrap,horizontalVector} from './astro.js';
export const MAX_AGE_HOURS=24;
function checksum(line){return line.length>=69&&[...line.slice(0,68)].reduce((s,c)=>s+(c==='-'?1:/\d/.test(c)?+c:0),0)%10===+line[68];}
function validRecord(s){return [s.inclo,s.nodeo,s.ecco,s.argpo,s.mo,s.no,s.bstar,s.jdsatepoch].every(Number.isFinite)&&s.ecco>=0&&s.ecco<1&&s.no>0&&s.inclo>=0&&s.inclo<=Math.PI;}
export function parseOrbits(text){
 if(text.length>10e6)throw new Error('tooLarge');
 const records=[];let rejected=0;
 const append=(satrec,name)=>{const epoch=(satrec.jdsatepoch-2440587.5)*864e5;if(!validRecord(satrec)||epoch<START-864e5||epoch>END+864e5){rejected++;return;}records.push({satrec,name:String(name||`NORAD ${satrec.satnum}`).slice(0,90),epoch,id:String(satrec.satnum)});};
 if(text.trim().startsWith('[')||text.trim().startsWith('{')){
  const parsed=JSON.parse(text),rows=Array.isArray(parsed)?parsed:[parsed];
  for(const j of rows){try{
   const required=['EPOCH','NORAD_CAT_ID','MEAN_MOTION','ECCENTRICITY','INCLINATION','RA_OF_ASC_NODE','ARG_OF_PERICENTER','MEAN_ANOMALY','BSTAR','MEAN_MOTION_DOT','MEAN_MOTION_DDOT'];
   if(required.some(k=>j[k]===undefined)||!Number.isFinite(Date.parse(j.EPOCH+'Z'.repeat(!/[zZ]|[+-]\d\d:\d\d$/.test(j.EPOCH))))){rejected++;continue;}
   append(S.json2satrec(j),j.OBJECT_NAME);
  }catch{rejected++;}}
 }else{
  const lines=text.split(/\r?\n/).map(s=>s.trimEnd()).filter(s=>s.trim());let name='';
  for(let i=0;i<lines.length;i++){
   if(lines[i].startsWith('1 ')){
    const a=lines[i],b=lines[++i]||'';
    if(!b.startsWith('2 ')||a.slice(2,7)!==b.slice(2,7)||!checksum(a)||!checksum(b)){rejected++;continue;}
    try{append(S.twoline2satrec(a,b),name);}catch{rejected++;}name='';
   }else if(!lines[i].startsWith('2 '))name=lines[i].replace(/^0 /,'');
  }
 }
 if(!records.length)throw new Error('noValidOrbits');
 return {records,rejected};
}
export function nearestOrbits(records,ms){
 const best=new Map();for(const r of records){const age=Math.abs(ms-r.epoch);if(age>MAX_AGE_HOURS*36e5)continue;const old=best.get(r.id);if(!old||age<Math.abs(ms-old.epoch))best.set(r.id,r);}
 return [...best.values()];
}
export function positions(records,ms,sunAlt){
 const date=new Date(ms),gmst=S.gstime(date),observer={longitude:SITE.longitude*D,latitude:SITE.latitude*D,height:SITE.height/1000};
 const eqd=A.RotateVector(A.Rotation_EQJ_EQD(date),A.GeoVector('Sun',date,true));
 // TEME differs from true equator/equinox by the equation of equinoxes; shadow
 // precision here is deliberately limited to a cylindrical Earth-shadow model.
 const norm=Math.hypot(eqd.x,eqd.y,eqd.z),sun=[eqd.x/norm,eqd.y/norm,eqd.z/norm];
 const out=[];
 for(const r of nearestOrbits(records,ms)){
  const prop=S.propagate(r.satrec,date),p=prop?.position;if(!p||![p.x,p.y,p.z].every(Number.isFinite))continue;
  const along=p.x*sun[0]+p.y*sun[1]+p.z*sun[2];
  const radial=Math.sqrt(Math.max(0,p.x*p.x+p.y*p.y+p.z*p.z-along*along));
  const lit=along>0||radial>6378.137;
  const ecf=S.eciToEcf(p,gmst),look=S.ecfToLookAngles(observer,ecf);
  const raw=look.elevation/D,alt=raw+A.Refraction('normal',raw)*0.78,az=wrap(look.azimuth/D);
  if(alt>0&&lit&&sunAlt<-6)out.push({id:r.id,name:r.name,kind:'satellite',az,alt,v:horizontalVector(az,alt),range:look.rangeSat,age:Math.abs(ms-r.epoch)/36e5,epoch:r.epoch});
 }
 return out;
}
