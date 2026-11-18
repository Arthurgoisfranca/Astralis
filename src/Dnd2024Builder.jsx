import React, { useEffect, useRef, useState } from 'react';
import { ABILITIES, ABILITY_KEYS, BACKGROUNDS, CLASSES, LANGUAGES, METAMAGIC, ORIGIN_FEATS, SKILLS, SKILL_KEYS, SPECIES, STYLES, TOOLS, WEAPONS, spellLabel } from './domain/dnd2024Catalog.mjs';
import { BUILDER_STEPS, POINT_COST, STANDARD_ARRAY, blessedStrikes, classData, classEntry, featureLevels, fightingStyles, isInnateCaster,
  masteryCapacity, metamagicCapacity, newAbilityRolls, sharesSpellChoices, signedNumber, skillBonus, subclassData } from './domain/dnd2024Rules.mjs';

const ORIGIN_LABELS = { 'Magic Initiate (Cleric)': 'Iniciado em Magia (Clérigo)', 'Magic Initiate (Druid)': 'Iniciado em Magia (Druida)',
  'Magic Initiate (Wizard)': 'Iniciado em Magia (Mago)', Tough: 'Robusto', Alert: 'Alerta', Skilled: 'Habilidoso', 'Savage Attacker': 'Atacante Selvagem' };
const LANGUAGES_AVAILABLE = LANGUAGES.filter(language => language !== 'Comum');
const STYLE_LABELS = {
  Archery: 'Arquearia', 'Blind Fighting': 'Combate às Cegas', Defense: 'Defesa', Dueling: 'Duelo',
  'Great Weapon Fighting': 'Combate com Armas Grandes', Interception: 'Interceptação', Protection: 'Proteção',
  'Thrown Weapon Fighting': 'Combate com Armas de Arremesso', 'Two-Weapon Fighting': 'Combate com Duas Armas',
  'Unarmed Fighting': 'Combate Desarmado', 'Blessed Warrior': 'Combatente Abençoado', 'Druidic Warrior': 'Combatente Druídico',
};
const styleOptions = styles => styles.map(style => [style, STYLE_LABELS[style] ?? style]);
const normalizeSearch = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const BACKGROUND_ROLLS = {
  alignment: ['Leal e Bom', 'Neutro e Bom', 'Caótico e Bom', 'Leal e Neutro', 'Neutro', 'Caótico e Neutro', 'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau'],
  lifestyle: ['Miserável', 'Esquálido', 'Pobre', 'Modesto', 'Confortável', 'Rico', 'Aristocrático'],
};

export function Select({ label, value, onChange, options, hint = 'Selecione', disabled }) {
  return <label className="dnd24-field">{label}<select disabled={disabled} value={value ?? ''}
    onChange={event => onChange(event.target.value)}>
    <option value="">{hint}</option>
    {options.map(option => {
      const [id, text] = Array.isArray(option) ? option : [option, option];
      return <option key={id} value={id}>{text}</option>;
    })}
  </select></label>;
}

export function TextField({ label, value, onChange, long = false, maxLength = 80, type = 'text', min, max }) {
  const props = { value: value ?? '', onChange: event => onChange(event.target.value), maxLength };
  return <label className="dnd24-field">{label}
    {long ? <textarea {...props} rows={4}/> : <input {...props} type={type} min={min} max={max}/>}
  </label>;
}

const abilityOptions = (keys = ABILITY_KEYS) => keys.map(key => [key, ABILITIES[key][0]]);
const skillOptions = keys => keys.map(key => [key, SKILLS[key][0]]);
const sourceOptions = catalog => Object.entries(catalog).map(([key, item]) => [key, item.name]);
const labelFeat = feat => ORIGIN_LABELS[feat] ?? feat;
const featOptions = ORIGIN_FEATS.map(feat => [feat, labelFeat(feat)]);

function Multiple({ label, options, selected, limit, onChange }) {
  return <fieldset className="dnd24-multiple">
    <legend>{label} <small>{selected.length}/{limit}</small></legend>
    <div>{options.map(option => {
      const [id, text] = Array.isArray(option) ? option : [option, option];
      return <label key={id}><input type="checkbox" checked={selected.includes(id)}
        disabled={!selected.includes(id) && selected.length >= limit}
        onChange={event => onChange(event.target.checked ? [...selected, id] : selected.filter(item => item !== id))}/>{text}</label>;
    })}</div>
  </fieldset>;
}

function Catalogue({ label, options, value, onChange }) {
  const [search, setSearch] = useState('');
  const match = normalizeSearch(search.trim());
  const shown = options.filter(([, name]) => normalizeSearch(name).includes(match));
  return <div className="dnd24-catalogue">
    <TextField label={`Buscar ${label}`} value={search} onChange={setSearch}/>
    <div className="dnd24-catalogue-grid">{shown.map(([id, name]) => <button type="button" key={id}
      aria-pressed={id === value} onClick={() => onChange(id)}>{name}</button>)}</div>
    {!shown.length && <p>Nenhum resultado.</p>}
  </div>;
}

