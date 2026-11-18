/** Ordem Paranormal 2 — dados e rolagens do playtest beta.
 * Não usar as regras da edição anterior (NEX, 5 atributos, Xd20).
 * Referência: playtest, testes básicos e Dado de Pavor (p. 24);
 * referências de ficha: Playtest beta - fichas de personagens elite.
 */
export const OP2_STEPS = Object.freeze([4, 6, 8, 10, 12]);
export const OP2_ARCHETYPES = Object.freeze(['Analista','Vigilante','Executor']);
export const OP2_ATTRIBUTES = Object.freeze([['physical','Físico'],['mind','Mente'],['emotion','Emoção']]);
export const OP2_SKILLS = Object.freeze([
 ['Aptidão (Erudição)','mind'],['Aptidão (Folclore)','mind'],['Aptidão (Guerra)','mind'],
 ['Aptidão (Nobreza)','mind'],['Aptidão (Religião)','mind'],['Atletismo','physical'],
 ['Bruxaria','mind'],['Crime','physical'],['Disciplina','emotion'],['Enganação','emotion'],
 ['Furtividade','physical'],['Inspecionar','mind'],['Intimidar','emotion'],
 ['Intuição','emotion'],['Luta','physical'],['Medicina','mind'],
 ['Ofício (Alquimia)','mind'],['Ofício (Carpintaria)','mind'],['Ofício (Culinária)','mind'],
 ['Ofício (Metalurgia)','mind'],['Percepção','mind'],['Persuasão','emotion'],
 ['Pontaria','physical'],['Sobrevivência','mind'],['Vigor','physical'],
]);
export const OP2_DEFAULT_STATS = Object.freeze({
 archetype:'Executor',role:'Ocupação',nivel:'4',physical:'d6',mind:'d8',emotion:'d8',
 pv:'10/10',pd:'10/10',op2DtPv:'7',op2DtPd:'7',
});
export const sides=value=>{
 const m=String(value??'').trim().match(/^d?(4|6|8|10|12)$/i);
 return m ? Number(m[1]) : null;
};
export function moveStep(value,delta=1){
 const index=OP2_STEPS.indexOf(sides(value));
 return OP2_STEPS[Math.max(0,Math.min(OP2_STEPS.length-1,(index<0?0:index)+Math.trunc(Number(delta)||0)))];
}
export function cycleStep(value,delta=1){
 const index=OP2_STEPS.indexOf(sides(value));
 return OP2_STEPS[((((index<0?0:index)+Math.trunc(Number(delta)||0))%OP2_STEPS.length)+OP2_STEPS.length)%OP2_STEPS.length];
}
export function parseTrack(value='10/10'){
 const [current,max]=String(value??'').split('/').map(s=>Number(s));
 const boundedMax=Number.isFinite(max)?Math.max(0,Math.min(9999,Math.trunc(max))):10;
 return {max:boundedMax,current:Number.isFinite(current)?Math.max(0,Math.min(boundedMax,Math.trunc(current))):boundedMax};
}
export function safeJsonRows(value){
 if(!value)return [];
 try { const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).slice(0,200):[]; }
 catch{return [];}
}
export function parseSkillMap(value){
 return Object.fromEntries(String(value??'').split(/\r?\n|;/).map(x=>x.match(/^\s*(.+?)\s*[:=]\s*(.*?)\s*$/)).filter(Boolean).map(m=>[m[1],m[2]]));
}
export function getSkillStep(value,fallback=4){const d=sides(String(value??'').split('|')[0]);return d??fallback;}
export function writeSkillMap(map){return Object.entries(map).map(([key,value])=>`${key}=${value}`).join('\n');}

export function prepareOP2Stats(stats) {
 const skillValues = parseSkillMap(stats.pericias);
 const links = parseSkillMap(stats.op2LinkedAttributes);
 const defaults = Object.fromEntries(OP2_SKILLS);
 for (const [name, current] of Object.entries(skillValues)) {
  const attribute = Object.hasOwn(links, name) ? links[name] : defaults[name];
  const skillDie = sides(current.split('|')[0]);
  const attributeDie = OP2_ATTRIBUTES.some(([key]) => key === attribute) && sides(stats[attribute]);
  if (skillDie && attributeDie) skillValues[name] = `d${skillDie}|d${attributeDie}`;
 }
 const prepared = { ...stats, pericias: writeSkillMap(skillValues) };
 const labels = {
  pericias: 'Perícias',
  op2LinkedAttributes: 'Vínculos de atributos',
  op2ExtraSkills: 'Aptidões e ofícios personalizados',
  op2Abilities: 'Habilidades',
  op2Equipment: 'Equipamentos',
 };
 // cleanCharacter limits each stat to 2400 characters.
 for (const [key, label] of Object.entries(labels)) {
  if (String(prepared[key] ?? '').trim().length > 2400) {
   throw new Error(`${label}: a lista excede o limite de salvamento. Reduza o conteúdo e tente novamente.`);
  }
 }
 return prepared;
}

