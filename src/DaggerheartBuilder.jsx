import React, { useState } from 'react';
import {
  ADVANCEMENTS, ANCESTRIES, ARMOR, CARD_HINTS, CARD_KINDS, CARDS, CLASSES, CLASS_GEAR,
  CLASS_HINTS, COMMUNITIES, DISTANCES, FEATURE_HINTS, KIT, POTIONS, SOURCE, TRAITS, TRAIT_KEYS,
  TRANSFORMATIONS, WEAPONS, availableCards, builderStatus, canUseClass, normalize, progression,
  signed, suggestedTraits, tierEntry, tierFor, traitAllocation,
} from './domain/daggerheartStudio.mjs';

const STEPS = ['Identidade', 'Classe', 'Herança', 'Experiências', 'Progressão'];
const CLASS_PARTS = [
  ['subclass', 'Subclasse'], ['traits', 'Atributos'], ['weapons', 'Armas iniciais'],
  ['armor', 'Armadura inicial'], ['inventory', 'Inventário inicial'], ['cards', 'Cartas de domínio'],
];
const HERITAGE_PARTS = [['ancestry', 'Ancestralidade'], ['community', 'Comunidade'], ['transformation', 'Transformação']];
const STORY_PARTS = [['description', 'Descrição'], ['background', 'História'], ['experience', 'Experiências'], ['connection', 'Conexões']];
const DETAILS_LABELS = {
  clothes: 'Roupas', eyes: 'Olhos', body: 'Corpo', color: 'Cor da pele', attitude: 'Atitude',
  background1: 'Quem marcou seu passado?', background2: 'Que acontecimento mudou sua vida?', background3: 'O que você procura agora?',
  connection1: 'Que lembrança nos une?', connection2: 'O que você já fez por mim?', connection3: 'O que ainda precisamos conversar?',
};
const WITCH_PROMPTS = {
  background1: 'Quem temia sua magia na comunidade? Que rumor surgiu e qual parte era verdadeira?',
  background2: 'Em que momento você usou seu poder para salvar alguém? Por que essa pessoa procurou você?',
  background3: 'Sua magia abriu uma porta que devia ficar fechada. O que havia do outro lado?',
  connection1: 'Que ritual você me ensinou e que agora praticamos juntos?',
  connection2: 'Você apareceu em um sonho meu com uma visão. O que me contou?',
  connection3: 'Em que assunto você costuma pedir meu conselho?',
};

export function Field({ label, value, onChange, max = 100, area = false, type = 'text', min, limit }) {
  const props = { value: value ?? '', maxLength: max, onChange: event => onChange(event.target.value) };
  return <label className="dh-field">{label}{area ? <textarea {...props} rows={3}/> : <input {...props} type={type} min={min} max={limit}/>}</label>;
}

export function Choice({ label, value, onChange, options, placeholder = 'Selecione' }) {
  return <label className="dh-field">{label}<select aria-label={label} value={value ?? ''} onChange={event => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(item => {
      const [id, name] = Array.isArray(item) ? item : [item, item];
      return <option key={id} value={id}>{name}</option>;
    })}
  </select></label>;
}

const traitOptions = TRAIT_KEYS.map(key => [key, TRAITS[key][0]]);
const asOptions = (items, label = item => item.name) => items.map(item => [item.id, label(item)]);
const named = table => Object.entries(table).map(([id, item]) => ({ id, ...item }));
const domainText = card => `${card.domain} · nível ${card.level} · ${CARD_KINDS[card.kind]}`;