function SubclassPreview({ subclasses, selected }) {
  const [focused, setFocused] = useState('');
  const subclass = subclasses.find(item => item.id === focused) ?? selected ?? subclasses[0];
  const levels = [...new Set([...Object.keys(subclass.levels), ...Object.keys(subclass.spells ?? {})])].sort((a, b) => Number(a) - Number(b));
  return <section className="dnd24-progression">
    <h4>Subclasses</h4>
    <div className="dnd24-subclass-list" role="group" aria-label="Consultar subclasses">
      {subclasses.map(item => <button key={item.id} type="button" aria-pressed={item.id === subclass.id}
        onClick={() => setFocused(item.id)}>{item.label}</button>)}
    </div>
    <div className="dnd24-subclass-preview">
      <small>Livro do Jogador 2024 · p. {subclass.page} · escolha no nível 3</small>
      {levels.map(level => <div key={level} className="dnd24-subclass-level">
        <strong>Nível {level}</strong>
        <div>{subclass.levels[level]?.join(' · ')}
          {subclass.spells?.[level] && <small>Magias · {subclass.spells[level].map(spellLabel).join(' · ')}</small>}
        </div>
      </div>)}
    </div>
  </section>;
}

function ClassStage({ build, details, patch }) {
  const [preview, setPreview] = useState(build.classes[0]?.id || 'cleric');
  const selected = build.classes.find(entry => entry.id === preview);
  const data = classData(selected ?? classEntry(preview));
  const subclass = subclassData(selected);
  const patchEntry = changes => patch({ classes: build.classes.map(entry => entry.id === preview ? { ...entry, ...changes } : entry) });
  const mastery = selected ? masteryCapacity(selected) : 0;
  const weaponOptions = Object.entries(WEAPONS).filter(([, weapon]) => {
    const traits = weapon[3] || '';
    return !traits.includes('martial') || data.weapons === 'martial' ||
      data.weapons === 'rogue' && (traits.includes('light') || traits.includes('finesse')) ||
      preview === 'cleric' && selected?.order === 'protector' || preview === 'druid' && selected?.order === 'warden';
  }).map(([name, weapon]) => [name, `${name} · ${weapon[2]}`]);
  const canFightStyle = selected && (preview === 'fighter' || ['paladin', 'ranger'].includes(preview) && selected.level >= 2);

  return <div className="dnd24-columns">
    <div className="dnd24-card">
      <div className="dnd24-metrics"><b>{details.level || '—'}<small>Nível total</small></b><b>{signedNumber(details.pb)}<small>Proficiência</small></b><b>{details.hp}<small>PV calculados</small></b></div>
      {!!build.classes.length && <div className="dnd24-roster">
        {build.classes.map((entry, index) => <button key={entry.id} type="button" aria-pressed={preview === entry.id} onClick={() => setPreview(entry.id)}>
          <span>{classData(entry).name} {index === 0 && <small>Inicial</small>}</span><b>{entry.level}</b>
        </button>)}
      </div>}
      <Catalogue label="classes" value={preview} onChange={setPreview}
        options={[...sourceOptions(CLASSES), ['custom', 'Classe personalizada']]}/>
    </div>
    <div className="dnd24-card">
      <h3>{data.name}</h3>
      <p>Dado de Vida d{data.hitDie}{data.primary.length > 0 && ` · Atributo principal ${data.primary.map(key => ABILITIES[key][0]).join(data.either ? ' ou ' : ' e ')}`}</p>
      {!selected ? <button type="button" className="dnd24-primary" disabled={details.level >= 20}
        onClick={() => patch({ classes: [...build.classes, classEntry(preview)] })}>
        {build.classes.length ? 'Adicionar multiclasse' : 'Escolher classe inicial'}</button> : <>
        <div className="dnd24-actions">
          <button type="button" disabled={selected.level <= 1} onClick={() => patchEntry({ level: selected.level - 1 })}>Diminuir nível</button>
          <strong>Nível {selected.level}</strong>
          <button type="button" disabled={details.level >= 20} onClick={() => patchEntry({ level: selected.level + 1 })}>Aumentar nível</button>
          <button type="button" onClick={() => patch({ classes: build.classes.filter(entry => entry.id !== selected.id),
            ...(build.classes[0].id === selected.id ? { classKit: '' } : {}) })}>Remover classe</button>
        </div>
        {preview === 'custom' && <div className="dnd24-fields">
          <TextField label="Nome da classe" value={selected.name} onChange={name => patchEntry({ name })}/>
          <Select label="Dado de Vida" value={selected.hitDie ?? 8} options={[6, 8, 10, 12].map(die => [die, `d${die}`])}
            onChange={hitDie => patchEntry({ hitDie: Number(hitDie) })}/>
          <Multiple label="Salvaguardas" options={abilityOptions()} selected={selected.customSaves ?? []} limit={2}
            onChange={customSaves => patchEntry({ customSaves })}/>
        </div>}
        {preview === 'cleric' && <Select label="Ordem Divina" value={selected.order}
          options={[[ 'protector', 'Protetor' ], [ 'thaumaturge', 'Taumaturgo' ]]} onChange={order => patchEntry({ order })}/>}
        {preview === 'druid' && <Select label="Ordem Primal" value={selected.order}
          options={[[ 'warden', 'Guardião' ], [ 'magician', 'Mago da natureza' ]]} onChange={order => patchEntry({ order })}/>}
        {preview === 'cleric' && selected.level >= 7 && <Select label="Golpes Abençoados" value={selected.blessedStrike}
          options={blessedStrikes} onChange={blessedStrike => patchEntry({ blessedStrike })}/>}
        {selected.level >= 3 && data.subclasses.length > 0 && <>
          <Select label="Subclasse" value={subclass?.id ?? (selected.subclass ? 'custom' : '')}
            options={[...data.subclasses.map(item => [item.id, item.label]), ['custom', 'Subclasse personalizada']]}
            onChange={subclass => patchEntry({ subclass: subclass === 'custom' ? 'Personalizada' : subclass })}/>
          {selected.subclass && !subclass && <TextField label="Nome da subclasse" value={selected.subclass} onChange={subclass => patchEntry({ subclass })}/>}
          {subclass?.terrains && <Select label="Terreno do Círculo da Terra" value={selected.terrain}
            options={Object.keys(subclass.terrains)} onChange={terrain => patchEntry({ terrain })}/>}
        </>}
        {canFightStyle && <Select label="Estilo de luta" value={selected.style} options={styleOptions(fightingStyles(selected))}
          onChange={style => patchEntry({ style, ...(style === selected.extraStyle ? { extraStyle: '' } : {}) })}/>}
        {subclass?.id === 'Champion' && selected.level >= 7 && <Select label="Estilo de luta adicional" value={selected.extraStyle}
          options={styleOptions(STYLES.filter(style => style !== selected.style))} onChange={extraStyle => patchEntry({ extraStyle })}/>}
        {metamagicCapacity(selected) > 0 && <Multiple label="Metamagia" options={METAMAGIC}
          selected={(selected.metamagic ?? []).slice(0, metamagicCapacity(selected))}
          limit={metamagicCapacity(selected)} onChange={metamagic => patchEntry({ metamagic })}/>}
        {mastery > 0 && <Multiple label="Maestrias em armas" options={weaponOptions} limit={mastery} selected={selected.mastery}
          onChange={mastery => patchEntry({ mastery })}/>}
      </>}
      {data.subclasses.length > 0 && <SubclassPreview key={`${preview}:${subclass?.id ?? ''}`} subclasses={data.subclasses} selected={subclass}/>}
      {data.rows.length > 0 && <div className="dnd24-progression">
        <h4>Progressão da classe</h4>
        {featureLevels(selected ?? classEntry(preview)).map(({ level, features }) => {
          const row = data.rows[level - 1];
          return <details key={level}><summary>Nível {level}{selected && level <= selected.level ? ' · liberado' : ''}</summary>
            <p>{features.length ? features.join(' · ') : 'Sem nova característica nesta tabela.'}</p>
            {(row.prepared || row.cantrips || row.mastery || row.pact) && <small>
              {[row.cantrips && `${row.cantrips} truques`, row.prepared && `${row.prepared} preparadas`,
                row.mastery && `${row.mastery} maestrias`, row.pact && `${row.pact} espaços de pacto`].filter(Boolean).join(' · ')}
            </small>}
          </details>;
        })}
      </div>}
    </div>
  </div>;
}

