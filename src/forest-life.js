import {D,DEFAULT,clamp,wrap,horizontalVector} from './astro.js';

// These quiet encounters belong to the illustrated foreground, not the sky
// catalog. Simulation time makes pausing, scrubbing and replaying consistent.
const mod=(n,d)=>((n%d)+d)%d;
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const palette=(night,day,t)=>`rgb(${night.map((n,i)=>Math.round(n+(day[i]-n)*t))})`;
const paths=new Map();
function shape(c,d,color){
 let path=paths.get(d);if(!path){path=new Path2D(d);paths.set(d,path);}
 c.fillStyle=color;c.fill(path);
}
function stroke(c,points,width,color){
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();
 points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
}

const ROUTES={
 bear:{period:1380,duration:38,offset:420,sector:0,depth:5.3,height:3.1},
 dogs:{period:142,duration:116,offset:19,sector:2,depth:4.1,height:1.95},
 horses:{period:260,duration:260,offset:67,sector:5,depth:2.5,height:3.65},
};
// Fixed forest clearings around the whole horizon, excluding the BTA building.
// A new visit advances to another clearing; turning the camera never moves it.
const GROVES=[[10,28],[101,121],[146,165],[193,214],[239,259],[287,307],[335,355]];

export function encounterAt(kind,ms){
 const r=ROUTES[kind],seconds=(ms-DEFAULT)/1000,t=mod(seconds+r.offset,r.period);
 if(t>=r.duration)return null;
 const visit=Math.floor((seconds+r.offset)/r.period),sector=mod(visit*3+r.sector,GROVES.length);
 const grove=GROVES[sector],outward=mod(visit,2)===0?1:-1;
 const [from,to]=outward===1?grove:[...grove].reverse();
 const p=t/r.duration,walking=p<.43||p>.57;
 const travel=p<.43?p/.43:p>.57?(1-p)/.43:1;
 // A short pause at the clearing, then a return into the same forest edge.
 const direction=outward*(p<.53?1:-1);
 const distance=p<.43?travel:p>.57?2-travel:1;
 return {...r,sector,visit,outward,from,to,az:wrap(from+(to-from)*travel),direction,walking,
  depth:1.3+(r.depth-1.3)*travel,height:r.height*(.76+.24*travel),
  stride:distance*Math.abs(to-from)*2.7,seconds,
  alpha:smooth(t/4)*smooth((r.duration-t)/4)};
}

// Overlapping visits: while one pair returns to the trees, another pair is
// already grazing in a different clearing. No global disappearance or teleport.
export function horseHerdsAt(ms){
 return [encounterAt('horses',ms),encounterAt('horses',ms+130000)]
  .filter(a=>a&&a.alpha>.001);
}

export function stargazerOpacity(sunAltitude){
 // The observer is absent through daylight and civil/nautical twilight.
 return smooth((-sunAltitude-12)/6);
}

export class ObserverDirector{
 constructor(){this.reset();}
 reset(){this.started=null;this.lastMs=null;}
 at(ms,sunAltitude){
  const night=stargazerOpacity(sunAltitude);
  if(night<=0){this.reset();return null;}
  // Starting a night, reloading or changing the date starts with an arrival.
  // Small normal clock steps (including pause and ×16) keep the scene continuous.
  if(this.started===null||ms<this.lastMs||ms-this.lastMs>10000)this.started=ms;
  this.lastMs=ms;
  const age=mod((ms-this.started)/1000,300);
  if(age>=250)return null;
  const stage=age<18?'arrive':age<30?'setup':age<220?'observe':age<232?'pack':'leave';
  const progress=stage==='arrive'?age/18:stage==='setup'?(age-18)/12:stage==='pack'?(age-220)/12:stage==='leave'?(age-232)/18:1;
  const approach=stage==='arrive'?smooth(progress):stage==='leave'?1-smooth(progress):1;
  // Long, still looks separated by a few seconds of gently re-aiming the tube.
  const targets=[-.5,-.73,-.39,-.63,-.48],look=Math.max(0,age-30)/38;
  const i=Math.min(targets.length-1,Math.floor(look));
  const aim=stage==='observe'?targets[i]+((targets[i+1]??targets[i])-targets[i])*smooth((look-i-.84)/.16):stage==='pack'?targets.at(-1):-.5;
  return {stage,progress,age,aim,az:43.8+6.8*approach,depth:1.1+.8*approach,
   height:2.35+.85*approach,direction:stage==='leave'?-1:1,
   alpha:night*smooth(age/2)*smooth((250-age)/2)};
 }
}

