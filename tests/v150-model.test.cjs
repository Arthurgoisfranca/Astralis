'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const name=path.join(__dirname,'../src/domain/characterSheets.ts');
const js=ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod=new Module(name,module);mod.filename=name;mod.paths=module.paths;mod._compile(js,name);
const {SYSTEM_IDS,buildCharacterSheet,createBlankSheet}=mod.exports;
const base={name:'Teste',stats:{}};
test('Cairn 2e in accepted systems',()=>{
 assert.ok(SYSTEM_IDS.includes('Cairn 2e'));
 assert.equal(createBlankSheet('Cairn 2e','p','p').system,'Cairn 2e');
});
test('Cairn 2e persists inventory types/armor/PG and enforces official slot limit',()=>{
 const record=buildCharacterSheet('Cairn 2e','p','p',{...base,stats:{str:'13',dex:'9',wil:'15',pg:'4',pgMax:'5',armor:'2',fatigue:'2',inventory:'Espada|normal|afiação\nBaú|volumoso|pesado\nAnel|miudeza|ornamento'}});
 assert.deepEqual(record.attributes,{str:13,dex:9,wil:15});assert.equal(record.inventory[1].type,'volumoso');assert.equal(record.armor,2);assert.equal(record.guard.current,4);
 const full=buildCharacterSheet('Cairn 2e','p','p',{...base,stats:{inventory:'Espada|normal|\nBaú|volumoso|',fatigue:'7',pg:'5'}});
 assert.equal(full.guard.current,0);
 assert.throws(()=>buildCharacterSheet('Cairn 2e','p','p',{...base,stats:{inventory:'Espada|normal|\nBaú|volumoso|',fatigue:'8'}}));
});
test('Ordem Paranormal II saves official dice steps and skill matrices',()=>{
 const record=buildCharacterSheet('Ordem Paranormal 2','p','p',{...base,stats:{physical:'d8',mind:'d6',emotion:'d10',pericias:'Acrobacia=d6|d8\nPercepção=d8|d6'}});
 assert.equal(record.attributes.physical,8);assert.equal(record.diceSkills['Acrobacia'].skillDie,6);assert.equal(record.diceSkills['Percepção'].attributeDie,6);
});
test('Assimilação saves symbolic mechanics as text, instintos, aptitudes and resources',()=>{
 const record=buildCharacterSheet('Assimilação RPG','p','p',{...base,stats:{instinct_influencia:'3',instinct_sagacidade:'2',knowledge:'Engenharia:2',practices:'Armas:1',health:'10/18',determination:'5/9',assimilation:'2'}});
 assert.equal(record.instincts.influencia,3);assert.equal(record.instincts.sagacidade,2);
 assert.equal(record.knowledge,'Engenharia:2');assert.equal(record.health.max,18);
 assert.equal(record.assimilation,2);
});
