import fs from 'node:fs/promises';
const url='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap';
const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'}});if(!r.ok)throw new Error(r.status);
let css=await r.text();const urls=[...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map(x=>x[1]))];
for(const u of urls){const res=await fetch(u);if(!res.ok)throw new Error(res.status);const b=Buffer.from(await res.arrayBuffer());css=css.replaceAll(u,'data:font/woff2;base64,'+b.toString('base64'));}
await fs.writeFile('src/fonts.css',css);console.log('Embedded font assets:',urls.length);
for(const name of ['cormorantgaramond','manrope']){const res=await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${name}/OFL.txt`);if(res.ok)await fs.writeFile(`src/data/LICENSE-${name}.txt`,await res.text());}
