import React, { useEffect, useRef, useState } from "react";
import { ImageDrop, Modal, TokenMaker, makeId, readImage, resizeImage } from "./SharedTools.jsx";


import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { SYSTEMS, systemProfile } from "./RpgSystems.js";
import { buildCharacterSheet } from "./domain/characterSheets.ts";
import { CharacterStudio } from "./CharacterStudio.jsx";

let pdfToolsPromise; async function loadPdfTools() { if (!pdfToolsPromise) pdfToolsPromise = Promise.all([import("pdf-lib"), import("pdfjs-dist")]).then(([pdfLib, pdfjsLib]) => { pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; return { PDFDocument: pdfLib.PDFDocument, pdfjsLib }; }); return pdfToolsPromise; }

function ModuleHeader({ eyebrow, title, description, action }) {
  return <div className="module-header"><div><div className="section-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function Empty({ children }) { return <div className="empty-module">{children}</div>; }

function dateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function parseDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day, 12) : new Date();
}
export function Agenda({ items = [], isGM, send }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(dateKey(today));
  const [form, setForm] = useState({ title: "", date: dateKey(today), time: "", location: "", notes: "" });
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1), startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (cells.length % 7) cells.push(null);
  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const dayItems = items.filter(item => item.date === selected).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  function moveMonth(amount) {
    const next = new Date(year, monthIndex + amount, 1);
    setMonth(next);
    const nextDay = new Date(next.getFullYear(), next.getMonth(), Math.min(parseDate(selected).getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()), 12);
    const key = dateKey(nextDay); setSelected(key); setForm(old => ({ ...old, date: key }));
  }
  function submit(event) {
    event.preventDefault();
    send("appointment:add", form);
    setForm(old => ({ ...old, title: "", notes: "" }));
  }
  return <div className="view-stack">
    <ModuleHeader eyebrow="AGENDA DA CAMPANHA" title="Calendário de sessões" description="Datas e encontros marcados para o grupo."/>
    <div className="agenda-layout">
      <section className="surface calendar-panel">
        <header className="calendar-heading"><button className="button quiet" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>←</button><h2>{monthLabel}</h2><button className="button quiet" aria-label="Próximo mês" onClick={() => moveMonth(1)}>→</button></header>
        <div className="calendar-grid calendar-weekdays">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => <span key={day}>{day}</span>)}</div>
        <div className="calendar-grid">{cells.map((day, index) => {
          if (!day) return <span className="calendar-empty" key={"empty-" + index}/>;
          const key = dateKey(new Date(year, monthIndex, day, 12)), marked = items.some(item => item.date === key);
          return <button key={key} className={"calendar-day " + (selected === key ? "selected" : "") + (key === dateKey(today) ? " today" : "")} onClick={() => { setSelected(key); setForm(old => ({ ...old, date: key })); }}><span>{day}</span>{marked && <i/>}</button>;
        })}</div>
        <div className="calendar-legend"><span><i/> Dia com sessão</span><span><b/> Hoje</span></div>
      </section>
      <section className="agenda-details">
        <section className="surface agenda-list"><div className="panel-heading"><div><div className="section-eyebrow">ENCONTROS MARCADOS</div><h2>{parseDate(selected).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}</h2></div><span className="count-badge">{dayItems.length}</span></div>
          {dayItems.length ? dayItems.map(item => <article className="appointment-card" key={item.id}><div className="appointment-time">{item.time || "Horário a definir"}</div><div className="appointment-copy"><b>{item.title}</b>{item.location && <small>{item.location}</small>}{item.notes && <p>{item.notes}</p>}</div>{isGM && <button className="text-action danger" onClick={() => send("appointment:delete", { id: item.id })}>Excluir</button>}</article>) : <Empty>Nenhuma sessão marcada para este dia.</Empty>}
        </section>
        {isGM && <form className="surface appointment-form" onSubmit={submit}><div className="section-eyebrow">MARCAR SESSÃO</div><label>Título<input required maxLength="120" value={form.title} onChange={event => setForm(old => ({ ...old, title: event.target.value }))} placeholder="Sessão 2 · A trilha do norte"/></label><div className="appointment-fields"><label>Data<input required type="date" value={form.date} onChange={event => { setForm(old => ({ ...old, date: event.target.value })); setSelected(event.target.value); if (event.target.value) setMonth(new Date(parseDate(event.target.value).getFullYear(), parseDate(event.target.value).getMonth(), 1)); }}/></label><label>Horário<input type="time" value={form.time} onChange={event => setForm(old => ({ ...old, time: event.target.value }))}/></label></div><label>Local<input value={form.location} onChange={event => setForm(old => ({ ...old, location: event.target.value }))} placeholder="Discord, endereço, VTT…"/></label><label>Notas<textarea value={form.notes} onChange={event => setForm(old => ({ ...old, notes: event.target.value }))} placeholder="Pauta, preparação ou lembretes"/></label><button className="button secondary">Adicionar à agenda</button></form>}
      </section>
    </div>
  </div>;
}
export function Workbench({ room, presence = [], isGM, onOpen }) {
  const today = dateKey(new Date()), upcoming = (room.appointments || []).filter(item => item.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3);
  const handouts = room.handouts || [], journal = room.journal || [], sessions = room.sessions || [];
  return <div className="view-stack"><ModuleHeader eyebrow="RESUMO DA CAMPANHA" title="Painel da mesa" description="Agenda, mapa, grupo e registros em cartões lado a lado."/>
    <div className="workbench-grid">
      <section className="surface workbench-card"><header><div><div className="section-eyebrow">PRÓXIMOS ENCONTROS</div><h2>Agenda</h2></div><span className="count-badge">{upcoming.length}</span></header>{upcoming.length ? upcoming.map(item => <div className="workbench-line" key={item.id}><b>{item.title}</b><span>{new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")} · {item.time || "horário a definir"}</span><small>{item.location}</small></div>) : <p className="muted-copy">Nenhuma sessão futura marcada.</p>}<button className="text-action" onClick={() => onOpen("agenda")}>Abrir calendário →</button></section>
      <section className="surface workbench-card"><header><div><div className="section-eyebrow">CENA ATUAL</div><h2>Mapa tático</h2></div><span className="count-badge">{room.map?.tokens?.length || 0} tokens</span></header>{room.map?.image ? <img className="workbench-map" src={room.map.image} alt={room.map.name || "Mapa compartilhado"}/> : <p className="muted-copy">{isGM ? "Nenhum mapa foi carregado." : "O Mestre ainda não compartilhou um mapa."}</p>}<button className="text-action" onClick={() => onOpen("maps")}>Abrir mapa →</button></section>
      <section className="surface workbench-card"><header><div><div className="section-eyebrow">MATERIAIS LIBERADOS</div><h2>Handouts</h2></div><span className="count-badge">{handouts.length}</span></header>{handouts.length ? handouts.slice(0, 3).map(item => <div className="workbench-line" key={item.id}><b>{item.title}</b><span>{(item.tags || []).join(" · ") || item.body?.slice(0, 90) || "Material da campanha"}</span></div>) : <p className="muted-copy">Nenhum material disponível nesta sala.</p>}<button className="text-action" onClick={() => onOpen("handouts")}>Abrir handouts →</button></section>
      <section className="surface workbench-card"><header><div><div className="section-eyebrow">REGISTROS RECENTES</div><h2>Diário e sessões</h2></div><span className="count-badge">{journal.length + sessions.length}</span></header>{journal.slice(0, 2).map(item => <div className="workbench-line" key={item.id}><b>{item.title}</b><span>{item.authorName} · {item.visibility === "private" ? "Privado" : "Público"}</span></div>)}{sessions.slice(0, 1).map(item => <div className="workbench-line" key={item.id}><b>{item.title || "Última sessão"}</b><span>{new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR")}</span></div>)}{!journal.length && !sessions.length && <p className="muted-copy">As entradas e sessões registradas aparecem aqui.</p>}<button className="text-action" onClick={() => onOpen("diary")}>Abrir diário →</button><button className="text-action" onClick={() => onOpen("sessions")}>Histórico →</button></section>
      <section className="surface workbench-card workbench-group"><header><div><div className="section-eyebrow">PRESENÇA</div><h2>Grupo online</h2></div><span className="count-badge">{presence.length}</span></header><div className="workbench-people">{presence.map(person => <span key={person.id}><i className="presence-dot"/>{person.name}<small>{person.role === "gm" ? "Mestre" : "Jogador"}</small></span>)}</div><button className="text-action" onClick={() => onOpen("lobby")}>Detalhes da sala →</button></section>
    </div>
  </div>;
}
export function SystemGuide({ value, isGM, send }) {
  const [text, setText] = useState(value || ""), [saving, setSaving] = useState(false), [saved, setSaved] = useState(false);
  useEffect(() => { setText(value || ""); setSaved(false); }, [value]);
  async function save() {
    setSaving(true); setSaved(false);
    try {
      const result = await send("system:update", { value: text });
      if (result?.ok) setSaved(true);
    } finally { setSaving(false); }
  }
  return <div className="view-stack"><ModuleHeader eyebrow="REGRAS DA CAMPANHA" title="Consulta do sistema" description="Regras da mesa, referências rápidas e combinações do grupo."/>
    <section className="surface writing-surface">{isGM ? <><textarea value={text} onChange={event => { setText(event.target.value); setSaved(false); }} placeholder="Anote regras da casa, referências úteis e acordos do grupo."/><div className="save-row"><button className="button primary" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar consulta"}</button>{saved && <span className="muted-copy" role="status">Salvo na sala</span>}</div></> : <div className="lore-read">{value || "O Mestre ainda não adicionou referências do sistema."}</div>}</section></div>;
}
export function Lore({ value, isGM, send }) {
  const [text, setText] = useState(value || "");
  useEffect(() => setText(value || ""), [value]);
  return <div className="view-stack"><ModuleHeader eyebrow="UNIVERSO" title="Arquivo do mundo" description="História, facções e lugares conhecidos pelo grupo."/>
    <section className="surface writing-surface">{isGM ? <><textarea value={text} onChange={event => setText(event.target.value)} placeholder="Registre fatos do mundo que os jogadores já podem conhecer."/><button className="button primary" onClick={() => send("lore:update", { value: text })}>Salvar arquivo</button></> : <div className="lore-read">{value || "O Mestre ainda não compartilhou informações sobre o universo."}</div>}</section></div>;
}

export function NPCs({ items, isGM, send, upload }) {
  const empty = { id: "", name: "", description: "", alignment: "", status: "Desconhecido", image: "", tags: [], public: false };
  const [form, setForm] = useState(empty);
  const update = key => event => setForm(old => ({ ...old, [key]: event.target.type === "checkbox" ? event.target.checked : event.target.value }));
  function save(event) { event.preventDefault(); send("npc:save", { ...form, id: form.id || makeId() }); setForm(empty); }
  return <div className="view-stack"><ModuleHeader eyebrow="PERSONAGENS DO MESTRE" title="NPCs" description={isGM ? "Cadastre, edite e revele personagens do cenário." : "Personagens conhecidos nesta campanha."}/>
    {isGM && <form className="surface npc-editor" onSubmit={save}>
      <div className="npc-fields"><input required placeholder="Nome do NPC" value={form.name} onChange={update("name")}/><input placeholder="Alinhamento" value={form.alignment} onChange={update("alignment")}/><select value={form.status} onChange={update("status")}><option>Desconhecido</option><option>Vivo</option><option>Morto</option></select><input placeholder="Descrição" value={form.description} onChange={update("description")}/><input placeholder="Tags separadas por vírgula" value={(form.tags || []).join(", ")} onChange={event => setForm(old => ({ ...old, tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) }))}/><label className="check-line"><input type="checkbox" checked={form.public} onChange={update("public")}/> Visível aos jogadores</label></div>
      <ImageDrop compact value={form.image} upload={upload} kind="npc" label="Arraste a imagem do NPC ou escolha um arquivo" onChange={image => setForm(old => ({ ...old, image }))}/>
      <div className="form-actions"><button className="button secondary">{form.id ? "Salvar alterações" : "Adicionar NPC"}</button>{form.id && <button type="button" className="button quiet" onClick={() => setForm(empty)}>Cancelar edição</button>}</div>
    </form>}
    <div className="content-grid">{items.map(npc => <article className="surface content-card" key={npc.id}>{npc.image && <img className="card-image" src={npc.image} alt={"Retrato de " + npc.name}/>}<div className="card-top"><h3>{npc.name}</h3><span className="soft-tag">{npc.status}</span></div><small>{npc.alignment}</small><p>{npc.description}</p><div className="tag-row">{(npc.tags || []).map(tag => <span className="soft-tag" key={tag}>{tag}</span>)}</div>{isGM && <div className="card-actions"><button className="text-action" onClick={() => setForm({ ...empty, ...npc })}>Editar</button><button className="text-action danger" onClick={() => send("npc:delete", { id: npc.id })}>Excluir</button></div>}</article>)}</div>
    {!items.length && <Empty>Nenhum NPC está visível para este acesso.</Empty>}
  </div>;
}

export function Handouts({ items, isGM, send, upload }) {
  const empty = { id: "", title: "", body: "", image: "", tags: [], revealed: false };
  const [form, setForm] = useState(empty);
  function save(event) { event.preventDefault(); send("handout:save", { ...form, id: form.id || makeId() }); setForm(empty); }
  return <div className="view-stack"><ModuleHeader eyebrow="PISTAS E DOCUMENTOS" title="Handouts" description={isGM ? "Prepare materiais e revele cada pista quando o grupo a encontrar." : "Materiais liberados pelo Mestre durante a campanha."}/>
    {isGM && <form className="surface handout-editor" onSubmit={save}>
      <div className="handout-fields"><input required placeholder="Título do handout" value={form.title} onChange={event => setForm(old => ({ ...old, title: event.target.value }))}/><input placeholder="Tags separadas por vírgula" value={(form.tags || []).join(", ")} onChange={event => setForm(old => ({ ...old, tags: event.target.value.split(",").map(tag => tag.trim()).filter(Boolean) }))}/><textarea placeholder="Texto, pista ou descrição" value={form.body} onChange={event => setForm(old => ({ ...old, body: event.target.value }))}/></div>
      <ImageDrop compact value={form.image} upload={upload} kind="handout" label="Arraste uma imagem de pista ou escolha um arquivo" onChange={image => setForm(old => ({ ...old, image }))}/>
      <label className="check-line"><input type="checkbox" checked={form.revealed} onChange={event => setForm(old => ({ ...old, revealed: event.target.checked }))}/> Mostrar aos jogadores</label>
      <div className="form-actions"><button className="button secondary">{form.id ? "Salvar alterações" : "Guardar handout"}</button>{form.id && <button type="button" className="button quiet" onClick={() => setForm(empty)}>Cancelar edição</button>}</div>
    </form>}
    <div className="content-grid">{items.map(item => <article className="surface handout-card" key={item.id}>{item.image && <img className="card-image" src={item.image} alt="Imagem do handout"/>}<div className="card-top"><h3>{item.title}</h3>{isGM && <span className={"soft-tag " + (item.revealed ? "revealed" : "")}>{item.revealed ? "Visível" : "Oculto"}</span>}</div><div className="tag-row">{(item.tags || []).map(tag => <span className="soft-tag" key={tag}>{tag}</span>)}</div><p>{item.body}</p>{isGM && <div className="card-actions"><button className="button quiet" onClick={() => send("handout:reveal", { id: item.id, revealed: !item.revealed })}>{item.revealed ? "Ocultar" : "Revelar"}</button><button className="text-action" onClick={() => setForm({ ...empty, ...item })}>Editar</button><button className="text-action danger" onClick={() => send("handout:delete", { id: item.id })}>Excluir</button></div>}</article>)}</div>
    {!items.length && <Empty>{isGM ? "Nenhum handout cadastrado." : "O Mestre ainda não revelou materiais."}</Empty>}
  </div>;
}
export function Maps({ value, room, identity, isGM, send, upload }) {
  const [name, setName] = useState(value.name || ""), [image, setImage] = useState(value.image || "");
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [drag, setDrag] = useState(null);
  const [mapAspect, setMapAspect] = useState(16/9), [stageSize,setStageSize] = useState({width:900,height:550});
  const [tool, setTool] = useState("pan"), [selected, setSelected] = useState(null), [drawing, setDrawing] = useState(null), [moving, setMoving] = useState(null);
  const [gridFeet, setGridFeet] = useState(value.gridFeet || 5), [busy, setBusy] = useState(false);
  const stageRef = useRef(null);
  useEffect(() => { if (!image) return; const bitmap = new Image(); bitmap.onload=()=>setMapAspect(bitmap.naturalWidth / Math.max(1, bitmap.naturalHeight)); bitmap.src=image; },[image]);
  useEffect(() => { if (!image || !stageRef.current) return; if (typeof ResizeObserver === "undefined") return; const observer = new ResizeObserver(entries => { const rect = entries[0]?.contentRect; if(rect)setStageSize({width:rect.width,height:rect.height}); }); observer.observe(stageRef.current); return () => observer.disconnect(); },[image]);
  const fitted = (() => {const ratio = mapAspect || 16/9, width=Math.min(stageSize.width,stageSize.height*ratio),height=width/ratio;return {width,height};})();
  useEffect(() => { setName(value.name || ""); setImage(value.image || ""); setGridFeet(value.gridFeet || 5); }, [value.name, value.image, value.gridFeet]);
  const candidates = [
    ...room.players.filter(player => player.character?.token).map(player => ({ sourceId: player.id, ownerId: player.id, name: player.character.name || player.name, image: player.character.token })),
    ...(isGM ? room.npcs.filter(npc => npc.image).map(npc => ({ sourceId: npc.id, ownerId: "gm", name: npc.name, image: npc.image })) : [])
  ].filter(item => isGM || item.ownerId === identity.userId);
  const stagePosition = event => {
    const rect = stageRef.current.getBoundingClientRect(), scale = zoom, left = rect.left + rect.width / 2 + pan.x - fitted.width * scale / 2, top = rect.top + rect.height / 2 + pan.y - fitted.height * scale / 2;
    return { x: Math.max(0, Math.min(100, (event.clientX - left) / (fitted.width * scale) * 100)), y: Math.max(0, Math.min(100, (event.clientY - top) / (fitted.height * scale) * 100)) };
  };
  function addToken(source, position) {
    if (!source) return;
    send("map:token:add", { id: source.sourceId, sourceId: source.sourceId, ownerId: source.ownerId, name: source.name, image: source.image, x: position.x, y: position.y });
    setSelected(null);
  }
  async function uploadMap(file) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await resizeImage(file, 2048), saved = await upload(prepared, { scope: "public", kind: "map" });
      setImage(saved.url); setName(file.name); const savedMap = await send("map:update", { image: saved.url, name: file.name, visible: value.visible, tokens: value.tokens || [], measurements: value.measurements || [], gridFeet }); if (!savedMap.ok) throw new Error(savedMap.error || "Não foi possível salvar o mapa.");
    } catch (error) { alert(error.message); }
    finally { setBusy(false); }
  }
  const measurements = value.measurements || [], tokens = value.tokens || [];
  function measurementShape(item, preview = false) {
    const dx = item.x2 - item.x1, dy = item.y2 - item.y1, radius = Math.hypot(dx, dy);
    if (item.type === "line") return <g key={item.id || "preview"}><line x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2}/><text x={(item.x1 + item.x2) / 2} y={(item.y1 + item.y2) / 2 - 2}>{measureLabel(item)}</text></g>;
    if (item.type === "circle") return <g key={item.id || "preview"}><circle cx={item.x1} cy={item.y1} r={radius}/><text x={item.x1 + radius} y={item.y1}>{measureLabel(item)}</text></g>;
    if (item.type === "square") return <g key={item.id || "preview"}><rect x={Math.min(item.x1, item.x2)} y={Math.min(item.y1, item.y2)} width={Math.abs(dx)} height={Math.abs(dy)}/><text x={(item.x1 + item.x2) / 2} y={(item.y1 + item.y2) / 2}>{measureLabel(item)}</text></g>;
    const angle = Math.atan2(dy, dx), side = Math.PI / 6, a = { x: item.x1 + radius * Math.cos(angle - side), y: item.y1 + radius * Math.sin(angle - side) }, b = { x: item.x1 + radius * Math.cos(angle + side), y: item.y1 + radius * Math.sin(angle + side) };
    return <g key={item.id || "preview"}><path d={"M " + item.x1 + " " + item.y1 + " L " + a.x + " " + a.y + " A " + radius + " " + radius + " 0 0 1 " + b.x + " " + b.y + " Z"}/><text x={item.x1 + radius * .7} y={item.y1 + dy * .7}>{measureLabel(item)}</text></g>;
  }
  function measureLabel(item) {
    const dx = (item.x2 - item.x1) / 10, dy = (item.y2 - item.y1) / 10;
    const baseFeet = Math.hypot(dx, dy) * (Number(item.gridFeet) || Number(gridFeet) || 5), distance = item.unit === "m" ? baseFeet * .3048 : baseFeet;
    return (distance < 10 ? distance.toFixed(1) : Math.round(distance)) + " " + (item.unit === "m" ? "m" : "ft");
  }
  function pointerDown(event) {
    const tokenElement = event.target.closest("[data-token-id]");
    if (tokenElement) {
      const token = tokens.find(item => item.id === tokenElement.dataset.tokenId);
      if (!token || (!isGM && token.ownerId !== identity.userId)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setMoving({ id: token.id, ...stagePosition(event) }); return;
    }
    const position = stagePosition(event);
    if (selected) { addToken(selected, position); return; }
    if (tool === "pan") { setDrag({ x: event.clientX - pan.x, y: event.clientY - pan.y }); event.currentTarget.setPointerCapture(event.pointerId); return; }
    if (isGM) { event.currentTarget.setPointerCapture(event.pointerId); setDrawing({ id: "preview", type: tool, x1: position.x, y1: position.y, x2: position.x, y2: position.y, unit: "ft", gridFeet }); }
  }
  function pointerMove(event) {
    const position = stagePosition(event);
    if (moving) setMoving(old => ({ ...old, ...position }));
    else if (drawing) setDrawing(old => ({ ...old, ...position }));
    else if (drag) setPan({ x: event.clientX - drag.x, y: event.clientY - drag.y });
  }
  function pointerUp() {
    if (moving) { send("map:token:move", { id: moving.id, x: moving.x, y: moving.y }); setMoving(null); }
    if (drawing) { send("map:measure:add", drawing); setDrawing(null); }
    setDrag(null);
  }
  function dropToken(event) {
    event.preventDefault(); const sourceId = event.dataTransfer.getData("text/token"), source = candidates.find(item => item.sourceId === sourceId);
    if (source) addToken(source, stagePosition(event));
  }
  return <div className="view-stack"><ModuleHeader eyebrow="MAPA DA SESSÃO" title="Mesa tática" description="Arraste tokens, marque áreas e acompanhe as alterações ao vivo."/>
    {isGM && <section className="surface map-tools"><label className="button quiet file-button">{busy ? "Preparando mapa…" : "Carregar mapa"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => uploadMap(event.target.files[0])}/></label><input className="map-name" placeholder="Nome do mapa" value={name} onChange={event => setName(event.target.value)}/><label className="check-line"><input type="checkbox" checked={value.visible} onChange={event => send("map:update", { image, name, visible: event.target.checked, tokens, measurements, gridFeet })}/> Mostrar para jogadores</label><label className="check-line">Grade <select value={gridFeet} onChange={event => setGridFeet(Number(event.target.value))}><option value="5">5 ft / 1,5 m</option><option value="10">10 ft / 3 m</option><option value="20">20 ft / 6 m</option></select></label><button className="button secondary" disabled={!image} onClick={() => send("map:update", { image, name, visible: value.visible, tokens, measurements, gridFeet })}>Salvar mapa</button></section>}
    {isGM && <section className="surface tactical-toolbar"><div className="tool-options">{[["pan", "Mover mapa"], ["line", "Régua"], ["circle", "Raio"], ["cone", "Cone"], ["square", "Quadrado"]].map(([key, label]) => <button key={key} className={"button " + (tool === key ? "primary" : "quiet")} onClick={() => setTool(key)}>{label}</button>)}</div><span>Uma quadrícula equivale a {gridFeet} ft · {Math.round(gridFeet * .3048 * 10) / 10} m</span><button className="text-action danger" onClick={() => send("map:measure:clear", {})}>Limpar medições</button></section>}
    <div className="token-carousel surface"><div className="section-eyebrow">TOKENS DA CENA</div>{candidates.length ? candidates.map(candidate => <button key={candidate.sourceId} draggable onDragStart={event => event.dataTransfer.setData("text/token", candidate.sourceId)} className={"carousel-token " + (selected?.sourceId === candidate.sourceId ? "selected" : "")} onClick={() => setSelected(candidate)}><img src={candidate.image} alt=""/><span>{candidate.name}</span></button>) : <span className="muted-copy">Crie tokens nas fichas ou adicione uma imagem ao NPC.</span>}</div>
    {image ? <div ref={stageRef} className={"map-stage tactical-map " + (drag || moving ? "dragging" : "")} onWheel={event => { event.preventDefault(); setZoom(z => Math.max(1, Math.min(3, z + (event.deltaY < 0 ? .1 : -.1)))); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDragOver={event => event.preventDefault()} onDrop={dropToken}>
      <div className="map-board" style={{ width:fitted.width, height:fitted.height, left:"50%",top:"50%", transform: `translate(calc(-50% + ${pan.x}px),calc(-50% + ${pan.y}px)) scale(${zoom})` }} ><img className="map-image" src={image} alt={name}/><svg className="measure-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">{measurements.map(item => measurementShape(item))}{drawing && measurementShape(drawing, true)}</svg>
        {tokens.map(token => { const moved = moving?.id === token.id ? moving : token; return <button data-token-id={token.id} key={token.id} className="map-token" style={{ left: moved.x + "%", top: moved.y + "%" }} title={token.name}><img src={token.image} alt=""/><span>{token.name}</span>{isGM && <i onClick={event => { event.stopPropagation(); send("map:token:delete", { id: token.id }); }}>×</i>}</button>; })}
      </div><div className="map-zoom" role="group" aria-label="Controles do mapa"><button type="button" onClick={()=>setZoom(z=>Math.max(1,z-.2))} aria-label="Reduzir zoom">−</button><span>{Math.round(zoom*100)}%</span><button type="button" onClick={()=>setZoom(z=>Math.min(3,z+.2))} aria-label="Aumentar zoom">+</button><button type="button" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}>Enquadrar</button></div>
    </div> : <Empty>{isGM ? "Carregue um mapa para abrir a área tática." : "O Mestre ainda não projetou um mapa."}</Empty>}
  </div>;
}
function youtubeId(url) {
  try { const parsed = new URL(url); if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1); if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop(); } catch (_) {}
  return "";
}
export function Music({ value, isGM, send }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [audioReady, setAudioReady] = useState(false), [sceneVolume, setSceneVolume] = useState(value.volume ?? .65);
  const audioRef = useRef(null), iframeRef = useRef(null);
  const track = value.playlist.find(item => item.id === value.currentId), video = track && youtubeId(track.url);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track || video) return;
    audio.volume = Math.min(1, Math.max(0, Number(value.volume ?? .65)));
    if (audio.src !== track.url) audio.src = track.url;
    const position = value.playing && value.startedAt ? value.position + Math.max(0, (Date.now() - value.startedAt) / 1000) : value.position;
    try { audio.currentTime = position; } catch (_) {}
    if (value.playing && audioReady) audio.play().catch(() => {}); else audio.pause();
  }, [track && track.id, value.startedAt, value.playing, value.volume, video, audioReady]);
  useEffect(() => {
    if (!video || !iframeRef.current) return;
    const timer = setTimeout(() => {
      const target = iframeRef.current?.contentWindow;
      if (!target) return;
      const command = (func, args = []) => target.postMessage(JSON.stringify({ event: "command", func, args }), "*");
      command("setVolume", [Math.round(Math.min(1, Math.max(0, Number(value.volume ?? .65))) * 100)]);
      if (value.playing) {
        const position = value.position + (value.startedAt ? Math.max(0, (Date.now() - value.startedAt) / 1000) : 0);
        command("seekTo", [position, true]); command("playVideo");
      } else command("pauseVideo");
    }, 450);
    return () => clearTimeout(timer);
  }, [video, value.playing, value.startedAt, value.position, value.volume]);
  function control(playing, nextTrack = track, nextVolume = value.volume) {
    if (!nextTrack) return;
    const switching = nextTrack.id !== track?.id;
    const position = switching ? 0 : audioRef.current && !video ? audioRef.current.currentTime : value.playing && value.startedAt ? value.position + Math.max(0, (Date.now() - value.startedAt) / 1000) : value.position;
    send("music:control", { trackId: nextTrack.id, playing, position, volume: nextVolume });
  }
  const youtubeUrl = video ? "https://www.youtube-nocookie.com/embed/" + video + "?enablejsapi=1&origin=" + encodeURIComponent(location.origin) + "&controls=0&disablekb=1&playsinline=1" : "";
  return <div className="view-stack"><ModuleHeader eyebrow="TRILHA SONORA" title="Música da mesa" description="A playlist do Mestre é atualizada para todos no lobby."/>
    {isGM && <form className="surface music-add" onSubmit={event => { event.preventDefault(); send("music:playlist", { tracks: [...value.playlist, { id: makeId(), title, url }] }); setTitle(""); setUrl(""); }}>
      <input required placeholder="Nome da faixa ou cena" value={title} onChange={event => setTitle(event.target.value)}/><input required type="url" placeholder="URL de áudio ou YouTube" value={url} onChange={event => setUrl(event.target.value)}/><button className="button secondary">Adicionar à playlist</button>
    </form>}
    <section className="surface player-surface">{track ? <><div className="track-now"><small>FAIXA DA SALA</small><h2>{track.title}</h2><span>{value.playing ? "Reproduzindo" : "Pausada"} · {value.playlist.length} faixas</span></div>{video ? <iframe ref={iframeRef} key={track.id} className="youtube-frame" title={track.title} src={youtubeUrl} allow="autoplay; encrypted-media; picture-in-picture" onLoad={() => { const target = iframeRef.current?.contentWindow; if (target) target.postMessage(JSON.stringify({ event: "command", func: value.playing ? "playVideo" : "pauseVideo", args: [] }), "*"); }}/> : <><audio ref={audioRef}/>{!audioReady && <button className="button quiet" onClick={() => { const audio = audioRef.current; if (audio) { const position = value.playing && value.startedAt ? value.position + Math.max(0, (Date.now() - value.startedAt) / 1000) : value.position; audio.volume = Number(value.volume ?? .65); audio.currentTime = position; if (value.playing) audio.play().catch(() => {}); else audio.pause(); setAudioReady(true); }}}>Ativar áudio neste dispositivo</button>}</>}{isGM && <div className="player-controls"><button className="button primary" onClick={() => control(!value.playing)}>{value.playing ? "Pausar" : "Reproduzir"}</button><button className="button quiet" onClick={() => { const index = value.playlist.findIndex(item => item.id === value.currentId), next = value.playlist[(index + 1) % value.playlist.length]; control(true, next); }}>Próxima faixa</button><label className="scene-volume">Volume da cena<input aria-label="Volume da cena" type="range" min="0" max="100" value={Math.round(sceneVolume * 100)} onChange={event => setSceneVolume(Number(event.target.value) / 100)} onPointerUp={() => control(value.playing, track, sceneVolume)} onKeyUp={() => control(value.playing, track, sceneVolume)}/></label></div>}</> : <Empty>Adicione uma faixa para iniciar a trilha.</Empty>}</section>
    {value.playlist.length > 0 && <section className="surface playlist"><div className="section-eyebrow">PLAYLIST</div>{value.playlist.map((item, index) => <div className={"playlist-row " + (item.id === value.currentId ? "current" : "")} key={item.id}><span className="track-index">{String(index + 1).padStart(2, "0")}</span><b>{item.title}</b>{isGM && <button className="text-action" onClick={() => control(true, item)}>Tocar</button>}</div>)}</section>}
  </div>;
}
export function Diary({ value, journal = [], isGM, identity, send }) {
  const [shared, setShared] = useState(value.shared || ""), [privateText, setPrivateText] = useState(value.private || "");
  const empty = { id: "", title: "", body: "", visibility: "public" };
  const [entry, setEntry] = useState(empty);
  useEffect(() => { setShared(value.shared || ""); setPrivateText(value.private || ""); }, [value.shared, value.private]);
  async function saveEntry(event) { event.preventDefault(); const result=await send("journal:save", entry); if(result?.ok) setEntry(empty); }
  return <div className="view-stack"><ModuleHeader eyebrow="REGISTROS" title="Diário de bordo" description="Entradas públicas para a mesa e notas privadas entre cada jogador e o Mestre."/>
    {isGM && <section className="surface writing-surface"><div className="section-eyebrow">CADERNO DO MESTRE</div><label className="writing-field">Notas privadas do Mestre<textarea value={privateText} onChange={event => setPrivateText(event.target.value)} placeholder="Somente o Mestre pode ler estas notas"/></label><label className="writing-field">Resumo compartilhado<textarea value={shared} onChange={event => setShared(event.target.value)} placeholder="Resumo geral da campanha visível para o grupo."/></label><button className="button secondary" onClick={() => send("notes:save", { shared, private: privateText })}>Salvar caderno</button></section>}
    <form className="surface journal-form" onSubmit={saveEntry}><div className="section-eyebrow">{entry.id ? "EDITAR ENTRADA" : "NOVA ENTRADA"}</div><input required maxLength="120" placeholder="Título" value={entry.title} onChange={event => setEntry(old => ({ ...old, title: event.target.value }))}/><textarea required value={entry.body} onChange={event => setEntry(old => ({ ...old, body: event.target.value }))} placeholder="Anote uma pista, acontecimento ou lembrança da sessão."/><div className="journal-controls"><label>Visibilidade<select value={entry.visibility} onChange={event => setEntry(old => ({ ...old, visibility: event.target.value }))}><option value="public">Público para a mesa</option><option value="private">Privado para mim e o Mestre</option></select></label><button className="button secondary">{entry.id ? "Salvar edição" : "Publicar no diário"}</button>{entry.id && <button type="button" className="button quiet" onClick={() => setEntry(empty)}>Cancelar</button>}</div></form>
    <div className="journal-list">{[...journal].sort((a,b)=>(b.createdAt || b.created_at || 0)-(a.createdAt || a.created_at || 0)).map(item => <article className="surface journal-entry" key={item.id}><header><div><div className="section-eyebrow">{item.authorName} · {(item.is_private ?? (item.visibility === "private")) ? "PRIVADO" : "PÚBLICO"}</div><h2>{item.title}</h2></div><time>{new Date(item.updatedAt).toLocaleDateString("pt-BR")}</time></header><p>{item.body}</p>{(isGM || item.authorId === identity.userId) && <div className="card-actions"><button className="text-action" onClick={() => setEntry({ id: item.id, title: item.title, body: item.body, visibility: item.visibility })}>Editar</button><button className="text-action danger" onClick={() => send("journal:delete", { id: item.id })}>Excluir</button></div>}</article>)}</div>
    {!journal.length && <Empty>O diário ainda não tem entradas.</Empty>}
    <div className="diary-private-grid">{!isGM && <section className="surface writing-surface"><div className="section-eyebrow">NOTAS PRIVADAS</div><textarea value={privateText} onChange={event => setPrivateText(event.target.value)} placeholder="Lembretes visíveis apenas para você e o Mestre."/><button className="button quiet" onClick={() => send("notes:save", { private: privateText })}>Salvar notas privadas</button></section>}
      {!isGM && <section className="surface writing-surface"><div className="section-eyebrow">CADERNO DO MESTRE</div><div className="lore-read">{value.shared || "O Mestre ainda não adicionou um resumo."}</div></section>}</div>
  </div>;
}
export function Sessions({ items, count, isGM, send }) {
  const [date, setDate] = useState(""); const [title, setTitle] = useState(""); const [summary, setSummary] = useState("");
  return <div className="view-stack"><ModuleHeader eyebrow="HISTÓRICO" title="Sessões realizadas" description={"Registro da campanha · " + count + " sessão" + (count === 1 ? "" : "ões")}/>
    {isGM && <form className="surface session-form" onSubmit={event => { event.preventDefault(); send("session:add", { date, title, summary }); setDate(""); setTitle(""); setSummary(""); }}>
      <label>Data<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label><label>Capítulo ou título<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: A torre de cinzas"/></label><label className="wide-field">Resumo<textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="O que aconteceu nesta sessão?"/></label><button className="button secondary">Registrar sessão</button>
    </form>}
    <div className="session-history">{items.map(item => <article className="surface history-item" key={item.id}><time>{new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}</time><div><h3>{item.title || "Sessão"}</h3><p>{item.summary}</p></div></article>)}</div>{!items.length && <Empty>Ainda não há sessões registradas.</Empty>}
  </div>;
}

export function Characters({ room, identity, system, isGM, send, upload }) {
  const [editing, setEditing] = useState(null), profile = systemProfile(system);
  const ownPlayer = room.players.find(player => player.id === identity.userId);
  const targets = isGM ? room.players : ownPlayer ? [ownPlayer] : [];
  return <div className="view-stack"><ModuleHeader eyebrow="FICHAS" title="Personagens" description={isGM ? "Consulte o grupo e edite as fichas conforme o sistema da campanha." : "A ficha usa os campos principais de " + (system || "um sistema genérico") + ". Você pode alterar apenas a sua."}/>
    <div className="character-grid">{targets.map(player => {
      const primary = profile.fields.slice(0, 4).map(([key, label]) => player.character?.stats?.[key] ? label + " " + player.character.stats[key] : "").filter(Boolean);
      return <article className="surface character-card" key={player.id}>{player.character?.token && <img className="character-token" src={player.character.token} alt={"Token de " + player.character.name}/>}<div className="character-body"><div className="section-eyebrow">{player.name}</div><h2>{player.character?.name || "Ficha não criada"}</h2><p>{player.character ? [player.character.classLevel, ...primary, player.character.hp ? "PV " + player.character.hp : "", player.character.ac ? "CA " + player.character.ac : ""].filter(Boolean).join(" · ") : "A ficha ainda está vazia."}</p><button className="button secondary" onClick={() => setEditing(player)}>{player.character ? "Editar ficha" : "Criar ficha"}</button></div></article>;
    })}</div>
    {!targets.length && <Empty>Entre na sala como jogador para criar sua ficha.</Empty>}
    {editing && <CharacterStudio key={editing.id} player={editing} profile={profile} system={system} upload={upload} send={send} onClose={() => setEditing(null)} onSave={async character => { const result = await send("character:save", { ownerId: editing.id, character }); if (!result?.ok) throw new Error(result?.error || "Não foi possível salvar a ficha."); setEditing(null); }}/>}
  </div>;
}
function ShieldReferencePanel({ section }) {
  return <section className="surface shield-reference">
    <div className="section-eyebrow">{section.title}</div>
    <div className="reference-list">{section.items.map(([label, detail]) => <article key={label}><b>{label}</b><p>{detail}</p></article>)}</div>
  </section>;
}

function GMThreatTracker({system,tracker,send}) {
  const key=system==="Triangle Agency"?"chaos":"fear",title=system==="Triangle Agency"?"Reserva de Caos":"Reserva de Medo",count=Number(tracker?.[key])||0,cap=system==="Daggerheart"?12:24;
  return <section className="gm-tracker"><div className="gm-tracker-copy"><span className="section-eyebrow">CONTROLE DA CENA</span><h2>{title}</h2><p>{system==="Triangle Agency"?"Dados diferentes de 3 alimentam a reserva.":"A reserva começa com um ponto por personagem e cresce com resultados de Medo."}</p></div><div className="gm-tracker-meter"><strong>{count}</strong><div className="gm-tracker-pips">{Array.from({length:Math.min(cap,12)},(_,i)=><i key={i} className={i<count?"filled":""}/>)}</div><small>{count>12?"+"+(count-12)+" além do marcador":system==="Daggerheart"?"limite 12":"pontos acumulados"}</small></div><div className="gm-tracker-actions"><button onClick={()=>send("gm:tracker:update",{key,value:Math.max(0,count-1)})}>−</button><button onClick={()=>send("gm:tracker:update",{key,value:count+1})}>+</button><button onClick={()=>send("gm:tracker:update",{key,value:0})}>Zerar</button></div><div className="gm-roll-log">{(tracker?.rolls||[]).slice(0,4).map(item=><span key={item.id}>{item.actor||"Jogador"} · {item.summary}</span>)}</div></section>;
}
export function GMQuickShield({system}) { const shield=systemProfile(system).shield; return <details className="gm-quick-shield"><summary><span>Consulta rápida</span><small>{shield.source}</small></summary><div className="gm-quick-body">{shield.sections.map(section=><details key={section.title}><summary>{section.title}</summary><div>{section.items.map(([label,detail])=><article key={label}><b>{label}</b><p>{detail}</p></article>)}</div></details>)}</div></details>; }
export function GMShield({ system, value, tracker, send }) {
  const profile = systemProfile(system);
  const shield = profile.shield;
  const [note, setNote] = useState(value || "");
  useEffect(() => setNote(value || ""), [value]);
  return <div className="view-stack"><ModuleHeader eyebrow="VISÍVEL APENAS AO MESTRE" title="Escudo do Mestre" description={shield.scope}/>
    <div className="shield-context"><span className="shield-source">{shield.source}</span>{shield.notice && <p className="shield-notice">{shield.notice}</p>}</div>
    {["Triangle Agency","Daggerheart"].includes(system)&&<GMThreatTracker system={system} tracker={tracker} send={send}/> }
    <div className="shield-grid">{shield.sections.map(section => <ShieldReferencePanel key={section.title} section={section}/>)}
      <section className="surface writing-surface shield-notes"><div className="section-eyebrow">ANOTAÇÕES PRIVADAS DO MESTRE</div><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Regras da casa, valores definidos para a campanha e lembretes da próxima sessão."/><button className="button secondary" onClick={() => send("gm:shield:update", { value: note })}>Salvar anotações do escudo</button></section>
    </div>
  </div>;
}
export function GMDocuments({ items, upload, getSignedUrl, send }) {
  const [title, setTitle] = useState(""), [notes, setNotes] = useState(""), [file, setFile] = useState(null), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (!file) return alert("Escolha um arquivo PDF ou DOCX.");
    setBusy(true);
    try {
      const saved = await upload(file, { scope: "private", kind: "gm-doc" });
      send("gm-doc:save", { title: title || file.name, notes, bucket: saved.bucket, path: saved.path, fileName: file.name });
      setTitle(""); setNotes(""); setFile(null);
    } catch (error) { alert(error.message); }
    finally { setBusy(false); }
  }
  async function open(item) { const url = await getSignedUrl(item); window.open(url, "_blank", "noopener,noreferrer"); }
  return <div className="view-stack"><ModuleHeader eyebrow="ARQUIVO PRIVADO · MESTRE" title="Documentos da campanha" description="Preparação, segredos, relatórios e diários do Mestre."/>
    <form className="surface gm-doc-form" onSubmit={submit}><label>Título<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Preparação da próxima sessão"/></label><label>Notas<textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Descrição curta para localizar o documento."/></label><label className="button quiet file-button">Anexar PDF ou DOCX<input type="file" accept="application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => setFile(event.target.files[0] || null)}/></label><span className="muted-copy">{file?.name || "PDF ou DOCX · até 30 MB"}</span><button className="button primary" disabled={busy}>{busy ? "Enviando…" : "Guardar em arquivo privado"}</button></form>
    <div className="document-list">{items.map(item => <article className="surface document-row" key={item.id}><div><b>{item.title}</b><small>{item.fileName} · {item.notes}</small></div><div className="card-actions"><button className="button quiet" onClick={() => open(item)}>Abrir</button><button className="text-action danger" onClick={() => send("gm-doc:delete", { id: item.id })}>Excluir</button></div></article>)}</div>
    {!items.length && <Empty>Nenhum documento privado adicionado.</Empty>}
  </div>;
}

