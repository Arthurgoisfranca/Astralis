import React, { useEffect, useState } from "react";
import { readImage, resizeImage } from "./SharedTools.jsx";
import { SYSTEMS } from "./RpgSystems.js";

export const MODULES = [
  ["agenda", "Agenda"], ["system", "Sistema"], ["characters", "Personagens"], ["lore", "Universo"], ["npcs", "NPCs"],
  ["handouts", "Handouts"], ["maps", "Mapas"], ["music", "Música"],
  ["diary", "Diário"], ["sessions", "Sessões"], ["gmDocs", "Documentos do Mestre"], ["pdfs", "Fichas em PDF"], ["library", "Biblioteca"]
];

const emptyCampaign = {
  title: "", system: "", gmName: "", status: "notStarted", duration: "Campanha curta", style: "", totalSeats: 5, availableSeats: 5,
  usualDay: "", date: "", time: "", location: "", ageRating: "", triggers: "", requirements: "",
  summary: "", observations: "", illustration: ""
};
function CampaignForm({ onCreate, busy }) {
  const [form, setForm] = useState(emptyCampaign);
  const [dragging, setDragging] = useState(false);
  const update = key => event => setForm(old => ({ ...old, [key]: event.target.value }));
  async function pickImage(file) {
    if (!file) return;
    try {
      const prepared = await resizeImage(file, 2048);
      const illustration = await readImage(prepared);
      setForm(old => ({ ...old, illustration }));
    } catch (error) { alert(error.message || "Não foi possível preparar a imagem."); }
  }
  return <form onSubmit={event => { event.preventDefault(); onCreate(form); }} className="stack-form">
    <label>Nome da campanha<input required maxLength="100" value={form.title} onChange={update("title")} placeholder="[D&D 5e] Mesa para iniciantes"/></label>
    <label>Sistema<select value={form.system} onChange={update("system")}><option value="">Selecione o sistema</option>{SYSTEMS.map(system => <option key={system}>{system}</option>)}</select></label>
    <label>Seu nome como Mestre<input value={form.gmName} onChange={update("gmName")} placeholder="Nome que aparecerá na sala"/></label>
    <label>Status inicial<select value={form.status} onChange={update("status")}><option value="notStarted">Não iniciada</option><option value="active">Em andamento</option><option value="completed">Concluída</option></select></label>
    <details className="campaign-extra"><summary>Detalhes da mesa</summary><div className="campaign-extra-grid">
      <label>Duração<select value={form.duration} onChange={update("duration")}><option>One-shot</option><option>Campanha curta</option><option>Campanha longa</option></select></label>
      <label>Estilo de jogo<input value={form.style} onChange={update("style")} placeholder="Exploração, investigação, combate…"/></label>
      <label>Vagas totais<input type="number" min="1" max="20" value={form.totalSeats} onChange={event => setForm(old => ({ ...old, totalSeats: event.target.value, availableSeats: Math.min(Number(event.target.value) || 1, Number(old.availableSeats) || 0) }))}/></label>
      <label>Vagas disponíveis<input type="number" min="0" max={form.totalSeats} value={form.availableSeats} onChange={update("availableSeats")}/></label>
      <label>Dia habitual<input value={form.usualDay} onChange={update("usualDay")} placeholder="Quintas-feiras"/></label>
      <label>Data da próxima sessão<input type="date" value={form.date} onChange={update("date")}/></label>
      <label>Horário<input type="time" value={form.time} onChange={update("time")}/></label>
      <label>Local ou plataforma<input value={form.location} onChange={update("location")} placeholder="Discord, endereço, VTT…"/></label>
      <label>Classificação indicativa<input value={form.ageRating} onChange={update("ageRating")} placeholder="14+, 18+…"/></label>
      <label>Possíveis gatilhos<input value={form.triggers} onChange={update("triggers")} placeholder="Temas que o grupo deve conhecer"/></label>
      <label>Requisitos para participar<input value={form.requirements} onChange={update("requirements")} placeholder="Experiência, material, microfone…"/></label>
      <label className="full-field">Breve resumo<textarea value={form.summary} onChange={update("summary")} placeholder="Premissa e ponto de partida da campanha."/></label>
      <label className="full-field">Observações<textarea value={form.observations} onChange={update("observations")} placeholder="Informações adicionais para o grupo."/></label>
      <div className="illustration-field full-field">
        <span>Imagem ilustrativa <small>PNG, JPG ou WebP · até 30 MB</small></span>
        <label className={"drop-image " + (dragging ? "dragging" : "")} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); pickImage(event.dataTransfer.files[0]); }}>
          {form.illustration ? <img src={form.illustration} alt="Prévia da campanha"/> : <span>Arraste uma imagem aqui ou <b>escolha um arquivo</b></span>}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => pickImage(event.target.files[0])}/>
        </label>
        {form.illustration && <button type="button" className="text-action danger" onClick={() => setForm(old => ({ ...old, illustration: "" }))}>Remover imagem</button>}
      </div>
    </div></details>
    <button className="button primary" disabled={busy}>{busy ? "Criando sala…" : "Criar sala de Mestre"}</button>
  </form>;
}

