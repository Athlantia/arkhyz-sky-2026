import fs from 'node:fs/promises';
const media=JSON.parse(await fs.readFile('src/data/dso-media.json','utf8'));
const prior=process.argv.includes('--retry-failed')?JSON.parse(await fs.readFile('tests/fixtures/media-check.json','utf8')).results:[];
const results=prior.filter(r=>r.ok),queue=Object.entries(media).filter(([id])=>!results.some(r=>r.id===id));
async function worker(){while(queue.length){const [id,m]=queue.shift();let result;for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(m.photo.url,{signal:AbortSignal.timeout(25000)});if(r.status===429){await new Promise(done=>setTimeout(done,Math.min(60000,Math.max(15000,1000*(Number(r.headers.get('retry-after'))||20)))));continue;}const type=r.headers.get('content-type'),bytes=r.ok?(await r.arrayBuffer()).byteLength:0;result={id,status:r.status,type,bytes,ok:r.ok&&type?.startsWith('image/')&&bytes>1000};break;}catch(e){result={id,ok:false,error:e.message};}}results.push(result||{id,ok:false,error:'Rate limit'});if(results.length%20===0)console.log(`${results.length}/${Object.keys(media).length} photos checked`);}}
await Promise.all([worker(),worker()]);
const report={checked:new Date().toISOString(),count:results.length,passed:results.filter(x=>x.ok).length,results:results.sort((a,b)=>a.id.localeCompare(b.id))};
await fs.writeFile('tests/fixtures/media-check.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({count:report.count,passed:report.passed,failures:results.filter(x=>!x.ok)},null,2));
if(report.passed!==report.count)process.exitCode=1;