// Four feet use alternating phases. Planted feet remain at ground level;
// only the returning foot lifts, instead of bobbing the whole animal in air.
function leg(c,x,hip,length,phase,walking,width,color,hoof=false){
 const swing=walking?Math.sin(phase)*7:0,lift=walking?Math.max(0,Math.cos(phase))*5:0;
 const foot=x+swing,knee=x-swing*.32;
 stroke(c,[[x,hip],[knee,hip+length*.53],[foot,-lift-2]],width,color);
 stroke(c,[[foot-2,-lift-1],[foot+3,-lift-1]],hoof?width+1:width+2,color);
}

function bear(c,a,col){
 const ph=a.stride,bob=a.walking?Math.sin(ph*2)*.8:0;
 leg(c,-39,-43,43,ph+Math.PI,a.walking,12,col.far);
 leg(c,40,-42,42,ph+.7,a.walking,12,col.far);
 c.save();c.translate(0,bob);
 shape(c,'M-61-37 C-73-47-70-70-52-79 C-39-91-23-93-5-86 C11-96 32-93 41-79 L52-72 C65-77 70-71 74-64 L88-57 Q95-52 91-46 L76-41 Q65-35 52-42 C43-33 27-29 9-30 L-29-28 Q-48-29-61-37Z',col.fur);
 shape(c,'M47-72 Q44-89 55-87 Q65-85 60-73 M66-70 Q64-81 72-78 Q80-75 75-67',col.fur);
 shape(c,'M-46-80 Q-25-94-6-85 Q15-95 31-85 Q-6-90-18-83 Q-33-88-46-80Z',col.edge);
 shape(c,'M83-55 Q95-57 94-50 L88-48Z',col.dark);
 c.restore();
 leg(c,-45,-41+bob,41,ph,a.walking,14,col.fur);
 leg(c,36,-40+bob,40,ph+Math.PI+.7,a.walking,13,col.fur);
}

function horse(c,a,col,variant){
 const ph=a.stride+variant*1.5,bob=a.walking?Math.sin(ph*2)*.6:0;
 leg(c,-29,-47,47,ph+Math.PI,a.walking,4,col.far,true);
 leg(c,32,-46,46,ph+.55,a.walking,4,col.far,true);
 stroke(c,[[-47,-58],[-58,-46],[-62+Math.sin(a.seconds*1.1+variant)*3,-23]],7,col.dark);
 c.save();c.translate(0,bob);
 shape(c,'M-47-43 Q-59-62-43-71 Q-29-76-7-68 Q12-65 27-75 L38-95 L47-100 L52-110 L56-98 L62-109 L63-97 Q72-91 72-83 L81-69 Q82-63 75-61 L65-65 L57-80 L50-81 Q48-58 39-46 Q28-37 11-41 L-22-38 Q-39-34-47-43Z',col.fur);
 shape(c,'M25-73 L37-96 Q44-105 51-101 L48-91 Q39-85 36-67Z',col.dark);
 shape(c,'M-40-70 Q-25-74-7-67 Q8-64 19-68 Q4-60-12-65 Q-27-70-40-70Z',col.edge);
 c.restore();
 leg(c,-32,-43+bob,43,ph,a.walking,4.8,col.fur,true);
 leg(c,31,-46+bob,46,ph+Math.PI+.55,a.walking,4.6,col.fur,true);
}