function SpeciesStage({ build, details, patch }) {
  const species = details.species;
  const custom = changes => patch({ custom: { ...build.custom, ...changes } });
  return <div className="dnd24-columns">
    <div className="dnd24-card"><Catalogue label="espécies" value={build.species}
      options={[...sourceOptions(SPECIES), ['custom', 'Espécie personalizada']]}
      onChange={value => patch({ species: value, lineage: '', speciesSkill: '', speciesAbility: '', humanFeat: '' })}/></div>
    <div className="dnd24-card">
      <h3>{species?.name || 'Espécie'}</h3>
      {build.species === 'custom' && <>
        <TextField label="Nome da espécie" value={build.custom.speciesName} onChange={speciesName => custom({ speciesName })}/>
        <TextField label="Deslocamento em pés" type="number" min={0} max={120} value={build.custom.speed ?? 30}
          onChange={speed => custom({ speed })}/>
      </>}
      {species && <>
        <div className="dnd24-metrics"><b>{details.speed}<small>Deslocamento em pés</small></b>
          {details.darkvision > 0 && <b>{details.darkvision}<small>Visão no escuro</small></b>}</div>
        {species.lineages && <Select label="Linhagem" value={build.lineage} options={species.lineages}
          onChange={lineage => patch({ lineage })}/>}
        {isInnateCaster(build) && <Select label="Atributo de magia inata" value={build.speciesAbility}
          options={abilityOptions(['intelligence', 'wisdom', 'charisma'])} onChange={speciesAbility => patch({ speciesAbility })}/>}
        <ul className="dnd24-plain-list">{species.traits.map(trait => <li key={trait}>{trait}</li>)}</ul>
      </>}
    </div>
  </div>;
}

