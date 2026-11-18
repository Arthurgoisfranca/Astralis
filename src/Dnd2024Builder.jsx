import React, { useEffect, useRef, useState } from 'react';
import { ABILITIES, ABILITY_KEYS, BACKGROUNDS, CLASSES, FEATS, FEAT_CATEGORIES, INSTRUMENTS, LANGUAGES, METAMAGIC,
  ORIGIN_FEATS, SKILLS, SKILL_KEYS, SPECIES, STYLES, TOOLS, WEAPONS, featInfo, spellLabel } from './domain/dnd2024Catalog.mjs';
import { BUILDER_STEPS, POINT_COST, STANDARD_ARRAY, blessedStrikes, classData, classEntry, classStyleSelections, featureLevels, fightingStyles, isInnateCaster,
  humanFeatOptions, masteryCapacity, metamagicCapacity, newAbilityRolls, sharesSpellChoices, signedNumber, skillBonus, subclassData } from './domain/dnd2024Rules.mjs';

const LANGUAGES_AVAILABLE = LANGUAGES.filter(language => language !== 'Comum');
const STYLE_LABELS = {
  'Blessed Warrior': 'Combatente Abençoado', 'Druidic Warrior': 'Combatente Druídico',
};
const styleOptions = styles => styles.map(style => [style, featInfo(style)?.label ?? STYLE_LABELS[style] ?? style]);
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
const labelFeat = feat => featInfo(feat)?.label ?? feat;
const featOptions = ORIGIN_FEATS.map(feat => [feat, labelFeat(feat)]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));

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
        {canFightStyle && <Select label="Estilo de luta" value={selected.style} options={styleOptions(fightingStyles(selected).filter(style =>
          !build.classes.some(entry => entry.id !== selected.id && classStyleSelections(entry).includes(style))))}
          onChange={style => patchEntry({ style, ...(style === selected.extraStyle ? { extraStyle: '' } : {}) })}/>}
        {subclass?.id === 'Champion' && selected.level >= 7 && <Select label="Estilo de luta adicional" value={selected.extraStyle}
          options={styleOptions(STYLES.filter(style => style !== selected.style &&
            !build.classes.some(entry => entry.id !== selected.id && classStyleSelections(entry).includes(style))))} onChange={extraStyle => patchEntry({ extraStyle })}/>}
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
      onChange={background => patch({ background, bonuses: [], backgroundKit: '', backgroundTool: '', backgroundKitTool: '',
        featChoices: Object.fromEntries(Object.entries(build.featChoices ?? {}).filter(([id]) => id !== 'origin:background')) })}/></div>
    <div className="dnd24-card">
      <h3>{background?.name || 'Antecedente'}</h3>
      {background?.summary && <p>{background.summary}</p>}
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
      {featInfo(background?.feat)?.summary && <p>{featInfo(background.feat).summary}</p>}
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

function FeatChoices({ row, build, patch, go }) {
  const { id, info, group, selected, expertOptions, expertSkill, expert, name } = row;
  const set = changes => patch({ featChoices: { ...build.featChoices, [id]: { ...build.featChoices?.[id], ...changes } } });
  const options = group?.options.map(key => [key, SKILLS[key]?.[0] ?? key]);
  return <>
    {info?.summary && <p>{info.summary}</p>}
    {group && (group.count === 1
      ? <Select label={group.label} options={options} value={selected[0]} onChange={value => set({ selected: value ? [value] : [] })}/>
      : <Multiple label={group.label} options={options} selected={selected} limit={group.count} onChange={values => set({ selected: values })}/>)}
    {expertSkill && <Select label="Especialização concedida pelo talento" options={skillOptions(expertOptions)}
      value={expert} onChange={expertise => set({ expertise })}/>}
    {info?.list && <Select label="Atributo de conjuração" options={abilityOptions(['intelligence', 'wisdom', 'charisma'])}
      value={build.magicAbilities[name]} onChange={ability => patch({ magicAbilities: { ...build.magicAbilities, [name]: ability } })}/>}
    {(info?.list || ['fey', 'shadow', 'ritual'].includes(info?.spells)) && <button type="button" onClick={() => go('Magias')}>
      {info?.list ? 'Escolher truques e magia' : 'Escolher magias do talento'}</button>}
  </>;
}

