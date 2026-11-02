import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {triangleAgency,daggerheart,vampireV5,cthulhu7,dnd5,sacramento,ordemBallynyr} from '../src/domain/diceEngines.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const seq=(values)=>{let i=0;return ()=>values[i++%values.length]};
test('All 7 dice engines resolve deterministic results',()=>{
 assert.equal(triangleAgency(()=>.55).chaos,0);
 assert.equal(triangleAgency(()=>0).chaos,6);
 assert.equal(daggerheart({},()=>.1).critical,true);
 assert.equal(vampireV5({pool:2,hunger:1,difficulty:3},()=>0).bestial,true);
 assert.equal(vampireV5({pool:2,hunger:1,difficulty:2},()=>.99).messy,true);
 assert.equal(cthulhu7({skill:60},()=>.1).title,'Extremo');
 assert.equal(cthulhu7({skill:60},()=>.99).title,'Desastre / falha crítica');
 assert.equal(dnd5({advantage:'advantage',attributeScore:16,proficiency:3,bonus:2,difficulty:19},seq([0,.94])).chosen,19);
 assert.equal(dnd5({advantage:'disadvantage',difficulty:5},seq([0,.94])).fumble,true);
 assert.match(sacramento({physical:2,speed:1,intellect:2,courage:1,antecedent:2,pain:3,housePenalty:true},()=>.5).detail,/−3 Dor/);
 assert.equal(ordemBallynyr({skillSides:6,attributeSides:6,exposure:2,difficulty:9},seq([.15,.9,.99])).dice.length,3);
});
test('Fields and skill matrices are guarded from non-array historical records',()=>{
 const source=read('src/CharacterStudio.jsx');
 assert.match(source,/Array\.isArray\(part\?\.fields\)\?part\.fields:\[\]/);
 assert.match(source,/Array\.isArray\(field\?\.rows\)\?field\.rows:\[\]/);
 assert.match(source,/Array\.isArray\(field\?\.options\)\?field\.options:\[\]/);
 assert.match(source,/Array\.isArray\(blueprint\?\.sections\)\?blueprint\.sections:\[\]/);
 assert.match(source,/SheetErrorBoundary/);
});
test('Theme uses global context, root classes and localStorage',()=>{
 const source=read('src/AstralisApp.jsx');
 for(const value of ['ThemeContext','ThemeProvider','localStorage.setItem','document.documentElement.classList.toggle','ThemeToggle'])assert.ok(source.includes(value));
 assert.match(read('src/astralisTheme.css'),/:root\[data-theme="light"\]/);
});
test('Short stateless links preserve existing server and legacy invites',()=>{
 const source=read('src/AstralisApp.jsx');
 assert.match(source,/compactInvitation\(activeRoom\.id,activeRoom\.inviteToken\)/);
 assert.match(source,/url\.searchParams\.get\('invite'\)/);
 assert.match(source,/location\.pathname\.startsWith\("\/join\/"\)/);
});
test('Token crop, PDF lazy loading and pagination are in bounded UI components',()=>{
 assert.match(read('src/SharedTools.jsx'),/onPointerMove=\{move\}/);
 assert.match(read('src/SharedTools.jsx'),/setOffset\(\{x:0,y:0\}\)/);
 assert.match(read('src/CampaignModules.jsx'),/loading="lazy"/);
 assert.match(read('src/CampaignModules.jsx'),/visible\.slice\(\(currentPage-1\)\*pageSize,currentPage\*pageSize\)/);
 assert.match(read('src/astralisTheme.css'),/object-fit:contain/);
});
test('Critical files remain original v1.4 bytes',async()=>{
 const {execFileSync}=await import('node:child_process');
 const {createHash}=await import('node:crypto');
 const {readFileSync}=await import('node:fs');
 const archive=path.resolve(root,'../Mesa-e-Dados-v1.4-preservada-melhorias-v1.5.zip');
 // Only run archive comparison when this reference exists (developer workspace).
 if(!fs.existsSync(archive))return;
 for(const file of ['server.js','src/AudioCenter.jsx','package.json','package-lock.json','render.yaml','vite.config.js','public/sw.js','public/manifest.json','index.html']){
  const original=execFileSync('unzip',['-p',archive,file]);const current=readFileSync(path.join(root,file));
  assert.equal(createHash('sha256').update(current).digest('hex'),createHash('sha256').update(original).digest('hex'),file);
 }
});
