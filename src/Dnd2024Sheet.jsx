import React, { useState } from 'react';
import { ABILITIES, ABILITY_KEYS, ARMOR, SKILLS, SKILL_KEYS, SPELLS } from './domain/dnd2024Catalog.mjs';
import { armorClass, bounded, changeHP, classData, featureLevels, levelRow, recover, resourceCaps,
  rollDamage, rollDndTest, signedNumber, skillBonus, usesLeft, weaponStats } from './domain/dnd2024Rules.mjs';
import { die } from './domain/manualRules.mjs';
import { Select, TextField } from './Dnd2024Builder.jsx';

const SHEET_TABS = ['Combate', 'Magias', 'Inventário', 'Traços', 'Notas', 'Sobre'];
const CONDITIONS = ['Agarrado', 'Amedrontado', 'Atordoado', 'Caído', 'Cego', 'Contido', 'Enfeitiçado', 'Envenenado',
  'Incapacitado', 'Inconsciente', 'Invisível', 'Paralisado', 'Petrificado', 'Surdo'];
const SPELL_ROLLS = {
  'Sacred Flame': ['save', '1d8', 'Destreza'], 'Guiding Bolt': ['attack', '4d6'], 'Fire Bolt': ['attack', '1d10'],
  'Ray of Frost': ['attack', '1d8'], 'Eldritch Blast': ['attack', '1d10'],
  'Cure Wounds': ['heal', '2d8'], 'Healing Word': ['heal', '2d4'],
  Bane: ['save', '', 'Carisma'], 'Toll the Dead': ['save', '', 'Sabedoria'],
};

function Counter({ title, current, max, onChange }) {
  return <div className="dnd24-counter">
    <span>{title}</span><button type="button" disabled={current <= 0} aria-label={`Gastar ${title}`} onClick={() => onChange(current - 1)}>−</button>
    <b>{current}/{max}</b><button type="button" disabled={current >= max} aria-label={`Recuperar ${title}`} onClick={() => onChange(current + 1)}>+</button>
  </div>;
}

function HitPoints({ build, details, play, onPlay, log }) {
  const [amount, setAmount] = useState('1');
  const [dieClass, setDieClass] = useState(build.classes[0].id);
  const entry = build.classes.find(row => row.id === dieClass) ?? build.classes[0];
  const hitDie = classData(entry).hitDie;
  const used = bounded(play.hitDice[entry.id], 0, entry.level);
  function spendDie() {
    const face = die(hitDie);
    const healed = Math.max(0, face + details.modifiers.constitution);
    onPlay({ ...changeHP(play, 'heal', healed), hitDice: { ...play.hitDice, [entry.id]: used + 1 } });
    log({ label: 'Dado de Vida', kind: 'heal', total: healed, status: 'Cura', dice: [face], bonus: details.modifiers.constitution, sides: hitDie });
  }
  function deathSave() {
    const result = rollDndTest({ label: 'Salvaguarda contra a morte', kind: 'save', bonus: 0,
      target: 10, exhaustion: play.exhaustion, effects: { bless: play.bless }, halfling: build.species === 'halfling' });
    const face = result.dice[result.selected];
    if (face === 20) onPlay({ ...play, hp: 1, deathSuccess: 0, deathFailure: 0 });
    else if (face === 1) onPlay({ ...play, deathFailure: Math.min(3, play.deathFailure + 2) });
    else if (result.good) onPlay({ ...play, deathSuccess: Math.min(3, play.deathSuccess + 1) });
    else onPlay({ ...play, deathFailure: Math.min(3, play.deathFailure + 1) });
    const status = face === 20 ? 'Recupera 1 PV' : face === 1 ? 'Duas falhas' : result.status;
    log({ ...result, kind: 'death', status, good: face === 20 || face !== 1 && result.good });
  }
  return <section className="dnd24-card dnd24-vitals">
    <h3>Pontos de vida</h3>
    <div className="dnd24-health-total"><strong>{play.hp}<small> / {play.max} PV</small></strong>
      <TextField label="PV temporários" value={play.temp} type="number" min={0} max={9999} onChange={value => onPlay({ ...play, temp: bounded(value, 0, 9999) })}/></div>
    <progress value={play.hp} max={play.max} aria-label="Pontos de vida atuais"/>
    <div className="dnd24-actions dnd24-health-actions">
      <button type="button" onClick={() => onPlay(changeHP(play, 'damage', amount))}>Aplicar dano</button>
      <TextField label="Quantidade de PV" type="number" min={0} max={9999} value={amount} onChange={setAmount}/>
      <button type="button" onClick={() => onPlay(changeHP(play, 'heal', amount))}>Curar</button>
    </div>
    {play.hp === 0 && <div className="dnd24-subcard" data-pending="true">
      <strong>Contra a morte · {play.deathSuccess} sucessos / {play.deathFailure} falhas</strong>
      <button type="button" disabled={play.deathSuccess >= 3 || play.deathFailure >= 3} onClick={deathSave}>Rolar contra a morte</button>
    </div>}
    <div className="dnd24-actions">
      <Select label="Dados de Vida" options={build.classes.map(item => [item.id, `${classData(item).name} · d${classData(item).hitDie}`])}
        value={entry.id} onChange={value => value && setDieClass(value)}/>
      <button type="button" disabled={used >= entry.level} onClick={spendDie}>Gastar d{hitDie} · {entry.level - used}/{entry.level}</button>
    </div>
    <div className="dnd24-actions">
      <button type="button" onClick={() => onPlay(recover(play, build, details, false))}>Descanso curto</button>
      <button type="button" onClick={() => onPlay(recover(play, build, details, true))}>Descanso longo</button>
    </div>
  </section>;
}