export function Home({ inviteId, setInviteId, rooms, onCreate, onJoin, onResume, busy, notice }) {
  const [mode, setMode] = useState(inviteId ? "join" : "create"); const [joinName, setJoinName] = useState(""); const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => { if (inviteId) setMode("join"); }, [inviteId]);
  const statusNames = { completed: "Concluída", active: "Em andamento", notStarted: "Não iniciada" };
  const filteredRooms = rooms.filter(room => (statusFilter === "all" || (room.status || "notStarted") === statusFilter) && (room.title + " " + (room.system || "")).toLowerCase().includes(search.toLowerCase()));
  return <div className="home-screen">
    <header className="home-top"><div className="wordmark">Astralis</div><span className="top-note">LOBBY DE CAMPANHAS</span></header>
    <section className="home-hero"><div className="hero-copy"><small>GESTÃO DE CAMPANHAS · SALA EM TEMPO REAL</small><h1>Campanhas e sessões<br/><em>no mesmo lugar.</em></h1><p>Agende encontros, convide o grupo e mantenha fichas, mapas e materiais juntos.</p></div><div className="hero-stats"><span><b>Agenda</b> encontros do grupo</span><span><b>Fichas</b> uma por jogador</span><span><b>Materiais</b> compartilhados pelo Mestre</span></div></section>
    <div className="home-columns">
      <section className="surface create-panel"><div className="section-eyebrow">SALA DE RPG</div><div className="mode-switch"><button className={mode === "create" ? "selected" : ""} onClick={() => setMode("create")}>Criar campanha</button><button className={mode === "join" ? "selected" : ""} onClick={() => setMode("join")}>Entrar com convite</button></div>
      {mode === "create" ? <CampaignForm onCreate={onCreate} busy={busy}/> : <form onSubmit={event => { event.preventDefault(); onJoin(inviteId.trim(), joinName.trim()); }} className="stack-form">
        <label>Código ou link da sala<input required value={inviteId} onChange={event => setInviteId(event.target.value)} placeholder="Cole o link de convite ou código"/></label>
        <label>Seu nome de jogador<input required maxLength="60" value={joinName} onChange={event => setJoinName(event.target.value)} placeholder="Nome que aparecerá na mesa"/></label>
        <button className="button primary" disabled={busy}>{busy ? "Entrando…" : "Entrar como jogador"}</button>
      </form>}
      {notice && <p className="inline-error">{notice}</p>}
      <p className="fine-print">A chave do Mestre é privada. O convite permite entrada como jogador.</p>
    </section>
    <section className="surface recent-panel"><div className="panel-heading"><div><div className="section-eyebrow">NESTE NAVEGADOR</div><h2>Salas recentes</h2></div><span className="count-badge">{rooms.length}</span></div>
      <div className="room-search"><input aria-label="Buscar campanhas" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por campanha ou sistema"/></div>
      <div className="status-filters"><button className={statusFilter === "all" ? "selected" : ""} onClick={() => setStatusFilter("all")}>Todas <b>{rooms.length}</b></button>{["notStarted", "active", "completed"].map(status => <button key={status} className={"status-filter " + status + (statusFilter === status ? " selected" : "")} onClick={() => setStatusFilter(status)}>{statusNames[status]} <b>{rooms.filter(room => (room.status || "notStarted") === status).length}</b></button>)}</div>
      {filteredRooms.length ? <div className="recent-list">{filteredRooms.map(room => <button key={room.id} className="recent-room" onClick={() => onResume(room)}><span><b>{room.title}</b><small>{room.role === "gm" ? "Mestre" : "Jogador"} · {room.system || "Sistema a definir"} · código {room.id}</small></span><span className={"status-chip " + (room.status || "notStarted")}>{statusNames[room.status || "notStarted"]}</span><i>Entrar →</i></button>)}</div> : <div className="empty-recent"><b>{rooms.length ? "Nenhuma campanha encontrada" : "Sem salas salvas"}</b><span>{rooms.length ? "Ajuste a busca ou o filtro de status." : "Crie uma campanha ou use um convite para entrar."}</span></div>}
      <div className="recent-foot">Chaves de acesso guardadas neste dispositivo.</div>
    </section></div>
    <footer className="home-footer">Astralis <span>·</span> Campanhas, encontros e materiais da sua mesa.</footer>
  </div>;
}