function BackgroundStage({ build, details, patch }) {
  const background = details.background;
  const custom = changes => patch({ custom: { ...build.custom, ...changes } });
  return <div className="dnd24-columns">
    <div className="dnd24-card"><Catalogue label="antecedentes" value={build.background}
      options={[...sourceOptions(BACKGROUNDS), ['custom', 'Antecedente personalizado']]}
      onChange={background => patch({ background, bonuses: [], backgroundKit: '', backgroundTool: '' })}/></div>
    <div className="dnd24-card">
      <h3>{background?.name || 'Antecedente'}</h3>
      {build.background === 'custom' && <>
        <TextField label="Nome do antecedente" value={build.custom.backgroundName} onChange={backgroundName => custom({ backgroundName })}/>
        <Multiple label="Atributos elegíveis" options={abilityOptions()} selected={build.custom.abilities ?? []} limit={3}
          onChange={abilities => { patch({ custom: { ...build.custom, abilities }, bonuses: [] }); }}/>
        <Multiple label="Perícias de origem" options={skillOptions(SKILL_KEYS)} selected={build.custom.skills ?? []} limit={2}
          onChange={skills => custom({ skills })}/>
        <Select label="Talento de origem" options={featOptions} value={build.custom.feat} onChange={feat => custom({ feat })}/>
        <Select label="Ferramenta" options={TOOLS} value={build.custom.tool} onChange={tool => custom({ tool })}/>
      </>}
      {background && <dl className="dnd24-facts">
        <dt>Atributos</dt><dd>{background.abilities.map(key => ABILITIES[key][0]).join(', ') || '—'}</dd>
        <dt>Talento de origem</dt><dd>{labelFeat(background.feat) || '—'}</dd>
        <dt>Perícias</dt><dd>{background.skills.map(key => SKILLS[key][0]).join(', ') || '—'}</dd>
        <dt>Ferramentas</dt><dd>{background.tool || background.tools?.join(' / ') || '—'}</dd>
      </dl>}
    </div>
  </div>;
}

function AbilityStage({ build, details, patch }) {
  const method = build.scoreMethod;
  const pool = method === 'roll' ? build.rolled.map(row => row.total) : STANDARD_ARRAY;
  const bonusKeys = details.background?.abilities ?? [];
  const pickScore = (key, value) => patch({ scores: { ...build.scores, [key]: value === '' ? undefined : Number(value) } });
  const assign = () => patch({ scores: Object.fromEntries(ABILITY_KEYS.map((key, index) => [key, pool[index]])) });
  return <>
    <div className="dnd24-methods">
      {[['standard', 'Valores padrão'], ['point', 'Compra por pontos'], ['roll', 'Rolagem'], ['manual', 'Manual']].map(([id, label]) =>
        <button key={id} type="button" aria-pressed={method === id}
          onClick={() => patch({ scoreMethod: id, scores: id === 'point' ? Object.fromEntries(ABILITY_KEYS.map(key => [key, 8])) : {} })}>{label}</button>)}
    </div>
    <div className="dnd24-columns">
      <div className="dnd24-card">
        {method === 'point' && <p><strong>{details.pointCost} / 27</strong> pontos gastos</p>}
        {method === 'roll' && <>
          <button type="button" onClick={() => patch({ rolled: newAbilityRolls(), scores: {} })}>Rolar seis vezes · 4d6</button>
          <ol className="dnd24-plain-list">{build.rolled.map(({ dice, total }, index) => <li key={index}>{dice.join(' · ')} → <b>{total}</b></li>)}</ol>
        </>}
        {['standard', 'roll'].includes(method) && <div className="dnd24-actions">
          <button type="button" disabled={pool.length !== 6} onClick={assign}>Atribuir na ordem</button>
          <button type="button" onClick={() => patch({ scores: {} })}>Limpar distribuição</button>
        </div>}
        <h3>Bônus de antecedente</h3>
        <Select label="Distribuição" value={build.bonusMode} options={[['split', '+2 e +1'], ['three', '+1, +1 e +1']]}
          onChange={bonusMode => patch({ bonusMode, bonuses: [] })}/>
        {(build.bonusMode === 'three' ? [1, 1, 1] : [2, 1]).map((amount, index) =>
          <Select key={index} label={`Bônus ${index + 1} (+${amount})`} value={build.bonuses[index]}
            options={abilityOptions(bonusKeys.filter(key => build.bonuses[index] === key || !build.bonuses.includes(key)))}
            onChange={value => {
              const bonuses = (build.bonusMode === 'three' ? [0, 1, 2] : [0, 1]).map(position => position === index ? value : build.bonuses[position] ?? '');
              patch({ bonuses });
            }}/>)}
      </div>
      <div className="dnd24-ability-grid">
        {ABILITY_KEYS.map(key => {
          const selected = build.scores[key];
          const available = pool.filter(value => pool.filter(item => item === value).length >
            ABILITY_KEYS.filter(other => other !== key && build.scores[other] === value).length);
          return <div className="dnd24-card dnd24-ability" key={key}>
            <span>{ABILITIES[key][0]}</span><b>{signedNumber(details.modifiers[key])}</b>
            <small>Total {details.scores[key]}</small>
            {method === 'manual' ? <TextField label={`Base de ${ABILITIES[key][0]}`} type="number" value={selected} min={1} max={20}
              onChange={value => pickScore(key, value)}/> : <Select label={`Base de ${ABILITIES[key][0]}`} value={selected}
              options={method === 'point' ? Object.entries(POINT_COST).map(([score, cost]) => [score, `${score} · ${cost} pts`]) : [...new Set(available)]}
              onChange={value => pickScore(key, value)}/>}
          </div>;
        })}
      </div>
    </div>
  </>;
}

