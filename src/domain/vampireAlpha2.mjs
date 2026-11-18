// Vampire: The Masquerade — public Alpha 2.0, Fall 2026. Not V5.
// Player Packet pp. 26, 39–40, 50, 56, 93–98, 103–104; Storyteller Packet: Masquerade Tracker.
export const VAMPIRE_ALPHA2 = "Vampire: The Masquerade 6E (Alpha 2.0)";
export const VAMPIRE_V5_LEGACY = "Vampire: The Masquerade 5E / 6E";
export const ALPHA_ATTRIBUTES = [["strength","Força"],["dexterity","Destreza"],["stamina","Vigor"],["charisma","Carisma"],["manipulation","Manipulação"],["composure","Autocontrole"],["intelligence","Inteligência"],["wits","Raciocínio"],["resolve","Determinação"]];
export const ALPHA_SKILLS = ["Athletics","Awareness","Craft","Expression","Fighting","Investigation","Knowledge","Medicine","Persuasion","Sabotage","Shooting","Subterfuge","Survival"];
export const ALPHA_CLANS = ["Brujah","Gangrel","Lasombra","Ministry","Nosferatu","Toreador","Tzimisce","Ventrue"];
export const ALPHA_GENERATIONS = ["Duskborn","Neonate","Ancilla","Elder"];
const bounded=(value,min,max,fallback=min)=>{const n=Number(value);return value===""||value==null||!Number.isFinite(n)?fallback:Math.max(min,Math.min(max,Math.trunc(n)));};
export function alphaResources(stats={}){
 const category=ALPHA_GENERATIONS.includes(stats.generationCategory)?stats.generationCategory:"Neonate";
 const modifier=category==="Elder"?3:category==="Ancilla"?2:1;
 const healthMax=bounded(stats.stamina,1,5,1)+5;
 const willpowerMax=bounded(stats.composure,1,5,1)+bounded(stats.resolve,1,5,1);
 const vitaeMax=5+5*modifier;
 const baneful=bounded(stats.banefulDamage,0,healthMax);
 const current=(key,max)=>bounded(String(stats[key]??"").split("/")[0],0,max,max);
 const vitae=current("vitae",vitaeMax);
 return {category,modifier,healthMax,willpowerMax,vitaeMax,health:current("health",healthMax-baneful),willpower:current("willpower",willpowerMax),vitae,baneful,hunger:Math.ceil((vitaeMax-vitae)/(vitaeMax/5))};
}
export function alphaResult(dice,hungerCount,difficulty){
 if(!Array.isArray(dice)||dice.length<1||dice.some(v=>!Number.isInteger(v)||v<1||v>10))throw new Error("Dados d10 inválidos.");
 const red=bounded(hungerCount,0,Math.min(5,dice.length)),target=bounded(difficulty,1,100,1);
 const total=dice.reduce((sum,v)=>sum+(v===10?2:v>=6?1:0),0),critical=dice.filter(v=>v===10).length,good=total>=target;
 const painful=!good&&total===0,bestial=!good&&red>0&&dice.slice(-red).includes(1);
 return {dice:[...dice],hungerCount:red,total,critical,good,painful,bestial,margin:total-target,difficulty:target,bargainEligible:!good&&!painful,title:good?"Sucesso":painful&&bestial?"Falha dolorosa e bestial":painful?"Falha dolorosa":bestial?"Falha bestial":"Falha",detail:total+" sucessos · "+critical+" resultado(s) 10 (2 sucessos cada) · margem "+(total-target)+". "+(painful?"Complicação adicional; sem Pacto com a Besta.":bestial?"O Narrador define a consequência da Besta.":"")};
}
export function vampireAlpha2({pool,hunger=0,difficulty=1},rng=Math.random){
 const size=bounded(pool,0,100);if(!size)throw new Error("A parada está vazia. Consulte o Narrador; não há dado automático.");
 const dice=Array.from({length:size},()=>Math.floor(Math.max(0,Math.min(.999999999,rng()))*10)+1);
 return alphaResult(dice,hunger,difficulty);
}
export function alphaTakingHalf(pool,difficulty=1){
 const size=bounded(pool,0,100);if(!size)throw new Error("A parada está vazia.");
 const total=Math.ceil(size/2),target=bounded(difficulty,1,100,1);
 return {dice:[],hungerCount:0,total,good:total>=target,margin:total-target,title:total>=target?"Sucesso · metade":"Falha · metade",detail:total+" sucessos (metade arredondada para cima), margem "+(total-target)+". Somente fora de situações estressantes."};
}
export function alphaReroll(result,indices,rng=Math.random){
 if(!result?.dice?.length)throw new Error("Role primeiro.");
 if(!Array.isArray(indices)||indices.length<1||indices.length>3||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=result.dice.length-result.hungerCount))throw new Error("Escolha de 1 a 3 dados comuns; Fome não pode ser rerrolada.");
 const dice=result.dice.map((v,i)=>indices.includes(i)?Math.floor(Math.max(0,Math.min(.999999999,rng()))*10)+1:v);
 return alphaResult(dice,result.hungerCount,result.difficulty);
}
