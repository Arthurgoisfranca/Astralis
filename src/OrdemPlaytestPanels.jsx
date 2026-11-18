import React, { useState } from 'react';
import { die, rollExpression } from './domain/manualRules.mjs';
import { OP2_NOTE_PAGES, OP2_STAT_LIMIT, OP2_STEPS, safeJsonRows } from './domain/ordemPlaytestStudio.mjs';

const MARKS = [0, 1, 2];
const HINTS = ['Mais baixo', 'Exato', 'Mais alto'];

function Pages({ label, active, onChange }) {
  return <nav className="op2-pages" aria-label={label}>
    {OP2_NOTE_PAGES.map(page => <button type="button" key={page}
      aria-pressed={page === active} onClick={() => onChange(page)}>Página {page}</button>)}
  </nav>;
}

function updateRows(key, rows, setStat, onError) {
  const value = JSON.stringify(rows);
  if (value.length > OP2_STAT_LIMIT) {
    onError('O espaço desta seção acabou. Reduza o texto ou remova um registro para continuar.');
    return;
  }
  setStat(key, value);
  onError('');
}

function marksFor(row) {
  return MARKS.map(index => row.marks?.[index] === true);
}

function Markers({ row, label, onChange }) {
  const marks = marksFor(row);
  return <div className="op2-markers">
    {marks.map((marked, index) => <button type="button" key={index}
      aria-label={`${label} · marca ${index + 1}`} aria-pressed={marked}
      onClick={() => onChange(marks.map((value, position) => index === position ? !value : value))}>
      {index + 1}
    </button>)}
  </div>;
}

function LockChallenge() {
  const [size, setSize] = useState(6);
  const [step, setStep] = useState(6);
  const [challenge, setChallenge] = useState(null);
  const [guess, setGuess] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const lastAttempt = attempts[0];
  const solved = lastAttempt?.hints.every(hint => hint === 'Exato');

  function generate() {
    setChallenge({ step, answer: Array.from({ length: size }, () => die(step)) });
    setGuess(Array(size).fill(1));
    setAttempts([]);
  }

  function checkGuess() {
    const hints = guess.map((face, index) => HINTS[Math.sign(challenge.answer[index] - face) + 1]);
    setAttempts(rows => [{ guess, hints, number: (rows[0]?.number ?? 0) + 1 }, ...rows].slice(0, 8));
  }

  return <section className="op2-notebook-panel" aria-labelledby="op2-lock-title">
    <header><h3 id="op2-lock-title">Fechaduras</h3></header>
    <div className="op2-lock-config">
      <label>Complexidade <input type="number" value={size}
        onChange={event => setSize(Number(event.target.value))}/></label>
      <label>Dado <select value={step} onChange={event => setStep(Number(event.target.value))}>
        {OP2_STEPS.map(value => <option key={value} value={value}>d{value}</option>)}
      </select></label>
      <button type="button" disabled={!Number.isInteger(size) || size < 1 || size > 12} onClick={generate}>Gerar fechadura</button>
    </div>
    {!challenge ? <p className="op2-panel-message">Gere uma combinação para praticar o desafio.</p> :
      <div className="op2-lock-play">
        <div className="op2-lock-guess">
          {guess.map((value, index) => <select key={index} value={value} disabled={solved}
            aria-label={`Dado ${index + 1} da tentativa`}
            onChange={event => setGuess(faces => faces.map((face, pos) => pos === index ? Number(event.target.value) : face))}>
            {Array.from({ length: challenge.step }, (_, face) => <option key={face}>{face + 1}</option>)}
          </select>)}
        </div>
        <button type="button" disabled={solved} onClick={checkGuess}>Conferir tentativa</button>
        {lastAttempt && <p role="status">{solved ? 'Fechadura aberta.' : lastAttempt.hints.join(' · ')}</p>}
        {attempts.length > 0 && <ol className="op2-attempts">
          {attempts.map(attempt => <li key={attempt.number}>{attempt.guess.join(' – ')}<small>{attempt.hints.join(' · ')}</small></li>)}
        </ol>}
      </div>}
  </section>;
}

