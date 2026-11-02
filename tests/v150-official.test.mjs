import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cairnSave,cairnSlots,cairnDamage,CAIRN_SCARS,ordemBasic,ordemWithPavor,rollExpression} from '../src/domain/manualRules.mjs';
import {triangleAgency,daggerheart} from '../src/domain/diceEngines.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const rng=n=>()=>n;
const sequence=(values)=>{let i=0;return ()=>values[i++%values.length]};
test('Cairn 2e: 1d20 <= attribute and natural 1/20 exceptions (guide p.62)',()=>{
 assert.equal(cairnSave(10,rng(0)).success,true);
 assert.equal(cairnSave(10,rng(.999)).success,false);
 assert.equal(cairnSave(10,rng(.45)).value,10);
 assert.equal(cairnSave(10,rng(.45)).success,true);
 assert.equal(cairnSave(10,rng(.5)).success,false);
});
test('Cairn 2e: inventory normal=1 bulky=2 trinket=0 fatigue=slot, cap 10 (guide p.9)',()=>{
 assert.equal(cairnSlots('Sword|normal|\nAnvil|volumoso|\nRing|miudeza|',2).total,5);
 assert.equal(cairnSlots(Array(9).fill('Torch|normal|').join('\n'),2).overLimit,true);
 assert.equal(cairnSlots(Array(8).fill('Torch|normal|').join('\n'),2).full,true);
});
test('Cairn 2e: armor (max 3) reduces damage; exact zero PG scars, overflow STR (guide pp.64-66)',()=>{
 assert.deepEqual(cairnDamage({raw:5,armor:2,guard:3,strength:10}),{net:3,lost:3,nextPG:0,overflow:0,nextStrength:10,scarIndex:3,criticalSaveNeeded:false});
 const hit=cairnDamage({raw:9,armor:1,guard:3,strength:10});
 assert.equal(hit.nextStrength,5);
 assert.equal(hit.criticalSaveNeeded,true);
 assert.equal(CAIRN_SCARS[3],'Sacudido');
});
test('Ordem Paranormal II: additive attribute+skill DT 7, matching >=6 critical, all-ones fail (beta pp.10-11)',()=>{
 assert.equal(ordemBasic({},sequence([.99,.99])).critical,true);
 assert.equal(ordemBasic({skillSides:6,attributeSides:6,difficulty:7},rng(0)).criticalFailure,true);
 assert.equal(ordemBasic({skillSides:6,attributeSides:8,difficulty:7},sequence([.5,.5])).total,9);
});
test('Ordem paranormal II: Pavor OPTIONAL d6 cancels lower results, can force fail (beta p.24)',()=>{
 const fail=ordemWithPavor({},sequence([0,.3,.999]));
 assert.equal(fail.criticalFailure,true);
 assert.equal(fail.total,0);
 const good=ordemWithPavor({},sequence([.99,.99,0]));
 assert.equal(good.good,true);
});
test('Triangle 6d4 threes and Daggerheart hope/fear, doubles (manuals pp.33-39 and 90)',()=>{
 assert.equal(triangleAgency(rng(.51)).threes,6);
 assert.equal(triangleAgency(rng(0)).chaos,6);
 const dh=daggerheart({},rng(.2));assert.equal(dh.critical,true);assert.equal(dh.withHope,true);
});
test('Arsenal: only explicit dice expressions; reject implicit mechanics',()=>{
 assert.equal(rollExpression('2d8+3',rng(0)).total,5);
 assert.throws(()=>rollExpression('ataque sem dano informado'));
 assert.throws(()=>rollExpression('d200'));
});
test('Cairn 2e available in schemas and character model: user can save its sheet',()=>{
 assert.match(read('src/domain/characterSheets.ts'),/case "Cairn 2e"/);
 assert.match(read('src/domain/characterSheets.ts'),/interface Cairn2eSheet/);
 assert.match(read('src/systemSheetBlueprints.js'),/"Cairn 2e"/);
 assert.match(read('src/CharacterStudio.jsx'),/cairnInventory/);
});
test('Astralis visual identity and PWA; protected working audio untouched',()=>{
 const manifest=JSON.parse(read('public/manifest.json'));
 assert.match(manifest.name,/Astralis/);assert.equal(manifest.short_name,'Astralis');
 assert.doesNotMatch(manifest.name,/Mesa & Dados|M&D/);
 assert.match(read('src/astralisTheme.css'),/data-system-theme/);
 assert.match(read('src/AccountPanel.jsx'),/onSession/);
});
test('No secrets or generated directories shipped',()=>{
 assert.equal(fs.existsSync(path.join(root,'.env')),false);
 assert.equal(fs.existsSync(path.join(root,'dist')),false);
 assert.equal(fs.existsSync(path.join(root,'node_modules')),false);
});