export function CatalogList({ label, items, selected, disabled = () => false, choose, render, info = item => item.features?.join(' · ') }) {
  const [search, setSearch] = useState('');
  const match = normalize(search.trim());
  const shown = items.filter(item => normalize(item.name).includes(match));
  const [count, setCount] = useState(24);
  return <>
    <Field label={label} value={search} onChange={value => { setSearch(value); setCount(24); }}/>
    <div className="dh-list">{shown.slice(0, count).map(item => <article key={item.id} className="dh-choice" data-selected={selected.includes(item.id)}>
      <div className="dh-choice-row"><span><b>{item.name}</b>{render && <small>{render(item)}</small>}</span>
        <button type="button" className={selected.includes(item.id) ? '' : 'dh-button'} aria-pressed={selected.includes(item.id)}
          disabled={disabled(item)} onClick={() => choose(item)}>{selected.includes(item.id) ? 'Remover' : 'Selecionar'}<span className="dh-sr"> {item.name}</span></button>
      </div>
      {(info(item) || item.reference) && <details><summary>Ver detalhes</summary>
        {info(item) && <p>{info(item)}</p>}
        {item.reference && <a href={item.reference} target="_blank" rel="noreferrer">Consultar regra da carta</a>}
      </details>}
    </article>)}</div>
    {!shown.length && <p>Nenhuma opção encontrada.</p>}
    {count < shown.length && <button type="button" onClick={() => setCount(count + 24)}>Ver mais opções</button>}
  </>;
}

export function TraitBar({ traits, onRoll }) {
  return <div className="dh-trait-bar">{TRAIT_KEYS.map(key => {
    const [label, help] = TRAITS[key];
    return onRoll
      ? <button type="button" key={key} title={help} onClick={() => onRoll(key)}><span>{label}</span><strong>{signed(traits[key])}</strong></button>
      : <div key={key} title={help}><span>{label}</span><strong>{signed(traits[key])}</strong></div>;
  })}</div>;
}

function SourceSettings({ build, patch, details, update }) {
  return <>
    <h3>Fontes da campanha</h3>
    {['hope', 'void4', 'void5'].map(key => <label key={key} className="dh-toggle"><input type="checkbox" checked={build.sources[key]}
      onChange={e => patch({ sources: { ...build.sources, [key]: e.target.checked } })}/>{SOURCE[key]}{key.startsWith('void') && <small>Playtest</small>}</label>)}
    <Field label="Cenário ou suplemento da mesa" value={details.frame} onChange={frame => update({ frame })} max={80}/>
    <p className="dh-help">As duas classes de The Void usam a edição de 9 de julho de 2026. O domínio Blood é compartilhado entre elas.</p>
  </>;
}

function ClassPreview({ id, choose }) {
  const item = CLASSES[id];
  if (!item) return <p>Escolha uma classe para consultar seus domínios e características.</p>;
  return <>
    <div className="dh-preview-title"><div><small>{SOURCE[item.source]}</small><h3>{item.name}</h3></div>
      <button type="button" className="dh-button" onClick={() => choose(id)}>Escolher {item.name}</button></div>
    <p>{CLASS_HINTS[id]}</p>
    <dl className="dh-metrics"><div><dt>Domínios</dt><dd>{item.domains.join(' · ')}</dd></div>
      <div><dt>Evasão</dt><dd>{item.evasion}</dd></div><div><dt>PV iniciais</dt><dd>{item.hp}</dd></div></dl>
    <h4>Habilidade de Esperança</h4><p><b>{item.hope}</b> · 3 Esperança</p>
    {FEATURE_HINTS[item.hope] && <p>{FEATURE_HINTS[item.hope]}</p>}
    <h4>Habilidades de classe</h4>
    <ul className="dh-feature-list">{item.features.filter(name => name !== item.hope).map(name =>
      <li key={name}><b>{name}</b>{FEATURE_HINTS[name] && <p>{FEATURE_HINTS[name]}</p>}</li>)}</ul>
    <h4>Subclasses</h4><p>{Object.values(item.subclasses).map(sub => sub.name).join(' · ')}</p>
  </>;
}

const weaponMeta = item => `${item.slot === 'primary' ? 'Primária' : 'Secundária'} · ${item.hands} mão(s) · ${TRAITS[item.trait]?.[0] ?? 'Conjuração'} · ${DISTANCES[item.range]}`;
const weaponInfo = item => `d${item.faces}${item.bonus ? signed(item.bonus) : ''} · ${item.damage === 'phy' ? 'Físico' : item.damage === 'mag' ? 'Mágico' : 'Físico ou mágico'}${item.feature ? ` · ${item.feature}` : ''}`;
const armorMeta = item => `Armadura ${item.score} · Limiares ${item.major}/${item.severe}`;
export { weaponMeta, weaponInfo, armorMeta, domainText };

