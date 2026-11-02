import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {triangleAgency, daggerheart, vampireV5, cthulhu7, dnd5, sacramento, ordemBallynyr} from '../src/domain/diceEngines.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sequence=values=>{let i=0;return ()=>values[i++%values.length]};
test('Triangle Agency: stable 3 and 6 successes generate zero chaos',()=>{
  assert.deepEqual([triangleAgency(sequence([.55,.55,.55,0,0,0])).chaos,triangleAgency(()=>.55).chaos],[0,0]);
  const fail=triangleAgency(()=>0); assert.equal(fail.chaos,6); assert.equal(fail.good,false);
});
test('Daggerheart: hope, fear and critical equality',()=>{
  assert.equal(daggerheart({},sequence([.75,.2])).withHope,true);
  assert.equal(daggerheart({},()=>.1).critical,true);
});
test('Vampire: hunger bestial failures and messy critical',()=>{
  const fail=vampireV5({pool:2,hunger:1,difficulty:3},sequence([0,0]));assert.equal(fail.bestial,true);
  const messy=vampireV5({pool:2,hunger:1,difficulty:2},()=>.99);assert.equal(messy.messy,true);
});
test('Call of Cthulhu: regular/hard/extreme and disaster',()=>{
  assert.equal(cthulhu7({skill:60},()=>.1).title,'Extremo');
  assert.equal(cthulhu7({skill:60},()=>.99).title,'Desastre / falha crítica');
});
test('D&D advantage and disadvantage use correct d20 and modifiers',()=>{
  const good=dnd5({advantage:'advantage',attributeScore:16,proficiency:3,bonus:2,difficulty:19},sequence([0,.94]));
  assert.equal(good.chosen,19);assert.equal(good.good,true);
  const bad=dnd5({advantage:'disadvantage',difficulty:5},sequence([0,.94]));assert.equal(bad.chosen,1);assert.equal(bad.fumble,true);
});
test('Sacramento: official derived resources and optional pain penalty',()=>{
  const r=sacramento({physical:2,speed:1,intellect:2,courage:1,antecedent:2,pain:3,housePenalty:true},()=>.5);
  assert.match(r.detail,/8 círculos de Vida/);assert.match(r.detail,/6 pontos de Antecedente/);assert.match(r.detail,/−3 Dor/);
});
test('Ordem Ballynyr: fear cancellation + exposure',()=>{
  const r=ordemBallynyr({skillSides:6,attributeSides:6,exposure:2,difficulty:9},sequence([.15,.9,.99]));
  assert.equal(r.good,false);assert.equal(r.dice.length,3);
});
test('PDF export must not shadow DOM document with PDFDocument',()=>{
  const source=read('src/CampaignModules.jsx');
  assert.match(source,/const pdfDocument = await PDFDocument\.load\(buffer\)/);
  assert.match(source,/const link = document\.createElement\("a"\)/);
  assert.doesNotMatch(source,/const document = await PDFDocument\.load\(buffer\)/);
});
test('1.5 UI has mini player, short invite URLs, crop/zoom and page controls',()=>{
  assert.match(read('src/AudioCenter.jsx'),/audio-mini-controls/);
  assert.match(read('src/AudioCenter.jsx'),/audio-queue-header/);
  assert.match(read('src/AstralisApp.jsx'),/join\/\$\{activeRoom\.id\}-\$\{roomState\.inviteCode\}/);
  assert.match(read('src/SharedTools.jsx'),/onPointerMove=\{pointerMove\}/);
  assert.match(read('src/CampaignModules.jsx'),/library-pages/);
  assert.match(read('server.js'),/invite !== inviteCode\(room\)/);
});
