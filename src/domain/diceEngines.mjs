/** Pure 1.5 tabletop roll resolvers. Pass a deterministic rng (0..1) for tests. */
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(n))?Number(n):min));
export const rollDie=(sides,rng=Math.random)=>Math.floor(clamp(rng(),0,.999999999)*sides)+1;
export const signed=n=>n>=0?`+${n}`:String(n);
export function triangleAgency(rng=Math.random){
  const dice=Array.from({length:6},()=>rollDie(4,rng));
  const threes=dice.filter(value=>value===3).length;
  const stable=threes>0&&threes%3===0;
  const chaos=stable?0:6-threes;
  const triscendence=threes===3;
  return {dice,title:triscendence?'Triscendência':stable?'Sucesso estável':threes?'Sucesso instável':'Falha',good:threes>0,highlight:3,chaos,threes,stable,detail:`${threes} resultado(s) 3 · ${chaos} Caos para a reserva do Mestre${triscendence?' · Triscendência!':''}.`};
}
export function daggerheart({attribute=0,bonus=0,difficulty=12}={},rng=Math.random){
  const hopeDie=rollDie(12,rng),fearDie=rollDie(12,rng),critical=hopeDie===fearDie,total=hopeDie+fearDie+Number(attribute)+Number(bonus),good=critical||total>=Number(difficulty),withHope=hopeDie>=fearDie;
  return {dice:[hopeDie,fearDie],hopeDie,fearDie,critical,withHope,total,good,dual:true,title:critical?'Crítico':`${good?'Sucesso':'Falha'} com ${withHope?'Esperança':'Medo'}`,detail:`2d12 ${hopeDie}+${fearDie} ${signed(Number(attribute))} atributo ${signed(Number(bonus))} bônus = ${total} contra ${difficulty}. ${critical?'+1 Esperança, recupera 1 Estresse':withHope?'+1 Esperança':'+1 Medo para o Mestre'}.`};
}
export function vampireV5({pool=3,hunger=0,difficulty=1}={},rng=Math.random){
  const size=clamp(Math.floor(pool),1,30),hungerCount=clamp(Math.floor(hunger),0,Math.min(5,size));
  const white=Array.from({length:size-hungerCount},()=>rollDie(10,rng)),red=Array.from({length:hungerCount},()=>rollDie(10,rng)),dice=[...white,...red];
  const base=dice.filter(v=>v>=6).length,tens=dice.filter(v=>v===10).length,criticalPairs=Math.floor(tens/2),total=base+2*criticalPairs,good=total>=Number(difficulty);
  const messy=good&&criticalPairs>0&&red.includes(10),bestial=!good&&red.includes(1);
  return {dice,total,good,hungerCount,criticalPairs,messy,bestial,title:messy?'Crítico bagunçado':bestial?'Falha bestial':good?'Sucesso':'Falha',detail:`${total} sucessos (${base} básicos, ${criticalPairs} par(es) de críticos) · ${hungerCount} dado(s) de Fome · dificuldade ${difficulty}.`};
}
export function cthulhu7({skill=50}={},rng=Math.random){
  const value=rollDie(100,rng),rating=clamp(Math.trunc(skill),0,100),hard=Math.floor(rating/2),extreme=Math.floor(rating/5),fumble=value===100||(rating<50&&value>=96);
  const title=value===1?'Crítico':fumble?'Desastre / falha crítica':value<=extreme?'Extremo':value<=hard?'Difícil':value<=rating?'Regular':'Falha';
  return {dice:[value],good:['Crítico','Regular','Difícil','Extremo'].includes(title),title,detail:`d100 ${String(value).padStart(2,'0')} · regular ≤ ${rating} · difícil ≤ ${hard} · extremo ≤ ${extreme} · 01 crítico.`};
}
export function dnd5({advantage='normal',attributeScore=10,proficiency=0,bonus=0,difficulty=12}={},rng=Math.random){
 const first=rollDie(20,rng),second=advantage==='normal'?null:rollDie(20,rng),natural=second===null?first:advantage==='advantage'?Math.max(first,second):Math.min(first,second);
 const modifier=Math.floor((Number(attributeScore)-10)/2),total=natural+modifier+Number(proficiency)+Number(bonus),critical=natural===20,fumble=natural===1,good=!fumble&&(critical||total>=Number(difficulty));
 return {dice:second===null?[first]:[first,second],chosen:natural,critical,fumble,good,title:critical?'20 natural':fumble?'1 natural':good?'Sucesso':'Falha',detail:`${natural} ${signed(modifier)} atributo ${signed(Number(proficiency))} proficiência ${signed(Number(bonus))} bônus = ${total} contra CD ${difficulty}. ${advantage==='normal'?'Rolagem normal':advantage==='advantage'?'Vantagem':'Desvantagem'}. Críticos automáticos se aplicam a ataques; para testes, consulte o Mestre.`};
}
/** Sacramento: official attribute-derived resources; cumulative penalty is optional house rule. */
export function sacramento({antecedent=0,difficulty=5,physical=0,speed=0,intellect=0,courage=0,pain=0,housePenalty=false}={},rng=Math.random){
 const value=rollDie(6,rng),penalty=housePenalty?clamp(Math.floor(pain),0,6):0,total=value+Number(antecedent)-penalty,good=total>=Number(difficulty);
 return {dice:[value],good,title:good?'Sucesso':'Falha',detail:`1d6 (${value}) ${signed(Number(antecedent))} antecedente ${housePenalty?`−${penalty} Dor (regra opcional)`:''} = ${total} contra Defesa ${difficulty}. Recursos: ${6+Number(physical)} círculos de Vida, ${1+Number(speed)} Movimento, ${4+Number(intellect)} pontos de Antecedente, ${1+Number(courage)} Ações de Combate.`};
}
/** Ordem Paranormal 2 / Ballynyr: follows the uploaded playtest's contested Pavor roll. */
export function ordemBallynyr({skillSides=6,attributeSides=6,difficulty=7,threat=20,exposure=0}={},rng=Math.random){
 const skill=rollDie(clamp(skillSides,4,20),rng),attribute=rollDie(clamp(attributeSides,4,20),rng),fear=rollDie(6,rng),active=[skill,attribute].filter(v=>v>=fear),total=active.reduce((n,v)=>n+v,0)-clamp(exposure,0,20),critical=active.length===0,good=!critical&&total>=Number(difficulty),threatened=active.some(v=>v>=Number(threat));
 return {dice:[skill,attribute,fear],good,critical,title:critical?'Falha crítica':good?'Sucesso':'Falha',detail:`Perícia ${skill}, atributo ${attribute}, Pavor ${fear} · ${active.length} dado(s) preservado(s), exposição −${clamp(exposure,0,20)}. Total ${total} vs DT ${difficulty}${threatened?' · margem de ameaça alcançada':''}.`,threatened};
}
