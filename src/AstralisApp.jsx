import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import AudioCenter from "./AudioCenter.jsx";
import SystemConsultations from "./SystemConsultations.jsx";
import AccountPanel from "./AccountPanel.jsx";
import { MODULES, Home, Lobby } from "./AppShell.jsx";
import { sha256Hex } from "./SharedTools.jsx";
import { Agenda, CommunityLibrary, Diary, GMDocuments, GMQuickShield, GMShield, Handouts, Lore, Maps, Music, NPCs, PDFWorkshop, Sessions, SystemGuide, Characters, Workbench } from "./CampaignModules.jsx";

const ROOM_LIST = "mesa-dados:rooms";
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE || location.origin;
const api = async (url, options = {}) => {
  const response = await fetch(API_BASE + url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Não foi possível concluir.");
  return body;
};
function savedRooms() { try { return JSON.parse(sessionStorage.getItem(ROOM_LIST) || "[]"); } catch (_) { return []; } }
function saveRoom(meta) {
  const rooms = savedRooms().filter(item => item.id !== meta.id);
  sessionStorage.setItem(ROOM_LIST, JSON.stringify([meta, ...rooms].slice(0, 12)));
}
function parseInvitation(input) {
  const raw=String(input||"").trim();
  let candidate=raw;
  try {const url=new URL(raw);candidate=url.pathname;const direct=url.searchParams.get("room");if(direct)return {roomId:direct,inviteToken:url.searchParams.get("invite")||""};}catch(_){}
  const short=candidate.match(/(?:^|\/)join\/([a-f0-9]{10})-([a-zA-Z0-9_-]{12})\/?$/);
  if(short)return {roomId:short[1],inviteToken:short[2]};
  const legacy=raw.match(/^([a-f0-9]+)(?:&invite=([a-f0-9]+))?$/i);
  return legacy?{roomId:legacy[1],inviteToken:legacy[2]||""}:{roomId:"",inviteToken:""};
}
function savedIdentity(id) { try { return JSON.parse(sessionStorage.getItem("mesa-dados:identity:" + id) || "null"); } catch (_) { return null; } }

export default function AppRoot() {
  const [session, setSession] = useState(null);
  const changeSession = useCallback(next => setSession(next), []);
  return <AccountPanel session={session} onSession={changeSession}>{({user,client,openProfile}) => <App key={user?.id || 'guest'} user={user} accountClient={client} openProfile={openProfile}/>}</AccountPanel>;
}
function App({user, accountClient, openProfile}) {
  const socketRef = useRef(null);
  const [rooms, setRooms] = useState(savedRooms);
  const [activeRoom, setActiveRoom] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [presence, setPresence] = useState([]);
  const [tab, setTab] = useState("lobby");
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [inviteId, setInviteId] = useState(() => location.pathname.startsWith("/join/") ? location.href : new URLSearchParams(location.search).has("invite") ? location.href : new URLSearchParams(location.search).get("room") || "");

  const enter = useCallback((meta, creds) => {
    socketRef.current?.disconnect();
    const connection = io(SOCKET_URL, { path: "/socket.io", auth: { roomId: meta.id, token: creds.token }, transports: ["websocket", "polling"] });
    socketRef.current = connection;
    connection.on("connect", () => setConnected(true));
    connection.on("disconnect", () => setConnected(false));
    connection.on("connect_error", error => { setConnected(false); setNotice(error.message || "Falha ao conectar."); });
    connection.on("room:state", value => { if(value?.music?.serverTime) value.music.clockOffset=Date.now()-value.music.serverTime; setRoomState(value); saveRoom({ ...meta, title: value.campaign.title, system: value.campaign.system, status: value.campaign.status || "notStarted" }); setRooms(savedRooms()); });
    connection.on("presence", setPresence);
    setActiveRoom(meta); setIdentity(creds); setRoomState(null); setTab("lobby");
    history.replaceState({}, "", "?room=" + encodeURIComponent(meta.id));
  }, []);

  useEffect(() => {
    const roomId = new URLSearchParams(location.search).get("room");
    if (!roomId) return;
    const creds = savedIdentity(roomId), meta = savedRooms().find(room => room.id === roomId);
    if (creds && meta) enter(meta, creds);
  }, [enter]);
  useEffect(() => () => socketRef.current?.disconnect(), []);
  useEffect(() => {
    if (!accountClient || !user || !activeRoom?.id) return;
    const channel = accountClient.channel('room_audio_' + activeRoom.id, {config:{private:true}})
      .on('broadcast', {event:'audio_state'}, ({payload}) => {
        if (!payload?.playlist || !Array.isArray(payload.playlist)) return;
        setRoomState(prev => prev ? {...prev, music:{...prev.music, ...payload, clockOffset:Date.now()-payload.serverTime}} : prev);
      }).subscribe();
    return () => {accountClient.removeChannel(channel);};
  }, [activeRoom?.id, accountClient, user?.id]);

  useEffect(() => {
    if (!user || !accountClient) return;
    let cancelled = false;
    const load = async () => {
      const token = (await accountClient.auth.getSession()).data.session?.access_token;
      if (!token) return;
      try {
        const response=await fetch(API_BASE+'/api/account/rooms', {headers:{Authorization:'Bearer '+token}});
        if(!response.ok)return;
        const data=await response.json();
        if(cancelled)return;
        for(const item of data.rooms || []) {sessionStorage.setItem('mesa-dados:identity:'+item.meta.id,JSON.stringify(item.credentials));saveRoom(item.meta);}
        setRooms(savedRooms());
      }catch(error){console.warn('Falha ao recuperar campanhas da conta',error);}
    };
    load();return ()=>{cancelled=true;};
  },[user?.id,accountClient]);
  async function linkRoom(meta, credentials) {
    if(!user || !accountClient)return;
    const session=(await accountClient.auth.getSession()).data.session;
    if(!session)return;
    try{const response=await fetch(API_BASE+'/api/account/link-room',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({roomId:meta.id,roomToken:credentials.token})});if(!response.ok)throw new Error((await response.json()).error);}catch(error){setNotice('Sala aberta, mas não vinculada à conta: '+error.message);}
  }

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); }, [notice]);

  async function createRoom(form) {
    setBusy(true);
    try {
      const result = await api("/api/rooms", { method: "POST", body: JSON.stringify(form) });
      const creds = { roomId: result.room.id, token: result.token, role: "gm", userId: "gm", name: result.name };
      const meta = { ...result.room, role: "gm", name: result.name };
      sessionStorage.setItem("mesa-dados:identity:" + meta.id, JSON.stringify(creds));
      saveRoom(meta); setRooms(savedRooms()); await linkRoom(meta, creds); enter(meta, creds);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function joinRoom(input, name) {
    setBusy(true);
    try {
      const invitation = parseInvitation(input);
      if (!invitation.roomId || !invitation.inviteToken) throw new Error("Cole o link completo enviado pelo Mestre.");
      const result = await api("/api/rooms/" + encodeURIComponent(invitation.roomId) + "/join", { method: "POST", body: JSON.stringify({ name, inviteToken: invitation.inviteToken }) });
      const creds = { roomId: result.room.id, token: result.token, role: "player", userId: result.userId, name: result.name };
      const meta = { ...result.room, role: "player", name: result.name };
      sessionStorage.setItem("mesa-dados:identity:" + meta.id, JSON.stringify(creds));
      saveRoom(meta); setRooms(savedRooms()); await linkRoom(meta, creds); enter(meta, creds);
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }
  async function resume(meta) {
    const creds = savedIdentity(meta.id);
    if (creds) { await linkRoom(meta, creds); enter(meta, creds); }
    else { setInviteId(meta.id); setNotice("Cole o convite completo para entrar novamente."); }
  }
  function leave() {
    socketRef.current?.disconnect(); socketRef.current = null;
    setActiveRoom(null); setIdentity(null); setRoomState(null); setPresence([]); setConnected(false);
    history.replaceState({}, "", location.pathname);
  }
  async function saveNick(event) {
    event.preventDefault();
    const next=nickname.trim(); if(!next)return;
    const response=await send('profile:nickname',{name:next});
    if(response?.ok) {const credentials={...identity,name:next};setIdentity(credentials);sessionStorage.setItem('mesa-dados:identity:'+activeRoom.id,JSON.stringify(credentials));setNicknameEditing(false);linkRoom(activeRoom,credentials);}
  }
  function send(type, payload) {
    const connection = socketRef.current;
    if (!connection?.connected) {
      const result = { ok: false, error: "Reconectando à sala. Tente novamente em instantes." };
      setNotice(result.error);
      return Promise.resolve(result);
    }
    return new Promise(resolve => connection.emit("room:action", { type, payload }, result => {
      if (!result?.ok) setNotice(result?.error || "Não foi possível salvar.");
      resolve(result || { ok: false, error: "Não foi possível confirmar o salvamento." });
    }));
  }
  async function uploadFile(file, options = {}) {
    if (!activeRoom || !identity) throw new Error("Entre na sala antes de enviar arquivos.");
    if (file.size > 30 * 1024 * 1024 || (file.type.startsWith("image/") && file.size > 30 * 1024 * 1024)) throw new Error("Imagens até 30 MB; PDFs e áudio até 30 MB.");
    const uploadSpec = { fileName: file.name, mime: file.type || "application/octet-stream", size: file.size, lastModified: file.lastModified, scope: options.scope || "public", kind: options.kind || "file" };
    const endpoint = "/api/rooms/" + encodeURIComponent(activeRoom.id) + "/uploads/start";
    let uploadStart = await api(endpoint, { method: "POST", headers: { "x-room-token": identity.token }, body: JSON.stringify(uploadSpec) });
    const chunkSize = uploadStart.chunkSize || 5 * 1024 * 1024, totalChunks = uploadStart.chunkCount || Math.ceil(file.size / chunkSize);
    for (let index = 0; index < (uploadStart.nextIndex || 0); index += 1) {
      const previousChunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize));
      if (await sha256Hex(previousChunk) !== uploadStart.receivedChunks?.[index]?.sha256) {
        uploadStart = await api(endpoint, { method: "POST", headers: { "x-room-token": identity.token }, body: JSON.stringify({ ...uploadSpec, restart: true }) });
        break;
      }
    }
    const uploadUrl = "/api/rooms/" + encodeURIComponent(activeRoom.id) + "/uploads/" + encodeURIComponent(uploadStart.uploadId);
    for (let index = uploadStart.nextIndex || 0; index < totalChunks; index += 1) {
      const chunk = file.slice(index * chunkSize, Math.min(file.size, (index + 1) * chunkSize)), hash = await sha256Hex(chunk);
      let response, saved;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = undefined;
        try {
          response = await fetch(API_BASE + uploadUrl + "/chunks/" + index, { method: "PUT", headers: { "Content-Type": "application/octet-stream", "x-room-token": identity.token, "x-chunk-sha256": hash }, body: chunk });
          saved = await response.json().catch(() => ({}));
          if (response.ok) break;
          if (response.status < 500 && response.status !== 429) throw new Error(saved.error || "Não foi possível enviar o bloco.");
        } catch (error) {
          if (response && response.status < 500 && response.status !== 429) throw error;
          if (attempt === 2) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
      }
      if (!response?.ok) throw new Error(saved?.error || "Falha ao enviar o bloco " + (index + 1) + ".");
      const percent = Math.round(((index + 1) / totalChunks) * 100);
      setNotice("Enviando " + file.name + " · " + percent + "%"); options.onProgress?.(percent);
    }
    setNotice("Finalizando envio e salvando no armazenamento…");
    const response = await fetch(API_BASE + uploadUrl + "/complete", { method: "POST", headers: { "Content-Type": "application/json", "x-room-token": identity.token }, body: "{}" });
    const saved = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(saved.error || "Não foi possível finalizar o arquivo.");
    options.onProgress?.(100); setNotice("Upload concluído: " + file.name);
    return { ...saved, url: saved.url && saved.url.startsWith("/") ? API_BASE + saved.url : saved.url };
  }  async function getSignedUrl(file) {
    if (!activeRoom || !identity) throw new Error("Entre na sala para abrir o arquivo.");
    const result = await api("/api/rooms/" + encodeURIComponent(activeRoom.id) + "/files/signed-url", {
      method: "POST", headers: { "x-room-token": identity.token }, body: JSON.stringify({ bucket: file.bucket, path: file.path })
    });
    return result.url && result.url.startsWith("/") ? API_BASE + result.url : result.url;
  }

  if (!activeRoom || !identity) return <><Home inviteId={inviteId} setInviteId={setInviteId} rooms={rooms} onCreate={createRoom} onJoin={joinRoom} onResume={resume} busy={busy} notice={notice}/>{accountClient && <button className="floating-profile button secondary" onClick={openProfile}>Meu perfil</button>}</>;
  if (!roomState) return <div className="loading-screen"><div className="wordmark">Mesa <span>&</span> Dados</div><p>Conectando à sala…</p></div>;

  const isGM = identity.role === "gm";
  const tabs = [["lobby", "Sala"], ["workbench", "Painel"]].concat(isGM ? [["gmShield", "Escudo do Mestre"]] : []).concat(MODULES.filter(([key]) => key === "gmDocs" ? isGM : isGM || roomState.modules[key]).map(([key, label]) => [key, label]));
  const inviteUrl = roomState.inviteCode ? `${location.origin}/join/${activeRoom.id}-${roomState.inviteCode}` : location.origin + "/?room=" + encodeURIComponent(activeRoom.id) + "&invite=" + encodeURIComponent(activeRoom.inviteToken || "");
  return <div className="app-shell">
    <aside className="rail"><div className="wordmark">M<span>&</span>D</div><div className="rail-campaign"><small>MESA ATUAL</small><strong>{roomState.campaign.title}</strong><span>{roomState.campaign.system || "Sistema a definir"}</span></div>
      <nav className="room-nav">{tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className="rail-bottom"><span className={"connection " + (connected ? "online" : "")}></span>{connected ? "Conectado" : "Reconectando"}<button onClick={leave}>Sair da sala</button></div>
    </aside>
    <main className="main-area"><header className="topline"><div><span className="crumb">Mesa & Dados</span><span className="slash">/</span><strong>{tabs.find(item => item[0] === tab)?.[1] || "Sala"}</strong></div><div className="user-chip"><span className="role-tag">{isGM ? "MESTRE" : "JOGADOR"}</span><span>{identity.name}</span><button className="text-action" onClick={()=>{setNickname(identity.name);setNicknameEditing(v=>!v);}}>Editar nick</button>{accountClient && <button className="text-action" onClick={openProfile}>Meu perfil</button>}</div></header>
      {nicknameEditing && <form className="nickname-form" onSubmit={saveNick}><input aria-label="Apelido nesta mesa" maxLength="60" value={nickname} onChange={e=>setNickname(e.target.value)} autoFocus/><button className="button secondary">Salvar apelido</button><button className="button quiet" type="button" onClick={()=>setNicknameEditing(false)}>Cancelar</button></form>}
      <div className="page-body">
        {tab === "lobby" && <Lobby room={roomState} presence={presence} isGM={isGM} inviteUrl={inviteUrl} send={send}/>}
        {tab === "workbench" && <Workbench room={roomState} presence={presence} isGM={isGM} onOpen={setTab}/>}
        {tab === "gmShield" && isGM && <GMShield system={roomState.campaign.system} value={roomState.gmShield?.notes || ""} tracker={roomState.gmShield?.tracker} send={send}/>}
        {tab === "agenda" && <Agenda items={roomState.appointments || []} isGM={isGM} send={send}/>}
        {tab === "system" && <SystemConsultations value={roomState.systemGuide} isGM={isGM} send={send}/>}
        {tab === "characters" && <Characters room={roomState} identity={identity} system={roomState.campaign.system} isGM={isGM} send={send} upload={uploadFile}/>}
        {tab === "lore" && <Lore value={roomState.lore.text} isGM={isGM} send={send}/>}
        {tab === "npcs" && <NPCs items={roomState.npcs} isGM={isGM} send={send} upload={uploadFile}/>}
        {tab === "handouts" && <Handouts items={roomState.handouts} isGM={isGM} send={send} upload={uploadFile}/>}
        {tab === "maps" && <Maps value={roomState.map} room={roomState} identity={identity} isGM={isGM} send={send} upload={uploadFile}/>}
        <AudioCenter value={roomState.music} isGM={isGM} send={send} upload={uploadFile} visible={tab === "music"}/>
        {tab === "diary" && <Diary value={roomState.notes} journal={roomState.journal || []} identity={identity} isGM={isGM} send={send}/>}
        {tab === "sessions" && <Sessions items={roomState.sessions} count={roomState.campaign.sessionCount} isGM={isGM} send={send}/>}
        {tab === "gmDocs" && isGM && <GMDocuments items={roomState.gmDocs || []} upload={uploadFile} getSignedUrl={getSignedUrl} send={send}/>}
        {tab === "pdfs" && <PDFWorkshop items={roomState.pdfs || []} room={roomState} identity={identity} isGM={isGM} system={roomState.campaign.system} upload={uploadFile} getSignedUrl={getSignedUrl} send={send}/>}
        {tab === "library" && <CommunityLibrary room={roomState} identity={identity} items={[]} upload={uploadFile}/>}
      </div>
    </main>
    {isGM && tab!=="gmShield" && <GMQuickShield system={roomState.campaign.system}/>}
    {notice && <div className="toast">{notice}</div>}
  </div>;
}