function FeatStage({ build, details, patch, go }) {
  return <div className="dnd24-columns">
    <div className="dnd24-card"><h3>Talentos de origem</h3>
      {build.species === 'human' && <Select label="Talento adicional do Humano" options={featOptions.filter(([feat]) => feat !== details.background?.feat)}
        value={build.humanFeat} onChange={humanFeat => patch({ humanFeat })}/>}
      {details.origins.map(feat => <div key={feat} className="dnd24-subcard"><strong>{labelFeat(feat)}</strong>
        {feat.startsWith('Magic Initiate') && <>
          <Select label="Atributo de conjuração" options={abilityOptions(['intelligence', 'wisdom', 'charisma'])}
            value={build.magicAbilities[feat]} onChange={ability => patch({ magicAbilities: { ...build.magicAbilities, [feat]: ability } })}/>
          <button type="button" onClick={() => go('Magias')}>Escolher truques e magia</button>
        </>}
      </div>)}
    </div>
    <div className="dnd24-card"><h3>Talentos de nível</h3>
      {!details.feats.length && <p>Os espaços aparecem quando a classe alcança o nível exigido.</p>}
      {details.feats.map(slot => {
        const choice = build.feats[slot.id] ?? {};
        const update = next => patch({ feats: { ...build.feats, [slot.id]: { ...choice, ...next } } });
        const options = [['Ability Score Improvement', 'Aumento no Valor de Atributo'], ['Custom', 'Talento personalizado']];
        if (slot.epic) options.push(['Boon of Fate', 'Dádiva do Destino'], ['Boon of Combat Prowess', 'Dádiva de Valentia em Combate']);
        else options.push(['Grappler', 'Agarrador'], ['Tough', 'Robusto']);
        return <div key={slot.id} className="dnd24-subcard"><h4>{slot.name} · nível {slot.level}</h4>
          <Select label="Talento" value={choice.name} options={options} onChange={name => update({ name, values: [], label: '' })}/>
          {choice.name === 'Custom' && <TextField label="Nome do talento" value={choice.label} onChange={label => update({ label })}/>}
          {choice.name === 'Ability Score Improvement' && <Multiple label="Um atributo +2 ou dois +1" options={abilityOptions()}
            selected={choice.values || []} limit={2} onChange={values => update({ values })}/>}
          {choice.name?.startsWith('Boon') && <Select label="Atributo +1" value={choice.values?.[0]} options={abilityOptions()}
            onChange={value => update({ values: [value] })}/>}
          {choice.name === 'Grappler' && <Select label="Atributo +1" value={choice.values?.[0]} options={abilityOptions(['strength', 'dexterity'])}
            onChange={value => update({ values: [value] })}/>}
        </div>;
      })}
    </div>
  </div>;
}