function ClassChoices({ build, patch, part, details, update }) {
  const item = CLASSES[build.classId], subclass = item.subclasses[build.subclass];
  if (part === 'subclass') return <CatalogList label="Buscar subclasses" items={named(item.subclasses)} selected={[build.subclass]}
    choose={option => patch({ subclass: option.id === build.subclass ? '' : option.id, primary: '', secondary: '' })}
    render={option => option.spellcast ? `Conjuração · ${TRAITS[option.spellcast][0]}` : 'Fundação'}
    info={option => [['Fundação', option.foundation], ['Especialização', option.specialization], ['Maestria', option.mastery]]
      .filter(([, list]) => list?.length).map(([name, list]) => `${name} · ${list.join(', ')}`).join(' | ')}/>;
  if (part === 'traits') return <>
    <p>Distribua +2, +1, +1 e −1 entre quatro atributos distintos. Os outros dois ficam com +0.</p>
    <button type="button" className="dh-button" onClick={() => patch({ traits: suggestedTraits(build) })}>Usar distribuição sugerida</button>
    <div className="dh-fields">{traitAllocation.map((value, i) => <Choice key={i} label={`Atributo ${value}${i === 2 ? ' (segundo)' : ''}`}
      value={build.traits[i]} options={traitOptions.filter(([key]) => key === build.traits[i] || !build.traits.includes(key))}
      onChange={selected => patch({ traits: build.traits.map((key, position) => i === position ? selected : key) })}/>)}</div>
    <dl className="dh-glossary">{Object.values(TRAITS).map(([name, help]) => <div key={name}><dt>{name}</dt><dd>{help}</dd></div>)}</dl>
  </>;
  if (part === 'weapons') return <>
    <p>Escolha uma primária de duas mãos ou uma primária e uma secundária de uma mão. Armas mágicas exigem um atributo de Conjuração.</p>
    {build.classId === 'witch' && <button type="button" onClick={() => patch({ primary: 'primary-casting-dagger', secondary: 'secondary-rune-shield' })}
      disabled={!subclass?.spellcast}>Equipar Casting Dagger e Rune Shield</button>}
    <CatalogList label="Buscar armas iniciais" items={Object.values(WEAPONS).filter(weapon => weapon.tier === 1)}
      selected={[build.primary, build.secondary]} disabled={weapon => (!subclass?.spellcast && weapon.damage !== 'phy') ||
        (weapon.slot === 'secondary' && (!build.primary || WEAPONS[build.primary]?.hands === 2 && build.classId !== 'warrior'))}
      render={weaponMeta} info={weaponInfo} choose={weapon => patch(weapon.slot === 'primary'
        ? { primary: build.primary === weapon.id ? '' : weapon.id, ...(weapon.hands === 2 && build.classId !== 'warrior' || build.primary === weapon.id ? { secondary: '' } : {}) }
        : { secondary: build.secondary === weapon.id ? '' : weapon.id })}/>
  </>;
  if (part === 'armor') return <>
    <p>O nível é somado aos dois limiares. Cada espaço de armadura pode reduzir em uma faixa a gravidade de um ataque.</p>
    <CatalogList label="Buscar armaduras iniciais" items={Object.values(ARMOR).filter(armor => armor.tier === 1)}
      selected={[build.armor]} choose={armor => patch({ armor: build.armor === armor.id ? '' : armor.id })} render={armorMeta} info={armor => armor.feature}/>
  </>;
  if (part === 'inventory') return <>
    <p>{[...KIT, 'um punhado de ouro'].join(' · ')}</p>
    <div className="dh-fields">
      <Choice label="Poção inicial" value={build.potion} options={Object.entries(POTIONS)} onChange={potion => patch({ potion })}/>
      <Choice label="Item de classe" value={build.gear} options={CLASS_GEAR[build.classId] ?? []} onChange={gear => patch({ gear })}/>
      {subclass?.spellcast && <Field label="Onde você guarda sua magia?" value={details.focus} onChange={focus => update({ focus })} max={80}/>}
    </div>
  </>;
  return <>
    <p>Escolha duas cartas de nível 1 entre {item.domains.join(' e ')}. Você pode escolher as duas do mesmo domínio.</p>
    <CatalogList label="Buscar cartas iniciais" items={availableCards(item, 1)} selected={build.cards} render={domainText}
      info={card => CARD_HINTS[card.id] ?? `Custo de resgate · ${card.recall} Estresse`}
      disabled={card => build.cards.length >= 2 && !build.cards.includes(card.id)}
      choose={card => patch({ cards: build.cards.includes(card.id) ? build.cards.filter(id => id !== card.id) : [...build.cards, card.id] })}/>
  </>;
}

