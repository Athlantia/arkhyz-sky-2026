import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import fs from 'node:fs';
const legal=()=>({name:'bundle-licenses',enforce:'post',generateBundle(_,bundle){
 const names=fs.readdirSync('src/data').filter(x=>x.startsWith('LICENSE-'));
 const text=fs.readFileSync('THIRD_PARTY_LICENSES.txt','utf8')+'\n\n'+names.map(n=>n+'\n'+fs.readFileSync('src/data/'+n,'utf8')).join('\n\n');
 for(const item of Object.values(bundle))if(item.fileName==='index.html')item.source+='\n<!-- Third-party licenses and data attribution\n'+text.replaceAll('--','—')+'\n-->\n';
}});
export default defineConfig({plugins:[viteSingleFile(),legal()],build:{target:'es2020',assetsInlineLimit:10000000},server:{host:'0.0.0.0',port:4173,strictPort:true}});
