import fs from 'node:fs/promises';
const csv=await fs.readFile('../hyg.csv','utf8');
const split=s=>s.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g).slice(0,-1).map(v=>v.replace(/,$/,'').replace(/^"|"$/g,'').replaceAll('""','"'));
const lines=csv.trim().split(/\r?\n/); const cols=split(lines.shift());
const epoch=(Date.parse('2026-08-08T00:00:00Z')-Date.parse('2000-01-01T12:00:00Z'))/(365.25*864e5);
const stars=[];
for(const line of lines){
 const row=Object.fromEntries(split(line).map((v,i)=>[cols[i],v]));
 if(!row.id||row.id==='0'||Number(row.mag)>8)continue;
 let x=+row.x+(+row.vx)*epoch, y=+row.y+(+row.vy)*epoch,z=+row.z+(+row.vz)*epoch;
 let ra=Math.atan2(y,x)*180/Math.PI,dec=Math.atan2(z,Math.hypot(x,y))*180/Math.PI;
 stars.push([+(row.hip||-row.id),+ra.toFixed(6),+dec.toFixed(6),+row.mag,row.ci===''?0.6:+row.ci,+row.dist,row.spect,row.con,row.proper,+row.absmag]);
}
await fs.writeFile('src/data/stars.json',JSON.stringify(stars));
const license=await (await fetch('https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/LICENSE')).text();
await fs.writeFile('src/data/LICENSE-HYG.txt',license);
// Keep only name translations used by this app; the underlying HIP IDs are unchanged.
const names=JSON.parse(await fs.readFile('src/data/starnames.json','utf8'));
const compact={}; for(const [key,value] of Object.entries(names))if(value.name||value.ru||value.en)compact[key]={name:value.name,ru:value.ru,en:value.en,desig:value.desig};
await fs.writeFile('src/data/names.json',JSON.stringify(compact));
const messier=JSON.parse(await fs.readFile('src/data/messier.json','utf8'));
console.log({stars:stars.length,naked:stars.filter(x=>x[3]<=6.5).length,epoch,types:[...new Set(messier.features.map(f=>f.properties.type))],m40:messier.features.find(f=>f.id==='M40'),m102:messier.features.find(f=>f.id==='M102')});