function Heritage({ build, patch, part }) {
  const mixing = build.mixedMode;
  if (part === 'ancestry') return <>
    <label className="dh-toggle"><input type="checkbox" checked={mixing} onChange={event => {
      patch({ mixedMode: event.target.checked, ...(event.target.checked ? {} : { mixed: '' }) });
    }}/>Ancestralidade mista</label>
    {mixing && <Choice label="Segunda ancestralidade" value={build.mixed}
      options={named(ANCESTRIES).filter(option => option.id !== build.ancestry).map(option => [option.id, `${option.name} · ${option.features[1] ?? ''}`])}
      onChange={mixed => patch({ mixed })}/>}
    <CatalogList label="Buscar ancestralidade" items={named(ANCESTRIES)} selected={[build.ancestry]}
      choose={item => patch({ ancestry: build.ancestry === item.id ? '' : item.id, ...(build.mixed === item.id ? { mixed: '' } : {}) })}
      render={item => mixing ? item.features[0] : item.features.join(' · ')}/>
  </>;
  const options = part === 'community' ? COMMUNITIES : TRANSFORMATIONS;
  return <CatalogList label={part === 'community' ? 'Buscar comunidade' : 'Buscar transformação'} items={named(options)}
    selected={[build[part]]} choose={item => patch({ [part]: build[part] === item.id ? '' : item.id })}/>;
}

function Story({ build, patch, part, details, update }) {
  if (part === 'experience') return <>
    <p>Escreva duas Experiências específicas a +2. Durante o jogo, gastar Esperança permite usar uma Experiência relevante.</p>
    <div className="dh-fields">{build.experiences.map((value, i) => <Field key={i} label={`Experiência ${i + 1} · +2`}
      max={60} value={value} onChange={name => patch({ experiences: build.experiences.map((old, j) => j === i ? name : old) })}/>)}</div>
  </>;
  const keys = part === 'description' ? ['clothes', 'eyes', 'body', 'color', 'attitude'] : Object.keys(DETAILS_LABELS).filter(key => key.startsWith(part));
  return <div className="dh-fields">{keys.map(key => <Field key={key} label={(build.classId === 'witch' && WITCH_PROMPTS[key]) || DETAILS_LABELS[key]} area={part !== 'description'}
    max={145} value={details[key]} onChange={value => update({ [key]: value })}/>)}</div>;
}

