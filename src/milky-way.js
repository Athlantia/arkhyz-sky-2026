import {A,clamp,rotate} from './astro.js';
import registration from './data/milky-way-registration.json' with {type:'json'};

const PHOTO=new URL('./assets/milky-way-eso.jpg',import.meta.url).href;
const GAL=A.Rotation_EQJ_GAL().rot,TAU=Math.PI*2;
const W=2048,H=1024;
export const PHOTO_ROTATION=registration.rotationColumns;

export function galacticTextureUV(v){
 return [((.5-Math.atan2(v[1],v[0])/TAU)%1+1)%1,.5-Math.asin(clamp(v[2],-1,1))/Math.PI];
}

export function galacticViewBasis(renderer){
 const m=renderer.frame.rotation;
 // Invert the EQJ -> HOR orthogonal matrix, converting renderer E/U/N to N/W/U.
 const convert=v=>{const hor=[v[2],-v[0],v[1]];const gal=rotate(GAL,m.map(column=>column.reduce((sum,n,i)=>sum+n*hor[i],0)));return rotate(PHOTO_ROTATION,gal);};
 return [convert(renderer.forward),convert(renderer.right),convert(renderer.up)];
}

function diffusePanorama(img){
 const source=document.createElement('canvas');source.width=W;source.height=H;
 const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,W,H);
 const rgba=ctx.getImageData(0,0,W,H).data,gray=new Float32Array(W*H),median=new Float32Array(W*H);
 for(let i=0;i<gray.length;i++)gray[i]=(.2126*rgba[i*4]+.7152*rgba[i*4+1]+.0722*rgba[i*4+2])/255;
 const values=new Float32Array(25);
 // Rank filtering removes isolated photographic stars and 2009 planets, keeping
 // the extended star clouds and dark lanes. Catalog stars are drawn separately.
 for(let y=H/4;y<H*3/4;y++)for(let x=0;x<W;x++){
  let n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)values[n++]=gray[(y+dy)*W+((x+dx+W)%W)];
  values.sort();median[y*W+x]=values[12];
 }
 const pixels=new Uint8Array(W*H*4),light=new Float32Array(W*H);
 for(let y=H/4+1;y<H*3/4-1;y++)for(let x=0;x<W;x++){
  const i=y*W+x,lat=Math.abs(.5-y/H)*180;
  // Exclude off-plane objects in the panorama (e.g. Magellanic Clouds).
  const mask=1-clamp((lat-19)/11,0,1);
  let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=median[(y+dy)*W+((x+dx+W)%W)]*(dx===0?2:1)*(dy===0?2:1);
  light[i]=Math.pow(Math.max(0,sum/16-.038),1.1)*mask;
  const value=Math.round(clamp(light[i],0,1)*255);
  pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=value;pixels[i*4+3]=255;
 }
 return {pixels,light};
}

const VERTEX=`attribute vec2 point; varying vec2 screen;
void main(){screen=point*.5+.5;gl_Position=vec4(point,0.,1.);}`;
const FRAGMENT=`precision highp float;
varying vec2 screen;
uniform sampler2D photo;
uniform vec3 forwardGal,rightGal,upGal;
uniform vec3 vertical;
uniform vec2 sizeOverF;
uniform float skyLight;
void main(){
 float dx=(screen.x-.5)*sizeOverF.x;
 float dy=(screen.y-.56)*sizeOverF.y;
 vec3 direction=normalize(forwardGal+dx*rightGal+dy*upGal);
 float lon=atan(direction.y,direction.x);
 float lat=asin(clamp(direction.z,-1.,1.));
 vec2 uv=vec2(fract(.5-lon/6.28318530718),.5-lat/3.14159265359);
 float haze=texture2D(photo,uv).r;
 float altitude=dot(direction,vertical);
 float atmosphere=smoothstep(-.015,.055,altitude)*(.26+.74*smoothstep(0.,.5,altitude));
 gl_FragColor=vec4(vec3(.94,.97,1.)*haze*skyLight*atmosphere,1.);
}`;

