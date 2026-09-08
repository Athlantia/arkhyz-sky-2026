import * as A from 'astronomy-engine';
export {A};
export const D=Math.PI/180,TAU=2*Math.PI;
export const SITE=Object.freeze({latitude:43+39/60+12/3600,longitude:41+26/60+30/3600,height:2070});
export const OBS=new A.Observer(SITE.latitude,SITE.longitude,SITE.height);
export const START=Date.parse('2026-08-01T00:00:00+03:00');
export const END=Date.parse('2026-08-26T00:00:00+03:00')-1;
export const DEFAULT=Date.parse('2026-08-12T23:00:00+03:00');
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const wrap=(x)=>((x%360)+360)%360;
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function unit(v){const n=Math.hypot(...v);return v.map(x=>x/n);}
export function eqVector(ra,dec){let c=Math.cos(dec*D);return [c*Math.cos(ra*D),c*Math.sin(ra*D),Math.sin(dec*D)];}
export function horizontalVector(az,alt){const c=Math.cos(alt*D);return[c*Math.sin(az*D),Math.sin(alt*D),c*Math.cos(az*D)];}
export function vectorHorizontal(v){return {az:wrap(Math.atan2(v[0],v[2])/D),alt:Math.asin(clamp(v[1],-1,1))/D};}
// Astronomy Engine matrices use column-major indexing.
export function rotate(m,v){return [0,1,2].map(i=>m[0][i]*v[0]+m[1][i]*v[1]+m[2][i]*v[2]);}
export function starToHorizontal(v,m,refraction=true){
 const q=rotate(m,v); // HOR: north, west, up.
 const raw=Math.asin(clamp(q[2],-1,1))/D;
 const alt=raw+(refraction?A.Refraction('normal',raw)*0.78:0); // standard pressure scaled to 2070 m
 const az=wrap(Math.atan2(-q[1],q[0])/D);
 return {az,alt,v:horizontalVector(az,alt)};
}
export function makeFrame(ms){
 const date=new Date(ms),time=A.MakeTime(date);
 return {date,time,rotation:A.Rotation_EQJ_HOR(time,OBS).rot};
}
export const BODY_KEYS=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];
export function bodyAt(body,ms,refraction=true){
 const date=new Date(ms),eq=A.Equator(body,date,OBS,true,true);
 const h=A.Horizon(date,OBS,eq.ra,eq.dec);
 const alt=h.altitude+(refraction?A.Refraction('normal',h.altitude)*0.78:0);
 const illum=A.Illumination(body,date);
 return {id:body,kind:'body',ra:eq.ra*15,dec:eq.dec,az:h.azimuth,alt,v:horizontalVector(h.azimuth,alt),dist:eq.dist,mag:illum.mag,phase:illum.phase_fraction,geo:illum.geo_dist};
}
export function bodiesAt(ms){return BODY_KEYS.map(b=>bodyAt(b,ms));}
export function limitingMagnitude(sunAlt,moon){
 const dark=clamp((-sunAlt-4)/14,0,1);
 const moonLoss=moon?2.4*moon.phase*Math.max(0,Math.sin(moon.alt*D)):0;
 return -3+9.5*dark-moonLoss;
}
export function extinction(alt){
 if(alt<=0)return 99;
 const air=1/(Math.sin(alt*D)+0.50572*Math.pow(alt+6.07995,-1.6364));
 return 0.16*(air-1);
}
export function ecliptic(ms){
 const date=new Date(ms),rot=A.Rotation_ECT_EQD(date),points=[];
 for(let lon=0;lon<=360;lon+=2){
  const v=A.RotateVector(rot,new A.Vector(Math.cos(lon*D),Math.sin(lon*D),0,date));
  const eq=A.EquatorFromVector(v),h=A.Horizon(date,OBS,eq.ra,eq.dec);
  points.push(horizontalVector(h.azimuth,h.altitude+A.Refraction('normal',h.altitude)*0.78));
 }return points;
}
export function localParts(ms){const d=new Date(ms+3*36e5);return {day:d.getUTCDate(),hours:d.getUTCHours(),minutes:d.getUTCMinutes(),seconds:d.getUTCSeconds(),secondOfDay:d.getUTCHours()*3600+d.getUTCMinutes()*60+d.getUTCSeconds()};}
export function fromLocal(day,seconds){return clamp(Date.UTC(2026,7,clamp(day,1,25),0,0,clamp(seconds,0,86399))-3*36e5,START,END);}
export function tickClock(ms,elapsed,speed,playing){const next=ms+(playing?Math.max(0,elapsed)*speed:0);return {ms:clamp(next,START,END),playing:playing&&next<END};}
export function angularDistance(a,b){return Math.acos(clamp(dot(a,b),-1,1))/D;}

// Search only the requested observing window. This never moves a below-horizon
// Moon into the sky: the UI explicitly offers to change the date and time.
export function moonViewingTime(ms){
 const step=15*60e3,origin=Math.round(ms/step)*step;
 for(let delta=0;delta<=END-START;delta+=step){
  for(const candidate of delta?[origin+delta,origin-delta]:[origin]){
   if(candidate<START||candidate>END)continue;
   const moon=bodyAt('Moon',candidate),sun=bodyAt('Sun',candidate);
   if(moon.alt>=15&&moon.phase>=.08&&sun.alt<=-10)return candidate;
  }
 }
 return null;
}