function Combat({ build, details, play, onPlay, roll, damage, last, stats }) {
  const [weaponSearch, setWeaponSearch] = useState('');
  const [critical, setCritical] = useState(false);
  const [actionName, setActionName] = useState('');
  const [formula, setFormula] = useState('');
  const weapons = play.items.map(([name]) => ({ name, ...weaponStats(name, details) })).filter(item => item.formula);
  const listed = String(stats.weapons || '').split(/\r?\n/).flatMap(row => {
    const [name, attack, formula, range] = row.split('|');
    return name && (formula || /^[-+]?\d+$/.test(attack)) ? [{ name, attack: Number(attack) || 0, formula, range, damageModifier: 0 }] : [];
  });
  const martialArts = build.classes.find(entry => entry.id === 'monk');
  const unarmedAbility = martialArts && details.modifiers.dexterity > details.modifiers.strength ? 'dexterity' : 'strength';
  const unarmed = { name: 'Golpe desarmado', attack: details.pb + details.modifiers[unarmedAbility], ability: unarmedAbility,
    formula: martialArts ? levelRow(martialArts).martialArts : '1', damageModifier: details.modifiers[unarmedAbility], range: '5 pés' };
  const attacks = [unarmed, ...weapons, ...listed].filter(item => item.name.toLowerCase().includes(weaponSearch.toLowerCase()));
  const mastery = [...new Set(build.classes.flatMap(entry => entry.mastery ?? []))];
  const recorded = Array.isArray(play.actions) ? play.actions : [];
  return <>
    <h3>Ataques e dano</h3>
    <TextField label="Buscar ataque" value={weaponSearch} onChange={setWeaponSearch}/>
    <label className="dnd24-toggle"><input type="checkbox" checked={critical} onChange={event => setCritical(event.target.checked)}/>Dano crítico manual</label>
    <div className="dnd24-attack-list">{attacks.map((item, index) => <article key={`${item.name}-${index}`}>
      <div><b>{item.name}</b><small>{item.range || 'Alcance livre'}{item.damageType ? ` · ${item.damageType}` : ''}</small></div>
      <button type="button" onClick={() => roll(item.name, 'attack', item.attack, { weapon: true, ability: item.ability })}>Ataque {signedNumber(item.attack)}</button>
      <button type="button" disabled={!item.formula} onClick={() => damage(item.name, item.formula, item.damageModifier,
        critical || last?.label === item.name && last.critical)}>Dano {item.formula}{item.damageModifier ? signedNumber(item.damageModifier) : ''}</button>
      {mastery.includes(item.name) && <small>Maestria · {item.mastery}</small>}
    </article>)}</div>
    <details className="dnd24-subcard"><summary>Efeitos de rolagem</summary>
      <label className="dnd24-toggle"><input type="checkbox" checked={play.bless}
        onChange={event => onPlay({ ...play, bless: event.target.checked })}/>Bless · +1d4 em ataques e salvaguardas</label>
      <Select label="Guidance · perícia afetada" hint="Desativado" value={play.guidance}
        options={SKILL_KEYS.map(key => [key, SKILLS[key][0]])} onChange={guidance => onPlay({ ...play, guidance })}/>
    </details>
    <details className="dnd24-subcard"><summary>Ações, bônus e reações</summary>
      <p>Use as ações de combate conforme a mesa. Registre expressões próprias para rolar aqui.</p>
      <div className="dnd24-fields">
        <TextField label="Nome da ação" value={actionName} maxLength={45} onChange={setActionName}/>
        <TextField label="Dado ou expressão" value={formula} maxLength={25} onChange={setFormula}/>
      </div>
      <button type="button" disabled={!actionName.trim() || !formula.trim() || recorded.length >= 8}
        onClick={() => { onPlay({ ...play, actions: [...recorded, [actionName.trim(), formula.trim()]] }); setActionName(''); setFormula(''); }}>Adicionar ação</button>
      {recorded.map(([name, expression], index) => <div key={index} className="dnd24-actions">
        <button type="button" onClick={() => damage(name, expression)}>{name} · {expression}</button>
        <button type="button" aria-label={`Remover ${name}`} onClick={() => onPlay({ ...play, actions: recorded.filter((_, position) => position !== index) })}>Remover</button>
      </div>)}
    </details>
  </>;
}