function SkillStage({ build, details, patch }) {
  const patchEntry = (id, changes) => patch({ classes: build.classes.map(item => item.id === id ? { ...item, ...changes } : item) });
  return <div className="dnd24-columns">
    <div className="dnd24-card">
      <h3>Escolhas de proficiência</h3>
      {details.background && <p>{details.background.name} · {details.background.skills.map(key => SKILLS[key][0]).join(', ')}</p>}
      {details.skillGroups.map(group => <Multiple key={group.id} label={group.title}
        options={skillOptions(group.allowed)} selected={group.values} limit={group.count}
        onChange={skills => group.id === 'species' ? patch({ speciesSkill: skills[0] || '' })
          : group.id === 'bard:lore' ? patchEntry('bard', { loreSkills: skills }) : patchEntry(group.id, { skills })}/>)}
      {details.expertiseGroups.map(group => <Multiple key={group.id} label={group.title} options={skillOptions(group.allowed)}
        selected={group.values} limit={group.count} onChange={expertise => patchEntry(group.id, { expertise })}/>)}
      {details.origins.includes('Skilled') && <Multiple label="Habilidoso" options={[
        ...skillOptions(SKILL_KEYS.filter(key => !details.baseSkills.includes(key))), ...TOOLS.filter(key => !details.baseTools.includes(key)),
      ]} selected={(build.skilled ?? []).filter(key => !details.baseSkills.includes(key) && !details.baseTools.includes(key))}
        limit={3} onChange={skilled => patch({ skilled })}/>}
      {details.background?.tools && <Select label="Ferramenta do antecedente" options={details.background.tools}
        value={build.backgroundTool} onChange={backgroundTool => patch({ backgroundTool })}/>}
      {build.classes.map((entry, index) => {
        const data = classData(entry), count = index === 0 ? data.toolPicks : entry.id === 'bard' ? 1 : 0;
        return count ? <Multiple key={entry.id} label={`Ferramentas · ${data.name}`}
          options={entry.id === 'bard' ? TOOLS.slice(-3) : TOOLS} selected={entry.tools} limit={count}
          onChange={tools => patchEntry(entry.id, { tools })}/> : null;
      })}
      {details.tools.length > 0 && <p>Ferramentas · {details.tools.join(', ')}</p>}
    </div>
    <div className="dnd24-card">
      <h3>Bônus das perícias</h3>
      <table className="dnd24-table"><thead><tr><th>Perícia</th><th>Atributo</th><th>Treino</th><th>Total</th></tr></thead>
        <tbody>{SKILL_KEYS.map(key => <tr key={key}><th>{SKILLS[key][0]}</th><td>{ABILITIES[SKILLS[key][1]][1]}</td>
          <td>{details.expertise.includes(key) ? 'Especialização' : details.proficientSkills.includes(key) ? 'Proficiência' : '—'}</td>
          <td><strong>{signedNumber(skillBonus(key, details))}</strong></td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function SpellPicker({ group, selected, onSave, onClose }) {
  const ref = useRef(null);
  const [search, setSearch] = useState('');
  const [circle, setCircle] = useState('');
  const [choices, setChoices] = useState(selected);
  useEffect(() => { ref.current?.showModal(); }, []);
  const match = normalizeSearch(search.trim());
  const visible = group.options.filter(spell => (normalizeSearch(spell.label).includes(match) || normalizeSearch(spell.name).includes(match)) &&
    (circle === '' || spell.level === Number(circle)));
  return <dialog ref={ref} className="dnd24-spell-dialog" aria-labelledby="dnd24-spell-picker"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); onClose(); }
      if (event.key === 'Enter' && event.target.type === 'text') event.preventDefault();
    }}>
    <header><div><h3 id="dnd24-spell-picker">{group.title}</h3><small>{choices.length}/{group.count} escolhidas</small></div>
      <button type="button" onClick={onClose} aria-label="Fechar seleção de magias">Fechar</button></header>
    <div className="dnd24-fields">
      <TextField label="Buscar magia" value={search} onChange={setSearch}/>
      {group.min !== group.max && <Select label="Círculo" hint="Todos" value={circle} onChange={setCircle}
        options={Array.from({ length: group.max - group.min + 1 }, (_, index) => String(group.min + index))}/>}
    </div>
    <div className="dnd24-spell-options">
      {visible.map(spell => <div key={spell.name} className="dnd24-spell-option">
        <label><input type="checkbox" aria-label={spell.name === spell.label ? spell.label : `${spell.label} (${spell.name})`}
          checked={choices.includes(spell.name)} disabled={!choices.includes(spell.name) && choices.length >= group.count}
          onChange={event => setChoices(values => event.target.checked ? [...values, spell.name] : values.filter(item => item !== spell.name))}/>
          <b>{spell.label}</b><small>{spell.level ? `${spell.level}º` : 'Truque'} · {spell.school}{spell.concentration ? ' · Concentração' : ''}{spell.ritual ? ' · Ritual' : ''}</small></label>
        <details><summary>Dados da magia</summary>
          <p>{[spell.components && spell.components.split('').join(' / '), spell.range, spell.duration].filter(Boolean).join(' · ')}</p>
        </details>
      </div>)}
      {!visible.length && <p>Nenhuma magia encontrada.</p>}
    </div>
    <footer><button type="button" className="dnd24-primary" onClick={() => onSave(choices)}>Salvar seleção</button></footer>
  </dialog>;
}

