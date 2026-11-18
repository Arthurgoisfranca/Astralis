import React, { useEffect, useRef, useState } from 'react';
import DaggerheartBuilder, { TraitBar } from './DaggerheartBuilder.jsx';
import DaggerheartSheet from './DaggerheartSheet.jsx';
import { DH_BUILD, DH_DETAILS, DH_PLAY, builderStatus, demoGabriel, derive, draftKey, parseJson,
  readBuild, readDetails, readPlay, startingPlay, storeStats } from './domain/daggerheartStudio.mjs';
import './daggerheartStudio.css';

const SRD = 'https://www.daggerheart.com/srd/';
const PLAYTEST = 'https://www.daggerheart.com/thevoid/';

function restore(id) {
  try { return parseJson(localStorage.getItem(draftKey(id))); } catch { return null; }
}

function updateStartingChoices(oldBuild, build, play) {
  if (!oldBuild?.classId) return startingPlay(build);
  const before = startingPlay(oldBuild), after = startingPlay(build);
  const all = (prior, earlier, current) => [...new Set([...prior.filter(id => !earlier.includes(id) || current.includes(id)), ...current.filter(id => !earlier.includes(id))])];
  const weapons = all(play.weapons, before.weapons, after.weapons), armors = all(play.armors, before.armors, after.armors);
  const items = [...play.items];
  before.items.filter(item => !after.items.includes(item)).forEach(item => {
    const index = items.indexOf(item);
    if (index >= 0) items.splice(index, 1);
  });
  items.push(...after.items.filter(item => !before.items.includes(item)));
  const available = derive(build, play).known;
  const knownBefore = derive(oldBuild, play).known;
  const cards = [...play.cards.filter(id => available.includes(id)), ...available.filter(id => !knownBefore.includes(id) && !play.cards.includes(id))].slice(0, 5);
  const next = { ...play, cards, items, weapons, armors };
  for (const slot of ['primary', 'secondary', 'armor']) {
    if (play[slot] === before[slot] && before[slot] !== after[slot]) next[slot] = after[slot];
  }
  if (oldBuild.subclass !== build.subclass || oldBuild.classId !== build.classId) {
    next.tokens = 0; next.shadows = 0; next.uses = [];
  }
  return readPlay(next, build);
}