function FeatCatalogue() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const query = normalizeSearch(search.trim());
  const rows = Object.entries(FEATS).filter(([name, feat]) => (!category || feat.category === category) &&
    (!query || normalizeSearch(`${feat.label} ${name}`).includes(query))).sort((a, b) => a[1].label.localeCompare(b[1].label, 'pt-BR'));
  return <details className="dnd24-card dnd24-feat-catalogue">
    <summary>Consultar os {Object.keys(FEATS).length} talentos do Livro do Jogador</summary>
    <div className="dnd24-fields">
      <TextField label="Buscar talento" value={search} onChange={setSearch}/>
      <Select label="Categoria do talento" options={Object.entries(FEAT_CATEGORIES)} value={category} onChange={setCategory} hint="Todas"/>
    </div>
    <p role="status">{rows.length} {rows.length === 1 ? 'talento' : 'talentos'}</p>
    <div className="dnd24-feat-list">{rows.map(([name, feat]) => {
      const needs = feat.requires;
      const armor = { light: 'armadura leve', medium: 'armadura média', heavy: 'armadura pesada', shield: 'escudo' };
      const requirements = [feat.level && `nível ${feat.level}+`,
        needs?.scores && `${needs.scores.map(key => ABILITIES[key][0]).join(' ou ')} 13+`,
        needs?.armor && `treinamento com ${armor[needs.armor]}`,
        needs?.style && 'característica de Estilo de Luta',
        needs?.magic && 'Conjuração ou Magia de Pacto', needs?.spellcasting && 'característica de Conjuração'].filter(Boolean);
      return <article className="dnd24-subcard" key={name}>
        <strong>{feat.label}</strong> <small>{[FEAT_CATEGORIES[feat.category], ...requirements].join(' · ')}</small><p>{feat.summary}</p>
      </article>;
    })}</div>
  </details>;
}

function FeatStage({ build, details, patch, go }) {
  return <div className="dnd24-columns">
    <div className="dnd24-card"><h3>Talentos de origem</h3>
      {build.species === 'human' && <Select label="Talento adicional do Humano"
        options={featOptions.filter(([name]) => humanFeatOptions(details.background?.feat).includes(name))}
        value={build.humanFeat} onChange={humanFeat => patch({ humanFeat,
          featChoices: Object.fromEntries(Object.entries(build.featChoices ?? {}).filter(([id]) => id !== 'origin:human')) })}/>}
      {details.originRows.map(row => <div key={row.id} className="dnd24-subcard"><strong>{row.label}</strong><small> · {row.source}</small>
        <FeatChoices {...{ row, build, patch, go }}/>
      </div>)}
    </div>
    <div className="dnd24-card"><h3>Talentos de nível</h3>
      {!details.feats.length && <p>Os espaços aparecem quando a classe alcança o nível exigido.</p>}
      {details.feats.map(slot => {
        const choice = build.feats[slot.id] ?? {};
        const update = next => patch({ feats: { ...build.feats, [slot.id]: { ...choice, ...next } } });
        const options = slot.options.map(name => [name, labelFeat(name)]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
        const selectFeat = name => patch({ feats: { ...build.feats, [slot.id]: { name, values: [], label: '' } },
          featChoices: Object.fromEntries(Object.entries(build.featChoices ?? {}).filter(([id]) => id !== slot.id)) });
        const row = slot.row;
        return <div key={slot.id} className="dnd24-subcard"><h4>{slot.name} · nível {slot.level}{slot.epic && ' · Dádiva Épica'}</h4>
          <Select label={`Talento · ${slot.name} ${slot.level}`} value={row || choice.name === 'Custom' ? choice.name : ''} options={[...options, ['Custom', 'Talento personalizado']]} onChange={selectFeat}/>
          {choice.name && !row && choice.name !== 'Custom' && <p>Revise os pré-requisitos de {labelFeat(choice.name)} ou escolha outro talento.</p>}
          {choice.name === 'Custom' && <TextField label="Nome do talento" value={choice.label} onChange={label => update({ label })}/>}
          {row?.info?.abilities && (choice.name === 'Ability Score Improvement'
            ? <Multiple label="Um atributo +2 ou dois +1" options={abilityOptions(row.abilityOptions)} selected={row.abilityPicks} limit={2} onChange={values => update({ values })}/>
            : <Select label="Atributo +1" value={row.ability} options={abilityOptions(row.abilityOptions)}
              onChange={value => update({ values: value ? [value] : [] })}/>)}
          {row && <FeatChoices {...{ row, build, patch, go }}/>}
        </div>;
      })}
    </div>
    <FeatCatalogue/>
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
      {details.background?.tools && <Select label="Ferramenta do antecedente" options={details.background.tools}
        value={build.backgroundTool} onChange={backgroundTool => patch({ backgroundTool })}/>}
      {build.classes.map((entry, index) => {
        const data = classData(entry), count = index === 0 ? data.toolPicks : entry.id === 'bard' ? 1 : 0;
        return count ? <Multiple key={entry.id} label={`Ferramentas · ${data.name}`}
          options={entry.id === 'bard' ? INSTRUMENTS : TOOLS} selected={entry.tools} limit={count}
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
        <details><summary>Resumo e dados da magia</summary>
          <p className="dnd24-spell-effect">{spell.summary}</p>
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
      {build.backgroundKit === '0' && details.background?.kitTools && <Select label="Jogo do pacote de antecedente"
        value={build.backgroundKitTool} options={details.background.kitTools} onChange={backgroundKitTool => patch({ backgroundKitTool })}/>}
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
    Talentos: details.acquiredFeats.map(row => row.label).join(', '), Perícias: `${details.proficientSkills.length} proficiências`,
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