function SpellStage({ details, setSpells }) {
  const [picker, setPicker] = useState('');
  const group = details.groups.find(item => item.id === picker);
  const alreadyChosen = group && sharesSpellChoices(group.id)
    ? details.groups.filter(other => other.id !== group.id && other.id.split(':')[0] === group.id.split(':')[0] && sharesSpellChoices(other.id))
      .flatMap(other => details.selected[other.id]) : [];
  return <div className="dnd24-columns">
    <div className="dnd24-card"><h3>Escolhas de magia</h3>
      {!details.groups.length && <p>A combinação atual não exige escolher magias.</p>}
      {details.groups.map(item => {
        const count = details.selected[item.id].length;
        return <article key={item.id} className="dnd24-subcard" data-pending={count < item.count}>
          <div className="dnd24-spell-heading"><h4>{item.title}</h4><b>{count}/{item.count}</b></div>
          {count > 0 && <p>{details.selected[item.id].map(spellLabel).join(' · ')}</p>}
          <button type="button" onClick={() => setPicker(item.id)}>{count ? 'Rever seleção' : 'Escolher'} · {item.title}</button>
        </article>;
      })}
    </div>
    <div className="dnd24-card"><h3>Espaços e magias concedidas</h3>
      <div className="dnd24-slot-list">{details.slots.map((count, index) => count > 0 &&
        <span key={index}>{index + 1}º círculo <b>{count}</b></span>)}</div>
      {details.pact?.pact > 0 && <p>Pacto · {details.pact.pact} de {details.pact.pactLevel}º círculo</p>}
      {details.granted.length > 0 && <ul className="dnd24-plain-list">{details.granted.map((spell, index) =>
        <li key={`${spell.id}-${index}`}>{spellLabel(spell.name)} · {spell.source}</li>)}</ul>}
    </div>
    {group && <SpellPicker key={picker} group={{ ...group, options: group.options.filter(spell => !alreadyChosen.includes(spell.name)) }}
      selected={details.selected[picker]} onClose={() => setPicker('')} onSave={choices => {
        setSpells(old => ({ ...old, [picker]: choices }));
        setPicker('');
      }}/>}
  </div>;
}

function EquipmentStage({ build, details, patch }) {
  const starting = classData(build.classes[0]);
  const packages = kits => kits?.map((kit, index) => [String(index), kit.items.length ? `Pacote ${String.fromCharCode(65 + index)} · ${kit.coins} PO` : `${kit.coins} PO`]) ?? [];
  return <div className="dnd24-columns">
    <div className="dnd24-card"><h3>Pacotes iniciais</h3>
      <Select label="Equipamento da classe" value={build.classKit} options={packages(starting?.kits)} onChange={classKit => patch({ classKit })}/>
      <Select label="Equipamento do antecedente" value={build.backgroundKit} options={packages(details.background?.kits)} onChange={backgroundKit => patch({ backgroundKit })}/>
      {details.equipment.needsFocus && <Select label="Símbolo sagrado" value={build.focus} options={['Amuleto', 'Emblema', 'Relicário']}
        onChange={focus => patch({ focus })}/>}
    </div>
    <div className="dnd24-card"><h3>Inventário inicial</h3><p><strong>{details.equipment.coins} PO</strong></p>
      <ul className="dnd24-plain-list">{details.equipment.items.map(([item, quantity]) => <li key={item}>{item} <b>×{quantity}</b></li>)}</ul>
    </div>
  </div>;
}

function AboutStage({ build, patch, name, onName, about, onAbout, notes, appearance, onText, onRoll }) {
  const fields = [
    ['pronouns', 'Pronomes'], ['faith', 'Fé'], ['hair', 'Cabelo'], ['skin', 'Pele'], ['eyes', 'Olhos'],
    ['height', 'Altura'], ['weight', 'Peso'], ['age', 'Idade'], ['gender', 'Gênero'],
  ];
  const stories = [['personality', 'Traços de personalidade'], ['ideals', 'Ideais'], ['bonds', 'Vínculos'], ['flaws', 'Defeitos'],
    ['allies', 'Aliados'], ['enemies', 'Inimigos'], ['organizations', 'Organizações']];
  const rollLabels = { alignment: 'Tendência', lifestyle: 'Estilo de vida' };
  return <div className="dnd24-columns">
    <div className="dnd24-card"><h3>Identidade</h3>
      <TextField label="Nome do personagem" value={name} onChange={onName}/>
      <div className="dnd24-fields">{fields.map(([key, label]) => <TextField key={key} label={label}
        value={about[key]} onChange={value => onAbout({ [key]: value })}/>)}</div>
      {Object.entries(BACKGROUND_ROLLS).map(([key, options]) => <div className="dnd24-paired" key={key}>
        <TextField label={rollLabels[key]} value={about[key]} onChange={value => onAbout({ [key]: value })}/>
        <button type="button" onClick={() => { const value = options[Math.floor(Math.random() * options.length)]; onAbout({ [key]: value }); onRoll(rollLabels[key], value); }}>Sortear {rollLabels[key].toLowerCase()}</button>
      </div>)}
      <Multiple label="Idiomas além do Comum" options={LANGUAGES_AVAILABLE} selected={build.languages} limit={2}
        onChange={languages => patch({ languages })}/>
    </div>
    <div className="dnd24-card"><h3>História e aparência</h3>
      <TextField long label="Aparência" value={appearance} maxLength={2000} onChange={value => onText('appearance', value)}/>
      <TextField long label="História e notas" value={notes} maxLength={3000} onChange={value => onText('notes', value)}/>
      {stories.map(([key, label]) => <TextField key={key} long label={label} value={about[key]} maxLength={220}
        onChange={value => onAbout({ [key]: value })}/>)}
    </div>
  </div>;
}

