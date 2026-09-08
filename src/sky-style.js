import {clamp,unit,eqVector,dot} from './astro.js';
export const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const atlasBlend=zoom=>smooth(Math.log2(clamp(zoom,1,4))/2);
export const zoomGain=zoom=>2.5*Math.log10(clamp(zoom,1,4));
export function approachZoom(current,target,seconds){
 const next=target+(current-target)*Math.exp(-Math.max(0,seconds)/.14);
 return Math.abs(next-target)<.0002?target:next;
}
export function starAppearance(apparent,baseLimit,zoom){
 const atlas=atlasBlend(zoom),limit=Math.min(8,baseLimit+zoomGain(zoom));
 const hierarchy=.46+.54*clamp((5.8-apparent)/3.8,0,1);
 const alpha=smooth((limit-apparent)/.75)*(hierarchy+(1-hierarchy)*atlas);
 const eyeRadius=clamp(2.25-.32*apparent,.38,2.65);
 const atlasRadius=clamp(2.1-.25*apparent,.43,2.6);
 return {alpha,radius:eyeRadius+(atlasRadius-eyeRadius)*atlas};
}
// Labels belong to the drawn asterism, not the geographic center of an IAU
// boundary. Unit-vector averaging also handles figures crossing RA = 0.
export function figureAnchors(constellationFeatures,lineFeatures){
 const figures=lineFeatures.map(f=>{
  const coords=[...new Map(f.geometry.coordinates.flat().map(p=>[p.join(','),p])).values()];
  const vectors=coords.map(p=>eqVector(...p));
  return {id:f.id,eq:unit([0,1,2].map(i=>vectors.reduce((sum,v)=>sum+v[i],0)))};
 });
 return constellationFeatures.map(f=>{
  const original=eqVector(...f.geometry.coordinates);
  const candidates=figures.filter(x=>x.id===f.id).sort((a,b)=>dot(b.eq,original)-dot(a.eq,original));
  return candidates[0]?.eq||original;
 });
}