export class MilkyWay{
 constructor(){
  this.canvas=document.createElement('canvas');this.ready=false;this.lastKey='';
  const img=new Image();img.onload=()=>{
   const prepared=diffusePanorama(img);this.light=prepared.light;
   try{this.initGL(prepared.pixels);}catch{this.gl=null;this.canvas=document.createElement('canvas');}
   this.ready=true;
  };
  img.onerror=()=>{this.ready=false;};img.src=PHOTO;
 }
 initGL(pixels){
  const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:true});
  if(!gl)throw new Error('Canvas fallback');
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const point=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(point);gl.vertexAttribPointer(point,2,gl.FLOAT,false,0,0);
  const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  this.uniforms=Object.fromEntries(['forwardGal','rightGal','upGal','vertical','sizeOverF','skyLight'].map(name=>[name,gl.getUniformLocation(program,name)]));
  this.gl=gl;
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.gl=null;this.canvas=document.createElement('canvas');this.lastKey='';});
 }
 draw(renderer){
  if(!this.ready||renderer.night<=.2)return;
  const intensity=.68*renderer.night*clamp((renderer.limit-1.5)/5,0,1);
  const key=[renderer.state.camera.az,renderer.state.camera.alt,renderer.state.camera.zoom,renderer.w,renderer.h,renderer.lastEpoch].join('/');
  if(key!==this.lastKey){
   const [forward,right,up]=galacticViewBasis(renderer);
   // The galactic direction of the local zenith gives altitude without refraction.
   const alt=renderer.state.camera.alt*Math.PI/180;
   const vertical=forward.map((n,i)=>n*Math.sin(alt)+up[i]*Math.cos(alt));
   if(this.gl){
    const gl=this.gl,scale=Math.min(1.2,1024/renderer.w,1024/renderer.h);
    const width=Math.max(1,Math.round(renderer.w*scale)),height=Math.max(1,Math.round(renderer.h*scale));
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;gl.viewport(0,0,width,height);}
    const u=this.uniforms;gl.uniform3fv(u.forwardGal,forward);gl.uniform3fv(u.rightGal,right);gl.uniform3fv(u.upGal,up);gl.uniform3fv(u.vertical,vertical);
    gl.uniform2f(u.sizeOverF,renderer.w/renderer.f,renderer.h/renderer.f);gl.uniform1f(u.skyLight,intensity);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
   }else this.drawCPU(renderer,[forward,right,up],vertical,intensity);
   this.lastKey=key;
  }
  const c=renderer.ctx;c.save();c.globalCompositeOperation='screen';c.drawImage(this.canvas,0,0,renderer.w,renderer.h);c.restore();
 }
 drawCPU(renderer,[forward,right,up],vertical,intensity){
  const width=280,height=Math.max(1,Math.round(width*renderer.h/renderer.w));
  this.canvas.width=width;this.canvas.height=height;const c=this.canvas.getContext('2d'),out=c.createImageData(width,height);
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const dx=((x+.5)/width-.5)*renderer.w/renderer.f,dy=(.44-(y+.5)/height)*renderer.h/renderer.f;
   const v=forward.map((n,i)=>n+dx*right[i]+dy*up[i]),len=Math.hypot(...v);for(let i=0;i<3;i++)v[i]/=len;
   const [u,t]=galacticTextureUV(v),px=u*W,py=clamp(t*H,0,H-1),ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
   const sample=(xx,yy)=>this.light[Math.min(yy,H-1)*W+xx%W];
   const a=sample(ix,iy)*(1-fx)+sample(ix+1,iy)*fx,b=sample(ix,iy+1)*(1-fx)+sample(ix+1,iy+1)*fx;
   const alt=v.reduce((sum,n,i)=>sum+n*vertical[i],0),haze=(a*(1-fy)+b*fy)*intensity*smooth(-.015,.055,alt)*(.26+.74*smooth(0,.5,alt));
   const i=(y*width+x)*4;out.data[i]=haze*255*.94;out.data[i+1]=haze*255*.97;out.data[i+2]=haze*255;out.data[i+3]=255;
  }
  c.putImageData(out,0,0);
 }
}