function dog(c,a,col,husky){
 const ph=a.stride+(husky?1.7:0),bob=a.walking?Math.sin(ph*2)*.9:0;
 leg(c,-29,-34,34,ph+Math.PI,a.walking,5.5,col.far);
 leg(c,31,-33,33,ph+.4,a.walking,5,col.far);
 c.save();c.translate(0,bob);
 if(husky){
  // A plumed curled tail, upright ears and pale mask distinguish the husky.
  stroke(c,[[-41,-49],[-61,-61],[-68,-75],[-60,-85],[-48,-81],[-48,-72]],10,col.fur);
  shape(c,'M-47-37 Q-56-52-40-61 Q-22-67 0-61 Q18-58 29-70 L37-83 L38-101 L50-89 L57-98 L61-84 Q67-81 68-72 L85-63 Q90-57 82-53 L63-51 Q56-38 41-33 Q30-26 15-29 L-23-26 Q-39-25-47-37Z',col.fur);
  shape(c,'M42-81 L51-71 L59-81 L60-66 L77-59 L61-57 Q53-38 39-33 L36-48 L45-66Z',col.light);
  shape(c,'M-36-32 Q-11-36 11-32 L17-27 L-24-25Z',col.light);
 }else{
  stroke(c,[[-43,-47],[-60,-49],[-74,-61+Math.sin(a.seconds*1.6)*3]],5,col.fur);
  shape(c,'M-47-34 Q-55-53-38-61 Q-17-66 5-60 Q22-58 33-73 Q39-85 52-81 Q64-79 67-68 L85-63 Q91-58 84-53 L64-50 Q60-36 43-31 Q29-24 12-28 L-23-25 Q-40-24-47-34Z',col.fur);
  shape(c,'M42-81 Q28-85 30-71 L36-57 Q45-58 48-73Z',col.dark);
  shape(c,'M48-47 L53-39 L43-31 L35-29Z',col.light);
 }
 shape(c,'M81-64 L90-60 L87-54 L82-55Z',col.dark);
 c.restore();
 leg(c,-32,-33+bob,33,ph,a.walking,6,col.fur);
 leg(c,32,-33+bob,33,ph+Math.PI+.4,a.walking,5.5,col.fur);
 if(husky){
  // Small socks stay attached to the same near feet throughout the walk.
  for(const phase of [ph,ph+Math.PI+.4]){
   const x=(phase===ph?-32:32)+(a.walking?Math.sin(phase)*7:0);
   const lift=a.walking?Math.max(0,Math.cos(phase))*5:0;
   stroke(c,[[x,-lift-6],[x,-lift-1]],4.5,col.light);
  }
 }
}

function observer(c,col,assembly=1,aim=-.5){
 // A small refractor aimed up and right. The eye, eyepiece and tube share
 // one optical axis; the bent figure is actually looking into the telescope.
 const spread=.12+.88*smooth(assembly/.65),raise=smooth((assembly-.3)/.7);
 stroke(c,[[28,-52],[28-16*spread,0]],3,col.fur);
 stroke(c,[[28,-52],[28+20*spread,0]],3,col.fur);
 stroke(c,[[28,-52],[28+3*spread,-1]],2,col.far);
 stroke(c,[[28-11*spread,-19],[28+13*spread,-19]],1.8,col.far);
 stroke(c,[[28,-51],[30,-52-12*raise]],5,col.fur);
 const angle=aim*raise;
 c.save();c.translate(28,-57-12*raise);c.rotate(angle);
 shape(c,'M-22-5 L34-5 L34 5 L-22 5Z',col.fur);
 shape(c,'M31-7 L38-7 L38 7 L31 7Z',col.edge);
 shape(c,'M-28-3 L-21-3 L-21 3 L-28 3Z',col.edge);
 shape(c,'M-4-11 L14-11 L14-8 L-4-8Z',col.far);
 c.restore();
 // The torso rises from the tripod as the tube is tilted toward the sky.
 const crouch=9*(1-raise),eyeX=28-29*Math.cos(angle),eyeY=-57-12*raise-29*Math.sin(angle);
 const headX=eyeX-6,headY=eyeY-2;
 c.save();c.translate(0,crouch);
 shape(c,'M-23-45 Q-25-58-16-70 Q-12-77-4-72 L0-62 Q-8-49-10-39 L-13-25 L-18-24Z',col.fur);
 stroke(c,[[-15,-63],[headX-2,headY-crouch+3]],8,col.fur);
 c.fillStyle=col.fur;c.beginPath();c.ellipse(headX,headY-crouch,6.5,7,.25,0,Math.PI*2);c.fill();
 stroke(c,[[-14,-61],[1,-44],[16,-35-17*raise]],4.5,col.fur);
 stroke(c,[[-23,-49],[-20,-62],[-15,-68]],1.2,col.edge);c.restore();
 stroke(c,[[-15,-34+crouch],[-18,-18],[-23,-2]],6,col.fur);
 stroke(c,[[-14,-33+crouch],[-6,-20],[1,-2]],6,col.fur);
 stroke(c,[[-24,-1],[-17,-1]],5,col.fur);
 stroke(c,[[-1,-1],[6,-1]],5,col.fur);
}

