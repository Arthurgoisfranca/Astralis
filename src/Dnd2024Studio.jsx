import React, { useEffect, useMemo, useRef, useState } from 'react';
import Dnd2024Builder from './Dnd2024Builder.jsx';
import Dnd2024Sheet from './Dnd2024Sheet.jsx';
import { SRD_CREDIT, SRD_LICENSE, SRD_URL } from './domain/dnd2024Catalog.mjs';
import { BUILD_STAT, DATA_LIMIT, PLAY_STAT, SPELL_STAT, buildDetails, demoGabriel, readBuild, readPlay, readRecord,
  rerollDndTest, signedNumber, storeCharacter } from './domain/dnd2024Rules.mjs';
import './dnd2024Studio.css';

export const ABOUT_STAT = 'dnd2024About';
export const dndDraftKey = playerId => `astralis:dnd2024:draft:${playerId}`;

function RollHistory({ entries, last, toast, onDismiss, onClear }) {
  const [open, setOpen] = useState(false);
  function Card({ roll }) {
    const color = roll.good === true ? 'success' : roll.good === false ? 'failure' : 'neutral';
    return <article className="dnd24-roll-card" data-result={color}>
      <header><b>{roll.label}</b><span>{roll.status}</span></header>
      {roll.total != null ? <strong>{roll.total}</strong> : <p>{roll.detail}</p>}
      {roll.dice?.length > 0 && <div className="dnd24-roll-dice">
        {roll.dice.map((face, index) => <span data-dropped={roll.selected != null && roll.selected !== index} key={index}
          title={roll.selected != null && roll.selected !== index ? 'Dado descartado' : ''}>{face}</span>)}
        {roll.effect != null && <span className="dnd24-roll-effect" title={`${roll.effectName} d4`}>+{roll.effect}</span>}
      </div>}
      {roll.total != null && <details open>
        <summary>Detalhes da rolagem</summary>
        <p>{roll.selected != null ? `d20 ${roll.dice[roll.selected]}` : (roll.dice?.join(' + ') || 'Valor fixo')}
          {roll.bonus ? ` ${signedNumber(roll.bonus)}` : ''}{roll.effect != null ? ` + ${roll.effect} (${roll.effectName})` : ''}
          {roll.fatigue ? ` − ${roll.fatigue} (exaustão)` : ''} = {roll.total}
          {roll.target != null ? ` · ${roll.kind === 'attack' ? 'CA' : 'CD'} ${roll.target}` : ''}
          {roll.replaced != null ? ` · Rerolagem de ${roll.replaced}` : ''}
        </p>
      </details>}
    </article>;
  }
  return <div className="dnd24-rolls">
    <button type="button" aria-expanded={open} onClick={() => { setOpen(value => !value); onDismiss(); }}>
      Histórico local · {entries.length}
    </button>
    {open && <section aria-label="Histórico de rolagens" className="dnd24-roll-history">
      <header><h3>Rolagens da ficha</h3><button type="button" onClick={onClear} disabled={!entries.length}>Limpar</button></header>
      {entries.length ? entries.map(entry => <Card key={entry.id} roll={entry}/>) : <p>Nenhuma rolagem nesta sessão.</p>}
    </section>}
    {toast && last && <div className="dnd24-roll-toast" role="status">
      <button type="button" aria-label="Fechar resultado" onClick={onDismiss}>×</button>
      <Card roll={last}/>
    </div>}
  </div>;
}

function serializeAbout(about) {
  const stored = JSON.stringify(about);
  if (stored.length > DATA_LIMIT) throw new Error('Os detalhes do personagem excedem o limite de salvamento.');
  return stored;
}

function readAbout(data) {
  return Object.fromEntries(Object.entries(readRecord(data)).filter(([, value]) => typeof value === 'string'));
}