function Magic({ details, play, spend, roll, damage, log, last, onEdit }) {
  const spells = [
    ...details.groups.flatMap(group => details.selected[group.id].map(name => ({ name, id: group.id, source: group.title, ability: group.ability }))),
    ...details.granted,
  ];
  const regular = details.slots.flatMap((max, index) => max ? [{ id: `slot${index + 1}`, level: index + 1, max }] : []);
  const pact = details.pact?.pact ? [{ id: 'pact', level: details.pact.pactLevel, max: details.pact.pact }] : [];
  const slots = [...regular, ...pact];
  function cast(spell, slot, level) {
    if (slot) spend(slot.id, slot.max, usesLeft(play, slot.id, slot.max) - 1);
    log({ label: spell.name, status: 'Conjuração', detail: level ? `Círculo ${level}` : 'Truque' });
  }
  return <>
    <div className="dnd24-stage-header"><h3>Magias conhecidas e preparadas</h3><button type="button" onClick={onEdit}>Alterar seleção</button></div>
    {slots.map(slot => <Counter key={slot.id} title={slot.id === 'pact' ? `Pacto · ${slot.level}º círculo` : `${slot.level}º círculo`}
      current={usesLeft(play, slot.id, slot.max)} max={slot.max} onChange={value => spend(slot.id, slot.max, value)}/>)}
    {!spells.length && <p>Nenhuma magia cadastrada para esta combinação.</p>}
    <div className="dnd24-spell-options">{spells.map((entry, index) => {
      const spell = SPELLS[entry.name], level = spell?.level ?? 0, mod = details.modifiers[entry.ability] ?? 0;
      const [kind, formula, savingAbility] = SPELL_ROLLS[entry.name] ?? [];
      const slot = slots.find(item => item.level >= level && usesLeft(play, item.id, item.max) > 0);
      const arcanum = entry.id.includes(':arcanum');
      const freeId = arcanum ? entry.id : entry.id.includes(':initiate1') ? `initiate:${entry.id.split(':')[0]}`
        : entry.name === 'Divine Smite' && entry.id === 'paladin' ? 'divine-smite'
          : entry.name === 'Hunter’s Mark' && entry.id === 'ranger' ? 'favored-enemy'
            : entry.innate ? `innate:${entry.name}` : '';
      const freeMax = freeId === 'favored-enemy' ? details.favoredEnemy : entry.innate === 'pb' ? details.pb : 1;
      const cantripDice = details.level >= 17 ? 4 : details.level >= 11 ? 3 : details.level >= 5 ? 2 : 1;
      const beams = entry.name === 'Eldritch Blast' ? cantripDice : 0;
      const rollDice = formula && (level || beams ? formula : formula.replace(/^1/, String(cantripDice)));
      return <details className="dnd24-subcard" key={index}>
        <summary><b>{entry.name}</b> · {level ? `${level}º círculo` : 'Truque'}{spell?.concentration ? ' · Concentração' : ''}</summary>
        <p>{entry.source} · {ABILITIES[entry.ability]?.[0] ?? 'Conjuração'} · CD {8 + details.pb + mod} · Ataque {signedNumber(details.pb + mod)}</p>
        {beams > 1 && <p>{beams} raios · role ataque e dano para cada raio.</p>}
        {spell?.components && <p>{spell.components.split('').join(' / ')} · {spell.range} · {spell.duration}</p>}
        <div className="dnd24-actions">
          {kind === 'attack' && <button type="button" onClick={() => roll(entry.name, 'attack', details.pb + mod, { ability: entry.ability })}>Rolar ataque</button>}
          {kind === 'save' && <span>Salvaguarda de {savingAbility} · CD {8 + details.pb + mod}</span>}
          {rollDice && <button type="button" onClick={() => damage(entry.name, rollDice, kind === 'heal' ? mod : 0,
            kind === 'attack' && last?.label === entry.name && last.critical, kind === 'heal' ? 'heal' : 'damage')}>{kind === 'heal' ? 'Cura' : 'Dano'} base · {rollDice}</button>}
          {!arcanum && <button type="button" disabled={level > 0 && !slot} onClick={() => cast(entry, level ? slot : null, level ? slot.level : 0)}>
            {level ? 'Conjurar com espaço' : 'Conjurar truque'}</button>}
          {freeId && <button type="button" disabled={!usesLeft(play, freeId, freeMax)} onClick={() => {
            spend(freeId, freeMax, usesLeft(play, freeId, freeMax) - 1); log({ label: entry.name, status: 'Conjuração livre', detail: `${level}º círculo` });
          }}>Usar conjuração livre</button>}
        </div>
      </details>;
    })}</div>
  </>;
}