function LevelChoices({ build, patch, progress }) {
  const [selectedLevel, setSelectedLevel] = useState(build.level > 1 ? build.level : 2);
  const level = Math.min(selectedLevel, build.level);
  const row = build.advances[level - 2] ?? { card: '', exp: '', choices: [] };
  const before = progression({ ...build, level: level - 1 });
  const tier = tierFor(level);
  const main = CLASSES[build.classId];
  const options = availableCards(main, level, progress.secondClass, progress.secondDomain).filter(card => !before.known.includes(card.id));
  const update = changes => patch({ advances: Array.from({ length: build.level - 1 }, (_, i) =>
    i === level - 2 ? { ...row, ...changes } : build.advances[i] ?? { card: '', exp: '', choices: [] }) });
  const setChoice = (index, choice) => update({ choices: Array.from({ length: Math.max(row.choices.length, index + 1) },
    (_, i) => i === index ? choice : row.choices[i] ?? { kind: '', tier, a: '', b: '', c: '' }) });
  return <>
    <Choice label="Nível do personagem" value={String(build.level)} options={Array.from({ length: 10 }, (_, i) => String(i + 1))}
      onChange={value => { if (value) { patch({ level: Number(value) }); setSelectedLevel(Math.max(2, Number(value))); } }}/>
    {build.level === 1 ? <p>Avance quando a mesa alcançar um marco. Cada nível exige dois avanços e uma carta de domínio.</p> : <>
      <div className="dh-levels">{Array.from({ length: build.level - 1 }, (_, index) => index + 2).map(value =>
        <button type="button" key={value} aria-pressed={value === level} onClick={() => setSelectedLevel(value)}>
          Nível {value} <small>{progress.pending[value] || '✓'}</small></button>)}</div>
      <h4>Nível {level} · Patamar {tier}</h4>
      {tierEntry(level) && <Field label="Nova Experiência · +2" value={row.exp} max={60} onChange={exp => update({ exp })}/>}
      {Array.from({ length: ['multiclass', 'proficiency'].includes(row.choices[0]?.kind) ? 1 : 2 }, (_, index) => {
        const choice = row.choices[index] ?? { tier, kind: '', a: '', b: '', c: '' };
        const apply = changes => setChoice(index, { ...choice, ...changes });
        const extraClass = CLASSES[choice.a];
        const experiences = [...before.experiences, ...(tierEntry(level) ? [{ name: row.exp }] : [])].map((exp, i) => [String(i), exp.name]).filter(([, name]) => name);
        return <section className="dh-level-choice" key={index}>
          <Choice label={`Avanço ${index + 1}`} value={choice.kind}
            options={Object.entries(ADVANCEMENTS).filter(([kind]) => (tier >= 3 && (index === 0 || kind === 'subclass')) ||
              !['multiclass', 'proficiency', 'subclass'].includes(kind))}
            onChange={kind => {
              const next = { tier, kind, a: '', b: '', c: '' };
              if (index === 0 && ['proficiency', 'multiclass'].includes(kind)) update({ choices: [next] });
              else setChoice(index, next);
            }}/>
          {choice.kind && tier > 2 && <Choice label={`Usar espaço de patamar · avanço ${index + 1}`} value={String(choice.tier)}
            options={Array.from({ length: tier - 1 }, (_, i) => String(i + 2)).filter(value => Number(value) >= (['multiclass', 'proficiency', 'subclass'].includes(choice.kind) ? 3 : 2))}
            onChange={value => value && apply({ tier: Number(value) })}/>}
          {['traits', 'experience'].includes(choice.kind) && <div className="dh-fields">{['a', 'b'].map((key, position) =>
            <Choice key={key} label={`${choice.kind === 'traits' ? 'Atributo' : 'Experiência'} ${position + 1} · avanço ${index + 1}`}
              value={choice[key]} options={choice.kind === 'traits' ? traitOptions : experiences} onChange={value => apply({ [key]: value })}/>)}</div>}
          {choice.kind === 'card' && <Choice label={`Carta extra · avanço ${index + 1}`} value={choice.a} options={asOptions(options)} onChange={a => apply({ a })}/>}
          {choice.kind === 'multiclass' && <div className="dh-fields">
            <Choice label="Classe adicional" value={choice.a} options={named(CLASSES).filter(item => item.id !== build.classId && canUseClass(item, build.sources)).map(item => [item.id, item.name])}
              onChange={a => apply({ a, b: '', c: '' })}/>
            {extraClass && <>
              <Choice label="Domínio adicional" value={choice.b} options={extraClass.domains.filter(domain => !main?.domains.includes(domain))} onChange={b => apply({ b })}/>
              <Choice label="Fundação da classe adicional" value={choice.c} options={named(extraClass.subclasses).map(item => [item.id, item.name])}
                onChange={c => apply({ c })}/>
            </>}
          </div>}
        </section>;
      })}
      <Choice label={`Carta de domínio · nível ${level}`} value={row.card} options={asOptions(options, item => `${item.name} · ${item.domain} ${item.level}`)}
        onChange={card => update({ card })}/>
      {progress.pending[level] > 0 && <p className="dh-help">Restam {progress.pending[level]} escolhas válidas. Atributos marcados e espaços de avanço usados não podem ser repetidos.</p>}
    </>}
  </>;
}

