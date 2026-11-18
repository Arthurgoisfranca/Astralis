import test from 'node:test';
import assert from 'node:assert/strict';
import {
 OP2_ARCHETYPES,OP2_ATTRIBUTES,OP2_SKILLS,OP2_STEPS,OP2_DEFAULT_STATS,
 moveStep,cycleStep,parseTrack,parseSkillMap,writeSkillMap,getSkillStep,
 safeJsonRows,rollOrderPlaytest,prepareOP2Stats
} from '../src/domain/ordemPlaytestStudio.mjs';
const rng=(...rolls)=>{let i=0;return ()=>((rolls[i++]??1)-1)/20;};
const diceRng=(...entries)=>{let i=0;return ()=>{const [result,sides]=entries[i++]||[1,4];return (result-.5)/sides;};};
test('três arquétipos separados e lista de perícias do layout fornecido',()=>{
 assert.deepEqual(OP2_ARCHETYPES,['Analista','Vigilante','Executor']);
 assert.deepEqual(OP2_ATTRIBUTES.map(([k])=>k),['physical','mind','emotion']);
 assert.ok(OP2_SKILLS.length>=25);assert.equal(new Set(OP2_SKILLS.map(([k])=>k)).size,OP2_SKILLS.length);
 assert.equal(OP2_DEFAULT_STATS.physical,'d6');
});
test('passos dos dados: piso, teto e ciclo de cinco formas',()=>{
 assert.deepEqual(OP2_STEPS,[4,6,8,10,12]);
 assert.equal(moveStep('d4',-1),4);assert.equal(moveStep('d4',1),6);
 assert.equal(moveStep('d8',2),12);assert.equal(moveStep('d12',1),12);
 assert.equal(cycleStep('d12',1),4);assert.equal(cycleStep('d4',-1),12);
});
test('tracks clamp e serialização de perícias antigas',()=>{
 assert.deepEqual(parseTrack('15/10'),{current:10,max:10});
 assert.deepEqual(parseTrack('3/5'),{current:3,max:5});
 const text=writeSkillMap({'Bruxaria':'d4|d8','Luta':'d6|d6'});
 assert.equal(parseSkillMap(text).Luta,'d6|d6');
 assert.equal(getSkillStep(parseSkillMap(text).Bruxaria),4);
 assert.deepEqual(safeJsonRows('not json'),[]);
});
test('teste básico 1d4+1d8 e DT7',()=>{
 const r=rollOrderPlaytest({skillDie:4,attributeDie:8,difficulty:7},diceRng([3,4],[7,8]));
 assert.deepEqual(r.dice.map(d=>d.value),[3,7]);assert.equal(r.total,10);
 assert.equal(r.success,true);assert.equal(r.pavor,null);
});
test('salvamento atualiza os vínculos novos e mantém os dados de perícias legadas',()=>{
 const stats = {
  physical: 'd6', mind: 'd8', emotion: 'd12',
  pericias: 'Bruxaria=d4|d6\nLuta=d6|d6\nAcrobacia=d6|d10',
  op2LinkedAttributes: 'Luta=emotion',
 };
 assert.deepEqual(parseSkillMap(prepareOP2Stats(stats).pericias), {
  Bruxaria: 'd4|d8', Luta: 'd6|d12', Acrobacia: 'd6|d10',
 });
 assert.equal(stats.pericias, 'Bruxaria=d4|d6\nLuta=d6|d6\nAcrobacia=d6|d10');
});
test('salvamento impede que o servidor corte as listas JSON',()=>{
 const rows = JSON.stringify([{ name: 'Recurso', text: 'a'.repeat(2400) }]);
 assert.throws(() => prepareOP2Stats({ op2Abilities: rows }), /Habilidades.*limite/);
 assert.throws(() => prepareOP2Stats({ op2Equipment: rows }), /Equipamentos.*limite/);
 const accepted = JSON.stringify([{ name: 'Recurso', text: 'a'.repeat(200) }]);
 assert.equal(prepareOP2Stats({ op2Abilities: accepted }).op2Abilities, accepted);
});
test('modificador aumenta passos e inclui até dois dados de bônus',()=>{
 const r=rollOrderPlaytest({skillDie:4,attributeDie:8,stepShift:2,extraDice:[6,12],difficulty:11},diceRng([4,8],[5,8],[6,6],[8,12]));
 assert.equal(r.adjustedSkill,8);assert.equal(r.total,23);assert.equal(r.success,true);
});
test('Pavor real cancela valores inferiores, mas não valores iguais',()=>{
 const r=rollOrderPlaytest({skillDie:4,attributeDie:8,pavorActive:true,pavorDie:6},diceRng([3,4],[5,8],[5,6]));
 assert.equal(r.dice[0].canceled,true);assert.equal(r.dice[1].canceled,false);
 assert.equal(r.total,5);assert.equal(r.success,false);
});
test('Pavor cancelando ambos causa falha crítica',()=>{
 const r=rollOrderPlaytest({skillDie:4,attributeDie:8,pavorActive:true,pavorDie:6},diceRng([3,4],[1,8],[5,6]));
 assert.equal(r.total,0);assert.equal(r.criticalFailure,true);assert.equal(r.allCanceled,true);
});
test('Pavor como bônus é explicitamente variante não oficial',()=>{
 const r=rollOrderPlaytest({skillDie:4,attributeDie:8,pavorActive:true,pavorAsBonus:true,pavorDie:6},diceRng([3,4],[1,8],[5,6]));
 assert.equal(r.total,9);assert.equal(r.nonOfficial,true);assert.equal(r.allCanceled,false);
});
test('sem Pavor, rolagem pura de atributo usa apenas seu dado',()=>{
 const r=rollOrderPlaytest({attributeDie:'d8',pureAttribute:true,difficulty:7},diceRng([6,8]));
 assert.equal(r.total,6);assert.equal(r.dice.length,1);assert.equal(r.success,false);
});
test('entrada errada é rejeitada sem inventar resultados',()=>{
 assert.throws(()=>rollOrderPlaytest({skillDie:20,attributeDie:8}));
 assert.throws(()=>rollOrderPlaytest({skillDie:4,attributeDie:8,difficulty:0}));
 assert.throws(()=>rollOrderPlaytest({skillDie:4,attributeDie:8,extraDice:[4,6,8]}));
});
