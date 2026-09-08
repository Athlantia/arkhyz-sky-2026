import {A,D,clamp,makeFrame,eqVector,starToHorizontal} from './astro.js';
const day=864e5;
const at=s=>Date.parse(`2026-${s}T00:00:00Z`);
const solarPeak=lon=>A.SearchSunLongitude(lon,new Date('2026-07-01T00:00:00Z'),65).date.getTime();
// IMO 2026 calendar. Activity envelopes and linear radiant drift are illustrative
// approximations, not a reconstruction of individual meteors or a measured 2026 curve.
// KCG uses the radiant in the detailed shower section (p.12); the summary table
// lists a different point in this broad, multi-radiant complex.
export const SHOWERS=[
 {id:'PER',name:['Персеиды','Perseids'],start:at('07-17'),end:at('08-25'),peak:Date.parse('2026-08-13T03:00:00Z'),peakLabel:['12–13 августа','12–13 August'],zhr:100,r:2.2,speed:59,ra:48,dec:58,drift:[1.25,.12],slope:[.12,.20]},
 {id:'SDA',name:['Южные дельта-Аквариды','Southern delta Aquariids'],start:at('07-12'),end:at('08-24'),peak:solarPeak(128),peakLabel:['31 июля','31 July'],zhr:25,r:2.5,speed:41,ra:340,dec:-16,drift:[.9,.25],slope:[.065,.06]},
 {id:'CAP',name:['Альфа-Каприкорниды','Alpha Capricornids'],start:at('07-03'),end:at('08-16'),peak:solarPeak(128),peakLabel:['31 июля','31 July'],zhr:5,r:2.5,speed:23,ra:307,dec:-10,drift:[1,.25],slope:[.055,.07]},
 {id:'ERI',name:['Эта-Эриданиды','Eta Eridanids'],start:at('07-31'),end:at('08-20'),peak:solarPeak(135),peakLabel:['7 августа','7 August'],zhr:3,r:3,speed:64,ra:41,dec:-11,drift:[.9,.2],slope:[.12,.075]},
 {id:'KCG',name:['Каппа-Цигниды','Kappa Cygnids'],start:at('08-03'),end:at('08-29'),peak:solarPeak(144),peakLabel:['17 августа','17 August'],zhr:3,r:3,speed:23,ra:288,dec:55,drift:[.2,.05],slope:[.07,.08]}
];
export function meteorShowers(ms,limit=6.5,sunAlt=-90){
 const frame=makeFrame(ms);
 const showers=SHOWERS.map(s=>{const days=(ms-s.peak)/day,active=ms>=s.start&&ms<s.end;
  const zhr=active?s.zhr*10**(-Math.abs(days)*s.slope[days<0?0:1]):0;
  const ra=s.ra+s.drift[0]*days,dec=s.dec+s.drift[1]*days,h=starToHorizontal(eqVector(ra,dec),frame.rotation);
  const rate=sunAlt>=-6?0:zhr*Math.max(0,Math.sin(h.alt*D))*s.r**Math.min(0,limit-6.5);
  return {...s,...h,ra,dec,zhr,active,rate};
 });
 return {showers,rate:showers.reduce((sum,s)=>sum+s.rate,0),zhr:showers.reduce((sum,s)=>sum+s.zhr,0)};
}
export function chooseShower(showers,random=Math.random){
 const total=showers.reduce((sum,s)=>sum+s.rate,0);if(total<=0)return null;
 let p=random()*total;for(const s of showers){p-=s.rate;if(p<0)return s;}return showers.findLast(s=>s.rate>0);
}
// The population index sets relative counts per magnitude bin. The palette and
// train eligibility below are conservative illustration choices, NOT measured
// green-Perseid percentages. NASA: most visually seen meteors are white/colorless.
export function meteorAppearance(shower,limit=6.5,random=Math.random){
 const faint=clamp(limit,0,6.5),bright=-4,r=shower.r;
 const u=clamp(random(),0,1);
 const magnitude=faint+Math.log(1-u*(1-r**(bright-faint)))/Math.log(r);
 const colorDraw=random(),trainDraw=random();
 const tint=magnitude>2||colorDraw<.45?'white':colorDraw<.7?'green':colorDraw<.88?'warm':'blue';
 const colors={white:'224,229,231',green:'161,202,181',warm:'221,196,162',blue:'176,198,227'};
 const power=clamp((faint-magnitude)/5,0,1);
 return {magnitude,tint,rgb:colors[tint],opacity:.32+.63*power,
  width:.65+1.05*power,wake:.08+.13*power,
  trainMs:magnitude<1&&trainDraw<(shower.speed>40?.55:.15)?1200+random()*1200:0};
}
// Integrated Poisson hazard: rate changes, time speeds and pauses are handled
// without starting a new timer every frame. Returning to a hidden tab never bursts.
export class MeteorClock{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.hazard=0;this.threshold=-Math.log(clamp(1-this.random(),1e-12,1-1e-12));}
 advance(seconds,rate){if(seconds<=0||seconds>10||rate<=0)return 0;this.hazard+=seconds*rate/3600;let count=0;while(this.hazard>=this.threshold&&count<8){this.hazard-=this.threshold;this.threshold=-Math.log(clamp(1-this.random(),1e-12,1-1e-12));count++;}return count;}
}