export default function Dnd2024Studio({ player, form, setForm, onTokenOpen, onClose, onClassic }) {
  const [builder, setBuilder] = useState(!form.stats[BUILD_STAT]);
  const [step, setStep] = useState('Classe');
  const [build, setBuild] = useState(() => readBuild(form.stats[BUILD_STAT]));
  const [spells, setSpells] = useState(() => readRecord(form.stats[SPELL_STAT]));
  const [about, setAbout] = useState(() => readAbout(form.stats[ABOUT_STAT]));
  const [history, setHistory] = useState([]);
  const [toast, setToast] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasDraft, setHasDraft] = useState(() => {
    try { return !!localStorage.getItem(dndDraftKey(player.id)); } catch { return false; }
  });
  const importedPlay = useRef(null);
  const fileInput = useRef(null);
  const fileMenu = useRef(null);
  const body = useRef(null);
  const slot = useRef(0);
  const edited = useRef(false);
  const stats = form.stats;
  const details = useMemo(() => buildDetails(build, spells, form.name), [build, spells, form.name]);
  const play = readPlay(stats, details);
  const last = history[0];

  useEffect(() => {
    if (!edited.current) return;
    try {
      localStorage.setItem(dndDraftKey(player.id), JSON.stringify({
        name: form.name, notes: form.notes, appearance: form.appearance, build, spells, about,
        statPlay: stats[PLAY_STAT], hp: stats.hp, temp: stats.hpTemp, builder, step,
      }));
      setHasDraft(true);
    } catch { /* a ficha da mesa continua disponível */ }
  }, [build, spells, about, form.name, form.notes, form.appearance, stats, player.id, builder, step]);

  function patch(values) { edited.current = true; setBuild(old => ({ ...old, ...values })); }
  function selectSpells(update) { edited.current = true; setSpells(update); }
  function onAbout(values) { edited.current = true; setAbout(old => ({ ...old, ...values })); }
  function onText(key, value) { edited.current = true; setForm(old => ({ ...old, [key]: value })); }
  function go(next) {
    setStep(next);
    body.current?.scrollTo({ top: 0 });
  }
  function log(roll) {
    slot.current += 1;
    setHistory(old => [{ id: slot.current, ...roll }, ...old].slice(0, 20));
    setToast(true);
  }

  function sync(next, reset = false) {
    try {
      const record = storeCharacter(stats, build, details.selected, next, details);
      const aboutJson = serializeAbout(about);
      edited.current = true;
      setForm(old => ({ ...old, classLevel: record.className,
        stats: { ...record, [ABOUT_STAT]: aboutJson } }));
      setError('');
      if (reset) {
        importedPlay.current = null;
        setBuilder(false);
        setMessage('');
        body.current?.scrollTo({ top: 0 });
      }
      return true;
    } catch (error) { setError(error.message); return false; }
  }

  function complete() {
    if (Object.values(details.issues).some(issues => issues.length)) return;
    const input = importedPlay.current ?? (stats[BUILD_STAT] ? play : null);
    const fresh = readPlay({}, details);
    const next = input ? { ...fresh, ...input, max: details.hp,
      hp: input.hp > 0 ? Math.max(1, Math.min(details.hp, input.hp + details.hp - input.max)) : 0 } : fresh;
    sync(next, true);
  }

  function startEdit(where) {
    setBuilder(true);
    go(where);
  }

  function levelUp() {
    if (details.level >= 20) return;
    if (build.classes.length === 1) {
      patch({ classes: [{ ...build.classes[0], level: build.classes[0].level + 1 }] });
      startEdit('Revisão');
    } else {
      startEdit('Classe');
      setMessage('Escolha qual classe recebe o próximo nível.');
    }
  }

  function loadDemo() {
    if ((build.classes.length || form.name.trim()) && !window.confirm('Carregar Gabriel no rascunho atual?')) return;
    const demo = demoGabriel();
    edited.current = true;
    setBuild(demo.build);
    setSpells(demo.spells);
    setAbout(demo.about);
    onText('name', demo.name);
    importedPlay.current = readPlay({}, buildDetails(demo.build, demo.spells, demo.name));
    go('Revisão');
  }

  function exportJson() {
    if (fileMenu.current) fileMenu.current.open = false;
    const snapshot = { format: 'astralis-dnd-2024', version: 1, name: form.name, notes: form.notes,
      appearance: form.appearance, build, spells, about, statPlay: stats[PLAY_STAT], hp: stats.hp, temp: stats.hpTemp };
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dnd-2024-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'personagem'}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadSnapshot(data) {
    if (fileMenu.current) fileMenu.current.open = false;
    const draft = readBuild(JSON.stringify(data.build));
    if (!data.build || data.build.version !== 1) throw new Error('Rascunho de D&D 2024 inválido.');
    const choices = readRecord(JSON.stringify(data.spells));
    const description = readAbout(JSON.stringify(data.about));
    if ([draft, choices, description].some(value => JSON.stringify(value).length > DATA_LIMIT)) {
      throw new Error('O arquivo ultrapassa o limite de uma seção da ficha.');
    }
    const name = String(data.name ?? '').slice(0, 80);
    edited.current = true;
    setBuild(draft);
    setSpells(choices);
    setAbout(description);
    setForm(old => ({ ...old, name, notes: String(data.notes ?? '').slice(0, 3000),
      appearance: String(data.appearance ?? '').slice(0, 2000) }));
    importedPlay.current = data.statPlay && String(data.statPlay).length <= DATA_LIMIT
      ? readPlay({ [PLAY_STAT]: data.statPlay, hp: data.hp, hpTemp: data.temp }, buildDetails(draft, choices, name)) : null;
    setBuilder(true);
    go('Revisão');
    setMessage('Revise as escolhas e monte a ficha para aplicar o rascunho.');
    setError('');
  }

  async function importJson(file) {
    if (!file) return;
    try {
      if (file.size > 60000) throw new Error('Selecione um JSON de ficha do Astralis de até 60 KB.');
      const data = JSON.parse(await file.text());
      if (data.format !== 'astralis-dnd-2024' || data.version !== 1) throw new Error('Formato de D&D 2024 inválido.');
      loadSnapshot(data);
    } catch (error) { setError(error.message); }
  }

  function restoreDraft() {
    try {
      const saved = localStorage.getItem(dndDraftKey(player.id));
      if (!saved) throw new Error('Nenhum rascunho disponível neste navegador.');
      loadSnapshot(JSON.parse(saved));
    } catch (error) { setError(error.message); }
  }

  return <div className="dnd24-studio" data-builder={builder} onKeyDown={event => {
    if (builder && event.key === 'Enter' && ['text', 'number'].includes(event.target.type)) event.preventDefault();
  }}>
    <header className="dnd24-topbar">
      <div className="dnd24-brand"><span aria-hidden="true">◇</span><div><strong>Astralis</strong><small>D&D 2024</small></div></div>
      <div className="dnd24-topline">{builder ? 'Criador de personagem' : 'Ficha de personagem'}</div>
      <div className="dnd24-header-actions">
        <a href={SRD_URL} target="_blank" rel="noreferrer">Compêndio SRD</a>
        <details ref={fileMenu}><summary>Arquivo</summary><div>
          <button type="button" onClick={exportJson}>Exportar JSON</button>
          <button type="button" onClick={() => fileInput.current?.click()}>Importar JSON</button>
          <button type="button" onClick={restoreDraft} disabled={!hasDraft}>Restaurar rascunho</button>
          {onClassic && <button type="button" onClick={onClassic}>Abrir editor clássico</button>}
        </div></details>
        {builder&&<button type="button" onClick={() => { if (stats[BUILD_STAT]) {
          setBuild(readBuild(stats[BUILD_STAT])); setSpells(readRecord(stats[SPELL_STAT])); setAbout(readAbout(stats[ABOUT_STAT]));
          setBuilder(false); setMessage(''); importedPlay.current = null;
        } else onClose(); }}>{stats[BUILD_STAT] ? 'Voltar à ficha' : 'Fechar'}</button>}
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => {
          importJson(event.target.files?.[0]); event.target.value = '';
        }}/>
      </div>
    </header>
    <div className="dnd24-body" ref={body}>
      {message && <p role="status" className="dnd24-message">{message}</p>}
      {error && <p role="alert" className="dnd24-error">{error}</p>}
      {builder ? <Dnd2024Builder {...{ build, details, patch, step, go, about, onAbout, onText }}
        name={form.name} onName={value => onText('name', value)} notes={form.notes} appearance={form.appearance}
        setSpells={selectSpells} onComplete={complete} onDemo={loadDemo} onRoll={(label, detail) => log({ label, detail, status: 'Sorteio' })}/>
        : <Dnd2024Sheet {...{ build, details, play, form, about, onText, onTokenOpen, last, log }}
          onPlay={sync} onEdit={startEdit} onLevel={levelUp} onReroll={() => {
            if (play.hero && last?.target !== undefined && sync({ ...play, hero: false })) log(rerollDndTest(last));
          }}/>}
      <details className="dnd24-credit"><summary>Fonte de regras e licença</summary>
        <p>{SRD_CREDIT}</p><a href={SRD_LICENSE} target="_blank" rel="noreferrer">CC BY 4.0</a>
      </details>
    </div>
    <RollHistory entries={history} last={last} toast={toast} onDismiss={() => setToast(false)} onClear={() => { setHistory([]); setToast(false); }}/>
  </div>;
}
