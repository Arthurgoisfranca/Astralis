const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const http = require("node:http");
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const { createClient } = require("@supabase/supabase-js");
const { Server } = require("socket.io");

const port = Number(process.env.PORT || 3001);
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const cloud = Boolean(supabaseUrl && supabaseSecret);
const supabase = cloud ? createClient(supabaseUrl, supabaseSecret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
const buckets = { public: process.env.SUPABASE_PUBLIC_BUCKET || "mesa-assets", private: process.env.SUPABASE_PRIVATE_BUCKET || "mesa-private", community: process.env.SUPABASE_COMMUNITY_BUCKET || "mesa-community" };
let db = null, insertRoom, getRoom, updateRoom;
if (!cloud) {
  db = new Database(path.join(dataDir, "mesa.sqlite"));
  db.pragma("journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, gm_token TEXT NOT NULL, invite_token TEXT NOT NULL DEFAULT '', state TEXT NOT NULL, created_at INTEGER NOT NULL)");
  try { db.exec("ALTER TABLE rooms ADD COLUMN invite_token TEXT NOT NULL DEFAULT ''"); } catch (_) {}
  db.exec("CREATE TABLE IF NOT EXISTS community_files (id TEXT PRIMARY KEY, title TEXT NOT NULL, system TEXT NOT NULL, uploader TEXT NOT NULL, bucket TEXT NOT NULL, file_path TEXT NOT NULL, file_name TEXT NOT NULL, created_at INTEGER NOT NULL)");
  const legacy = db.prepare("SELECT id FROM rooms WHERE invite_token = ''").all();
  const setInvite = db.prepare("UPDATE rooms SET invite_token = ? WHERE id = ?");
  for (const row of legacy) setInvite.run(crypto.randomBytes(24).toString("hex"), row.id);
  insertRoom = db.prepare("INSERT INTO rooms (id, gm_token, invite_token, state, created_at) VALUES (?, ?, ?, ?, ?)");
  getRoom = db.prepare("SELECT id, gm_token, invite_token, state, created_at FROM rooms WHERE id = ?");
  updateRoom = db.prepare("UPDATE rooms SET state = ? WHERE id = ?");
}
const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(origin => origin.trim()).filter(Boolean); const corsOptions = { origin: (origin, callback) => callback(null, !origin || !allowedOrigins.length || allowedOrigins.includes(origin)), credentials: true }; app.use(cors(corsOptions));
app.use(express.json({ limit: "35mb" }));
const server = http.createServer(app);
const actionQueues = new Map();
const io = new Server(server, { maxHttpBufferSize: 35 * 1024 * 1024, cors: corsOptions });

function id(bytes = 10) { return crypto.randomBytes(bytes).toString("hex"); }
function text(value, max = 5000) { return String(value ?? "").trim().slice(0, max); }
function imageData(value, max = 2_000_000) { const data = text(value, max); return /^data:image\/(png|jpeg|webp);base64,/.test(data) ? data : ""; }
function safeImageUrl(value) { const url = text(value, 1200); return /^https:\/\/[^\s]+$/i.test(url) || /^\/files\/[a-z0-9_-]+\/(?:[a-f0-9_-]+\/)*[a-f0-9_-]+\.[a-z0-9]+$/i.test(url) ? url : ""; }
async function readRoom(roomId) {
  if (supabase) {
    const { data, error } = await supabase.from("rooms").select("id,gm_token,invite_token,state,created_at").eq("id", roomId).maybeSingle();
    if (error) throw error;
    return data ? { id: data.id, gmToken: data.gm_token, inviteToken: data.invite_token, createdAt: data.created_at, state: normalizeState(data.state) } : null;
  }
  const row = getRoom.get(roomId);
  return row ? { id: row.id, gmToken: row.gm_token, inviteToken: row.invite_token, createdAt: row.created_at, state: normalizeState(JSON.parse(row.state)) } : null;
}
async function insertNewRoom(room) {
  if (supabase) {
    const { error } = await supabase.from("rooms").insert({ id: room.id, gm_token: room.gmToken, invite_token: room.inviteToken, state: room.state, created_at: new Date(room.createdAt).toISOString() });
    if (error) throw error;
  } else insertRoom.run(room.id, room.gmToken, room.inviteToken, JSON.stringify(room.state), room.createdAt);
}
async function saveRoom(room) {
  if (supabase) {
    const { error } = await supabase.from("rooms").update({ state: room.state }).eq("id", room.id);
    if (error) throw error;
  } else updateRoom.run(JSON.stringify(room.state), room.id);
}
function createState(input) {
  const campaign = {
    title: text(input.title, 100), system: text(input.system, 80), gmName: text(input.gmName, 80) || "Mestre",
    status: ["completed", "active", "notStarted"].includes(input.status) ? input.status : "notStarted",
    duration: text(input.duration, 40), style: text(input.style, 120), totalSeats: Math.min(20, Math.max(1, Number(input.totalSeats) || 6)),
    availableSeats: Math.min(20, Math.max(0, input.availableSeats !== undefined ? Number(input.availableSeats) || 0 : Number(input.totalSeats) || 6)),
    usualDay: text(input.usualDay, 40), date: text(input.date, 20), time: text(input.time, 20), location: text(input.location, 160),
    ageRating: text(input.ageRating, 30), triggers: text(input.triggers, 2000), requirements: text(input.requirements, 2000),
    summary: text(input.summary, 5000), observations: text(input.observations, 3000), illustration: imageData(input.illustration, 1_700_000), sessionCount: 0
  };
  return {
    campaign,
    modules: { agenda: true, system: true, characters: true, lore: true, npcs: true, handouts: true, maps: true, music: true, diary: true, sessions: true, gmDocs: true, pdfs: true, library: true },
    players: [], appointments: campaign.date ? [{ id: id(6), title: "Sessão 1", date: campaign.date, time: campaign.time, location: campaign.location, notes: "" }] : [],
    systemGuide: { text: "" }, gmShield: { notes: "" }, lore: { text: "" }, npcs: [], handouts: [], gmDocs: [], pdfs: [],
    map: { image: "", name: "", visible: false, tokens: [], measurements: [], gridFeet: 5 },
    music: { playlist: [], currentId: "", playing: false, position: 0, startedAt: 0, volume: 0.65 },
    notes: { shared: "", private: {} }, journal: [], sessions: []
  };
}
function normalizeState(input) {
  const state = input && typeof input === "object" ? input : {}, campaign = state.campaign || {};
  const base = createState({ title: campaign.title, system: campaign.system, gmName: campaign.gmName, totalSeats: campaign.totalSeats, availableSeats: campaign.availableSeats });
  return {
    ...base, ...state, campaign: { ...base.campaign, ...campaign }, modules: { ...base.modules, ...(state.modules || {}) },
    players: Array.isArray(state.players) ? state.players : [], appointments: Array.isArray(state.appointments) ? state.appointments : [],
    systemGuide: state.systemGuide || { text: "" }, gmShield: { ...(base.gmShield || { notes: "" }), ...(state.gmShield || {}) }, lore: state.lore || { text: "" }, npcs: Array.isArray(state.npcs) ? state.npcs : [],
    handouts: Array.isArray(state.handouts) ? state.handouts : [], gmDocs: Array.isArray(state.gmDocs) ? state.gmDocs : [],
    pdfs: Array.isArray(state.pdfs) ? state.pdfs : [], journal: Array.isArray(state.journal) ? state.journal : [],
    map: { ...base.map, ...(state.map || {}), tokens: Array.isArray(state.map?.tokens) ? state.map.tokens : [], measurements: Array.isArray(state.map?.measurements) ? state.map.measurements : [] },
    music: { ...base.music, ...(state.music || {}) }, notes: { ...base.notes, ...(state.notes || {}), private: { ...(state.notes?.private || {}) } },
    sessions: Array.isArray(state.sessions) ? state.sessions : []
  };
}
function identify(room, token) {
  if (token && token === room.gmToken) return { role: "gm", userId: "gm", name: room.state.campaign.gmName || "Mestre" };
  const player = room.state.players.find(item => item.token === token);
  return player ? { role: "player", userId: player.id, name: player.name } : null;
}
function publicState(room, socketData) {
  const isGM = socketData.role === "gm", state = room.state;
  const players = state.players.map(({ token, ...player }) => ({ ...player }));
  const ownPrivate = isGM ? (state.notes.private.gm || "") : (state.notes.private[socketData.userId] || "");
  return {
    id: room.id, campaign: state.campaign, modules: state.modules,
    players: isGM || state.modules.characters ? players : players.filter(player => player.id === socketData.userId),
    systemGuide: isGM || state.modules.system ? state.systemGuide : { text: "" }, gmShield: isGM ? state.gmShield : { notes: "" },
    lore: isGM || state.modules.lore ? state.lore : { text: "" },
    npcs: isGM ? state.npcs : state.modules.npcs ? state.npcs.filter(npc => npc.public) : [],
    handouts: isGM ? state.handouts : state.modules.handouts ? state.handouts.filter(item => item.revealed) : [],
    map: isGM || (state.modules.maps && state.map.visible) ? state.map : { image: "", name: "", visible: false, tokens: [], measurements: [], gridFeet: state.map.gridFeet },
    music: isGM || state.modules.music ? state.music : { playlist: [], currentId: "", playing: false, position: 0, startedAt: 0, volume: 0.65 },
    notes: isGM || state.modules.diary ? { shared: state.notes.shared, private: ownPrivate } : { shared: "", private: "" },
    journal: isGM ? state.journal : state.modules.diary ? state.journal.filter(item => item.visibility === "public" || item.authorId === socketData.userId) : [],
    gmDocs: isGM && state.modules.gmDocs ? state.gmDocs : [],
    pdfs: isGM ? state.pdfs : state.modules.pdfs ? state.pdfs.filter(item => item.ownerId === socketData.userId) : [],
    sessions: isGM || state.modules.sessions ? state.sessions : [],
    appointments: isGM || state.modules.agenda ? state.appointments : [],
    role: socketData.role, userId: socketData.userId, name: socketData.name
  };
}
async function roomPresence(roomId) {
  const sockets = await io.in(roomId).fetchSockets();
  io.to(roomId).emit("presence", sockets.map(socket => ({ id: socket.data.userId, name: socket.data.name, role: socket.data.role })));
}
async function broadcastRoom(roomId) {
  const room = await readRoom(roomId);
  if (!room) return;
  const sockets = await io.in(roomId).fetchSockets();
  for (const socket of sockets) socket.emit("room:state", publicState(room, socket.data));
  await roomPresence(roomId);
}
function requireGM(socket) { if (socket.data.role !== "gm") throw new Error("Essa ação é exclusiva do Mestre."); }
function moduleKey(value) { return ["agenda", "system", "characters", "lore", "npcs", "handouts", "maps", "music", "diary", "sessions", "gmDocs", "pdfs", "library"].includes(value); }
function cleanCharacter(input) {
  const stats = input.stats && typeof input.stats === "object" ? Object.fromEntries(Object.entries(input.stats).slice(0, 24).map(([key, value]) => [text(key, 40), text(value, 100)])) : {};
  return { name: text(input.name, 80), classLevel: text(input.classLevel, 80), hp: text(input.hp, 20), mp: text(input.mp, 20), ac: text(input.ac, 20), stats, attributes: text(input.attributes, 2000), appearance: text(input.appearance, 2000), inventory: text(input.inventory, 3000), notes: text(input.notes, 3000), token: imageData(input.token, 1_700_000) || safeImageUrl(input.token), pdf: input.pdf && typeof input.pdf === "object" ? { name: text(input.pdf.name, 160), bucket: text(input.pdf.bucket, 60), path: text(input.pdf.path, 500) } : null };
}
function applyAction(room, socket, action) {
  const state = room.state, payload = action && action.payload || {};
  switch (action && action.type) {
    case "campaign:update": {
      requireGM(socket);
      const fields = ["title", "system", "gmName", "duration", "style", "usualDay", "date", "time", "location", "ageRating", "triggers", "requirements", "summary", "observations"];
      for (const field of fields) if (payload[field] !== undefined) state.campaign[field] = text(payload[field], field === "summary" ? 5000 : 3000);
      if (["completed", "active", "notStarted"].includes(payload.status)) state.campaign.status = payload.status;
      if (payload.totalSeats !== undefined) state.campaign.totalSeats = Math.min(20, Math.max(1, Number(payload.totalSeats) || 1));
      if (payload.availableSeats !== undefined) state.campaign.availableSeats = Math.min(state.campaign.totalSeats, Math.max(0, Number(payload.availableSeats) || 0));
      if (payload.illustration !== undefined) state.campaign.illustration = imageData(payload.illustration, 1_700_000);
      break;
    }
    case "module:set": requireGM(socket); if (!moduleKey(payload.key)) throw new Error("Módulo inválido."); state.modules[payload.key] = Boolean(payload.enabled); break;
    case "system:update": requireGM(socket); state.systemGuide.text = text(payload.value, 30000); break; case "gm:shield:update": requireGM(socket); state.gmShield.notes = text(payload.value, 30000); break;
    case "lore:update": requireGM(socket); state.lore.text = text(payload.value, 30000); break;
    case "npc:save": {
      requireGM(socket); if (!text(payload.name, 80)) throw new Error("Informe o nome do NPC.");
      const npc = { id: text(payload.id, 50) || id(6), name: text(payload.name, 80), description: text(payload.description, 2000), alignment: text(payload.alignment, 80), tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 12).map(tag => text(tag, 30)) : [], status: ["Vivo", "Morto", "Desconhecido"].includes(payload.status) ? payload.status : "Desconhecido", image: imageData(payload.image, 1_700_000) || safeImageUrl(payload.image), public: Boolean(payload.public) };
      const index = state.npcs.findIndex(item => item.id === npc.id); if (index < 0) state.npcs.unshift(npc); else state.npcs[index] = npc; break;
    }
    case "npc:delete": requireGM(socket); state.npcs = state.npcs.filter(item => item.id !== payload.id); state.map.tokens = state.map.tokens.filter(item => item.sourceId !== payload.id); break;
    case "handout:save": {
      requireGM(socket); if (!text(payload.title, 100)) throw new Error("Informe o título do handout.");
      const item = { id: text(payload.id, 50) || id(6), title: text(payload.title, 100), body: text(payload.body, 4000), tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 12).map(tag => text(tag, 30)) : [], image: imageData(payload.image, 1_700_000) || safeImageUrl(payload.image), revealed: Boolean(payload.revealed), createdAt: Date.now() };
      const index = state.handouts.findIndex(handout => handout.id === item.id); if (index < 0) state.handouts.unshift(item); else state.handouts[index] = { ...state.handouts[index], ...item }; break;
    }
    case "handout:reveal": requireGM(socket); { const item = state.handouts.find(handout => handout.id === payload.id); if (item) item.revealed = Boolean(payload.revealed); } break;
    case "handout:delete": requireGM(socket); state.handouts = state.handouts.filter(item => item.id !== payload.id); break;
    case "map:update": requireGM(socket); state.map = { image: imageData(payload.image, 8_000_000) || safeImageUrl(payload.image), name: text(payload.name, 120), visible: Boolean(payload.visible), tokens: Array.isArray(payload.tokens) ? payload.tokens.slice(0, 80) : state.map.tokens, measurements: Array.isArray(payload.measurements) ? payload.measurements.slice(0, 120) : state.map.measurements, gridFeet: Math.min(20, Math.max(1, Number(payload.gridFeet) || state.map.gridFeet || 5)) }; break;
    case "map:token:add": {
      const character = state.players.find(player => player.id === payload.ownerId);
      if (socket.data.role !== "gm" && (!character || character.id !== socket.data.userId)) throw new Error("Você só pode colocar seu próprio token.");
      const token = { id: text(payload.id, 60) || id(6), sourceId: text(payload.sourceId, 60), ownerId: text(payload.ownerId, 60), name: text(payload.name, 80), image: imageData(payload.image, 1_700_000) || safeImageUrl(payload.image), x: Math.min(100, Math.max(0, Number(payload.x) || 50)), y: Math.min(100, Math.max(0, Number(payload.y) || 50)) };
      state.map.tokens = state.map.tokens.filter(item => item.id !== token.id); state.map.tokens.push(token); break;
    }
    case "map:token:move": {
      const token = state.map.tokens.find(item => item.id === payload.id); if (!token) throw new Error("Token não encontrado.");
      if (socket.data.role !== "gm" && token.ownerId !== socket.data.userId) throw new Error("Você só pode mover seu próprio token.");
      token.x = Math.min(100, Math.max(0, Number(payload.x) || 0)); token.y = Math.min(100, Math.max(0, Number(payload.y) || 0)); break;
    }
    case "map:token:delete": requireGM(socket); state.map.tokens = state.map.tokens.filter(item => item.id !== payload.id); break;
    case "map:measure:add": requireGM(socket); state.map.measurements.unshift({ id: id(6), type: ["line", "circle", "cone", "square"].includes(payload.type) ? payload.type : "line", x1: Number(payload.x1) || 0, y1: Number(payload.y1) || 0, x2: Number(payload.x2) || 0, y2: Number(payload.y2) || 0, unit: payload.unit === "ft" ? "ft" : "m", gridFeet: Math.min(20, Math.max(1, Number(payload.gridFeet) || 5)) }); break;
    case "map:measure:clear": requireGM(socket); state.map.measurements = []; break;
    case "music:playlist": requireGM(socket); state.music.playlist = (Array.isArray(payload.tracks) ? payload.tracks : []).slice(0, 40).map(track => ({ id: text(track.id, 60) || id(5), title: text(track.title, 100), url: text(track.url, 600) })).filter(track => /^https:\/\/\S+$/i.test(track.url)); if (!state.music.playlist.some(track => track.id === state.music.currentId)) { state.music.currentId = state.music.playlist[0] ? state.music.playlist[0].id : ""; state.music.playing = false; state.music.position = 0; } break;
    case "music:control": requireGM(socket); {
      const trackId = text(payload.trackId, 60); if (trackId && !state.music.playlist.some(track => track.id === trackId)) throw new Error("A faixa não está na playlist.");
      state.music.currentId = trackId; state.music.playing = Boolean(payload.playing); state.music.position = Math.max(0, Number(payload.position) || 0); state.music.startedAt = state.music.playing ? Date.now() : 0; state.music.volume = Math.min(1, Math.max(0, Number(payload.volume ?? state.music.volume) || 0)); break;
    }
    case "character:save": {
      const targetId = socket.data.role === "gm" ? text(payload.ownerId, 60) : socket.data.userId, player = state.players.find(item => item.id === targetId);
      if (!player) throw new Error("Jogador não encontrado."); player.character = cleanCharacter(payload.character || {}); break;
    }
    case "notes:save": if (socket.data.role === "gm" && payload.shared !== undefined) state.notes.shared = text(payload.shared, 12000); state.notes.private[socket.data.role === "gm" ? "gm" : socket.data.userId] = text(payload.private, 12000); break;
    case "journal:save": {
      const entry = { id: text(payload.id, 60) || id(6), authorId: socket.data.userId, authorName: socket.data.name, title: text(payload.title, 120), body: text(payload.body, 5000), visibility: payload.visibility === "private" ? "private" : "public", updatedAt: Date.now() };
      if (!entry.title || !entry.body) throw new Error("Preencha o título e a anotação.");
      const index = state.journal.findIndex(item => item.id === entry.id);
      if (index >= 0 && socket.data.role !== "gm" && state.journal[index].authorId !== socket.data.userId) throw new Error("Você só pode editar suas próprias entradas.");
      if (index >= 0) state.journal[index] = { ...state.journal[index], ...entry, authorId: state.journal[index].authorId, authorName: state.journal[index].authorName };
      else state.journal.unshift(entry); break;
    }
    case "journal:delete": { const entry = state.journal.find(item => item.id === payload.id); if (!entry) break; if (socket.data.role !== "gm" && entry.authorId !== socket.data.userId) throw new Error("Você só pode excluir suas próprias entradas."); state.journal = state.journal.filter(item => item.id !== payload.id); break; }
    case "gm-doc:save": requireGM(socket); { const doc = { id: text(payload.id, 60) || id(6), title: text(payload.title, 120), notes: text(payload.notes, 3000), bucket: text(payload.bucket, 60), path: text(payload.path, 500), fileName: text(payload.fileName, 180), updatedAt: Date.now() }; const index = state.gmDocs.findIndex(item => item.id === doc.id); if (index < 0) state.gmDocs.unshift(doc); else state.gmDocs[index] = { ...state.gmDocs[index], ...doc }; } break;
    case "gm-doc:delete": requireGM(socket); state.gmDocs = state.gmDocs.filter(item => item.id !== payload.id); break;
    case "pdf:save": { const pdf = { id: text(payload.id, 60) || id(6), ownerId: socket.data.role === "gm" ? text(payload.ownerId, 60) : socket.data.userId, title: text(payload.title, 120), bucket: text(payload.bucket, 60), path: text(payload.path, 500), fileName: text(payload.fileName, 180), createdAt: Date.now() }; if (socket.data.role !== "gm" && pdf.ownerId !== socket.data.userId) throw new Error("Ficha não pertence a este jogador."); state.pdfs = state.pdfs.filter(item => item.id !== pdf.id); state.pdfs.unshift(pdf); const player = state.players.find(item => item.id === pdf.ownerId); if (player?.character) player.character.pdf = { bucket: pdf.bucket, path: pdf.path, name: pdf.fileName }; break; }
    case "appointment:add": requireGM(socket); { const appointment = { id: id(6), title: text(payload.title, 120), date: text(payload.date, 20), time: text(payload.time, 20), location: text(payload.location, 160), notes: text(payload.notes, 2000) }; if (!appointment.title || !/^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) throw new Error("Informe o título e uma data válida."); state.appointments.unshift(appointment); state.campaign.date = appointment.date; state.campaign.time = appointment.time; state.campaign.location = appointment.location; break; }
    case "appointment:delete": requireGM(socket); { const removed = state.appointments.find(item => item.id === payload.id); state.appointments = state.appointments.filter(item => item.id !== payload.id); if (removed && state.campaign.date === removed.date) { const next = state.appointments[0]; state.campaign.date = next ? next.date : ""; state.campaign.time = next ? next.time : ""; state.campaign.location = next ? next.location : ""; } break; }
    case "session:add": requireGM(socket); { const session = { id: id(6), date: text(payload.date, 30), title: text(payload.title, 120), summary: text(payload.summary, 4000), createdAt: Date.now() }; if (!session.date) throw new Error("Informe a data da sessão."); state.sessions.unshift(session); state.campaign.sessionCount = state.sessions.length; break; }
    default: throw new Error("Ação desconhecida.");
  }
}
function fileIdentity(room, token) { return identify(room, token); }
function fileExt(fileName, mime) { const ext = path.extname(fileName || "").toLowerCase(); if (ext) return ext.slice(0, 10); return mime === "application/pdf" ? ".pdf" : mime === "image/jpeg" ? ".jpg" : mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".docx"; }
function allowedMime(mime) { return ["image/png", "image/jpeg", "image/webp", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mime); }
async function storeFile(room, actor, buffer, fileName, mime, scope) {
  const bucket = buckets[scope] || buckets.public, safeName = id(12) + fileExt(fileName, mime), filePath = room.id + "/" + actor.userId + "/" + safeName;
  if (supabase) {
    const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, { contentType: mime, cacheControl: "3600", upsert: false });
    if (error) throw error;
    if (scope === "private") { const { data, error: signError } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600); if (signError) throw signError; return { bucket, path: filePath, url: data.signedUrl, name: fileName, mime, size: buffer.length }; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { bucket, path: filePath, url: data.publicUrl, name: fileName, mime, size: buffer.length };
  }
  const localPath = path.join(dataDir, "uploads", bucket, ...filePath.split("/"));
  fs.mkdirSync(path.dirname(localPath), { recursive: true }); fs.writeFileSync(localPath, buffer);
  return { bucket, path: filePath, url: "/files/" + bucket + "/" + filePath.split("/").map(encodeURIComponent).join("/"), name: fileName, mime, size: buffer.length };
}
function signedUrl(bucket, filePath) { return supabase ? supabase.storage.from(bucket).createSignedUrl(filePath, 3600).then(({ data, error }) => { if (error) throw error; return data.signedUrl; }) : Promise.resolve("/files/" + bucket + "/" + filePath.split("/").map(encodeURIComponent).join("/")); }
async function listLibrary() {
  if (supabase) { const { data, error } = await supabase.from("community_library").select("id,title,system,uploader,bucket,file_path,file_name,created_at").order("created_at", { ascending: false }).limit(300); if (error) throw error; return data || []; }
  return db.prepare("SELECT id,title,system,uploader,bucket,file_path,file_name,created_at FROM community_files ORDER BY created_at DESC LIMIT 300").all();
}
const libraryShape = row => { const bucket = row.bucket, filePath = row.file_path || row.path; const url = supabase ? supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl : "/files/" + bucket + "/" + filePath.split("/").map(encodeURIComponent).join("/"); return { id: row.id, title: row.title, system: row.system, uploader: row.uploader, bucket, path: filePath, fileName: row.file_name || row.fileName, createdAt: row.created_at || row.createdAt, url }; };
app.get("/api/health", (_req, res) => res.json({ ok: true, storage: cloud ? "supabase" : "local" }));
app.post("/api/rooms", async (req, res) => {
  try {
    const input = req.body || {}, title = text(input.title, 100);
    if (!title) return res.status(400).json({ error: "Informe o nome da campanha." });
    const room = { id: id(5), gmToken: id(24), inviteToken: id(24), createdAt: Date.now(), state: createState({ ...input, title }) };
    const coverMatch = room.state.campaign.illustration.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (coverMatch) { const cover = await storeFile(room, { userId: "gm", role: "gm" }, Buffer.from(coverMatch[2], "base64"), "capa." + (coverMatch[1] === "jpeg" ? "jpg" : coverMatch[1]), "image/" + coverMatch[1], "public"); room.state.campaign.illustration = cover.url; }
    if (room.state.campaign.availableSeats > room.state.campaign.totalSeats) room.state.campaign.availableSeats = room.state.campaign.totalSeats;
    await insertNewRoom(room);
    res.json({ room: { id: room.id, title, inviteToken: room.inviteToken }, token: room.gmToken, role: "gm", name: room.state.campaign.gmName });
  } catch (error) { res.status(500).json({ error: error.message || "Não foi possível criar a campanha." }); }
});
app.post("/api/rooms/:roomId/join", async (req, res) => {
  try {
    const room = await readRoom(req.params.roomId), name = text(req.body && req.body.name, 60), invite = text(req.body && req.body.inviteToken, 100);
    if (!room) return res.status(404).json({ error: "Sala não encontrada." });
    if (!name) return res.status(400).json({ error: "Informe seu nome." });
    if (!invite || invite !== room.inviteToken) return res.status(403).json({ error: "Convite inválido. Use o link enviado pelo Mestre." });
    if (room.state.campaign.availableSeats <= 0) return res.status(403).json({ error: "Não há vagas disponíveis nesta mesa." });
    const player = { id: id(8), token: id(24), name, character: null };
    room.state.players.push(player); room.state.campaign.availableSeats = Math.max(0, room.state.campaign.availableSeats - 1); await saveRoom(room);
    res.json({ room: { id: room.id, title: room.state.campaign.title }, token: player.token, role: "player", userId: player.id, name: player.name });
    await broadcastRoom(room.id);
  } catch (error) { res.status(500).json({ error: error.message || "Não foi possível entrar na sala." }); }
});
app.post("/api/rooms/:roomId/uploads", express.raw({ type: "*/*", limit: "30mb" }), async (req, res) => {
  try {
    const room = await readRoom(req.params.roomId), actor = room && fileIdentity(room, text(req.headers["x-room-token"], 100));
    if (!room || !actor) return res.status(401).json({ error: "Acesso à sala inválido." });
    const scope = ["public", "private", "community"].includes(req.query.scope) ? req.query.scope : "public";
    if (scope === "private" && actor.role !== "gm" && req.query.kind !== "character") return res.status(403).json({ error: "Documentos privados são exclusivos do Mestre." });
    if (scope === "public" && actor.role !== "gm" && req.query.kind !== "character") return res.status(403).json({ error: "Apenas o Mestre pode enviar materiais da campanha." });
    const mime = text(req.headers["content-type"], 160).split(";")[0], fileName = decodeURIComponent(text(req.headers["x-file-name"], 220) || "arquivo");
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!allowedMime(mime)) return res.status(415).json({ error: "Formato não suportado. Use PNG, JPG, WebP, PDF ou DOCX." });
    if (!buffer.length || buffer.length > 25 * 1024 * 1024) return res.status(413).json({ error: "O arquivo deve ter até 25 MB." });
    const saved = await storeFile(room, actor, buffer, fileName, mime, scope);
    res.json(saved);
  } catch (error) { res.status(500).json({ error: error.message || "Não foi possível enviar o arquivo." }); }
});
app.post("/api/rooms/:roomId/files/signed-url", async (req, res) => {
  try {
    const room = await readRoom(req.params.roomId), actor = room && fileIdentity(room, text(req.headers["x-room-token"], 100));
    if (!room || !actor) return res.status(401).json({ error: "Acesso à sala inválido." });
    const bucket = text(req.body && req.body.bucket, 80), filePath = text(req.body && req.body.path, 600);
    if (bucket === buckets.private && actor.role !== "gm" && filePath.split("/")[1] !== actor.userId) return res.status(403).json({ error: "Acesso restrito ao Mestre ou dono da ficha." });
    if (!filePath.startsWith(room.id + "/")) return res.status(400).json({ error: "Arquivo inválido." });
    const url = supabase ? await signedUrl(bucket, filePath) : bucket === buckets.private ? "/api/rooms/" + room.id + "/private-file?path=" + encodeURIComponent(filePath) + "&token=" + encodeURIComponent(text(req.headers["x-room-token"], 100)) : "/files/" + bucket + "/" + filePath.split("/").map(encodeURIComponent).join("/");
    res.json({ url });
  } catch (error) { res.status(500).json({ error: error.message || "Não foi possível abrir o arquivo." }); }
});
app.get("/api/library", async (_req, res) => { try { res.json({ items: (await listLibrary()).map(libraryShape) }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post("/api/rooms/:roomId/library", async (req, res) => {
  try {
    const room = await readRoom(req.params.roomId), actor = room && fileIdentity(room, text(req.headers["x-room-token"], 100));
    if (!room || !actor) return res.status(401).json({ error: "Acesso à sala inválido." });
    const saved = req.body || {};
    if (saved.bucket !== buckets.community || !text(saved.path, 600) || !saved.path.startsWith(room.id + "/" + actor.userId + "/") || !text(saved.fileName, 180).toLowerCase().endsWith(".pdf") || !text(saved.title, 120)) return res.status(400).json({ error: "Envie um PDF e informe título e sistema." });
    const item = { id: id(8), title: text(saved.title, 120), system: text(saved.system, 80), uploader: actor.name, bucket: buckets.community, file_path: text(saved.path, 600), file_name: text(saved.fileName, 180), created_at: new Date().toISOString() };
    if (supabase) { const { error } = await supabase.from("community_library").insert(item); if (error) throw error; }
    else db.prepare("INSERT INTO community_files (id,title,system,uploader,bucket,file_path,file_name,created_at) VALUES (?,?,?,?,?,?,?,?)").run(item.id, item.title, item.system, item.uploader, item.bucket, item.file_path, item.file_name, Date.now());
    res.json({ item: libraryShape(item) });
  } catch (error) { res.status(500).json({ error: error.message || "Não foi possível publicar o PDF." }); }
});
app.get("/api/rooms/:roomId/private-file", async (req, res) => {
  try {
    const room = await readRoom(req.params.roomId), actor = room && fileIdentity(room, text(req.query.token, 100));
    const filePath = text(req.query.path, 600), ownerId = filePath.split("/")[1];
    if (!room || !actor || (actor.role !== "gm" && actor.userId !== ownerId) || !filePath.startsWith(room.id + "/")) return res.status(403).end();
    if (supabase) {
      const url = await signedUrl(buckets.private, filePath);
      return res.redirect(url);
    }
    const root = path.resolve(dataDir, "uploads", buckets.private), absolute = path.resolve(root, ...filePath.split("/"));
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) return res.status(404).end();
    res.sendFile(absolute);
  } catch (_) { res.status(404).end(); }
});
app.use("/files/" + buckets.public, express.static(path.join(dataDir, "uploads", buckets.public)));
app.use("/files/" + buckets.community, express.static(path.join(dataDir, "uploads", buckets.community)));
app.use(express.static(path.join(__dirname, "dist")));
app.use((req, res, next) => { if (req.path.startsWith("/api/")) return next(); res.sendFile(path.join(__dirname, "dist", "index.html")); });

io.use(async (socket, next) => {
  try {
    const room = await readRoom(text(socket.handshake.auth && socket.handshake.auth.roomId, 30)), actor = room && identify(room, text(socket.handshake.auth && socket.handshake.auth.token, 100));
    if (!room) return next(new Error("Sala não encontrada."));
    if (!actor) return next(new Error("Convite inválido ou expirado."));
    socket.data = { roomId: room.id, ...actor }; next();
  } catch (error) { next(error); }
});
io.on("connection", socket => {
  const roomId = socket.data.roomId; socket.join(roomId);
  readRoom(roomId).then(room => { if (room) socket.emit("room:state", publicState(room, socket.data)); return roomPresence(roomId); }).catch(error => console.error("Não foi possível carregar sala:", error.message));
  socket.on("room:action", (action, callback) => {
    const ack = typeof callback === "function" ? callback : () => {};
    const previous = actionQueues.get(roomId) || Promise.resolve();
    const pending = previous.catch(() => {}).then(async () => {
      try { const latest = await readRoom(roomId); if (!latest) throw new Error("Sala encerrada."); applyAction(latest, socket, action); await saveRoom(latest); await broadcastRoom(roomId); ack({ ok: true }); }
      catch (error) { ack({ ok: false, error: error.message || "Não foi possível salvar." }); }
    });
    actionQueues.set(roomId, pending);
    pending.finally(() => { if (actionQueues.get(roomId) === pending) actionQueues.delete(roomId); });
  });
  socket.on("disconnect", () => roomPresence(roomId).catch(() => {}));
});
server.listen(port, "0.0.0.0", () => console.log("Mesa & Dados disponível na porta " + port + (cloud ? " (Supabase)" : " (modo local)")));


