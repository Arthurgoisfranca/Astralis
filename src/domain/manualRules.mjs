/** Regras puras extraídas somente dos livros recebidos.
 * Cairn 2e Guia do Jogador PT-BR pp. 8–9, 62–66;
 * Ordem Paranormal II Playtest beta pp. 8–12;
 * D&D Livro do Jogador 2024, ficha oficial.
 */
export const die = (sides, random=Math.random)=>Math.floor(Math.max(0, Math.min(.999999999, random()))*sides)+1;
export function cairnSave(attribute,random=Math.random){
 const target=Number(attribute);if(!Number.isInteger(target)||target<0||target>20)throw Error('Atributo Cairn deve ser inteiro entre 0 e 20.');
 const value=die(20,random);return {value,target,success:value===1||(value!==20&&value<=target),criticalSuccess:value===1,automaticFailure:value===20};
}
export function cairnSlots(inventory='',fatigue=0){
 const items=String(inventory||'').split(/\r?\n/).filter(Boolean).map(line=>{const [name,type='normal',notes='']=line.split('|');return {name:name.trim(),type:type.toLowerCase().trim(),notes};}).filter(x=>x.name);
 const itemSlots=items.reduce((n,x)=>n+(x.type==='miudeza'?0:x.type==='volumoso'?2:1),0);
 const fatigueSlots=Math.max(0,Math.trunc(Number(fatigue)||0));
 return {items,itemSlots,fatigueSlots,total:itemSlots+fatigueSlots,max:10,comfortable:4,overLimit:itemSlots+fatigueSlots>10,full:itemSlots+fatigueSlots===10};
}
export function cairnDamage({raw=0,armor=0,guard=0,strength=0}={}){
 const net=Math.max(0,Math.trunc(Number(raw)||0)-Math.max(0,Math.min(3,Math.trunc(Number(armor)||0))));
 const pg=Math.max(0,Math.trunc(Number(guard)||0));const lost=Math.min(pg,net);const nextPG=Math.max(0,pg-net);const overflow=Math.max(0,net-pg);
 return {net,lost,nextPG,overflow,nextStrength:Math.max(0,Number(strength)-overflow),scarIndex:pg>0&&net===pg?lost:null,criticalSaveNeeded:overflow>0};
}
export const CAIRN_SCARS={1:'Cicatriz Duradoura',2:'Golpe Chocante',3:'Sacudido',4:'Membro Quebrado',5:'Doença',6:'Ferimento Desorientador na Cabeça',7:'Tendão Partido',8:'Ensurdecido',9:'Reconfiguração Mental',10:'Membro Estropiado',11:'Ferimento Mortal',12:'Condenado'};
export function ordemBasic({skillSides=6,attributeSides=6,difficulty=7}={},random=Math.random){
 const valid=[4,6,8,10,12,20];if(!valid.includes(Number(skillSides))||!valid.includes(Number(attributeSides)))throw Error('Passos de dados devem ser d4, d6, d8, d10, d12 ou d20.');
 const skill=die(Number(skillSides),random),attribute=die(Number(attributeSides),random),total=skill+attribute;
 const critical=skill===attribute&&skill>=6,criticalFailure=skill===1&&attribute===1;
 return {dice:[skill,attribute],total,critical,criticalFailure,good:!criticalFailure&&(critical||total>=Number(difficulty)),title:critical?'Sucesso crítico':criticalFailure?'Falha crítica':total>=Number(difficulty)?'Sucesso':'Falha'};
}
/** Ordem Paranormal II beta p. 24: Pavor só se o personagem tiver recebido o dado. */
export function ordemWithPavor({skillSides=6,attributeSides=6,difficulty=7,pavorSides=6}={},random=Math.random){
 const valid=[4,6,8,10,12,20];if(!valid.includes(Number(pavorSides)))throw Error('Passo de Pavor inválido.');
 const basic=ordemBasic({skillSides,attributeSides,difficulty},random);const pavor=die(Number(pavorSides),random);
 const kept=basic.dice.filter(n=>n>=pavor);const total=kept.reduce((a,b)=>a+b,0);
 const criticalFailure=!kept.length||basic.criticalFailure;
 const critical=!criticalFailure&&kept.length>=2&&kept[0]===kept[1]&&kept[0]>=6;
 return {dice:[...basic.dice,pavor],pavor,total,critical,criticalFailure,good:!criticalFailure&&(critical||total>=Number(difficulty)),title:critical?'Sucesso crítico':criticalFailure?'Falha crítica':total>=Number(difficulty)?'Sucesso':'Falha',detail:`Perícia ${basic.dice[0]}, atributo ${basic.dice[1]}, Pavor ${pavor}. Dados mantidos ${kept.join('+')||'nenhum'} = ${total} contra DT ${difficulty}.`};
}
/** Expressão explícita registrada na ficha, sem inferir bônus mecânicos. */
export function rollExpression(expression,random=Math.random){
 const match=String(expression||'').replace(/\s+/g,'').match(/^(?:(\d{1,2})?d(4|6|8|10|12|20|100))(?:([+-])(\d{1,3}))?$/i);
 if(!match)throw Error('Informe dano no formato 1d6, 2d8+3 ou similar.');
 const count=Number(match[1]||1),sides=Number(match[2]);if(count>20)throw Error('Máximo: 20 dados.');
 const dice=Array.from({length:count},()=>die(sides,random));const modifier=Number(match[4]||0)*(match[3]==='-'?-1:1);
 return {dice,sides,modifier,total:dice.reduce((a,b)=>a+b,modifier),expression:String(expression)};
}