export default function DaggerheartStudio({ player, form, setForm, onTokenOpen, onClose, onClassic, send, fear }) {
  const [initial] = useState(() => {
    const original = readBuild(form.stats[DH_BUILD]);
    const saved = Boolean(form.stats[DH_BUILD]), draft = restore(player.id);
    const recovery = !saved && draft?.build ? draft : null;
    const build = recovery ? readBuild(recovery.build) : original;
    return {
      build, details: readDetails(recovery?.details ?? form.stats[DH_DETAILS]),
      play: readPlay(recovery?.play ?? form.stats[DH_PLAY], build), draft, recovery,
    };
  });
  const [build, setBuild] = useState(initial.build);
  const [details, setDetails] = useState(initial.details);
  const [play, setPlay] = useState(initial.play);
  const [builder, setBuilder] = useState(!form.stats[DH_BUILD]);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [restoredDraft, setRestoredDraft] = useState(Boolean(initial.recovery));
  const fileInput = useRef(null);
  const menu = useRef(null);
  const imported = useRef(null);
  const previousIdentity = useRef(null);
  const stats = derive(build, play);
  const message = error || (builder && restoredDraft ? 'Rascunho recuperado.' : '');
  useEffect(() => {
    if (initial.recovery?.name && !form.name) setForm(old => ({ ...old, name: initial.recovery.name,
      notes: initial.recovery.notes ?? old.notes, appearance: initial.recovery.appearance ?? old.appearance }));
  }, []);
  useEffect(() => {
    if (!builder && !form.stats[DH_BUILD]) return;
    try { localStorage.setItem(draftKey(player.id), JSON.stringify({ name: form.name, notes: form.notes, appearance: form.appearance, build, details, play })); }
    catch { /* Local drafts are optional when the browser blocks storage. */ }
  }, [builder, build, details, play, form.name, form.notes, form.appearance, form.stats, player.id]);

  function toForm(nextBuild, next, info, identity = {}) {
    const saved = storeStats(form.stats, nextBuild, next, info);
    const cls = derive(nextBuild, next);
    setForm(old => ({ ...old, ...identity, classLevel: `${cls.cls.name} · ${cls.sub.name} · Nível ${nextBuild.level}`, stats: saved }));
  }
  function finish() {
    if (builderStatus(build, form.name, details).stages.some(Boolean)) return;
    try {
      const stored = form.stats[DH_BUILD] ? readBuild(form.stats[DH_BUILD]) : null;
      const next = imported.current
        ? updateStartingChoices(imported.current.build, build, imported.current.play)
        : updateStartingChoices(stored, build, play);
      toForm(build, next, details);
      setPlay(next);
      setBuilder(false);
      imported.current = null;
      setRestoredDraft(false);
      setError('');
    } catch (err) { setError(err.message); }
  }
  function updatePlay(changes) {
    const next = readPlay({ ...play, ...changes }, build);
    try { toForm(build, next, details); setPlay(next); setError(''); }
    catch (err) { setError(err.message); }
  }
  function edit(nextStage, advance = false) {
    previousIdentity.current = { name: form.name, notes: form.notes, appearance: form.appearance };
    if (advance && build.level < 10) setBuild(old => ({ ...old, level: old.level + 1 }));
    setStage(nextStage);
    setBuilder(true);
  }
  function cancelEdits() {
    if (!form.stats[DH_BUILD]) { onClose(); return; }
    const restored = readBuild(form.stats[DH_BUILD]);
    setBuild(restored); setPlay(readPlay(form.stats[DH_PLAY], restored)); setDetails(readDetails(form.stats[DH_DETAILS]));
    if (previousIdentity.current) setForm(old => ({ ...old, ...previousIdentity.current }));
    imported.current = null;
    setRestoredDraft(false);
    setBuilder(false);
    setError('');
  }
  function demo() {
    const named = demoGabriel();
    setForm(old => ({ ...old, name: named.name }));
    setBuild(named.build); setDetails(named.details); setPlay(named.play);
    imported.current = { build: named.build, play: named.play };
    setRestoredDraft(false);
    setStage(1);
  }
  function restoreDraft() {
    const draft = initial.draft;
    if (draft?.build?.v !== 1) return;
    if (!builder) previousIdentity.current = { name: form.name, notes: form.notes, appearance: form.appearance };
    const next = readBuild(draft.build), previousPlay = readPlay(draft.play, next);
    setBuild(next); setDetails(readDetails(draft.details)); setPlay(previousPlay);
    imported.current = { build: next, play: previousPlay };
    setForm(old => ({ ...old, name: draft.name ?? old.name, notes: draft.notes ?? old.notes, appearance: draft.appearance ?? old.appearance }));
    setBuilder(true); setStage(0); setError(''); setRestoredDraft(true);
    if (menu.current) menu.current.open = false;
  }
  function exportJSON() {
    const json = { format: 'astralis-daggerheart', version: 1, name: form.name, build, details, play, notes: form.notes, appearance: form.appearance };
    const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(form.name || 'personagem').trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 50)}-daggerheart.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (menu.current) menu.current.open = false;
  }
  async function importJSON(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 96 * 1024) throw Error('O arquivo excede o tamanho esperado para uma ficha de Daggerheart.');
      const payload = parseJson(await file.text());
      if (payload?.format !== 'astralis-daggerheart' || payload.version !== 1 || payload.build?.v !== 1) throw Error('Selecione um JSON exportado pela ficha de Daggerheart.');
      const next = readBuild(payload.build);
      const candidate = readPlay(payload.play, next);
      if (!builder) previousIdentity.current = { name: form.name, notes: form.notes, appearance: form.appearance };
      setForm(old => ({ ...old, name: String(payload.name ?? '').slice(0, 80), notes: String(payload.notes ?? '').slice(0, 2200),
        appearance: String(payload.appearance ?? '').slice(0, 2200) }));
      setBuild(next); setDetails(readDetails(payload.details)); setPlay(candidate);
      imported.current = { build: next, play: candidate }; setBuilder(true); setStage(0); setError('');
      setRestoredDraft(false);
    } catch (err) { setError(err.message); }
    if (menu.current) menu.current.open = false;
  }
  const showBuilder = builder || !stats.cls || !stats.sub;
  return <div className="dh-studio" data-creating={showBuilder}
    onKeyDown={event => { if (event.key === 'Enter' && ['text', 'number'].includes(event.target.type)) event.preventDefault(); }}>
    <header className="dh-top">
      <div className="dh-brand"><span aria-hidden="true">◆</span><div><b>Daggerheart</b><small>Astralis</small></div></div>
      {showBuilder && <div className="dh-current">
        <button type="button" className="dh-avatar" aria-label="Editar retrato" onClick={onTokenOpen}>
          {form.token ? <img src={form.token} alt=""/> : form.name.slice(0, 1).toUpperCase() || '◇'}
        </button><span>{form.name || 'Novo personagem'}</span>
      </div>}
      <div className="dh-actions">
        <a href={SRD} target="_blank" rel="noreferrer">Regras</a>
        <details className="dh-file" ref={menu}><summary>Arquivo</summary><div>
          <button type="button" onClick={exportJSON}>Exportar JSON</button>
          <button type="button" onClick={() => fileInput.current?.click()}>Importar JSON</button>
          {initial.draft?.build?.v === 1 && !initial.recovery && <button type="button" onClick={restoreDraft}>Restaurar rascunho</button>}
          {onClassic && <button type="button" onClick={onClassic}>Editor clássico</button>}
        </div></details>
        {showBuilder && <button type="button" onClick={cancelEdits}>{form.stats[DH_BUILD] ? 'Voltar à ficha' : 'Fechar'}</button>}
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importJSON}/>
    </header>
    <main className="dh-body">
      {message && <p className="dh-message" role={error ? 'alert' : 'status'}>{message}</p>}
      {showBuilder ? <>
        <TraitBar traits={derive(build).traits}/>
        <DaggerheartBuilder {...{ form, setForm, build, details, stage, setStage }}
          patch={changes => setBuild(old => ({ ...old, ...changes }))}
          update={changes => setDetails(old => ({ ...old, ...changes }))} onDemo={demo} onFinish={finish}/>
      </> : <DaggerheartSheet {...{ form, setForm, build, details, play, stats, send, fear }} patch={updatePlay}
        onPortrait={onTokenOpen} onEdit={() => edit(0)} onLevel={() => edit(4, true)}/>}
      <div className="dh-sources">
        <a href={SRD} target="_blank" rel="noreferrer">Daggerheart SRD 2.0</a>
        <a href={PLAYTEST} target="_blank" rel="noreferrer">The Void</a>
      </div>
    </main>
  </div>;
}
