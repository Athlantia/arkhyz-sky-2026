import {A,D,clamp,wrap,dot,unit,eqVector,horizontalVector,vectorHorizontal,starToHorizontal,makeFrame,bodiesAt,limitingMagnitude,extinction,ecliptic} from './astro.js';
import starsData from './data/stars.json';
import nameData from './data/names.json';
import messierData from './data/messier.json';
import caldwellData from './data/caldwell.json';
import mediaData from './data/dso-media.json';
import constData from './data/constellations.json';
import lineData from './data/constellations.lines.json';
import {pick,BODY_INFO,DSO_NAMES} from './content.js';
import {positions,nearestOrbits} from './satellites.js';
import {meteorShowers,chooseShower,MeteorClock,meteorAppearance} from './meteors.js';
import {drawForestLife,ObserverDirector} from './forest-life.js';
import {MilkyWay} from './milky-way.js';
import {atlasBlend,zoomGain,starAppearance,figureAnchors} from './sky-style.js';

const nameFallback={11767:['Полярная','Polaris'],91262:['Вега','Vega'],102098:['Денеб','Deneb'],97649:['Альтаир','Altair'],32349:['Сириус','Sirius'],69673:['Арктур','Arcturus'],24608:['Капелла','Capella'],24436:['Ригель','Rigel'],27989:['Бетельгейзе','Betelgeuse'],80763:['Антарес','Antares'],21421:['Альдебаран','Aldebaran'],65474:['Спика','Spica'],113368:['Фомальгаут','Fomalhaut'],37826:['Поллукс','Pollux'],36850:['Кастор','Castor'],49669:['Регул','Regulus']};
export const stars=starsData.map(s=>({kind:'star',id:String(s[0]),ra:s[1],dec:s[2],mag:s[3],bv:s[4],dist:s[5],spectral:s[6],con:s[7],proper:s[8],absmag:s[9],eq:eqVector(s[1],s[2]),name: nameFallback[s[0]]||[nameData[s[0]]?.ru||nameData[s[0]]?.name||s[8]||`HIP ${s[0]}`,nameData[s[0]]?.en||nameData[s[0]]?.name||s[8]||`HIP ${s[0]}`]}));
export const messier=messierData.features.map(f=>({kind:'messier',catalog:'Messier',id:f.id,ra:f.geometry.coordinates[0],dec:f.geometry.coordinates[1],eq:eqVector(...f.geometry.coordinates),...f.properties,name:DSO_NAMES[f.id]||[f.id,f.id],media:mediaData[f.id]}));
export const caldwell=caldwellData.map(o=>({...o,kind:'messier',eq:eqVector(o.ra,o.dec),media:mediaData[o.id]}));
export const deepSky=[...messier,...caldwell];
const labelAnchors=figureAnchors(constData.features,lineData.features);
export const constellations=constData.features.map((f,i)=>({kind:'constellation',id:f.id,ra:f.geometry.coordinates[0],dec:f.geometry.coordinates[1],eq:labelAnchors[i],name:[f.properties.ru,f.properties.en],latin:f.properties.name}));
const lineStars=lineData.features.map(f=>({id:f.id,lines:f.geometry.coordinates.map(line=>line.map(p=>eqVector(...p)))}));
export function terrainAlt(az){const a=az*D;return 2.8+2.6*Math.sin(a*2+1.2)**2+2*Math.sin(a*3-1)**4+1.2*Math.sin(a*7+0.4)**2;}
const rnd=x=>{const a=Math.sin(x*127.1+311.7)*43758.5453;return a-Math.floor(a);};
function color(bv){return bv<0?'184,208,255':bv<0.4?'209,225,255':bv<0.8?'245,240,220':bv<1.4?'255,214,170':'255,179,136';}
function blend(a,b,t){return a.map((x,i)=>Math.round(x+(b[i]-x)*t));}
export class SkyRenderer{
 constructor(canvas,state,onUpdate){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.state=state;this.onUpdate=onUpdate;this.hits=[];this.meteors=[];this.orbits=[];this.lastEpoch=0;this.lastMs=state.ms;
  this.meteorClock=new MeteorClock();this.meteorCount=0;this.lastMeteor=null;
  this.observerDirector=new ObserverDirector();
  this.milkyWay=new MilkyWay();
  this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
 basis(){let {az,alt,zoom}=this.state.camera;az*=D;alt*=D;this.forward=[Math.sin(az)*Math.cos(alt),Math.sin(alt),Math.cos(az)*Math.cos(alt)];this.right=[Math.cos(az),0,-Math.sin(az)];this.up=[-Math.sin(az)*Math.sin(alt),Math.cos(alt),-Math.cos(az)*Math.sin(alt)];this.f=Math.max(this.w/(2*Math.tan(52*D)),this.h/(2*Math.tan(45*D)))*zoom;this.cx=this.w/2;this.cy=this.h*.44;}
 project(v,wide=false){const z=dot(v,this.forward);if(z<=.02)return null;const x=this.cx+this.f*dot(v,this.right)/z,y=this.cy-this.f*dot(v,this.up)/z;if(!wide&&(x<-80||x>this.w+80||y<-80||y>this.h+80))return null;return{x,y,z};}
 unproject(x,y){this.basis();return unit(this.forward.map((v,i)=>v+(x-this.cx)/this.f*this.right[i]-(y-this.cy)/this.f*this.up[i]));}
 updateEphemeris(){
  const ms=this.state.ms;this.frame=makeFrame(ms);this.bodies=bodiesAt(ms);this.sun=this.bodies[0];this.moon=this.bodies[1];this.limit=limitingMagnitude(this.sun.alt,this.moon);this.shower=meteorShowers(ms,this.limit,this.sun.alt);this.ecl=ecliptic(ms);
  this.starPositions=stars.map(s=>({...s,...starToHorizontal(s.eq,this.frame.rotation)}));
  this.dsoPositions=deepSky.map(s=>({...s,...starToHorizontal(s.eq,this.frame.rotation)}));
  this.conPositions=constellations.map(s=>({...s,...starToHorizontal(s.eq,this.frame.rotation)}));
  this.constLines=lineStars.map(c=>({id:c.id,lines:c.lines.map(line=>line.map(eq=>starToHorizontal(eq,this.frame.rotation).v))}));
  this.lastEpoch=ms;this.lastZoom=this.state.camera.zoom;
  this.onUpdate?.(this);
 }
 render(){
  this.basis();let elapsed=Math.max(0,(this.state.ms-this.lastMs)/1000);if(Math.abs(this.state.ms-this.lastMs)>10000)this.meteors=[];this.lastMs=this.state.ms;
  if(!this.frame||Math.abs(this.state.ms-this.lastEpoch)>1000)this.updateEphemeris();
  this.satPositions=this.state.layers.satellites?positions(this.orbits,this.state.ms,this.sun.alt):[];
  const c=this.ctx,w=this.w,h=this.h;c.globalAlpha=1;this.hits=[];
  const day=clamp((this.sun.alt+9)/18,0,1),night=clamp((-this.sun.alt-4)/14,0,1);
  this.night=night;const top=blend([5,10,20],[30,78,126],day),bot=blend([22,33,45],[135,187,209],day);
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgb(${top})`);g.addColorStop(.72,`rgb(${bot})`);g.addColorStop(1,`rgb(${blend(bot,[20,28,34],.45)})`);c.fillStyle=g;c.fillRect(0,0,w,h);
  this.milkyWay.draw(this);
  if(this.sun.alt>-15&&this.sun.alt<7){const sp=this.project(this.sun.v,true);if(sp){let glow=c.createRadialGradient(sp.x,sp.y,0,sp.x,sp.y,w*.7);glow.addColorStop(0,`rgba(217,144,107,${.35*(1-Math.abs(this.sun.alt+3)/16)})`);glow.addColorStop(1,'rgba(150,96,85,0)');c.fillStyle=glow;c.fillRect(0,0,w,h);}}
  if(this.state.layers.constellations&&night>.05)this.drawConstellations();
  if(this.state.layers.ecliptic)this.drawEcliptic();
  this.drawStars();
  if(this.state.layers.messier)this.drawMessier();
  this.drawBodies();
  if(this.state.layers.satellites)this.drawSatellites();
  if(this.state.layers.meteors){const events=this.meteorClock.advance(elapsed,this.shower.rate);for(let n=0;n<events;n++)this.spawnMeteor(false);this.drawMeteors();}
  this.drawLandscape(day);
  this.drawCompass();
  const selected=this.state.selected;
  if(selected){let object=selected.kind==='star'?this.starPositions.find(x=>x.id===selected.id):selected.kind==='body'?this.bodies.find(x=>x.id===selected.id):selected.kind==='messier'?this.dsoPositions.find(x=>x.id===selected.id):null;
   if(object&&object.alt>terrainAlt(object.az)){let p=this.project(object.v);if(p){c.strokeStyle='rgba(222,192,145,.85)';c.lineWidth=1;c.beginPath();c.arc(p.x,p.y,13,0,Math.PI*2);c.stroke();}}}
 }
 drawStars(){
  const c=this.ctx,zoom=this.state.camera.zoom;let count=0;const labels=[];
  for(const s of this.starPositions){if(s.alt<=0)continue;const p=this.project(s.v);if(!p)continue;
   const apparent=s.mag+extinction(s.alt);
   const {alpha,radius:bright}=starAppearance(apparent,this.limit,zoom),rgb=color(s.bv);
   if(alpha<.003)continue;
   if(s.mag<2){const r=bright*5;const g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(${rgb},${.22*alpha})`);g.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=g;c.fillRect(p.x-r,p.y-r,2*r,2*r);}
   c.fillStyle=`rgba(${rgb},${alpha})`;c.beginPath();c.arc(p.x,p.y,bright,0,Math.PI*2);c.fill();
   if(s.mag<.8){c.strokeStyle=`rgba(${rgb},${alpha*.26})`;c.lineWidth=.6;c.beginPath();c.moveTo(p.x-bright*3,p.y);c.lineTo(p.x+bright*3,p.y);c.moveTo(p.x,p.y-bright*3);c.lineTo(p.x,p.y+bright*3);c.stroke();}
   if(s.alt>terrainAlt(s.az)){this.hits.push({...p,object:s,r:Math.max(7,bright*3)});count++;if((s.mag<1.7||s.id==='11767')&&p.y>100&&p.y<this.h-230)labels.push({s,p});}
  }
  c.font='11px Arial, sans-serif';c.fillStyle='rgba(209,215,218,.55)';
  const placed=[];for(const{s,p}of labels.sort((a,b)=>a.s.mag-b.s.mag)){const name=pick(s.name,this.state.lang),width=c.measureText(name).width;if(p.x<12||p.x+width+15>this.w||this.w<700&&p.y>this.h-365)continue;if(placed.some(q=>Math.abs(q.y-p.y)<16&&p.x+10<q.x+q.width+10&&p.x+width+20>q.x))continue;c.fillText(name,p.x+10,p.y+4);placed.push({x:p.x+10,y:p.y,width});}
  this.visibleStars=count;
 }
 drawConstellations(){const c=this.ctx;c.strokeStyle=`rgba(152,177,195,${.25*this.night})`;c.lineWidth=.65;
  for(const con of this.constLines)for(const line of con.lines)this.drawLine(line);
  c.font=`${this.w<600?11:12}px Georgia, serif`;c.textAlign='center';
  const placed=[];
  for(const con of this.conPositions){
   if(con.alt<terrainAlt(con.az))continue;const p=this.project(con.v);
   if(!p||p.y<80||p.y>this.h-155)continue;
   const name=pick(con.name,this.state.lang),width=c.measureText(name).width;
   if(p.x-width/2<10||p.x+width/2>this.w-10)continue;
   let label=null;
   for(const dy of [19,-17,34,-32]){
    const candidate={x:p.x,y:p.y+dy,width};
    if(!placed.some(q=>Math.abs(q.y-candidate.y)<18&&Math.abs(q.x-candidate.x)<(q.width+width)/2+12)){label=candidate;break;}
   }
   if(!label)continue;
   // A short hairline attaches the name to the center of its own figure.
   c.strokeStyle=`rgba(152,177,195,${.27*this.night})`;c.lineWidth=.6;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(label.x,label.y+(label.y>p.y?-11:4));c.stroke();
   c.fillStyle=`rgba(173,191,205,${.74*this.night})`;c.fillText(name,label.x,label.y);
   this.hits.push({...p,x:label.x,y:label.y-4,object:con,r:11,width:width/2+5});placed.push(label);
  }c.textAlign='left';
 }
 drawLine(line){let prev=null;const c=this.ctx;c.beginPath();for(const v of line){const p=this.project(v,true);if(p&&prev&&Math.abs(p.x-prev.x)<this.w*2&&Math.abs(p.y-prev.y)<this.h*2&&v[1]>-.05){c.moveTo(prev.x,prev.y);c.lineTo(p.x,p.y);}prev=p;}c.stroke();}
 drawEcliptic(){const c=this.ctx;c.save();c.strokeStyle='rgba(202,161,107,.55)';c.setLineDash([4,7]);c.lineWidth=.8;this.drawLine(this.ecl);c.restore();}
 drawMessier(){
  const c=this.ctx,atlas=atlasBlend(this.state.camera.zoom);
  for(const o of this.dsoPositions){if(o.alt<=0)continue;const p=this.project(o.v);if(!p)continue;
   const naked=['M31','M44','M45','M7','M6','M13','M42'].includes(o.id)&&o.mag+extinction(o.alt)<this.limit-.4;
   if(atlas<.005&&!naked)continue;if(this.night<.2)continue;
   const dims=o.dim?.split('x').map(Number)||[8,8],rx=clamp((dims[0]||8)/60*D*this.f/2,2,60),ry=clamp((dims[1]||dims[0]||8)/60*D*this.f/2,1.5,35);
   if(naked||atlas){c.save();c.translate(p.x,p.y);c.scale(1,ry/rx);const g=c.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,`rgba(190,198,202,${((naked?.09:0)+atlas*(naked?.11:.2))*this.night})`);g.addColorStop(1,'rgba(170,185,201,0)');c.fillStyle=g;c.fillRect(-rx,-rx,rx*2,rx*2);c.restore();}
   if(atlas>.005){c.strokeStyle=`rgba(198,169,126,${.64*atlas})`;c.lineWidth=.7;c.beginPath();const r=5;if(['s','e','i'].includes(o.type))c.ellipse(p.x,p.y,r*1.3,r*.6,-.5,0,Math.PI*2);else if(o.type==='pos'){c.moveTo(p.x-r,p.y);c.lineTo(p.x+r,p.y);c.moveTo(p.x,p.y-r);c.lineTo(p.x,p.y+r);}else c.arc(p.x,p.y,r,0,Math.PI*2);c.stroke();c.fillStyle=`rgba(209,189,157,${.83*atlas})`;c.font='10px Arial, sans-serif';c.fillText(o.id,p.x+10,p.y+3);}
   if(o.alt>terrainAlt(o.az)&&(naked||atlas>.08))this.hits.push({...p,object:o,r:atlas>.08?12:Math.max(8,rx)});
  }
 }
 drawBodies(){
  const c=this.ctx;
  // Draw Sun first, Moon second so close alignments have the correct occlusion order.
  for(const b of this.bodies){if(b.alt<-2)continue;const p=this.project(b.v);if(!p)continue;const info=BODY_INFO[b.id],isDisk=b.id==='Sun'||b.id==='Moon';
   if(!isDisk&&b.mag+extinction(b.alt)>this.limit+zoomGain(this.state.camera.zoom))continue;
   const trueR=Math.atan(info.radius/(b.dist*149597870.7))*this.f/p.z;
   const r=isDisk?Math.max(.9,trueR):Math.max(.9,2.5-.22*b.mag);
   if(b.id!=='Moon'||b.phase>.05){const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r*(isDisk?9:5));glow.addColorStop(0,b.id==='Sun'?'rgba(255,220,156,.5)':'rgba(239,234,208,.18)');glow.addColorStop(1,'rgba(225,220,202,0)');c.fillStyle=glow;c.fillRect(p.x-r*10,p.y-r*10,r*20,r*20);}
   c.fillStyle=b.id==='Moon'?'#17222d':info.color;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();
   if(b.id==='Moon'){
    const sp=this.project(this.sun.v,true);let angle=sp?Math.atan2(sp.y-p.y,sp.x-p.x):0;
    // Project the local tangent toward the Sun; this also works when the Sun is behind the camera.
    const q=unit(this.sun.v.map((v,i)=>v-b.v[i]*dot(b.v,this.sun.v)));let qp=this.project(unit(b.v.map((v,i)=>v+.001*q[i])),true);if(qp)angle=Math.atan2(qp.y-p.y,qp.x-p.x);
    c.save();c.translate(p.x,p.y);c.rotate(angle);c.fillStyle=info.color;c.beginPath();for(let j=0;j<=40;j++){let y=-1+j/20,x=Math.sqrt(Math.max(0,1-y*y));j?c.lineTo(x*r,y*r):c.moveTo(x*r,y*r);}for(let j=40;j>=0;j--){let y=-1+j/20,x=(1-2*b.phase)*Math.sqrt(Math.max(0,1-y*y));c.lineTo(x*r,y*r);}c.closePath();c.fill();c.restore();
   }
   if(b.alt>terrainAlt(b.az)&&(b.id!=='Moon'||b.phase>.005||this.sun.alt>0)){c.font='11px Arial, sans-serif';c.fillStyle='rgba(230,217,190,.83)';if(b.id!=='Moon'||b.phase>.03)c.fillText(pick(info.name,this.state.lang),p.x+r+9,p.y+4);this.hits.push({...p,object:b,r:Math.max(10,r)});}
  }
 }
 drawSatellites(){const c=this.ctx;for(const o of this.satPositions){if(o.alt<terrainAlt(o.az))continue;const p=this.project(o.v);if(!p)continue;c.fillStyle='#bad7db';c.beginPath();c.arc(p.x,p.y,1.7,0,Math.PI*2);c.fill();c.font='10px Arial, sans-serif';c.fillText(o.name,p.x+9,p.y-6);this.hits.push({...p,object:o,r:10});}}
 spawnMeteor(preview){
  const shower=chooseShower(this.shower.showers)|| (preview?this.shower.showers[0]:null);if(!shower)return;
  let v;
  if(preview||this.state.meteorScope==='view'){
   // User-facing default: collect the estimated all-sky event rate in the viewed
   // region. The UI explicitly labels this spatial illustration and offers sky mode.
   for(let attempt=0;attempt<24;attempt++){const candidate=this.unproject(this.w*(.2+Math.random()*.6),this.h*(.12+Math.random()*.38));const h=vectorHorizontal(candidate);if(h.alt>terrainAlt(h.az)+7&&Math.abs(dot(shower.v,candidate))<.995){v=candidate;break;}}
   if(!v)return;
  }else v=horizontalVector(Math.random()*360,Math.asin(.08+.92*Math.random())/D);
  const r=shower.v,tangent=unit(v.map((x,i)=>x*dot(r,v)-r[i]));
  const duration=(400+Math.random()*500)*59/shower.speed;
  this.meteors.push({v,tangent,start:this.state.ms,duration,length:(8+Math.random()*16)*D,preview,shower:shower.id,look:meteorAppearance(shower,this.limit)});
  if(!preview){this.meteorCount++;this.lastMeteor={id:shower.id,name:shower.name,time:this.state.ms};}
 }
 meteorPoint(m,t){return unit(m.v.map((x,i)=>x*Math.cos(m.length*t)+m.tangent[i]*Math.sin(m.length*t)));}
 drawMeteors(){
  const c=this.ctx;this.meteors=this.meteors.filter(m=>this.state.ms-m.start<m.duration+m.look.trainMs&&this.state.ms>=m.start);
  for(const m of this.meteors){
   const age=this.state.ms-m.start,t=clamp(age/m.duration,0,1),train=age>=m.duration,l=m.look;
   const a=this.project(this.meteorPoint(m,train?.48:clamp(t-l.wake,0,1))),b=this.project(this.meteorPoint(m,t));if(!a||!b)continue;
   if(Math.hypot(a.x-b.x,a.y-b.y)<.1)continue;
   const opacity=train?.22*(1-(age-m.duration)/l.trainMs)**2:Math.sin(Math.PI*t)**.35*l.opacity;
   c.save();c.globalAlpha=opacity;const g=c.createLinearGradient(a.x,a.y,b.x,b.y);
   g.addColorStop(0,`rgba(${l.rgb},0)`);g.addColorStop(.55,`rgba(${l.rgb},.72)`);g.addColorStop(1,train?`rgb(${l.rgb})`:'#fffdf7');
   c.strokeStyle=g;c.lineWidth=train?.65:l.width;
   c.shadowBlur=train?0:l.magnitude<1?5:2;c.shadowColor=`rgb(${l.rgb})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
   if(!train){c.fillStyle='#fffdf7';c.beginPath();c.arc(b.x,b.y,l.width*.48,0,Math.PI*2);c.fill();}c.restore();
  }
 }
 drawLandscape(day){
  const c=this.ctx,w=this.w,h=this.h;
  for(let layer=0;layer<3;layer++){
   const points=[];
   for(let off=-110;off<=110;off+=.4){const az=this.state.camera.az+off;let alt=terrainAlt(az)+(layer===0?2:layer===1?.6:-.8);const p=this.project(horizontalVector(az,alt),true);if(p&&p.x>-w*2&&p.x<w*3)points.push(p);}
   points.sort((a,b)=>a.x-b.x);c.fillStyle=`rgb(${blend(layer===0?[19,28,36]:layer===1?[11,21,28]:[5,13,19],layer===0?[66,89,104]:layer===1?[41,67,74]:[21,45,46],day)})`;
   if(points.length){c.beginPath();c.moveTo(-w,h*8);c.lineTo(-w,points[0].y);for(const p of points)c.lineTo(p.x,p.y);c.lineTo(w*2,points.at(-1).y);c.lineTo(w*2,h*8);c.closePath();c.fill();}else if(this.state.camera.alt<0)c.fillRect(0,0,w,h);
  }
  // Trees and building are fixed in azimuth, so they move with a 360° camera turn.
  c.fillStyle=`rgb(${blend([4,11,17],[14,34,32],day)})`;
  for(let i=0;i<560;i++){
   const az=i*360/560;if(az>49&&az<84)continue;
   const base=terrainAlt(az)-.9,treeHeight=1.7+rnd(i)*3.8,width=.7+rnd(i+90)*.7;
   const p=this.project(horizontalVector(az,base)),top=this.project(horizontalVector(az,base+treeHeight));if(!p||!top)continue;
   const half=Math.max(1,this.f*Math.tan(width*D)/p.z),height=p.y-top.y;if(height<0)continue;
   c.beginPath();c.moveTo(p.x,top.y);for(let tier=1;tier<=6;tier++){const y=top.y+height*tier/6;const spread=half*tier/6;c.lineTo(p.x+spread*.35,y-height*.14);c.lineTo(p.x+spread,y);}c.lineTo(p.x+half*.07,p.y+height*.13);c.lineTo(p.x-half*.07,p.y+height*.13);for(let tier=6;tier>=1;tier--){const y=top.y+height*tier/6,spread=half*tier/6;c.lineTo(p.x-spread,y);c.lineTo(p.x-spread*.35,y-height*.14);}c.closePath();c.fill();
  }
  this.drawDome(day);
  drawForestLife(this,terrainAlt,day);
 }
 drawDome(day){
  const c=this.ctx,az=66,base=terrainAlt(az)-1;const pt=(dx,dy)=>this.project(horizontalVector(az+dx,base+dy),true);const center=pt(0,3);if(!center||center.x<-this.w*.5||center.x>this.w*1.5)return;
  const shape=[];shape.push(pt(-9,0),pt(-9,4));for(let a=Math.PI;a>=0;a-=Math.PI/60)shape.push(pt(9*Math.cos(a),4+8.4*Math.sin(a)));shape.push(pt(9,0));if(shape.some(p=>!p))return;
  c.fillStyle=`rgb(${blend([7,15,22],[39,55,62],day)})`;c.beginPath();shape.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
  c.strokeStyle=`rgba(139,160,168,${.1+day*.12})`;c.lineWidth=.8;c.beginPath();const rimA=pt(-9,4),rimB=pt(9,4);c.moveTo(rimA.x,rimA.y);c.lineTo(rimB.x,rimB.y);c.stroke();
  // Familiar hemispherical BTA dome with a narrow slit and low cylindrical base.
  c.fillStyle=`rgb(${blend([4,10,16],[24,35,40],day)})`;const slit=[pt(-1,4),pt(-1,12.35),pt(.25,12.37),pt(.4,4)];c.beginPath();slit.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
  const roof=[pt(-11,-.1),pt(-11,1.6),pt(-7,2),pt(8,2),pt(11,1.3),pt(11,-.1)];c.fillStyle=`rgb(${blend([4,10,16],[28,41,47],day)})`;c.beginPath();roof.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
  const label=pt(0,-2.2);if(label&&this.w>700&&this.state.camera.zoom<1.3&&label.y<this.h-175){c.textAlign='center';c.font='9px Arial, sans-serif';c.fillStyle='rgba(149,161,166,.46)';c.fillText(this.state.lang==='ru'?'БТА · САО РАН':'BTA · SAO RAS',label.x,label.y);c.textAlign='left';}
 }
 drawCompass(){if(this.w<700)return;const c=this.ctx,names=this.state.lang==='ru'?['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ']:['N','NE','E','SE','S','SW','W','NW'];c.font='10px Arial, sans-serif';c.textAlign='center';for(let i=0;i<8;i++){const p=this.project(horizontalVector(i*45,0));if(!p||p.y>this.h-165||p.y<0)continue;c.fillStyle=i===0?'rgba(224,193,145,.9)':'rgba(173,186,193,.65)';c.fillText(names[i],p.x,p.y+12);c.strokeStyle='rgba(178,194,201,.28)';c.beginPath();c.moveTo(p.x,p.y-8);c.lineTo(p.x,p.y-3);c.stroke();}c.textAlign='left';}
 hit(x,y){
  return this.hits.filter(h=>{if(h.object.alt!==undefined&&h.object.alt<terrainAlt(h.object.az))return false;return h.width?Math.abs(x-h.x)<=h.width&&Math.abs(y-h.y)<h.r:Math.hypot(x-h.x,y-h.y)<=h.r;}).sort((a,b)=>{
   const priority=o=>o.kind==='messier'?0:o.kind==='body'?1:o.kind==='constellation'?2:3;
   return priority(a.object)-priority(b.object)||Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y);
  })[0]?.object;
 }
 getObject(object){if(object.kind==='body')return this.bodies.find(x=>x.id===object.id);if(object.kind==='satellite')return this.satPositions?.find(x=>x.id===object.id)||object;return {...object,...starToHorizontal(object.eq,this.frame.rotation)};}
 getCoverage(){return nearestOrbits(this.orbits,this.state.ms).length;}
}
