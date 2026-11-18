import React, { useState } from 'react';

const ABILITY_COLLECTIONS = [
  {
    name: 'Maldição do Ídolo de Pedra',
    abilities: ['Amor pela descoberta', 'Avaliação', 'Conhecimento técnico', 'Esforço e suor',
      'Estoico', 'Foco emocional', 'Foco mental', 'Foco mental (nível 6)'],
  },
  {
    name: 'Contos da Vigília',
    abilities: ['Análise', 'Antecipação tática', 'Arsenal de herborista', 'Curandeiro',
      'Espectro, o Lobo', 'Esquiva', 'Guardiã'],
  },
];
const EMPTY_ABILITY = { name: '', type: 'Arquétipo', text: '', pd: 0, pv: 0, impetusMax: 0, impetus: 0 };
const EMPTY_EQUIPMENT = { name: '', type: 'Geral', attackSkill: 'Luta', damage: '', uses: '', maxUses: '', notes: '' };
const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');

export function ImpetusBar({ row, onChange }) {
  const capacity = Math.min(5, Math.max(0, Math.trunc(Number(row.impetusMax) || 0)));
  if (!capacity) return null;
  const filled = Math.max(0, Math.min(capacity, Math.trunc(Number(row.impetus) || 0)));
  return <div className="op2-impetus" role="group" aria-label={`Ímpeto de ${row.name || 'habilidade'}`}>
    <small>Ímpeto {filled}/{capacity}</small>
    <div>{Array.from({ length: capacity }, (_, index) => <button type="button" key={index}
      aria-label={`Ímpeto ${index + 1} de ${capacity}`} aria-pressed={index < filled}
      onClick={() => onChange(filled === index + 1 ? index : index + 1)}/>)}</div>
  </div>;
}