export function InvestigationPanel({ stats, notes, setStat, onError }) {
  const [pointPage, setPointPage] = useState(1);
  const [notePage, setNotePage] = useState(1);
  const pointsKey = `op2Points${pointPage}`;
  const notesKey = `op2Notes${notePage}`;
  const points = safeJsonRows(stats[pointsKey]);

  function setPoints(rows) {
    updateRows(pointsKey, rows, setStat, onError);
  }

  function updatePoint(index, changes) {
    setPoints(points.map((point, position) => position === index ? { ...point, ...changes } : point));
  }

  return <section className="op2-secondary" aria-labelledby="op2-investigation-title">
    <h2 id="op2-investigation-title">Investigação</h2>
    <div className="op2-investigation-grid">
      <section className="op2-notebook-panel" aria-labelledby="op2-points-title">
        <header><h3 id="op2-points-title">Pontos de interesse</h3>
          <button type="button" onClick={() => setPoints([...points, { name: '', note: '', marks: [] }])}>Adicionar ponto</button>
        </header>
        <Pages label="Páginas de pontos de interesse" active={pointPage} onChange={setPointPage}/>
        <div className="op2-points">
          {points.length === 0 && <p className="op2-panel-message">Registre locais, objetos ou pessoas que quer investigar.</p>}
          {points.map((point, index) => <div className="op2-point" key={index}>
            <div className="op2-point-name">
              <input value={String(point.name ?? '')} placeholder="Nome do ponto" maxLength={80}
                aria-label={`Nome do ponto ${index + 1}`} onChange={event => updatePoint(index, { name: event.target.value })}/>
              <button type="button" aria-label={`Remover ponto ${index + 1}`}
                onClick={() => setPoints(points.filter((_, position) => position !== index))}>×</button>
            </div>
            <Markers row={point} label={`Ponto ${index + 1}`} onChange={marks => updatePoint(index, { marks })}/>
            <textarea value={String(point.note ?? '')} rows={3} maxLength={1600} placeholder="Pistas e detalhes"
              aria-label={`Pistas do ponto ${index + 1}`} onChange={event => updatePoint(index, { note: event.target.value })}/>
          </div>)}
        </div>
      </section>
      <section className="op2-notebook-panel" aria-labelledby="op2-notes-title">
        <header><h3 id="op2-notes-title">Anotações</h3></header>
        <Pages label="Páginas de anotações" active={notePage} onChange={setNotePage}/>
        <textarea className="op2-research-notes" aria-label={`Anotações da página ${notePage}`}
          maxLength={OP2_STAT_LIMIT} placeholder="Anote o que descobriu nesta página."
          value={String(stats[notesKey] ?? (notePage === 1 ? notes : ''))}
          onChange={event => setStat(notesKey, event.target.value)}/>
      </section>
      <LockChallenge/>
    </div>
  </section>;
}

export function RelationsPanel({ stats, editing, setStat, onError, onEdit }) {
  const relations = safeJsonRows(stats.op2Relations);
  const legacy = String(stats.relacoes ?? stats.relationships ?? '');

  function setRelations(rows) {
    updateRows('op2Relations', rows, setStat, onError);
  }

  function updateRelation(index, changes) {
    setRelations(relations.map((row, position) => position === index ? { ...row, ...changes } : row));
  }

  return <section className="op2-secondary" aria-labelledby="op2-relations-title">
    <div className="op2-section-heading">
      <h2 id="op2-relations-title">Relações</h2>
      <button type="button" onClick={() => {
        const rows = [...relations, { name: '', photo: '', marks: [] }];
        setRelations(rows);
        onEdit();
      }}>Adicionar personagem</button>
    </div>
    {relations.length === 0 && <p className="op2-panel-message">Adicione as pessoas importantes para o agente.</p>}
    <div className="op2-relations-grid">
      {relations.map((relation, index) => {
        const name = typeof relation.name === 'string' ? relation.name.trim() : '';
        const photo = typeof relation.photo === 'string' && /^(https:\/\/|\/files\/)/i.test(relation.photo.trim())
          ? relation.photo.trim() : '';
        return <article className="op2-relation" key={index}>
          <div className="op2-relation-photo">{photo
            ? <img src={photo} alt={`Retrato de ${name || 'personagem'}`} loading="lazy" referrerPolicy="no-referrer"/>
            : <span aria-hidden="true">{(name || '•').slice(0, 1).toUpperCase()}</span>}
          </div>
          {editing ? <>
            <label>Nome <input value={String(relation.name ?? '')} maxLength={80}
              onChange={event => updateRelation(index, { name: event.target.value })}/></label>
            <label>Link da foto <input value={String(relation.photo ?? '')} maxLength={500} placeholder="https://"
              onChange={event => updateRelation(index, { photo: event.target.value })}/></label>
          </> : <h3>{name || 'Personagem sem nome'}</h3>}
          <Markers row={relation} label={name || `Personagem ${index + 1}`}
            onChange={marks => updateRelation(index, { marks })}/>
          {editing && <button type="button" className="op2-relation-remove" aria-label={`Remover personagem ${index + 1}`}
            onClick={() => setRelations(relations.filter((_, position) => position !== index))}>Remover</button>}
        </article>;
      })}
    </div>
    {(editing || legacy) && <label className="op2-relations-notes">Notas sobre relações
      {editing ? <textarea value={legacy} rows={4} maxLength={OP2_STAT_LIMIT}
        onChange={event => setStat('relacoes', event.target.value)}/> : <p>{legacy}</p>}
    </label>}
  </section>;
}

export function DiceTray({ DieSymbol, onRoll }) {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  function roll() {
    try {
      const rolled = rollExpression(expression);
      const summary = `${rolled.dice.join(' + ')}${rolled.modifier ? ` (${rolled.modifier > 0 ? '+' : ''}${rolled.modifier})` : ''} = ${rolled.total}`;
      setResult(summary);
      setError('');
      onRoll({ name: `Dados · ${rolled.expression}`, text: summary, result: null });
    } catch (error) {
      setError(error.message);
      setResult(null);
    }
  }

  return <section className="op2-dice-tray" aria-label="Dados livres">
    <div className="op2-free-dice">
      {[...OP2_STEPS, 20].map(value => <button type="button" key={value}
        aria-label={`Selecionar d${value}`} onClick={() => setExpression(`1d${value}`)}>
        <DieSymbol value={value}/>
      </button>)}
    </div>
    <div className="op2-dice-expression">
      <input value={expression} aria-label="Expressão de dados" placeholder="Ex. 2d6+1" maxLength={24}
        onChange={event => setExpression(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); roll(); } }}/>
      <button type="button" onClick={roll}>Rolar</button>
    </div>
    {result && <output aria-live="polite">{result}</output>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
