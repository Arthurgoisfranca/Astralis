import React,{useEffect,useMemo,useRef,useState} from 'react';
import {rollExpression} from './domain/manualRules.mjs';
import {
 OP2_STEPS,OP2_ARCHETYPES,OP2_ATTRIBUTES,OP2_SKILLS,OP2_DEFAULT_STATS,OP2_NOTEBOOK_FIELDS,OP2_STAT_LIMIT,
 sides,moveStep,cycleStep,parseTrack,parseSkillMap,writeSkillMap,getSkillStep,
 safeJsonRows,rollOrderPlaytest
} from './domain/ordemPlaytestStudio.mjs';
import ResourceEditor, { ImpetusBar } from './OrdemPlaytestEditor.jsx';
import { DiceTray, InvestigationPanel, RelationsPanel } from './OrdemPlaytestPanels.jsx';
import './ordemParanormalStudio.css';

const titleAttribute={physical:'FÍSICO',mind:'MENTE',emotion:'EMOÇÃO'};
const toInt=(v,min=0,max=9999)=>Math.max(min,Math.min(max,Math.trunc(Number(v)||0)));
const val=(stats,key)=>stats[key]??OP2_DEFAULT_STATS[key]??'';
const db=(sides)=>sides?`d${sides}`:'—';
const storageKey=playerId=>`astralis:op2:draft:${String(playerId??'local').slice(0,72)}`;
const lengthLimit=(input,max=500)=>String(input??'').slice(0,max).replaceAll('|','/');