function AcroField({ field, value, onChange }) { return <label>{field.name}{field.type === "PDFCheckBox" ? <input type="checkbox" checked={value === "Sim" || value === true} onChange={event => onChange(event.target.checked ? "Sim" : "Não")}/> : <input value={value ?? ""} onChange={event => onChange(event.target.value)}/>}</label>; }
function fieldValue(field) { try { if (typeof field.getText === "function") return field.getText() || ""; if (typeof field.isChecked === "function") return field.isChecked() ? "Sim" : "Não"; if (typeof field.getSelected === "function") return (field.getSelected() || []).join(", "); } catch (_) {}
  return "";
}
function normalizePdfLabel(value) { return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,""); }
function pdfFormStatKey(name,system) { const value=normalizePdfLabel(name); if(system&&system.startsWith("D&D")) { const map={str:"strength",dex:"dexterity",con:"constitution",int:"intelligence",wis:"wisdom",cha:"charisma",profbonus:"proficiencyBonus",ac:"ac",initiative:"initiative",speed:"speed",hp:"hpCurrent",hitpoints:"hpCurrent",hpcurrent:"hpCurrent",hpmax:"hpMax",maxhp:"hpMax",hptemp:"hpTemp",passive:"passivePerception",passiveperception:"passivePerception",classlevel:"className",background:"background",alignment:"alignment",xp:"experience",inspiration:"inspiration",cp:"cp",sp:"sp",ep:"ep",gp:"gp",pp:"pp",spellcastingability2:"spellcastingAbility",spellsavedc2:"spellDC",spellatkbonus2:"spellAttack",proficiencieslang:"languagesProficiencies",feattraits:"originFeats",equipment:"equipmentText",featurestraits:"classResources"}; return map[value]||null; } if(system==="Call of Cthulhu") { const map={str:"str",dex:"dex",con:"con",app:"app",edu:"edu",siz:"siz",int:"int",pow:"pow",san:"sanCurrent",sanity:"sanCurrent",sanitycurrent:"sanCurrent",sanitystart:"sanCurrent",sanitymax:"sanMax",lucktotal:"luck",hp:"hpCurrent",currenthp:"hpCurrent",hitpoints:"hpCurrent",maxhp:"hpMax",hpmax:"hpMax",nome:"characterName",build:"build",mov:"movement"}; return map[value]||null; } if(system&&system.startsWith("Vampire")){const map={"nomepersonagem":"characterName","cla":"clan","clan":"clan","geracao":"generation","fome":"hunger","humanidade":"humanity","pds":"bloodPotency"};return map[value]||null;} if(system==="Triangle Agency"){const map={"charactername":"characterName","chaospool":"chaosPool","reality":"realityStatus","competency":"competency","anomalyname":"anomalyName","anomalybehavior":"anomalyBehavior","anomalyfocus":"anomalyFocus","anomalydomain":"anomalyDomain","realitytrigger":"realityTrigger","burnoutrelease":"burnoutRelease","anomalyalias":"anomalyAlias","requisition1name":"requisition1Name","requisition1pagepdcode":"requisition1Code","requisition1effect":"requisition1Effect","requisition2name":"requisition2Name","requisition2pagepdcode":"requisition2Code","requisition2effect":"requisition2Effect","requisition3name":"requisition3Name","requisition3pagepdcode":"requisition3Code","requisition3effect":"requisition3Effect","requisition4name":"requisition4Name","requisition4pagepdcode":"requisition4Code","requisition4effect":"requisition4Effect","requisition5name":"requisition5Name","requisition5pagepdcode":"requisition5Code","requisition5effect":"requisition5Effect","requisition6name":"requisition6Name","requisition6pagepdcode":"requisition6Code","requisition6effect":"requisition6Effect"};return map[value]||null;} const fields=systemProfile(system).fields; return fields.find(([key,label])=>value===normalizePdfLabel(key)||value===normalizePdfLabel(label))?.[0]||null; }
function pdfFormSuggestions(fields,system){
 const result={},indexed=new Map(fields.map(field=>[normalizePdfLabel(field.name),field])),get=name=>indexed.get(normalizePdfLabel(name))?.value||"",textFields=fields.filter(field=>field.type!=="PDFCheckBox"&&field.value);
 for(const field of textFields){const key=pdfFormStatKey(field.name,system);if(key)result[key]=field.value;}
 const checked=(prefix,max)=>Array.from({length:Math.min(max,9)},(_,i)=>indexed.get(normalizePdfLabel(prefix+(i+1)))).filter(field=>field?.value==="Sim").length+(max===10&&indexed.get(normalizePdfLabel(prefix+"0"))?.value==="Sim"?1:0);
 if(system&&system.startsWith("D&D")){
  result.characterName=get("CharacterName")||get("CharacterName 2")||result.characterName;
  const hpCurrent=result.hpCurrent,hpMax=result.hpMax;if(hpCurrent||hpMax)result.hp=(hpCurrent||"0")+"/"+(hpMax||hpCurrent||"0");delete result.hpCurrent;delete result.hpMax;
  const slots=[];for(let circle=1;circle<=9;circle++){const suffix=18+circle,total=Number(get("SlotsTotal "+suffix)),remaining=Number(get("SlotsRemaining "+suffix));if(total||remaining)slots.push(circle+":"+Math.max(0,total-remaining)+"/"+total);}if(slots.length)result.spellSlots=slots.join(";");
  const spells=textFields.filter(field=>/^spells\s/i.test(field.name)).map(field=>String(field.value).trim()).filter(Boolean);if(spells.length)result.spells=spells.join("\n");
  const weapons=[];for(let index=1;index<=3;index++){const suffix=index===1?"":" "+index,name=get("Wpn Name"+suffix),attack=get("Wpn"+index+" AtkBonus"),damage=get("Wpn"+index+" Damage");if(name||attack||damage)weapons.push([name,attack,damage,"",""] .join("|"));}if(weapons.length)result.weapons=weapons.join("\n");
  if(result.equipmentText){result.inventory=String(result.equipmentText).split(/\r?\n/).filter(Boolean).map(line=>line+"|||").join("\n");delete result.equipmentText;}
 }
 if(system==="Call of Cthulhu"){
  result.characterName=get("Nome")||result.characterName;
  const aliases={contabilidade:"Contabilidade",antropologia:"Antropologia",avaliacao:"Avaliação",arqueologia:"Arqueologia",arte:"Arte/Ofício · especialidade",artesouoficios:"Arte/Ofício · especialidade",charme:"Charme",escalar:"Escalar",computadores:"Usar Computadores",credito:"Crédito",mythos:"Mitos de Cthulhu",disfarce:"Disfarce",esquivar:"Esquivar",dirigir:"Dirigir Automóvel",eletricos:"Reparos Elétricos",mecanicos:"Reparos Mecânicos",labia:"Lábia",lutar:"Lutar · Briga",pistolas:"Armas de Fogo · Pistolas",rifles:"Armas de Fogo · Rifles/Escopetas",primeirossocorros:"Primeiros Socorros",historia:"História",intimidacao:"Intimidar",saltar:"Saltar",linguanatural:"Idioma · Nativo",linguanaturalidade:"Idioma · Nativo",linguaoutra:"Idioma · Outro",direito:"Direito",bibliotecas:"Usar Bibliotecas",escutar:"Escutar",chaveiro:"Chaveiro",medicina:"Medicina",natural:"Mundo Natural",navegacao:"Navegar",ocultismo:"Ocultismo",persuasao:"Persuadir",pilotarre:"Pilotar · especialidade",psicologia:"Psicologia",psicanalise:"Psicanálise",cavalgar:"Cavalgar",ciencia:"Ciência · especialidade",prestidigitacao:"Prestidigitação",encontrar:"Encontrar",furtividade:"Furtividade",sobrevivencia:"Sobrevivência · especialidade",natacao:"Nadar",arremessar:"Arremessar",rastrear:"Rastrear"},skills={};for(const field of textFields){const key=normalizePdfLabel(field.name),skill=aliases[key];if(skill&&/^\d{1,3}$/.test(String(field.value).trim()))skills[skill]=String(field.value).trim();}if(Object.keys(skills).length)result.skills=Object.entries(skills).map(([name,value])=>name+"="+value).join("\n");
  const current=result.sanCurrent,max=result.sanMax;if(current||max)result.san=(current||"0")+"/"+(max||current||"0");const hp=result.hpCurrent,hpMax=result.hpMax||((Number(result.con)>0&&Number(result.siz)>0)?String(Math.floor((Number(result.con)+Number(result.siz))/10)):"");if(hp||hpMax)result.hitPoints=(hp||"0")+"/"+(hpMax||hp||"0");delete result.sanCurrent;delete result.sanMax;delete result.hpCurrent;delete result.hpMax;
 }
 if(system&&system.startsWith("Vampire")){
  result.characterName=get("NOME DO PERSONAGEM")||result.characterName;
  const dots=[["FOR","strength",5],["DES","dexterity",5],["VIG","stamina",5],["CAR","charisma",5],["MAN","manipulation",5],["AUT","composure",5],["INT","intelligence",5],["RAC","wits",5],["DET","resolve",5]];for(const [prefix,key,max] of dots){const count=checked(prefix,max);if(count)result[key]=String(count);}
  for(const [prefix,key,max] of [["Fome","hunger",5],["Humanidade","humanity",10],["PdS","bloodPotency",10]]){const count=checked(prefix,max);if(count)result[key]=String(count);}
  const aliases={arbr:["Luta","physical"],arfo:["Armas de Fogo","physical"],atle:["Atletismo","physical"],brig:["Briga","physical"],cond:["Condução","physical"],ladr:["Furto","physical"],ofic:["Ofícios","physical"],sobr:["Sobrevivência","physical"],emca:["Empatia com Animais","social"],etiq:["Etiqueta","social"],inti:["Intimidação","social"],lide:["Liderança","social"],manh:["Manha","social"],perf:["Performance","social"],pers:["Persuasão","social"],saga:["Intuição","social"],subt:["Lábia","social"],cien:["Ciência","social"],erud:["Acadêmicos","social"],fina:["Finanças","social"],inve:["Investigação","social"],medi:["Medicina","social"],ocul:["Ocultismo","social"],perc:["Prontidão","social"],poli:["Política","social"],tecn:["Tecnologia","social"]},skillRows={physical:{},social:{}};for(const field of fields){const match=normalizePdfLabel(field.name).match(/^([a-z]+)([1-5])$/),entry=match&&aliases[match[1]];if(entry&&field.value==="Sim")skillRows[entry[1]==="physical"?"physical":"social"][entry[0]]=(skillRows[entry[1]==="physical"?"physical":"social"][entry[0]]||0)+1;}if(Object.keys(skillRows.physical).length)result.skillsPhysical=Object.entries(skillRows.physical).map(([key,value])=>key+"="+value).join("\n");if(Object.keys(skillRows.social).length)result.skillsSocialMental=Object.entries(skillRows.social).map(([key,value])=>key+"="+value).join("\n");
  const disciplines=[];for(let index=1;index<=6;index++){const name=get("DISCIPLINA "+index);if(name)disciplines.push(name+"|||");}if(disciplines.length)result.disciplines=disciplines.join("\n");
 }
 if(system==="Triangle Agency"){
  result.characterName=get("Character Name")||result.characterName;
  const anomalyName=result.anomalyName||get("Anomaly"),behavior=result.anomalyBehavior,focus=result.anomalyFocus,domain=result.anomalyDomain,trigger=result.realityTrigger,burnout=result.burnoutRelease;if(anomalyName||behavior||focus||domain||trigger||burnout)result.anomalies=[[anomalyName,[behavior,focus&&"Foco: "+focus,domain&&"Domínio: "+domain].filter(Boolean).join(" · "),burnout,trigger].join("|")].join("\n");
  const requisitions=[];for(let index=1;index<=6;index++){const name=result["requisition"+index+"Name"],code=result["requisition"+index+"Code"],effect=result["requisition"+index+"Effect"];if(name||code||effect)requisitions.push([name,code,effect].join("|"));delete result["requisition"+index+"Name"];delete result["requisition"+index+"Code"];delete result["requisition"+index+"Effect"];}if(requisitions.length)result.requisitions=requisitions.join("\n");
  ["anomalyName","anomalyBehavior","anomalyFocus","anomalyDomain","realityTrigger","burnoutRelease","anomalyAlias"].forEach(key=>delete result[key]);
 }
 return result;
}
function parseSuggestions(text, profile) {
  const result = {};
  const aliases = { strength: "STR|FOR|força|strength", dexterity: "DEX|DES|destreza|dexterity", constitution: "CON|constituição|constitution", intelligence: "INT|inteligência|intelligence", wisdom: "WIS|SAB|sabedoria|wisdom", charisma: "CHA|CAR|carisma|charisma", hp: "PV|HP|pontos de vida|hit points", ac: "CA|AC|classe de armadura|armor class", san: "SAN|sanidade|sanity", luck: "sorte|luck", hitPoints: "HP|PV|pontos de vida|hit points", magicPoints: "PM|pontos de magia|magic points", spellSlots: "espaços de magia|spell slots", hunger: "fome|hunger", hope: "esperança|hope", stress: "fadiga|stress", evasion: "evasão|evasion", defense: "defesa", pv: "PV|pontos de vida" };
  for (const [key, label] of profile.fields) {
    const terms = aliases[key] || label;
    const match = text.match(new RegExp("(?:^|\\n|\\b)(?:" + terms + ")\\s*[:=]?\\s*(-?\\d+(?:\\s*[/|+]\\s*\\d+)?)", "i"));
    if (match) result[key] = match[1].replace(/\s+/g, "");
  }
  return result;
}

