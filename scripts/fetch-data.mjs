import fs from 'node:fs/promises';
const base='https://raw.githubusercontent.com/ofrohn/d3-celestial/master/';
const files=['stars.8.json','starnames.json','messier.json','constellations.json','constellations.lines.json','mw.json'];
await fs.mkdir('src/data',{recursive:true});
for (const name of files) {
  const res=await fetch(base+'data/'+name);
  if(!res.ok) throw new Error(`${name}: ${res.status}`);
  const data=await res.json();
  await fs.writeFile('src/data/'+name,JSON.stringify(data));
  console.log(name, data.features?.length,JSON.stringify(data.features?.[0]||Object.entries(data).slice(0,1)).slice(0,900));
}
const res=await fetch(base+'LICENSE');
await fs.writeFile('src/data/LICENSE-d3-celestial.txt',await res.text());