function Inventory({ details, play, onPlay }) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('1');
  const armors = play.items.filter(([name]) => Object.hasOwn(ARMOR, name)).map(([name]) => name);
  function add() {
    const name = item.trim();
    if (!name || !Number(quantity)) return;
    const items = new Map(play.items);
    items.set(name, bounded(Number(items.get(name) ?? 0) + Number(quantity), 1, 9999));
    onPlay({ ...play, items: [...items] });
    setItem('');
    setQuantity('1');
  }
  return <>
    <h3>Inventário</h3>
    <div className="dnd24-fields">{[['pp', 'PL'], ['gp', 'PO'], ['ep', 'PE'], ['sp', 'PP'], ['cp', 'PC']].map(([key, text]) =>
      <TextField key={key} label={text} type="number" min={0} max={999999} value={play.coins[key]}
        onChange={value => onPlay({ ...play, coins: { ...play.coins, [key]: bounded(value, 0, 999999) } })}/>)}</div>
    <Select label="Armadura vestida" hint="Sem armadura" options={armors}
      value={play.armor} onChange={armor => onPlay({ ...play, armor })}/>
    {play.items.some(([name]) => name === 'Shield') && <label className="dnd24-toggle"><input type="checkbox" checked={play.shield}
      onChange={event => onPlay({ ...play, shield: event.target.checked })}/>Empunhar escudo{!details.armorTraining.has('shield') ? ' · sem treinamento' : ''}</label>}
    <div className="dnd24-paired">
      <TextField label="Adicionar item" value={item} maxLength={75} onChange={setItem}/>
      <TextField label="Quantidade" type="number" min={1} max={9999} value={quantity} onChange={setQuantity}/>
      <button type="button" disabled={!item.trim() || play.items.length >= 40} onClick={add}>Adicionar</button>
    </div>
    <ul className="dnd24-items">{play.items.map(([name, count], index) => <li key={name}>
      <span>{name} <small>×{count}</small></span><button type="button" aria-label={`Remover ${name}`} onClick={() => onPlay({ ...play,
        items: play.items.filter((_, position) => position !== index), armor: play.armor === name ? '' : play.armor, shield: name === 'Shield' ? false : play.shield,
      })}>Remover</button>
    </li>)}</ul>
  </>;
}

