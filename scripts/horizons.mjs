import fs from 'node:fs/promises';
const cases=[];
await fs.mkdir('tests/fixtures',{recursive:true});
for (const [name,id] of Object.entries({Sun:'10',Moon:'301',Mercury:'199',Venus:'299',Mars:'499',Jupiter:'599',Saturn:'699',Uranus:'799',Neptune:'899'})){
 const p={format:'json',COMMAND:`'${id}'`,OBJ_DATA:"'NO'",EPHEM_TYPE:"'OBSERVER'",CENTER:"'coord@399'",COORD_TYPE:"'GEODETIC'",SITE_COORD:"'41.4416666667,43.6533333333,2.070'",START_TIME:"'2026-08-01 00:00'",STOP_TIME:"'2026-08-26 00:00'",STEP_SIZE:"'12 h'",QUANTITIES:"'4'",CSV_FORMAT:"'YES'",APPARENT:"'AIRLESS'",ELEV_CUT:"'-90'",EXTRA_PREC:"'YES'"};
 const url='https://ssd.jpl.nasa.gov/api/horizons.api?'+new URLSearchParams(p);
 const r=await fetch(url,{signal:AbortSignal.timeout(30000)});const j=await r.json();
 if(!j.result?.includes('$$SOE'))throw new Error(JSON.stringify(j).slice(0,1000));
 await fs.writeFile(`tests/fixtures/horizons-${name}.txt`,j.result.replace(/[ \t]+$/gm,''));
 const lines=j.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
 for(const line of lines){const c=line.split(',').map(s=>s.trim());const ms=Date.parse(c[0]+' UTC');if(!Number.isFinite(ms))throw new Error(line);cases.push({body:name,ms,az:+c[3],alt:+c[4]});}
 console.log(name,lines.length,lines[0]);
}
await fs.writeFile('tests/fixtures/horizons.json',JSON.stringify({source:'NASA JPL Horizons observer ephemerides (airless), DE441 / planetary satellite kernels as returned in raw fixtures',retrieved:new Date().toISOString(),cases},null,2));