function walkingObserver(c,a,col){
 const stride=a.age*4.2,swing=Math.sin(stride)*9;
 stroke(c,[[-5,-36],[-9-swing*.4,-19],[-7+swing,-2]],5.5,col.far);
 stroke(c,[[-4,-36],[2+swing*.4,-19],[3-swing,-2]],6,col.fur);
 const bob=Math.cos(stride*2)*.8;c.save();c.translate(0,bob);
 shape(c,'M-14-37 L-15-65 Q-13-75-4-75 Q5-74 8-63 L8-37Z',col.fur);
 c.fillStyle=col.fur;c.beginPath();c.ellipse(-1,-85,6.7,8,.13,0,Math.PI*2);c.fill();
 stroke(c,[[-2,-68],[13,-53],[25,-57]],4.5,col.fur);
 stroke(c,[[24,-62],[28,-12]],3,col.fur);
 stroke(c,[[24,-62],[22,-12]],2,col.far);
 c.save();c.translate(29,-65);c.rotate(-.72);
 shape(c,'M-22-4 L21-4 L21 4 L-22 4Z',col.fur);
 shape(c,'M18-5 L24-5 L24 5 L18 5Z',col.edge);c.restore();c.restore();
}

function actorFrame(renderer,az,alt,height,dir){
 const p=renderer.project(horizontalVector(az,alt));if(!p||p.z<.18)return null;
 const top=renderer.project(horizontalVector(az,alt+height),true);
 const right=renderer.project(horizontalVector(az+height/Math.cos(alt*D),alt),true);
 if(!top||!right)return null;
 // A local tangent frame anchors feet to the terrain and respects pan/zoom.
 return {p,a:(right.x-p.x)/100*dir,b:(right.y-p.y)/100*dir,
  c:(p.x-top.x)/100,d:(p.y-top.y)/100};
}

function drawActor(renderer,actor,terrain,day,paint){
 const base=terrain(actor.az)-actor.depth;
 const frame=actorFrame(renderer,actor.az,base,actor.height,actor.direction);
 if(!frame)return;
 const c=renderer.ctx,{p,a,b,c:cx,d}=frame;
 if(p.y<-120||p.y>renderer.h+120||Math.hypot(cx,d)<.05)return;
 c.save();c.globalAlpha=actor.alpha;
 c.transform(a,b,cx,d,p.x,p.y);
 // Subtle ground contact, without a spotlight or a luminous animal outline.
 c.fillStyle=palette([2,7,10],[12,29,28],day);c.beginPath();c.ellipse(0,1,68,4,0,0,Math.PI*2);c.fill();
 const col={
  fur:palette([26,36,41],[46,53,48],day),
  far:palette([17,26,31],[32,44,40],day),
  dark:palette([12,22,27],[27,38,35],day),
  edge:palette([43,53,57],[73,79,65],day),
  light:palette([53,65,71],[121,131,127],day),
 };
 paint(c,actor,col);c.restore();
}

export function drawForestLife(renderer,terrain,day){
 const ms=renderer.state.ms;
 const bearVisit=encounterAt('bear',ms),dogs=encounterAt('dogs',ms);
 // Farther pair first; the two dogs share a visit but have different gaits.
 for(const horseGroup of horseHerdsAt(ms)){
  drawActor(renderer,{...horseGroup,az:wrap(horseGroup.az-4.8*horseGroup.outward),height:horseGroup.height*.89,depth:Math.max(1.1,horseGroup.depth-.85)},terrain,day,(c,a,col)=>horse(c,a,col,1));
  drawActor(renderer,horseGroup,terrain,day,(c,a,col)=>horse(c,a,col,0));
 }
 if(bearVisit)drawActor(renderer,bearVisit,terrain,day,bear);
 if(dogs){
  drawActor(renderer,dogs,terrain,day,(c,a,col)=>dog(c,a,col,false));
  drawActor(renderer,{...dogs,az:wrap(dogs.az-3.1*dogs.outward),height:dogs.height*1.15,depth:dogs.depth+.6},terrain,day,(c,a,col)=>dog(c,a,col,true));
 }
 const person=renderer.observerDirector.at(ms,renderer.sun.alt);
 if(person)drawActor(renderer,person,terrain,day,(c,a,col)=>{
  if(a.stage==='arrive'||a.stage==='leave')walkingObserver(c,a,col);
  else observer(c,col,a.stage==='setup'?a.progress:a.stage==='pack'?1-a.progress:1,a.aim);
 });
}