function Traits({ build, details }) {
  return <>
    <h3>Traços e recursos de classe</h3>
    {build.classes.map(entry => <details key={entry.id} className="dnd24-subcard" open>
      <summary>{classData(entry).name} {entry.level}{entry.subclass ? ` · ${entry.subclass}` : ''}</summary>
      <ul className="dnd24-plain-list">{featureLevels(entry).filter(row => row.level <= entry.level && row.features.length).reverse()
        .map(row => <li key={row.level}><small>Nível {row.level}</small> {row.features.join(' · ')}</li>)}</ul>
    </details>)}
    <p>{details.species?.traits?.join(' · ')}</p><p>{details.origins.join(' · ')}</p>
  </>;
}

export default function Dnd2024Sheet({ build, details, play, onPlay, form, about, onText, onEdit, onLevel, onTokenOpen, log, last, onReroll }) {
  const [tab, setTab] = useState('Combate');
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState('normal');
  const [error, setError] = useState('');
  const ac = armorClass(play.armor, play.shield, details.modifiers, build.classes, details.armorTraining);
  const speed = play.conditions.some(item => ['Agarrado', 'Contido', 'Paralisado', 'Inconsciente', 'Petrificado'].includes(item))
    ? 0 : Math.max(0, details.speed - 5 * play.exhaustion - ((ARMOR[play.armor]?.[2] ?? 0) > details.scores.strength ? 10 : 0));
  const resources = resourceCaps(build, details);
  const classText = build.classes.map(entry => `${classData(entry).name} ${entry.level}`).join(' / ');
  function roll(label, kind, bonus, options = {}) {
    const fighter = build.classes.find(entry => entry.subclass === 'Champion');
    const criticalAt = options.weapon && fighter?.level >= 3 ? fighter.level >= 15 ? 18 : 19 : 20;
    const armor = ARMOR[play.armor];
    const untrained = armor && !details.armorTraining.has(armor[1]) && ['strength', 'dexterity'].includes(options.ability);
    const noisy = kind === 'check' && options.skill === 'Stealth' && armor?.[3];
    const advantage = fighter?.level >= 3 && (kind === 'initiative' || options.skill === 'Athletics') ||
      build.species === 'gnome' && kind === 'save' && ['intelligence', 'wisdom', 'charisma'].includes(options.ability);
    log(rollDndTest({ label, kind, bonus, target: kind === 'initiative' || target === '' ? null : Number(target), mode,
      conditions: play.conditions, exhaustion: play.exhaustion, effects: play, skill: options.skill, criticalAt,
      extraDisadvantage: Boolean(untrained || noisy), extraAdvantage: Boolean(advantage), halfling: build.species === 'halfling',
    }));
  }
  function damage(label, formula, bonus = 0, critical = false, kind = 'damage') {
    try {
      const result = rollDamage(formula, bonus, Boolean(critical));
      log({ label, kind, ...result, bonus: result.modifier, status: kind === 'heal' ? 'Cura' : critical ? 'Dano crítico' : 'Dano',
        sides: Number(formula.match(/d(\d+)/i)?.[1]) || null });
      setError('');
    } catch (error) { setError(error.message); }
  }
  function spend(id, max, value) {
    onPlay({ ...play, spent: { ...play.spent, [id]: max - bounded(value, 0, max) } });
  }
  const saves = key => details.modifiers[key] + (details.saves.includes(key) ? details.pb : 0);
  const plain = key => details.modifiers[key] + (details.jackOfAllTrades ? Math.floor(details.pb / 2) : 0);
  return <>
    <div className="dnd24-sheet-options">
      <Select label="Rolagem" value={mode} options={[['normal', 'Normal'], ['advantage', 'Vantagem'], ['disadvantage', 'Desvantagem']]}
        onChange={value => setMode(value || 'normal')}/>
      <TextField label="CD ou CA do alvo · opcional" type="number" min={0} max={99} value={target} onChange={setTarget}/>
      <button type="button" onClick={() => onEdit('Revisão')}>Editar no criador</button>
    </div>
    <div className="dnd24-sheet-top">
      <section className="dnd24-card dnd24-profile">
        <button type="button" className="dnd24-portrait" aria-label="Editar retrato" onClick={onTokenOpen}>
          {form.token ? <img src={form.token} alt="Retrato"/> : <span>{form.name.slice(0, 1).toUpperCase()}</span>}
        </button>
        <div><h2>{form.name}</h2><p>{classText} · {details.species?.name} · {details.background?.name}</p>
          <p>{about.pronouns} {about.pronouns && '·'} Proficiência {signedNumber(details.pb)}</p></div>
        <div className="dnd24-info-line"><TextField label="Experiência (XP)" value={play.experience}
          type="number" min={0} max={9999999} onChange={value => onPlay({ ...play, experience: bounded(value, 0, 9999999) })}/></div>
        <div className="dnd24-actions">
          <button type="button" className="dnd24-primary" disabled={details.level >= 20} onClick={onLevel}>Subir de nível</button>
          <button type="button" onClick={() => roll('Iniciativa', 'initiative', details.initiative, { ability: 'dexterity' })}>Iniciativa {signedNumber(details.initiative)}</button>
          <button type="button" aria-pressed={play.hero} onClick={() => onPlay({ ...play, hero: !play.hero })}>Inspiração heroica</button>
          {play.hero && last?.target !== undefined && last.kind !== 'death' && <button type="button" onClick={onReroll}>Gastar para rerrolar d20</button>}
        </div>
      </section>
      <HitPoints {...{ build, details, play, onPlay, log }}/>
    </div>
    <div className="dnd24-ability-strip">
      {ABILITY_KEYS.map(key => <div className="dnd24-card" key={key}>
        <small>{ABILITIES[key][1]}</small><b>{details.scores[key]}</b>
        <button type="button" aria-label={`Teste de ${ABILITIES[key][0]}`} onClick={() => roll(ABILITIES[key][0], 'check', plain(key), { ability: key })}>Teste {signedNumber(plain(key))}</button>
        <button type="button" aria-label={`Salvaguarda de ${ABILITIES[key][0]}`} data-trained={details.saves.includes(key)}
          onClick={() => roll(`Salvaguarda de ${ABILITIES[key][0]}`, 'save', saves(key), { ability: key })}>Salva {signedNumber(saves(key))}</button>
      </div>)}
      <div className="dnd24-card"><small>CA</small><b>{ac}</b><small>Deslocamento</small><strong>{speed} pés</strong></div>
    </div>
    <div className="dnd24-sheet-grid">
      <aside className="dnd24-card dnd24-skill-panel"><h3>Perícias</h3>
        {SKILL_KEYS.map(key => <button key={key} type="button" data-trained={details.proficientSkills.includes(key)}
          onClick={() => roll(SKILLS[key][0], 'check', skillBonus(key, details), { skill: key, ability: SKILLS[key][1] })}>
          <span>{SKILLS[key][0]} <small>{ABILITIES[SKILLS[key][1]][1]}</small></span><strong>{signedNumber(skillBonus(key, details))}</strong>
        </button>)}
        {details.tools.length > 0 && <details><summary>Ferramentas</summary>
          <Select hint="Atributo da tarefa" label="Atributo da ferramenta" value={play.toolAbility ?? 'dexterity'}
            options={ABILITY_KEYS.map(key => [key, ABILITIES[key][0]])} onChange={toolAbility => onPlay({ ...play, toolAbility })}/>
          {details.tools.map(tool => <button key={tool} type="button"
            onClick={() => roll(tool, 'check', (details.modifiers[play.toolAbility] ?? details.modifiers.dexterity) + details.pb)}>{tool}</button>)}
        </details>}
      </aside>
      <div className="dnd24-card dnd24-sheet-main">
        <nav className="dnd24-methods" aria-label="Seções da ficha D&D">{SHEET_TABS.map(item =>
          <button type="button" aria-pressed={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</nav>
        {tab === 'Combate' && <Combat {...{ build, details, play, onPlay, roll, damage, last, stats: form.stats }}/>}
        {tab === 'Magias' && <Magic {...{ details, play, spend, roll, damage, log, last }} onEdit={() => onEdit('Magias')}/>}
        {tab === 'Inventário' && <Inventory {...{ details, play, onPlay }}/>}
        {tab === 'Traços' && <Traits {...{ build, details }}/>}
        {tab === 'Notas' && <TextField label="Notas do personagem" long maxLength={3000} value={form.notes} onChange={value => onText('notes', value)}/>}
        {tab === 'Sobre' && <><h3>{form.name}</h3><p>{form.appearance}</p><p>Idiomas · {['Comum', ...build.languages].join(', ')}</p>
          <p>{[about.alignment, about.lifestyle, about.faith].filter(Boolean).join(' · ')}</p><button type="button" onClick={() => onEdit('Sobre')}>Editar detalhes</button></>}
        {error && <p role="alert">{error}</p>}
      </div>
      <aside className="dnd24-card dnd24-sheet-side">
        <h3>Recursos</h3>
        {!resources.length && <p>Sem contador de classe ou origem neste nível.</p>}
        {resources.map(resource => <Counter key={resource.id} title={resource.name} max={resource.max}
          current={usesLeft(play, resource.id, resource.max)} onChange={value => spend(resource.id, resource.max, value)}/>)}
        <h3>Defesas e condições</h3>
        {details.resistance && <p>Resistência · {details.resistance}</p>}
        <Select label="Adicionar condição" value="" options={CONDITIONS.filter(item => !play.conditions.includes(item))}
          onChange={value => value && onPlay({ ...play, conditions: [...play.conditions, value] })}/>
        <div className="dnd24-conditions">{play.conditions.map(item => <button type="button" key={item} aria-label={`Remover condição ${item}`}
          onClick={() => onPlay({ ...play, conditions: play.conditions.filter(value => value !== item) })}>{item} ×</button>)}</div>
        <TextField label="Exaustão" value={play.exhaustion} type="number" min={0} max={6}
          onChange={value => onPlay({ ...play, exhaustion: bounded(value, 0, 6) })}/>
        <h3>Sentidos passivos</h3>
        <dl className="dnd24-facts">{['Investigation', 'Insight', 'Perception'].map(key =>
          <React.Fragment key={key}><dt>{SKILLS[key][0]}</dt><dd>{10 + skillBonus(key, details)}</dd></React.Fragment>)}
          {details.darkvision > 0 && <><dt>Visão no escuro</dt><dd>{details.darkvision} pés</dd></>}
        </dl>
      </aside>
    </div>
  </>;
}