export default function ResourceEditor({ kind, initial, onSave, onClose }) {
  const isAbility = kind === 'Habilidades';
  const [mode, setMode] = useState(isAbility && !initial ? 'catalog' : 'create');
  const [collection, setCollection] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [limited, setLimited] = useState(!isAbility && (initial?.uses ?? '') !== '');
  const [draft, setDraft] = useState(() => {
    const values = { ...(isAbility ? EMPTY_ABILITY : EMPTY_EQUIPMENT), ...initial };
    if (limited && !values.maxUses) values.maxUses = String(Math.max(1, Number(values.uses) || 0));
    return values;
  });
  const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const capacity = Number(draft.impetusMax) || 0;
  const abilities = ABILITY_COLLECTIONS[collection].abilities.filter(name => normalize(name).includes(normalize(search.trim())));
  const title = mode === 'catalog' ? 'Selecionar habilidade'
    : initial ? (isAbility ? 'Editar habilidade' : 'Editar equipamento')
    : isAbility ? 'Criar habilidade' : 'Criar equipamento';

  function selectAbility(name) {
    setDraft({
      ...EMPTY_ABILITY,
      name,
      source: ABILITY_COLLECTIONS[collection].name,
      impetusMax: name === 'Análise' ? 4 : 0,
    });
    setError('');
    setMode('create');
  }

  function submit() {
    if (!draft.name?.trim() || !String(isAbility ? draft.text : draft.notes).trim()) {
      setError('Preencha o nome e a descrição.');
      return;
    }
    if (!isAbility && limited) {
      const maximum = Number(draft.maxUses);
      if (!Number.isInteger(maximum) || maximum < 1 || maximum > 9999) {
        setError('Informe um limite de usos de 1 a 9999.');
        return;
      }
      const uses = Math.max(0, Math.min(maximum, Math.trunc(Number(draft.uses) || 0)));
      setError(onSave({ ...draft, name: draft.name.trim(), maxUses: String(maximum), uses: String(uses) }) || '');
      return;
    }
    setError(onSave({ ...draft, name: draft.name.trim() }) || '');
  }

  return <div className="op2-dialog-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="op2-dialog op2-resource-editor" role="dialog" aria-modal="true" aria-labelledby="op2-editor-title"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault();
      }}>
      <header><h3 id="op2-editor-title">{title}</h3>
        <button type="button" aria-label="Fechar formulário" onClick={onClose}>×</button>
      </header>
      {isAbility && !initial && <nav className="op2-editor-tabs" aria-label="Adicionar habilidade">
        <button type="button" aria-pressed={mode === 'catalog'} onClick={() => { setError(''); setMode('catalog'); }}>Seleção</button>
        <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Criação</button>
      </nav>}
      {mode === 'catalog' ? <>
        <input autoFocus aria-label="Buscar habilidades" placeholder="Buscar habilidades" value={search}
          onChange={event => setSearch(event.target.value)}/>
        <nav className="op2-editor-tabs" aria-label="Coleções de habilidades">
          {ABILITY_COLLECTIONS.map(({ name }, index) => <button key={name} type="button"
            aria-pressed={collection === index} onClick={() => setCollection(index)}>{name}</button>)}
        </nav>
        <ul className="op2-catalog">
          {abilities.map(name => <li key={name}><button type="button" aria-label={`Selecionar ${name}`}
              onClick={() => selectAbility(name)}><span>{name}</span><b aria-hidden="true">+</b></button></li>)}
          {abilities.length === 0 && <li className="op2-panel-message">Nenhuma habilidade encontrada.</li>}
        </ul>
      </> : <>
        {draft.source && <p className="op2-resource-source">{draft.source}</p>}
        <div className="op2-editor-fields">
          <label>Nome <input autoFocus maxLength={80} value={draft.name}
            onChange={event => set('name', event.target.value)}/></label>
          {isAbility ? <label>Barra de Ímpeto <select value={capacity}
            onChange={event => {
              const impetusMax = Number(event.target.value);
              setDraft(current => ({ ...current, impetusMax, impetus: Math.min(impetusMax, Number(current.impetus) || 0) }));
            }}>
            <option value={0}>Sem barra</option>
            {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
          </select></label> : <label>Limite de usos <select value={limited ? 'limited' : 'unlimited'}
            onChange={event => {
              const enabled = event.target.value === 'limited';
              setLimited(enabled);
              setDraft(current => ({ ...current, maxUses: enabled ? '1' : '', uses: enabled ? '1' : '' }));
            }}><option value="unlimited">Sem limite</option><option value="limited">Com limite</option></select></label>}
        </div>
        <label>Descrição <textarea rows={5} maxLength={1600} value={isAbility ? draft.text : draft.notes}
          onChange={event => set(isAbility ? 'text' : 'notes', event.target.value)}/></label>
        <div className="op2-editor-fields">
          <label>Tipo <select value={draft.type} onChange={event => set('type', event.target.value)}>
            {(isAbility ? ['Arquétipo', 'Ocupação', 'Bruxaria', 'Outro'] : ['Geral', 'Arma', 'Proteção', 'Catalisador'])
              .map(type => <option key={type}>{type}</option>)}
          </select></label>
          {isAbility ? <>
            <label>Custo de PD registrado <input type="number" min="0" max="9999" value={draft.pd}
              onChange={event => set('pd', event.target.value)}/></label>
            <label>Custo de PV registrado <input type="number" min="0" max="9999" value={draft.pv}
              onChange={event => set('pv', event.target.value)}/></label>
          </> : limited && <label>Limite máximo <input type="number" min="1" max="9999" value={draft.maxUses}
            onChange={event => setDraft(current => {
              const maximum = event.target.value;
              const wasFull = !current.maxUses || String(current.uses) === String(current.maxUses);
              return { ...current, maxUses: maximum, uses: wasFull ? maximum : current.uses };
            })}/></label>}
        </div>
        {!isAbility && draft.type === 'Arma' && <div className="op2-editor-fields">
          <label>Perícia para ataque <select value={draft.attackSkill} onChange={event => set('attackSkill', event.target.value)}>
            <option>Luta</option><option>Pontaria</option>
          </select></label>
          <label>Dano conforme a ficha <input value={draft.damage} placeholder="Ex. 1d8+2" maxLength={24}
            onChange={event => set('damage', event.target.value)}/></label>
        </div>}
        <div className="op2-dialog-actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" onClick={submit}>{initial ? 'Salvar alterações' : 'Adicionar à ficha'}</button>
        </div>
      </>}
      {error && <p className="op2-editor-error" role="alert">{error}</p>}
    </section>
  </div>;
}