const randDie=(die,random)=>{
 if(!OP2_STEPS.includes(Number(die)))throw new Error('Use apenas os passos d4 a d12.');
 const n=Number(random());if(!Number.isFinite(n))throw new Error('Gerador de dados inválido.');
 return 1+Math.floor(Math.max(0,Math.min(.999999999,n))*die);
};
/** A regra oficial do Pavor cancela todos os dados cujo resultado seja menor que o Pavor.
 * O modo pavorAsBonus é uma opção da mesa, explicitamente NÃO oficial, e desativada por padrão.
 * Bônus são dados opcionais declarados pelo usuário, nunca proficiências automáticas.
 */
export function rollOrderPlaytest({skillDie=4,attributeDie=8,extraDice=[],stepShift=0,
 difficulty=7,pavorActive=false,pavorDie=6,pavorAsBonus=false,pureAttribute=false}={},random=Math.random){
 const baseSkill=sides(skillDie),attribute=sides(attributeDie);
 if(!attribute || (!pureAttribute&&!baseSkill))throw new Error('Passo de dado inválido.');
 const adjustedSkill=pureAttribute?null:moveStep(baseSkill,stepShift);
 const extras=Array.isArray(extraDice)?extraDice.filter(Boolean):[];
 if(extras.length>2 || extras.some(d=>!sides(d)))throw new Error('Máximo de dois dados bônus entre d4 e d12.');
 const dt=Number(difficulty);
 if(!Number.isInteger(dt)||dt<1||dt>100)throw new Error('DT deve ser um inteiro entre 1 e 100.');
 const dice=[...(pureAttribute?[]:[{kind:'Perícia',sides:adjustedSkill,value:randDie(adjustedSkill,random)}]),
  {kind:'Atributo',sides:attribute,value:randDie(attribute,random)},
  ...extras.map((d,i)=>({kind:`Bônus ${i+1}`,sides:sides(d),value:randDie(sides(d),random)}))];
 const pavor=pavorActive?{sides:sides(pavorDie),value:randDie(sides(pavorDie),random)}:null;
 if(pavorActive&&!pavor?.sides)throw new Error('Dado de Pavor inválido.');
 const canceled=pavor&&!pavorAsBonus?dice.filter(d=>d.value<pavor.value):[];
 const effective=dice.map(d=>({...d,canceled:!!(pavor&&!pavorAsBonus&&d.value<pavor.value)}));
 const kept=effective.filter(d=>!d.canceled);
 const total=kept.reduce((sum,d)=>sum+d.value,0)+(pavorAsBonus&&pavor?pavor.value:0);
 const allCanceled=kept.length===0;
 const base=effective.slice(0,pureAttribute?1:2);
 // O playtest define crítico no teste básico. Dados bônus não criam automaticamente novos críticos.
 const critical=!pureAttribute&&!allCanceled&&base.length===2&&base.every(d=>!d.canceled)&&base[0].value===base[1].value&&base[0].value>=6;
 const criticalFailure=allCanceled||(!pureAttribute&&base.length===2&&base.every(d=>!d.canceled)&&base[0].value===1&&base[1].value===1&&extras.length===0);
 const success=!criticalFailure&&(critical||total>=dt);
 return {dice:effective,pavor,total,dt,success,critical,criticalFailure,allCanceled,
  title:criticalFailure?'Falha crítica':critical?'Sucesso crítico':success?'Sucesso':'Falha',
  formula:effective.map(d=>`${d.kind} d${d.sides} (${d.value})${d.canceled?' — anulado':''}`).join(' + ')+(pavor?` | Pavor d${pavor.sides} (${pavor.value})${pavorAsBonus?' — variante como bônus':' — anula valores menores'}`:''),
  nonOfficial:pavorAsBonus&&!!pavor,adjustedSkill,houseRule:!!pavorAsBonus};
}
