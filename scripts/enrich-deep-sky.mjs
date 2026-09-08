// Reproducible object metadata and photograph provenance. No article text is copied.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const headers={'User-Agent':'ArkhyzSky/2.0 (educational astronomy atlas; public catalog metadata)'};
await fs.mkdir('../catalog-cache',{recursive:true});
async function get(url,json=false){const path='../catalog-cache/'+createHash('sha256').update(url).digest('hex');try{const s=await fs.readFile(path,'utf8');return json?JSON.parse(s):s;}catch{}for(let i=0;i<4;i++){if(url.includes('/w/api.php'))await new Promise(r=>setTimeout(r,6000));const r=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});if(r.status===429){await new Promise(done=>setTimeout(done,Math.min(60000,Math.max(15000,(Number(r.headers.get('retry-after'))||30)*1000))));continue;}if(!r.ok)throw Error(`${r.status} ${url}`);const s=await r.text();await fs.writeFile(path,s);return json?JSON.parse(s):s;}throw Error('Rate limit: try later.');}
const api=(host,p)=>`https://${host}/w/api.php?`+new URLSearchParams({action:'query',format:'json',formatversion:2,...p});
function csv(text){let rows=[],row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===';'&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}if(cell){row.push(cell);rows.push(row);}const keys=rows.shift();return rows.map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]||''])));}
const raw=await get('https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv');
await fs.writeFile('../OpenNGC.csv',raw);
const ngc=csv(raw),sex=(s)=>{const [a,b,c]=s.replace(/^[+-]/,'').split(':').map(Number);return (s.startsWith('-')?-1:1)*(a+b/60+c/3600);};
const selection=[
 [1,'NGC0188','Скопление NGC 188','NGC 188'],[2,'NGC0040','Туманность Галстук-бабочка','Bow-Tie Nebula'],
 [4,'NGC7023','Туманность Ирис','Iris Nebula'],[6,'NGC6543','Кошачий Глаз','Cat’s Eye Nebula'],
 [7,'NGC2403','Галактика NGC 2403','NGC 2403'],[8,'NGC0559','Скопление NGC 559','NGC 559'],
 [9,'NGC0869','h Персея · двойное скопление','h Persei · Double Cluster'],[10,'NGC0663','Скопление NGC 663','NGC 663'],
 [11,'NGC7635','Туманность Пузырь','Bubble Nebula'],[12,'NGC6946','Галактика Фейерверк','Fireworks Galaxy'],
 [13,'NGC0457','Скопление Сова','Owl Cluster'],[14,'NGC0884','χ Персея · двойное скопление','χ Persei · Double Cluster'],
 [15,'NGC6826','Мигающая туманность','Blinking Planetary Nebula'],[16,'NGC7243','Скопление NGC 7243','NGC 7243'],
 [19,'IC5146','Туманность Кокон','Cocoon Nebula'],[20,'NGC7000','Туманность Северная Америка','North America Nebula'],
 [22,'NGC7662','Голубой Снежок','Blue Snowball Nebula'],[23,'NGC0891','Галактика NGC 891','NGC 891'],
 [27,'NGC6888','Туманность Полумесяц','Crescent Nebula'],[28,'NGC0752','Скопление NGC 752','NGC 752'],
 [30,'NGC7331','Галактика NGC 7331','NGC 7331'],[31,'IC0405','Туманность Пылающая Звезда','Flaming Star Nebula'],[32,'NGC4631','Галактика Кит','Whale Galaxy'],
 [33,'NGC6992','Восточная Вуаль','Eastern Veil Nebula'],[34,'NGC6960','Западная Вуаль','Western Veil Nebula'],
 [38,'NGC4565','Галактика Игла','Needle Galaxy'],[39,'NGC2392','Туманность NGC 2392','NGC 2392'],
 [42,'NGC7006','Скопление NGC 7006','NGC 7006'],[43,'NGC7814','Малое Сомбреро','Little Sombrero Galaxy'],
 [47,'NGC6934','Скопление NGC 6934','NGC 6934'],[49,'NGC2237','Туманность Розетка','Rosette Nebula'],
 [50,'NGC2244','Скопление в Розетке','Rosette Cluster'],[55,'NGC7009','Туманность Сатурн','Saturn Nebula'],
 [56,'NGC0246','Туманность Череп','Skull Nebula'],[57,'NGC6822','Галактика Барнарда','Barnard’s Galaxy'],
 [63,'NGC7293','Туманность Улитка','Helix Nebula']
];
const types={G:'s',GCl:'gc',OCl:'oc','Cl+N':'sfr',HII:'sfr',Neb:'sfr',EmN:'sfr',RfN:'rn',PN:'pn',SNR:'snr','*Ass':'oc'};
const extras=selection.map(([n,id,ru,en])=>{let r=ngc.find(r=>r.Name===id);if(!r)throw Error(id);if(r.Type==='Dup')r=ngc.find(x=>x.Name==='NGC'+r.NGC.padStart(4,'0'));const type=types[r.Type];if(!type)throw Error(`${id}: ${r.Type}`);return {id:'C'+n,ra:sex(r.RA)*15,dec:sex(r.Dec),desig:id.replace(/(NGC|IC)0*(\d+)/,'$1 $2'),name:[ru,en],catalog:'Caldwell',type,mag:r['V-Mag']?+r['V-Mag']:null,dim:[r.MajAx,r.MinAx].filter(Boolean).join('x'),aliases:r['Common names']||'',coordinateSource:'https://github.com/mattiaverga/OpenNGC',coordinateSources:r.Sources||''};});
await fs.writeFile('src/data/caldwell.json',JSON.stringify(extras));
await fs.writeFile('src/data/LICENSE-OpenNGC.txt','OpenNGC — Mattia Verga and contributors\nhttps://github.com/mattiaverga/OpenNGC\nChanges: selected 36 Caldwell entries; converted sexagesimal coordinates to degrees and translated common names. This derived catalog remains CC BY-SA 4.0.\n\n'+await get('https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/LICENSES/CC-BY-SA-4.0.txt'));
const messier=JSON.parse(await fs.readFile('src/data/messier.json','utf8')).features.map(f=>({id:f.id,ra:(f.geometry.coordinates[0]+360)%360,dec:f.geometry.coordinates[1],dim:f.properties.dim}));
const all=[...messier,...extras],media={};
const nasaHTML=await get('https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/');
const nasaLinks=[...nasaHTML.matchAll(/href="(https:\/\/science\.nasa\.gov\/[^"#]+messier[^"#]+)"/g)].map(m=>m[1]);
function survey(o){const fov=Math.max(.07,Math.min(5,(parseFloat(o.dim)||10)/60*1.7));return {url:'https://alasky.cds.unistra.fr/hips-image-services/hips2fits?'+new URLSearchParams({hips:'CDS/P/DSS2/color',width:640,height:480,fov,projection:'TAN',coordsys:'icrs',ra:o.ra,dec:o.dec,format:'jpg'}),page:'https://aladin.cds.unistra.fr/AladinLite/?'+new URLSearchParams({target:`${o.ra} ${o.dec}`,fov,survey:'P/DSS2/color'}),credit:'DSS2 · STScI / Caltech / AAO · CDS',license:'DSS acknowledgement',licenseUrl:'https://archive.stsci.edu/dss/acknowledging.html',survey:true};}
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
for(let start=0;start<all.length;start+=20){
 const batch=all.slice(start,start+20),titles=batch.map(o=>o.id[0]==='M'?'Messier '+o.id.slice(1):'Caldwell '+o.id.slice(1));
 const q=(await get(api('en.wikipedia.org',{titles:titles.join('|'),redirects:1,prop:'pageimages|info|langlinks',piprop:'name|thumbnail',pithumbsize:640,pilicense:'free',inprop:'url',lllang:'ru',lllimit:50}),true)).query;
 const resolved=t=>{let r;while((r=q.redirects?.find(r=>r.from===t)))t=r.to;return q.pages.find(p=>p.title===t);};
 const fileTitles=q.pages.filter(p=>p.pageimage).map(p=>'File:'+p.pageimage);
 const files=fileTitles.length?(await get(api('commons.wikimedia.org',{titles:fileTitles.join('|'),prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:640}),true)).query.pages:[];
 for(let i=0;i<batch.length;i++){
  const o=batch[i],p=resolved(titles[i]);if(!p||p.missing)throw Error(`No article ${o.id}`);
  const info=files.find(f=>f.title.replaceAll('_',' ')==='File:'+p.pageimage?.replaceAll('_',' '))?.imageinfo?.[0],meta=info?.extmetadata;
  const photo=info&&p.thumbnail&&!/\.svg$/i.test(p.pageimage)?{url:info.thumburl||p.thumbnail.source,page:info.descriptionurl,credit:plain(meta?.Artist?.value)||plain(meta?.Credit?.value)||'Wikimedia Commons contributors',license:plain(meta?.LicenseShortName?.value)||'See image source',licenseUrl:(meta?.LicenseUrl?.value||info.descriptionurl).replace(/^http:/,'https:'),file:p.pageimage}:survey(o);
  const number=o.id.slice(1),nasa=o.id[0]==='M'?nasaLinks.find(url=>new RegExp(`/messier-${number}(?:-|/)`).test(url)):null;
  media[o.id]={article:p.fullurl,articleRu:p.langlinks?.[0]?`https://ru.wikipedia.org/wiki/${encodeURIComponent(p.langlinks[0].title.replaceAll(' ','_'))}`:null,title:p.title,photo,survey:survey(o),...(nasa?{nasa}:{}),retrieved:new Date().toISOString().slice(0,10)};
 }
 await fs.writeFile('src/data/dso-media.json',JSON.stringify(media));
 console.log(`Metadata: ${Math.min(start+20,all.length)}/${all.length}`);
}
// Original-resolution Commons endpoints for these three small files throttled
// consistently during validation. Use verified observatory publications instead.
for(const [id,page,credit,license,licenseUrl] of [
 ['C55','https://www.eso.org/public/images/eso1731a/','ESO/J. Walsh','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'],
 ['C56','https://www.eso.org/public/images/eso2019a/','ESO','CC BY 4.0','https://creativecommons.org/licenses/by/4.0/'],
 ['M99',media.M99.nasa,'ESA/Hubble & NASA; Acknowledgment: Matej Novak','Image use policy','https://esahubble.org/copyright/']
]){const html=await get(page),url=html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)?.[1];if(!url?.startsWith('https://'))throw Error(`Image missing: ${id}`);media[id].photo={url,page,credit,license,licenseUrl};}
media.M99.photo.note=['Фрагмент спирального рукава · Hubble.','Detail of a spiral arm · Hubble.'];
await fs.writeFile('src/data/dso-media.json',JSON.stringify(media));
console.log(JSON.stringify({messier:messier.length,caldwell:extras.length,photos:Object.keys(media).length,surveyFallbacks:Object.entries(media).filter(([id,m])=>m.photo.survey).map(([id])=>id)},null,2));