function DieSymbol({value,dim='md'}){
 const n=Number(value)===20?20:sides(value)||4;
 return <span className={`op2-die op2-die-${n} op2-die-${dim}`} aria-label={`d${n}`}><span>{n}</span></span>;
}
function Ornament({children,extra}){return <h3 className={'op2-ornament '+(extra||'')}>{children}</h3>}
function StepControl({value,onChange,label}){
 const n=sides(value)||4;
 return <div className="op2-step-controls"><button type="button" className="op2-die-click" title={`Rolar ${label}`} aria-label={`Rolar ${label}, d${n}`} onClick={()=>onChange('roll')}><DieSymbol value={n} dim="lg"/></button><button type="button" aria-label={`Diminuir ${label}`} onClick={()=>onChange('d'+moveStep(n,-1))}>−</button><button type="button" aria-label={`Aumentar ${label}`} onClick={()=>onChange('d'+moveStep(n,1))}>+</button></div>;
}
function Track({id,label,icon,stats,onChange,onRoll}){
 const field=id==='pv'?'PV':'PD',track=parseTrack(val(stats,id));
 const dtKey=id==='pv'?'op2DtPv':'op2DtPd',dt=toInt(val(stats,dtKey)||7,1,99);
 function adjust(n){onChange(id,`${Math.max(0,Math.min(track.max,track.current+n))}/${track.max}`);}
 return <div className="op2-vital" aria-label={`${label} ${track.current} de ${track.max}`}>
   <div className="op2-dt"><button type="button" onClick={()=>onChange(dtKey,String(Math.max(1,dt-1)))} aria-label={`Diminuir DT ${field}`}>−</button><button type="button" onClick={()=>onRoll(id,dt)} title={`Teste orientativo DT ${dt}`}>DT {String(dt).padStart(2,'0')}</button><button type="button" aria-label={`Aumentar DT ${field}`} onClick={()=>onChange(dtKey,String(Math.min(99,dt+1)))}>+</button></div>
   <div className="op2-vital-bar"><span className="op2-vital-icon" aria-hidden="true">{icon}</span><button type="button" aria-label={`Diminuir ${label}`} onClick={()=>adjust(-1)}>‹</button><label><strong>{field}</strong><input title="Valor atual" type="number" min="0" max={track.max} value={track.current} onChange={e=>onChange(id,`${toInt(e.target.value,0,track.max)}/${track.max}`)}/><span>/</span><input title="Valor máximo" type="number" min="0" max="9999" value={track.max} onChange={e=>{const max=toInt(e.target.value);onChange(id,`${Math.min(track.current,max)}/${max}`);}}/></label><button type="button" aria-label={`Aumentar ${label}`} onClick={()=>adjust(1)}>›</button></div>
 </div>;
}
export default function OrdemParanormalStudio({player,form,setForm,stats,setStat,onTokenOpen}){
 const archetype=OP2_ARCHETYPES.includes(stats.archetype)?stats.archetype:'Executor';
 const [panel,setPanel]=useState('Equipamentos'),[mobile,setMobile]=useState('agent'),[search,setSearch]=useState(''),[sort,setSort]=useState('name');
 const [modsShown,setModsShown]=useState(true),[bonusDice,setBonusDice]=useState([null,null]),[shift,setShift]=useState(0),[pavor,setPavor]=useState(false),[pavorStep,setPavorStep]=useState(6),[housePavorBonus,setHousePavorBonus]=useState(false);
 const [difficulty,setDifficulty]=useState('7'),[rolls,setRolls]=useState([]),[showHistory,setShowHistory]=useState(false),[toast,setToast]=useState(true),[error,setError]=useState('');
 const [editor,setEditor]=useState(null),[importNotice,setImportNotice]=useState('');
 const [section,setSection]=useState('Agente'),[relationsEditing,setRelationsEditing]=useState(false),[diceOpen,setDiceOpen]=useState(false);
 const inputFile=useRef(null),dirty=useRef(false);
 const skills=parseSkillMap(stats.pericias),linked=parseSkillMap(stats.op2LinkedAttributes);
 const abilities=safeJsonRows(stats.op2Abilities),equipment=safeJsonRows(stats.op2Equipment);
 const isAbilitiesPanel=panel==='Habilidades';
 const currentRows=isAbilitiesPanel?abilities:equipment;
 const custom=safeJsonRows(stats.op2ExtraSkills).filter(row=>row?.name&&typeof row.name==='string');
 const skillRows=useMemo(()=>[...OP2_SKILLS.map(([name,attribute])=>({name,attribute})),...custom.map(row=>({name:row.name,attribute:OP2_ATTRIBUTES.some(([k])=>k===row.attribute)?row.attribute:'mind'}))],[stats.op2ExtraSkills]);
 const shownSkills=useMemo(()=>skillRows.filter(row=>row.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))).sort((a,b)=>sort==='step'?getSkillStep(skills[b.name])-getSkillStep(skills[a.name])||a.name.localeCompare(b.name,'pt-BR'):a.name.localeCompare(b.name,'pt-BR')),[skillRows,search,sort,stats.pericias]);
 useEffect(()=>{if(!dirty.current){dirty.current=true;return;}try{localStorage.setItem(storageKey(player?.id),JSON.stringify({name:form.name,classLevel:form.classLevel,appearance:form.appearance,notes:form.notes,inventory:form.inventory,stats}));}catch{/* armazenar em nuvem continua disponível */}},[form.name,form.classLevel,form.appearance,form.notes,form.inventory,stats,player?.id]);
 const update=(key,value)=>setStat(key,value);
 const skillAttr=row=>OP2_ATTRIBUTES.some(([key])=>key===linked[row.name])?linked[row.name]:row.attribute;
 const currentSkill=row=>getSkillStep(skills[row.name],4);
 function changeSkill(row,value){update('pericias',writeSkillMap({...skills,[row.name]:`d${value}|d${sides(val(stats,skillAttr(row)))||6}`}));}
 function changeLinked(row,attribute){update('op2LinkedAttributes',writeSkillMap({...linked,[row.name]:attribute}));}
 function addLog(entry){setRolls(old=>[{id:`${Date.now()}-${Math.random()}`,at:new Date().toLocaleTimeString('pt-BR'),...entry},...old].slice(0,20));setToast(true);setError('');}
 function roll({name,attribute,skillDie,dt=Number(difficulty),pure=false}){
  try{const result=rollOrderPlaytest({skillDie,attributeDie:val(stats,attribute),extraDice:bonusDice,stepShift:pure?0:shift,difficulty:dt,pavorActive:pavor,pavorDie:pavorStep,pavorAsBonus:housePavorBonus,pureAttribute:pure});addLog({name,result});return result;}
  catch(e){setError(e.message);return null;}
 }
 function rollSkill(row,alias){return roll({name:alias||row.name,attribute:skillAttr(row),skillDie:currentSkill(row)});}
 function rollTrack(id,dt){const attr=id==='pv'?'physical':'emotion';roll({name:`Referência ${id==='pv'?'PV':'PD'} · confirme o teste com o Narrador`,attribute:attr,dt,pure:true});}
 function rowUpdate(kind,index,key,value){const all=kind==='Habilidades'?abilities:equipment;update(kind==='Habilidades'?'op2Abilities':'op2Equipment',JSON.stringify(all.map((row,i)=>i===index?{...row,[key]:value}:row)));}
 function rowRemove(kind,index){const all=kind==='Habilidades'?abilities:equipment;update(kind==='Habilidades'?'op2Abilities':'op2Equipment',JSON.stringify(all.filter((_,i)=>i!==index)));}
 function saveEditor(row){
  const isAbility=editor.kind==='Habilidades';
  const all=isAbility?abilities:equipment;
  const rows=editor.index===null?[...all,row]:all.map((item,index)=>index===editor.index?row:item);
  const value=JSON.stringify(rows);
  if(value.length>OP2_STAT_LIMIT) return 'A lista atingiu o limite de salvamento. Reduza a descrição ou remova um registro.';
  update(isAbility?'op2Abilities':'op2Equipment',value);
  setEditor(null);
  setError('');
 }
 function addCustom(){const name=window.prompt('Nome da nova Aptidão / Ofício (sem duplicar outra perícia):');if(!name)return;const cleaned=lengthLimit(name.trim(),65);if(!cleaned)return;if(skillRows.some(row=>row.name.toLocaleLowerCase('pt-BR')===cleaned.toLocaleLowerCase('pt-BR'))){setError('Já existe uma perícia com esse nome.');return;}update('op2ExtraSkills',JSON.stringify([...custom,{name:cleaned,attribute:'mind'}]));}
 function removeCustom(name){update('op2ExtraSkills',JSON.stringify(custom.filter(x=>x.name!==name)));const next={...skills};delete next[name];update('pericias',writeSkillMap(next));}
 function useAbility(ability){const costPd=toInt(ability.pd,0,9999),costPv=toInt(ability.pv,0,9999),pd=parseTrack(val(stats,'pd')),pv=parseTrack(val(stats,'pv'));
  if(pd.current<costPd||pv.current<costPv){setError('PV ou PD insuficiente para o custo cadastrado.');return;}
  if(costPd)update('pd',`${pd.current-costPd}/${pd.max}`);if(costPv)update('pv',`${pv.current-costPv}/${pv.max}`);
  addLog({name:`Habilidade: ${ability.name}`,text:`Custo registrado: ${costPd} PD, ${costPv} PV. ${ability.text||''}`,result:null});}
 function equipmentDamage(item){try{if(!item.damage)throw new Error('Cadastre a expressão de dano conforme o livro/ficha.');const result=rollExpression(item.damage);addLog({name:`Dano · ${item.name}`,text:`${item.damage} → ${result.dice.join(' + ')} ${result.modifier?`(${result.modifier>0?'+':''}${result.modifier})`:''} = ${result.total}`,result:null});}catch(e){setError(e.message);}}
 function equipmentAttack(item){const row=skillRows.find(r=>r.name.toLocaleLowerCase('pt-BR')===String(item.attackSkill||'Luta').toLocaleLowerCase('pt-BR'));if(row)rollSkill(row,`Ataque: ${item.name} · ${row.name}`);else setError('Perícia de ataque não encontrada na ficha.');}
 function exportJson(){const payload={format:'astralis-op2-sheet',version:1,name:form.name,classLevel:form.classLevel,appearance:form.appearance,notes:form.notes,inventory:form.inventory,stats};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ordem-2-${(form.name||'agente').replace(/[^\w-]/g,'_').slice(0,45)}.json`;a.click();URL.revokeObjectURL(url);}
 function importJson(file) {
  if(!file)return;
  if(file.size>500000){setError('O arquivo JSON deve ter menos de 500 KB.');return;}
  const reader=new FileReader();
  reader.onload=()=>{
   try {
    const data=JSON.parse(reader.result);
    if(data?.format!=='astralis-op2-sheet'||data?.version!==1||typeof data.stats!=='object'||Array.isArray(data.stats)||data.stats===null) {
     throw new Error('Formato de ficha Ordem 2 inválido.');
    }
    const allowed=new Set([
     ...Object.keys(OP2_DEFAULT_STATS),...Object.keys(OP2_NOTEBOOK_FIELDS),
     'pericias','op2LinkedAttributes','op2Abilities','op2Equipment','op2ExtraSkills','relationships','relacoes',
     'conditions','trauma','levelMarks','trainingNotes','inventory','space','appearance',
    ]);
    const cleaned={};
    for(const [key,value] of Object.entries(data.stats)) {
     if(!allowed.has(key)||typeof value!=='string')continue;
     if(Object.hasOwn(OP2_NOTEBOOK_FIELDS,key)&&value.trim().length>OP2_STAT_LIMIT) {
      throw new Error(`${OP2_NOTEBOOK_FIELDS[key]} excede o limite desta ficha.`);
     }
     cleaned[key]=value.slice(0,20000);
    }
    setForm(old=>({...old,name:lengthLimit(data.name||old.name,120),classLevel:lengthLimit(data.classLevel||old.classLevel,120),
     appearance:lengthLimit(data.appearance??old.appearance,20000),notes:lengthLimit(data.notes??old.notes,20000),
     inventory:lengthLimit(data.inventory??old.inventory,20000),stats:{...old.stats,...cleaned}}));
    setImportNotice('Ficha importada como rascunho. Clique em Salvar ficha para sincronizar.');
    setError('');
   } catch(error) {setError(error.message);}
  };
  reader.readAsText(file);
 }
 function restoreDraft(){try{const raw=localStorage.getItem(storageKey(player?.id));if(!raw){setError('Nenhum rascunho local encontrado.');return;}const saved=JSON.parse(raw);if(!saved.stats||typeof saved.stats!=='object')throw Error('Rascunho inválido.');setForm(old=>({...old,name:saved.name||old.name,classLevel:saved.classLevel??old.classLevel,appearance:saved.appearance??old.appearance,notes:saved.notes??old.notes,inventory:saved.inventory??old.inventory,stats:{...old.stats,...saved.stats}}));setImportNotice('Rascunho restaurado; confirme em Salvar ficha.');}catch(e){setError(e.message);}}
 function resetMods(){setBonusDice([null,null]);setShift(0);setPavor(false);setHousePavorBonus(false);setError('');}
 return <div className="op2-view" data-archetype={archetype.toLowerCase()} data-mobile-section={mobile}>
  <div className="op2-topbar">
   <span className="op2-brand">ORDEM PARANORMAL <b>II</b></span>
   <nav className="op2-sections" aria-label="Seções de Ordem Paranormal II">
    {['Agente','Investigação','Relações'].map(item=><button key={item} type="button"
     aria-pressed={section===item} onClick={()=>setSection(item)}>{item}</button>)}
   </nav>
   <div className="op2-toolbar">
    {section==='Relações'&&<button type="button" aria-pressed={relationsEditing}
     onClick={()=>setRelationsEditing(value=>!value)}>{relationsEditing?'Concluir edição':'Editar relações'}</button>}
    <div className="op2-dice-anchor">
     <button type="button" aria-expanded={diceOpen} onClick={()=>setDiceOpen(value=>!value)}>Dados</button>
     {diceOpen&&<DiceTray DieSymbol={DieSymbol} onRoll={addLog}/>}
    </div>
    <details className="op2-options">
     <summary>Opções</summary>
     <div>
      <button type="button" onClick={resetMods}>Zerar modificadores</button>
      <button type="button" onClick={restoreDraft}>Restaurar rascunho</button>
      <button type="button" onClick={exportJson}>Exportar JSON</button>
      <button type="button" onClick={()=>inputFile.current?.click()}>Importar JSON</button>
      <input ref={inputFile} type="file" accept="application/json,.json" hidden onChange={e=>{importJson(e.target.files?.[0]);e.target.value='';}}/>
     </div>
    </details>
   </div>
  </div>
  <div hidden={section!=='Agente'}>
  <nav className="op2-mobile-nav" aria-label="Painéis da ficha"><button type="button" aria-current={mobile==='agent'?'page':undefined} onClick={()=>setMobile('agent')}>Agente</button><button type="button" aria-current={mobile==='skills'?'page':undefined} onClick={()=>setMobile('skills')}>Perícias</button><button type="button" aria-current={mobile==='management'?'page':undefined} onClick={()=>setMobile('management')}>Habilidades e itens</button></nav>
  <div className="op2-columns">
   <section className="op2-agent-col" aria-label="Agente e atributos">
    <div className="op2-profile"><button type="button" className="op2-avatar" onClick={onTokenOpen} aria-label="Editar retrato">{form.token?<img src={form.token} alt="Retrato do agente"/>:<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#8b672d"/><path d="M32 9 11 45h42L32 9Zm0 11 10 18H22L32 20Z" fill="#fff1bd"/><path d="M13 51c9-8 29-8 38 0" stroke="#fff1bd" strokeWidth="7" strokeLinecap="round" fill="none"/></svg>}</button><div className="op2-profile-text"><input aria-label="Nome do agente" placeholder="Novo Agente" value={form.name} onChange={e=>setForm(old=>({...old,name:e.target.value}))}/><select aria-label="Arquétipo" value={archetype} onChange={e=>update('archetype',e.target.value)}>{OP2_ARCHETYPES.map(k=><option key={k}>{k}</option>)}</select><input aria-label="Ocupação" value={val(stats,'role')} placeholder="Ocupação" onChange={e=>update('role',e.target.value)}/><label>Nível <input aria-label="Nível" type="number" min="1" max="30" value={val(stats,'nivel')||'4'} onChange={e=>update('nivel',String(toInt(e.target.value,1,30)))}/></label></div></div>
    <Ornament>Atributos</Ornament>
    <div className="op2-attributes">{OP2_ATTRIBUTES.map(([key,label])=><div className="op2-attribute" key={key}><strong>{label.toUpperCase()}{((archetype==='Analista'&&key==='mind')||(archetype==='Vigilante'&&key==='physical')||(archetype==='Executor'&&key==='emotion'))?' ↑':''}</strong><StepControl label={label} value={val(stats,key)} onChange={next=>next==='roll'?roll({name:`Atributo puro: ${label}`,attribute:key,pure:true}):update(key,next)}/></div>)}</div>
    <Track id="pv" label="Pontos de Vida" icon="♥" stats={stats} onChange={update} onRoll={rollTrack}/>
    <Track id="pd" label="Pontos de Determinação" icon="✺" stats={stats} onChange={update} onRoll={rollTrack}/>
    <small className="op2-info">Atributos: d4 → d6 → d8 → d10 → d12. Clique no dado para um teste puro. A DT das barras é configurável; confirme o tipo de teste com o Narrador.</small>
   </section>
   <section className="op2-skills-col" aria-label="Perícias e modificadores">
    <Ornament extra="op2-ornament-between">Modificadores de perícias <button type="button" onClick={()=>setModsShown(!modsShown)} aria-label={modsShown?'Ocultar modificadores':'Mostrar modificadores'} aria-expanded={modsShown}>◉</button></Ornament>
    {modsShown&&<div className="op2-modifiers"><div><b>Dados bônus (situacionais)</b><div className="op2-bonus-row">{bonusDice.map((v,i)=><React.Fragment key={i}>{i>0&&<b>+</b>}<select aria-label={`Dado bônus ${i+1}`} value={v??''} onChange={e=>setBonusDice(old=>old.map((d,j)=>i===j?(e.target.value?Number(e.target.value):null):d))}><option value="">×</option>{OP2_STEPS.map(n=><option key={n} value={n}>d{n}</option>)}</select></React.Fragment>)}</div></div><div><b>Passos das perícias</b><div className="op2-counter"><button type="button" aria-label="Diminuir passos" onClick={()=>setShift(n=>Math.max(-4,n-1))}>−</button><span>{shift>0?'+':''}{shift}</span><button type="button" aria-label="Aumentar passos" onClick={()=>setShift(n=>Math.min(4,n+1))}>+</button></div></div><div className="op2-pavor-block"><b>Dado de Pavor</b><div className="op2-counter"><button type="button" onClick={()=>setPavorStep(v=>moveStep(v,-1))}>−</button><span>d{pavorStep}</span><button type="button" onClick={()=>setPavorStep(v=>moveStep(v,1))}>+</button></div></div><div className="op2-checks"><label><input type="checkbox" checked={pavor} onChange={e=>setPavor(e.target.checked)}/> Ativar Pavor</label><label title="Regra alternativa da mesa; não pertence ao playtest"><input type="checkbox" checked={housePavorBonus} disabled={!pavor} onChange={e=>setHousePavorBonus(e.target.checked)}/> Usar como bônus (regra da mesa)</label></div><label className="op2-difficulty">DT do teste <input type="number" min="1" max="100" value={difficulty} onChange={e=>setDifficulty(e.target.value)}/></label></div>}
    <Ornament>Perícias</Ornament><div className="op2-skills-bar"><input aria-label="Filtrar perícias" placeholder="⌕ Filtrar..." value={search} onChange={e=>setSearch(e.target.value)}/><button type="button" className={sort==='name'?'selected':''} onClick={()=>setSort('name')}>Nome ↑</button><button type="button" className={sort==='step'?'selected':''} onClick={()=>setSort('step')}>Passo ↓</button></div>
    <div className="op2-skill-table" role="list">{shownSkills.map(row=>{const attr=skillAttr(row),skill=currentSkill(row),dice=sides(val(stats,attr))||6;return <div className="op2-skill" role="listitem" key={row.name}><button type="button" className="op2-skill-name" title={`Rolar ${row.name}`} onClick={()=>rollSkill(row)}>{row.name}</button><button type="button" className="op2-skill-step" aria-label={`Aumentar dado da perícia ${row.name}`} title="Clique: próximo passo. Clique direito: passo anterior" onClick={()=>changeSkill(row,cycleStep(skill,1))} onContextMenu={e=>{e.preventDefault();changeSkill(row,cycleStep(skill,-1));}}><DieSymbol value={skill} dim="sm"/></button><span className="op2-plus">+</span><span className="op2-skill-attribute"><DieSymbol value={dice} dim="sm"/></span><select aria-label={`Atributo de ${row.name}`} value={attr} onChange={e=>changeLinked(row,e.target.value)}>{OP2_ATTRIBUTES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>{custom.some(c=>c.name===row.name)&&<button type="button" className="op2-remove" title="Remover perícia personalizada" aria-label={`Remover ${row.name}`} onClick={()=>removeCustom(row.name)}>×</button>}</div>})}</div><button type="button" className="op2-add-skill" onClick={addCustom}>+ Nova Aptidão / Ofício</button>
    <small className="op2-info">O Pavor oficial anula dados menores que seu resultado; se todos forem anulados, há falha crítica. A soma do Pavor como bônus é uma variante opcional, não oficial.</small>
   </section>
   <section className="op2-management-col" aria-label="Habilidades e equipamentos">
    <div className="op2-panel-tabs">
     <button type="button" aria-pressed={isAbilitiesPanel} className={isAbilitiesPanel?'active':''} onClick={()=>setPanel('Habilidades')}>Habilidades</button>
     <button type="button" aria-pressed={!isAbilitiesPanel} className={!isAbilitiesPanel?'active':''} onClick={()=>setPanel('Equipamentos')}>Equipamentos</button>
     <button type="button" aria-label={isAbilitiesPanel?'Adicionar habilidade':'Adicionar equipamento'} className="op2-panel-add"
      onClick={()=>setEditor({kind:panel,index:null})}>+</button>
    </div>
    <div className={`op2-panel-scroll${currentRows.length?'':' op2-panel-empty'}`}>
     {currentRows.length===0&&<p className="op2-empty">{isAbilitiesPanel?'Adicione uma habilidade.':'Adicione um equipamento.'}</p>}
     {currentRows.map((row,index)=>{
      const maxUses=Number(row.maxUses)||null;
      return <article className="op2-card" key={index}>
       <div className="op2-card-head">
        <h4>{row.name||'Sem nome'}</h4>
        <div><button type="button" onClick={()=>setEditor({kind:panel,index})} aria-label={`Editar ${row.name}`}>Editar</button>
         <button type="button" aria-label={`Remover ${row.name}`} onClick={()=>rowRemove(panel,index)}>×</button></div>
       </div>
       <small>{row.type}{row.source&&` · ${row.source}`}</small>
       {isAbilitiesPanel?<><p>{row.text}</p>
        <ImpetusBar row={row} onChange={value=>rowUpdate(panel,index,'impetus',value)}/>
        <button type="button" onClick={()=>useAbility(row)}>Usar · {toInt(row.pd)} PD / {toInt(row.pv)} PV</button>
       </>:<>
        <p>{row.notes}</p>
        {row.type==='Arma'&&<div className="op2-card-actions">
         <button type="button" onClick={()=>equipmentAttack(row)}>Rolar ataque</button>
         <button type="button" onClick={()=>equipmentDamage(row)}>Rolar dano</button>
        </div>}
        {row.uses!=null&&row.uses!==''&&<label>Usos restantes
         <input type="number" min="0" max={maxUses??9999} value={row.uses}
          onChange={event=>rowUpdate(panel,index,'uses',String(toInt(event.target.value,0,maxUses??9999)))}/>
         {maxUses&&<span>de {maxUses}</span>}
        </label>}
       </>}
      </article>;
     })}
    </div>
   </section>
  </div>
  </div>
  <div hidden={section!=='Investigação'}><InvestigationPanel stats={stats} notes={form.notes} setStat={setStat} onError={setError}/></div>
  <div hidden={section!=='Relações'}><RelationsPanel stats={stats} editing={relationsEditing} setStat={setStat}
   onError={setError} onEdit={()=>setRelationsEditing(true)}/></div>
  <div className="op2-log-wrap"><button type="button" className="op2-history-toggle" onClick={()=>{setShowHistory(!showHistory);setToast(false);}} aria-expanded={showHistory}>◈ Dados · histórico {rolls.length}</button>{showHistory&&<div className="op2-log-history" role="region" aria-label="Histórico de rolagens"><div className="op2-log-head"><b>Últimas 20 rolagens</b><button type="button" onClick={()=>setRolls([])}>Limpar</button></div>{rolls.length===0?<p>Nenhum teste nesta sessão.</p>:rolls.map(entry=><div className="op2-log-item" key={entry.id}><small>{entry.at} · {entry.name}</small><b>{entry.result?`${entry.result.total} — ${entry.result.title}`:'Ação registrada'}</b><p>{entry.result?.formula||entry.text}</p></div>)}</div>}{toast&&rolls[0]&&<div className="op2-toast" role="status"><button type="button" aria-label="Fechar resultado" onClick={()=>setToast(false)}>×</button><b>{form.name||'Novo Agente'} · {rolls[0].name}</b>{rolls[0].result?<><strong>{rolls[0].result.total}</strong><span>{rolls[0].result.title}</span><small>{rolls[0].result.formula}</small></>:<p>{rolls[0].text}</p>}</div>}</div>
  {importNotice&&<p role="status" className="op2-status">{importNotice}</p>}{error&&<p role="alert" className="op2-error">{error}<button type="button" onClick={()=>setError('')}>Fechar</button></p>}
  {editor&&<ResourceEditor kind={editor.kind}
   initial={editor.index===null?null:(editor.kind==='Habilidades'?abilities:equipment)[editor.index]}
   onSave={saveEditor} onClose={()=>setEditor(null)}/>}
 </div>;
}