export default function DaggerheartBuilder({ form, setForm, build, patch, details, update, stage, setStage, onDemo, onFinish }) {
  const [part, setPart] = useState('');
  const [browse, setBrowse] = useState(false);
  const [preview, setPreview] = useState(build.classId || 'witch');
  const [query, setQuery] = useState('');
  const cls = CLASSES[build.classId], progress = progression(build), status = builderStatus(build, form.name, details);
  const choosing = stage === 1 && (!cls || browse || !canUseClass(cls, build.sources));
  const substeps = stage === 1 ? CLASS_PARTS : stage === 2 ? HERITAGE_PARTS : stage === 3 ? STORY_PARTS : [];
  const current = substeps.some(([id]) => part === id) ? part : substeps[0]?.[0];
  const count = status.stages.reduce((sum, value) => sum + value, 0);
  const go = next => { setStage(next); setPart(''); };
  const chooseClass = id => {
    if (id !== build.classId) patch({ classId: id, subclass: '', primary: '', secondary: '', gear: '', cards: [] });
    setBrowse(false);
    setPart('subclass');
  };
  const sectionTitle = choosing ? 'Prévia da classe' : substeps.find(([id]) => id === current)?.[1] ?? STEPS[stage];
  return <div className="dh-builder">
    <nav className="dh-rail" aria-label="Etapas do criador Daggerheart">
      {STEPS.map((name, index) => <button type="button" key={name} aria-current={stage === index ? 'step' : undefined} onClick={() => go(index)}>
        <span>{name}{index === 1 && cls && <small>{[cls.name, cls.subclasses[build.subclass]?.name].filter(Boolean).join(' · ')}</small>}</span>
        <b aria-label={status.stages[index] ? `${status.stages[index]} pendências` : 'Completo'}>{status.stages[index] || '✓'}</b>
      </button>)}
      <button type="button" className="dh-button dh-finish" disabled={count > 0} onClick={onFinish}>Montar ficha</button>
    </nav>
    <section className="dh-builder-index">
      <div className="dh-between"><h2>{choosing ? 'Explorar classes' : STEPS[stage]}</h2>
        {stage === 1 && cls && <button type="button" onClick={() => setBrowse(value => !value)}>{browse ? 'Voltar' : 'Trocar classe'}</button>}</div>
      {stage === 0 && <>
        <Field label="Nome do personagem" value={form.name} onChange={name => setForm(old => ({ ...old, name }))} max={80}/>
        <Field label="Pronomes" value={details.pronouns} onChange={pronouns => update({ pronouns })} max={80}/>
        <button type="button" onClick={onDemo}>Carregar exemplo Gabriel</button>
      </>}
      {choosing ? <>
        <Field label="Buscar classes" value={query} onChange={setQuery}/>
        <div className="dh-class-list">{named(CLASSES).filter(item => canUseClass(item, build.sources) && normalize(item.name).includes(normalize(query.trim())))
          .sort((a, b) => a.name.localeCompare(b.name)).map(item =>
            <button type="button" key={item.id} aria-pressed={preview === item.id} onClick={() => setPreview(item.id)}>
              <b>{item.name}</b><small>{item.domains.join(' / ')}</small></button>)}</div>
      </> : substeps.map(([id, name]) => <button className="dh-substep" type="button" key={id} aria-pressed={current === id} onClick={() => setPart(id)}>
        {name}{stage === 1 && <small>{status.remaining[id] ? `${status.remaining[id]} pendente(s)` : '✓'}</small>}
      </button>)}
      {stage === 4 && <p>{build.level === 1 ? 'Patamar inicial' : `Nível ${build.level} · Proficiência ${progress.proficiency}`}</p>}
      <div className="dh-step-actions">
        <button type="button" disabled={stage === 0} onClick={() => go(stage - 1)}>Anterior</button>
        <button type="button" disabled={stage === STEPS.length - 1} onClick={() => go(stage + 1)}>Próxima etapa</button>
      </div>
    </section>
    <section className="dh-reading" aria-label={sectionTitle} key={`${stage}:${current ?? ''}`}>
      {!choosing && <h3>{sectionTitle}</h3>}
      {stage === 0 && <SourceSettings {...{ build, patch, details, update }}/>}
      {choosing && <ClassPreview id={canUseClass(CLASSES[preview], build.sources) ? preview : 'bard'} choose={chooseClass}/>}
      {stage === 1 && !choosing && <ClassChoices {...{ build, patch, details, update, part: current }}/>}
      {stage === 2 && <Heritage {...{ build, patch, part: current }}/>}
      {stage === 3 && <Story {...{ build, patch, details, update, part: current }}/>}
      {stage === 4 && <LevelChoices {...{ build, patch, progress }}/>}
    </section>
  </div>;
}