export function PDFWorkshop({ items = [], room, identity, isGM, system, upload, getSignedUrl, send }) {
  const own = room.players.find(player => player.id === identity.userId);
  const [ownerId, setOwnerId] = useState(isGM ? (room.players[0]?.id || "") : identity.userId);
  const [active, setActive] = useState(null), [buffer, setBuffer] = useState(null), [viewerUrl, setViewerUrl] = useState("");
  const [fields, setFields] = useState([]), [values, setValues] = useState({}), [textContent, setTextContent] = useState("");
  const [suggestions, setSuggestions] = useState({}), [busy, setBusy] = useState(false), [progress, setProgress] = useState("");
  const profile = systemProfile(system);
  const available = isGM ? items : items.filter(item => item.ownerId === identity.userId); async function saveSuggestedStats(found, pdfMeta = active, targetId = ownerId) {
    if (!Object.keys(found).length) return;
    const player = room.players.find(item => item.id === targetId);
    if (!player) return;
    const imported = { ...found }, characterName = String(imported.characterName || "").trim(), className = String(imported.className || "").trim(); delete imported.characterName;
    const character = { ...(player.character || {}), ...(characterName ? { name: characterName } : {}), ...(className ? { classLevel: className } : {}), stats: { ...(player.character?.stats || {}), ...imported } };
    character.sheet = buildCharacterSheet(system, targetId, targetId, { name: character.name || player.name, classLevel: character.classLevel || "", portraitUrl: character.token || null, notes: character.notes || "", appearance: character.appearance || "", inventory: character.inventory || "", stats: character.stats });
    if (pdfMeta) character.pdf = { name: pdfMeta.fileName, bucket: pdfMeta.bucket, path: pdfMeta.path };
    const result = await send("character:save", { ownerId: targetId, character });
    if (!result?.ok) throw new Error(result?.error || "Não foi possível atualizar a ficha.");
  }
  useEffect(() => () => { if (viewerUrl.startsWith("blob:")) URL.revokeObjectURL(viewerUrl); }, [viewerUrl]);
  async function parsePdf(file, meta = null) { const { PDFDocument, pdfjsLib } = await loadPdfTools();
    const bytes = await file.arrayBuffer(), document = await PDFDocument.load(bytes), form = document.getForm();
    const found = form.getFields().map(field => ({ name: field.getName(), type: field.constructor.name, value: fieldValue(field) }));
    setBuffer(bytes); setFields(found); setValues(Object.fromEntries(found.map(field => [field.name, field.value]))); setTextContent("");
    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setViewerUrl(objectUrl);
    const task = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) }), pdf = await task.promise;
    let text = "";
    for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 10); pageNo++) {
      const page = await pdf.getPage(pageNo), content = await page.getTextContent();
      text += content.items.map(item => item.str || "").join(" ") + "\n";
    }
    setTextContent(text);
    const fromText = parseSuggestions(text, profile), fromForms = pdfFormSuggestions(found,system);
    const parsed = { ...fromText, ...fromForms }; setSuggestions(parsed); await saveSuggestedStats(parsed, meta || active, meta?.ownerId || ownerId);
    if (meta) setActive(meta);
    return bytes;
  }
  async function chooseFile(file) {
    if (!file || file.type !== "application/pdf") return alert("Escolha uma ficha em PDF.");
    if (file.size > 30 * 1024 * 1024) return alert("O arquivo deve ter até 30 MB.");
    if (!ownerId && isGM) return alert("Adicione um jogador antes de enviar a ficha.");
    setBusy(true); setProgress("Lendo campos e texto do PDF…");
    try {
      const saved = await upload(file, { scope: "private", kind: "character" });
      const owner = isGM ? ownerId : identity.userId;
      const meta = { id: makeId(), ownerId: owner, title: file.name, bucket: saved.bucket, path: saved.path, fileName: file.name };
      await parsePdf(file, meta); send("pdf:save", meta);
    } catch (error) { alert(error.message || "Não foi possível ler esse PDF."); }
    finally { setBusy(false); setProgress(""); }
  }
  async function openSaved(item) {
    setBusy(true); setProgress("Abrindo ficha…");
    try {
      const url = await getSignedUrl(item), response = await fetch(url);
      if (!response.ok) throw new Error("Não foi possível abrir a ficha salva.");
      const blob = await response.blob(), file = new File([blob], item.fileName || item.title, { type: "application/pdf" });
      setOwnerId(item.ownerId); await parsePdf(file, item);
    } catch (error) { alert(error.message); }
    finally { setBusy(false); setProgress(""); }
  }
  async function scanOcr() {
    if (!buffer) return;
    setBusy(true); setProgress("Preparando OCR em português…");
    let worker;
    try {
      const { pdfjsLib } = await loadPdfTools(), { createWorker } = await import("tesseract.js"); worker = await createWorker("por", 1, { logger: message => { if (message.status === "recognizing text") setProgress("OCR " + Math.round((message.progress || 0) * 100) + "%"); } });
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
      let text = "";
      for (let pageNo = 1; pageNo <= Math.min(pdf.numPages, 4); pageNo++) {
        const page = await pdf.getPage(pageNo), viewport = page.getViewport({ scale: 1.4 }), canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
        const result = await worker.recognize(canvas); text += result.data.text + "\n";
      }
      setTextContent(text); const parsed = parseSuggestions(text, profile); setSuggestions(parsed); await saveSuggestedStats(parsed);
    } catch (error) { alert(error.message || "O OCR não conseguiu ler este PDF."); }
    finally { await worker?.terminate(); setBusy(false); setProgress(""); }
  }
  async function downloadFilled() { const { PDFDocument } = await loadPdfTools();
    if (!buffer) return;
    try {
      const pdfDocument = await PDFDocument.load(buffer), form = pdfDocument.getForm();
      for (const field of fields) {
        try {
          if (field.type === "PDFTextField") form.getTextField(field.name).setText(String(values[field.name] ?? ""));
          else if (field.type === "PDFCheckBox") { const box = form.getCheckBox(field.name); if (values[field.name] === "Sim" || values[field.name] === true) box.check(); else box.uncheck(); }
        } catch (_) {}
      }
      const bytes = await pdfDocument.save(), url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = (active?.fileName || "ficha").replace(/\.pdf$/i, "") + "-preenchida.pdf"; link.click(); URL.revokeObjectURL(url);
    } catch (error) { alert(error.message || "Não foi possível gerar o PDF preenchido."); }
  }
  async function applyToCharacter() { try { await saveSuggestedStats(suggestions, active, ownerId); } catch (error) { alert(error.message || "Não foi possível aplicar os dados à ficha."); } }
  return <div className="view-stack" onDragOver={event=>{if(Array.from(event.dataTransfer?.types||[]).includes("Files"))event.preventDefault();}} onDrop={event=>{const pdf=Array.from(event.dataTransfer.files||[]).find(file=>file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf"));if(pdf){event.preventDefault();chooseFile(pdf);}}}><ModuleHeader eyebrow="FICHAS E FORMULÁRIOS" title="PDF da ficha" description={system || "Selecione o sistema da campanha para sugerir os campos."}/><div className="pdf-drop-zone" role="note">📄 Arraste e solte aqui um PDF da ficha para enviar e extrair texto automaticamente (limite 30 MB)</div>
    <section className="surface pdf-toolbar">{isGM && <label>Personagem<select value={ownerId} onChange={event => setOwnerId(event.target.value)}><option value="">Escolha o jogador</option>{room.players.map(player => <option value={player.id} key={player.id}>{player.name}</option>)}</select></label>}<label className="button quiet file-button">{busy ? "Processando…" : "Enviar PDF"}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => chooseFile(event.target.files[0])}/></label><span>{progress || "Campos AcroForm, texto e OCR"}</span></section>
    {!!available.length && <section className="surface saved-pdfs"><div className="section-eyebrow">FICHAS GUARDADAS</div>{available.map(item => <button key={item.id} className="recent-room" onClick={() => openSaved(item)}><span><b>{item.title}</b><small>{room.players.find(player => player.id === item.ownerId)?.name || "Minha ficha"}</small></span><i>Abrir PDF</i></button>)}</section>}
    {viewerUrl && <div className="pdf-workbench"><iframe className="pdf-viewer" src={viewerUrl} title="Visualizador da ficha PDF"/><section className="surface pdf-fields"><div className="section-eyebrow">CAMPOS EDITÁVEIS · {fields.length}</div>{fields.length ? fields.map(field => <AcroField key={field.name} field={field} value={values[field.name]} onChange={next => setValues(old => ({ ...old, [field.name]: next }))}/>) : <p className="muted-copy">Nenhum campo AcroForm. Use o OCR se a ficha for uma imagem digitalizada.</p>}
      {!!Object.keys(suggestions).length && <div className="suggested-stats"><div className="section-eyebrow">DADOS SUGERIDOS PARA A FICHA</div>{Object.entries(suggestions).map(([key, value]) => <label key={key}>{profile.fields.find(field => field[0] === key)?.[1] || key}<input value={value} onChange={event => setSuggestions(old => ({ ...old, [key]: event.target.value }))}/></label>)}<button className="button secondary" onClick={applyToCharacter}>Aplicar à ficha digital</button></div>}
      <div className="card-actions"><button className="button quiet" disabled={busy || !buffer} onClick={scanOcr}>Escanear com OCR</button><button className="button secondary" disabled={!buffer} onClick={downloadFilled}>Exportar PDF preenchido</button></div></section></div>}
    {textContent && <details className="pdf-text"><summary>Texto reconhecido para consulta</summary><pre>{textContent}</pre></details>}
    {!available.length && !viewerUrl && <Empty>Envie uma ficha PDF para abrir o leitor e detectar campos ou texto.</Empty>}
  </div>;
}

export function CommunityLibrary({ room, identity, items: initialItems = [], upload }) {
  const [items, setItems] = useState(initialItems), [title, setTitle] = useState(""), [system, setSystem] = useState(room.campaign.system || ""), [file, setFile] = useState(null), [search, setSearch] = useState(""), [busy, setBusy] = useState(false);
  async function refresh() { const response = await fetch((import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api/library"); const result = await response.json(); setItems(result.items || []); }
  useEffect(() => { refresh().catch(() => {}); }, []);
  async function submit(event) {
    event.preventDefault(); if (!file || file.type !== "application/pdf") return alert("Escolha um PDF de referência.");
    setBusy(true);
    try {
      const saved = await upload(file, { scope: "community", kind: "library" });
      const endpoint = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api/rooms/" + encodeURIComponent(room.id) + "/library";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "x-room-token": identity.token }, body: JSON.stringify({ ...saved, title: title || file.name, fileName: file.name, system }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Falha ao publicar.");
      setTitle(""); setFile(null); await refresh();
    } catch (error) { alert(error.message); }
    finally { setBusy(false); }
  }
  const visible = items.filter(item => (item.title + " " + item.system + " " + item.fileName).toLowerCase().includes(search.toLowerCase()));
  return <div className="view-stack"><ModuleHeader eyebrow="BIBLIOTECA DA COMUNIDADE" title="PDFs de referência" description="Consulte e compartilhe materiais de sistemas durante a sessão."/>
    <form className="surface library-form" onSubmit={submit}><label>Título<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Livro ou referência"/></label><label>Sistema<select value={system} onChange={event => setSystem(event.target.value)}><option value="">Sistema geral</option>{SYSTEMS.map(value => <option key={value}>{value}</option>)}</select></label><label className="button quiet file-button">Escolher PDF<input type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files[0] || null)}/></label><span className="muted-copy">{file?.name || "PDF · até 30 MB"}</span><button className="button secondary" disabled={busy}>{busy ? "Enviando…" : "Publicar na biblioteca"}</button></form>
    <input className="library-search" aria-label="Buscar na biblioteca" placeholder="Buscar por título, sistema ou arquivo" value={search} onChange={event => setSearch(event.target.value)}/>
    <div className="document-list">{visible.map(item => <article className="surface document-row" key={item.id}><div><b>{item.title}</b><small>{item.system || "Geral"} · {item.uploader}</small></div><button className="button quiet" onClick={async () => { const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""), url = item.url?.startsWith("/") ? base + item.url : item.url; window.open(url, "_blank", "noopener,noreferrer"); }}>Abrir PDF</button></article>)}</div>
    {!visible.length && <Empty>A biblioteca ainda não tem arquivos.</Empty>}
  </div>;
}