export function Lobby({ room, presence, isGM, inviteUrl, send, identity, currentAvatar }) {
  const [form, setForm] = useState(room.campaign); const [copied, setCopied] = useState(false);
  const statusNames = { completed: "Concluída", active: "Em andamento", notStarted: "Não iniciada" };
  useEffect(() => setForm(room.campaign), [room.campaign]);
  const update = key => event => setForm(old => ({ ...old, [key]: event.target.value }));
  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); }
    catch (_) {
      const input = document.createElement("textarea"); input.value = inviteUrl; input.setAttribute("readonly", ""); input.style.position = "fixed"; input.style.opacity = "0"; document.body.appendChild(input); input.select();
      const copiedToClipboard = document.execCommand("copy"); input.remove(); if (!copiedToClipboard) return;
    }
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }
  const campaign = room.campaign;
  return <div className="view-stack">
    <div className="page-title-row"><div><div className="section-eyebrow">LOBBY DA CAMPANHA</div><h1>{campaign.title}</h1><span className={"status-chip " + (campaign.status || "notStarted")}>{statusNames[campaign.status || "notStarted"]}</span><p>{campaign.system || "Sistema a definir"} <span>·</span> {campaign.sessionCount} sessões realizadas</p></div><span className={"live-pill " + (presence.length ? "live" : "")}><i></i>{presence.length} online</span></div>
    {campaign.illustration && <img className="campaign-banner" src={campaign.illustration} alt={"Imagem de " + campaign.title}/>}
    <div className="summary-grid"><Metric label="Participantes" value={room.players.length + (presence.some(member => member.role === "gm") ? 1 : 0)} detail={room.players.length + " jogadores cadastrados"}/><Metric label="Vagas abertas" value={campaign.availableSeats ?? campaign.totalSeats ?? 0} detail={"de " + (campaign.totalSeats || 0) + " vagas totais"}/><Metric label="Sessões" value={campaign.sessionCount} detail="capítulos registrados"/></div>
    <div className="campaign-facts surface"><Fact label="Duração" value={campaign.duration}/><Fact label="Estilo" value={campaign.style}/><Fact label="Dia habitual" value={campaign.usualDay}/><Fact label="Próxima sessão" value={[campaign.date, campaign.time].filter(Boolean).join(" · ")}/><Fact label="Local" value={campaign.location}/><Fact label="Classificação" value={campaign.ageRating}/><Fact label="Requisitos" value={campaign.requirements}/><Fact label="Gatilhos" value={campaign.triggers}/><Fact label="Resumo" value={campaign.summary}/><Fact label="Observações" value={campaign.observations}/></div>
    <div className="lobby-grid">
      <section className="surface members-panel"><div className="panel-heading"><div><div className="section-eyebrow">PRESENÇA</div><h2>Grupo na sala</h2></div><span className="count-badge">{presence.length}</span></div>
        <div className="member-list">{presence.map(member => <div key={member.id} className="member-row"><span className={"member-avatar " + (member.role === "gm" ? "gm-avatar" : "")}>{currentAvatar && identity?.userId===member.id?<img src={currentAvatar} alt={"Avatar de "+member.name} referrerPolicy="no-referrer"/>:member.name.slice(0, 1).toUpperCase()}</span><span><b>{member.name}</b><small>{member.role === "gm" ? "Mestre" : "Jogador"} · conectado</small></span><i className="presence-dot"></i></div>)}</div>
        {isGM && <div className="invite-box"><small>LINK DE CONVITE</small><div><code>{inviteUrl}</code><button className="button quiet" onClick={copyInvite}>{copied ? "Copiado" : "Copiar"}</button></div></div>}
      </section>
      <div className="lobby-right">
        {isGM && <section className="surface campaign-settings"><div className="section-eyebrow">DADOS DA CAMPANHA</div><form onSubmit={event => { event.preventDefault(); send("campaign:update", form); }} className="compact-form campaign-edit">
          <label>Título<input value={form.title || ""} onChange={update("title")}/></label><label>Sistema<select value={form.system || ""} onChange={update("system")}><option value="">Selecione o sistema</option>{SYSTEMS.map(system => <option key={system}>{system}</option>)}</select></label><label>Nome do Mestre<input value={form.gmName || ""} onChange={update("gmName")}/></label><label>Status<select value={form.status || "notStarted"} onChange={update("status")}><option value="notStarted">Não iniciada</option><option value="active">Em andamento</option><option value="completed">Concluída</option></select></label>
          <details className="edit-more"><summary>Editar os outros dados</summary><div className="campaign-extra-grid">
            <label>Duração<select value={form.duration || ""} onChange={update("duration")}><option>One-shot</option><option>Campanha curta</option><option>Campanha longa</option></select></label><label>Estilo<input value={form.style || ""} onChange={update("style")}/></label>
            <label>Vagas totais<input type="number" min="1" max="20" value={form.totalSeats || 1} onChange={update("totalSeats")}/></label><label>Vagas disponíveis<input type="number" min="0" max={form.totalSeats || 20} value={form.availableSeats ?? 0} onChange={update("availableSeats")}/></label>
            <label>Dia habitual<input value={form.usualDay || ""} onChange={update("usualDay")}/></label><label>Data<input type="date" value={form.date || ""} onChange={update("date")}/></label><label>Horário<input type="time" value={form.time || ""} onChange={update("time")}/></label><label>Local<input value={form.location || ""} onChange={update("location")}/></label>
            <label>Classificação<input value={form.ageRating || ""} onChange={update("ageRating")}/></label><label>Requisitos<input value={form.requirements || ""} onChange={update("requirements")}/></label>
            <label className="full-field">Gatilhos<input value={form.triggers || ""} onChange={update("triggers")}/></label><label className="full-field">Resumo<textarea value={form.summary || ""} onChange={update("summary")}/></label><label className="full-field">Observações<textarea value={form.observations || ""} onChange={update("observations")}/></label>
          </div></details><button className="button secondary">Atualizar campanha</button></form></section>}
        {isGM ? <section className="surface modules-panel"><div className="section-eyebrow">CONTROLE DE VISIBILIDADE</div><h2>Módulos da mesa</h2><p>Desative módulos para removê-los da navegação dos jogadores.</p><div className="module-toggles">{MODULES.map(([key, label]) => <label key={key} className="toggle-row"><span>{label}</span><input type="checkbox" checked={Boolean(room.modules[key])} onChange={event => send("module:set", { key, enabled: event.target.checked })}/></label>)}</div></section> : <section className="surface player-welcome"><div className="section-eyebrow">ACESSO DE JOGADOR</div><h2>Ficha e materiais da mesa</h2><p>Edite sua própria ficha, consulte handouts liberados e acompanhe as atualizações.</p></section>}
      </div>
    </div>
  </div>;
}
function Fact({ label, value }) { return value ? <div className="campaign-fact"><small>{label}</small><span>{value}</span></div> : null; }
function Metric({ label, value, detail }) { return <div className="metric"><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>; }