export default function Dnd2024Builder({ build, details, patch, setSpells, step, go, name, onName, about, onAbout,
  notes, appearance, onText, onRoll, onComplete, onDemo }) {
  const pending = BUILDER_STEPS.filter(item => details.issues[item].length);
  const index = BUILDER_STEPS.indexOf(step);
  const spellOverview = new Map();
  for (const group of details.groups) {
    const [caster, type] = group.id.split(':');
    const origin = type.startsWith('initiate') ? labelFeat(`Magic Initiate (${caster[0].toUpperCase()}${caster.slice(1)})`) : CLASSES[caster]?.name ?? group.title;
    const totals = spellOverview.get(origin) ?? { chosen: 0, total: 0 };
    totals.chosen += details.selected[group.id].length;
    totals.total += group.count;
    spellOverview.set(origin, totals);
  }
  const summary = {
    Classe: build.classes.map(entry => `${classData(entry).name} ${entry.level}`).join(' / '),
    Espécie: details.species?.name, Antecedente: details.background?.name,
    Atributos: ABILITY_KEYS.map(key => `${ABILITIES[key][1]} ${details.scores[key]}`).join(' · '),
    Talentos: details.origins.map(labelFeat).join(', '), Perícias: `${details.proficientSkills.length} proficiências`,
    Magias: spellOverview.size ? '' : 'Sem escolhas de magia',
    Equipamento: `${details.equipment.items.length} itens · ${details.equipment.coins} PO`, Sobre: [name, about.pronouns].filter(Boolean).join(' · '),
  };
  const active = {
    Classe: <ClassStage build={build} details={details} patch={patch}/>,
    Espécie: <SpeciesStage build={build} details={details} patch={patch}/>,
    Antecedente: <BackgroundStage build={build} details={details} patch={patch}/>,
    Atributos: <AbilityStage build={build} details={details} patch={patch}/>,
    Talentos: <FeatStage build={build} details={details} patch={patch} go={go}/>,
    Perícias: <SkillStage build={build} details={details} patch={patch}/>,
    Magias: <SpellStage details={details} setSpells={setSpells}/>,
    Equipamento: <EquipmentStage build={build} details={details} patch={patch}/>,
    Sobre: <AboutStage {...{ build, patch, name, onName, about, onAbout, notes, appearance, onText, onRoll }}/>,
  };
  return <div className="dnd24-builder">
    <aside className="dnd24-builder-rail">
      <nav aria-label="Etapas do criador">{BUILDER_STEPS.map((item, position) => <button type="button" key={item}
        aria-current={step === item ? 'step' : undefined} onClick={() => go(item)} data-pending={details.issues[item].length > 0}>
        <span>{position + 1}</span>{item}<small>{details.issues[item].length ? '!' : '✓'}</small>
      </button>)}</nav>
      <button type="button" className="dnd24-review-link" aria-current={step === 'Revisão' ? 'step' : undefined} onClick={() => go('Revisão')}>Revisão</button>
    </aside>
    <div className="dnd24-builder-main">
      <header className="dnd24-stage-header">
        <div><span>{index >= 0 ? `Etapa ${index + 1} de ${BUILDER_STEPS.length}` : 'Conferir personagem'}</span><h2>{step}</h2></div>
        {step === 'Revisão' ? <button type="button" data-pending={pending.length > 0} onClick={() => pending[0] && go(pending[0])}>
          {pending.length ? `${pending.length} etapa(s) pendente(s)` : 'Tudo pronto'}
        </button> : <div className="dnd24-actions"><button type="button" onClick={onDemo}>Testar com Gabriel</button>
          <button type="button" onClick={() => go('Revisão')}>Revisar · {pending.length}</button></div>}
      </header>
      {step === 'Revisão' ? <div className="dnd24-review-grid">
        {BUILDER_STEPS.map(item => <article key={item} className="dnd24-card" data-pending={details.issues[item].length > 0}>
          <button type="button" onClick={() => go(item)}><b>{item}</b><span>{details.issues[item].length ? '!' : '✓'}</span></button>
          {summary[item] && <p>{summary[item]}</p>}
          {item === 'Magias' && [...spellOverview].map(([origin, totals]) => <p key={origin} data-pending={totals.chosen < totals.total}>
            {origin} · <b>{totals.chosen}/{totals.total} escolhidas</b>
          </p>)}
          {details.issues[item].length > 0 && <ul>{details.issues[item].map((issue, i) => <li key={i}>{issue}</li>)}</ul>}
        </article>)}
      </div> : <>
        {active[step]}
        {details.issues[step].length > 0 && <ul className="dnd24-stage-issues" aria-label="Pendências da etapa">
          {details.issues[step].map((issue, i) => <li key={i}>{issue}</li>)}
        </ul>}
      </>}
      <div className="dnd24-wizard-footer">
        {index > 0 && <button type="button" onClick={() => go(BUILDER_STEPS[index - 1])}>Voltar</button>}
        {index >= 0 ? <button type="button" className="dnd24-primary" onClick={() => go(BUILDER_STEPS[index + 1] ?? 'Revisão')}>Avançar</button>
          : <button type="button" className="dnd24-primary" disabled={pending.length > 0} onClick={onComplete}>Montar ficha</button>}
      </div>
    </div>
  </div>;
}
