import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 4100 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astralis-roles-'));
let server;

const json = (url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const createRoom = async () => (await json('/api/rooms', { title: 'Mesa', system: 'D&D 5E', gmName: 'Mestre', totalSeats: 5 })).json();
const join = async (roomId, inviteToken, name) => { const r = await json(`/api/rooms/${roomId}/join`, { name, inviteToken }); return { status: r.status, body: await r.json() }; };
function connect(roomId, token) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { auth: { roomId, token }, transports: ['websocket'], forceNew: true });
    socket.firstState = new Promise(r => socket.once('room:state', r));
    socket.once('connect', () => resolve(socket)); socket.once('connect_error', reject);
  });
}
const emit = (socket, event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));
const act = (socket, type, payload) => emit(socket, 'room:action', { type, payload });

before(async () => {
  const env = { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'test' };
  for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete env[key];
  server = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env, stdio: 'ignore' });
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/api/health')).ok) return; } catch { /* iniciando */ } await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Servidor de teste não iniciou.');
});
after(async () => {
  if (server && server.exitCode === null) { const exited = new Promise(r => server.once('exit', r)); server.kill(); await exited; }
  try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* o SO limpa */ }
});

test('R-P2: link legado de convite ainda entra', async () => {
  const gm = await createRoom();
  const r = await join(gm.room.id, gm.room.inviteToken, 'Legado');
  assert.equal(r.status, 200);
  assert.equal(r.body.role, 'player');
});

test('R2: convite com validade, limite e revogação', async () => {
  const gm = await createRoom();
  const gmSocket = await connect(gm.room.id, gm.token);
  await gmSocket.firstState;
  try {
    assert.equal((await act(gmSocket, 'invite:create', { role: 'player', ttlDays: 7, maxUses: 1 })).ok, true);
    const state = await connect(gm.room.id, gm.token).then(async s => { const st = await s.firstState; s.disconnect(); return st; });
    const token = state.invites[0].token;
    assert.equal((await join(gm.room.id, token, 'A')).status, 200);
    assert.equal((await join(gm.room.id, token, 'B')).status, 403); // limite de 1 uso
    assert.equal((await act(gmSocket, 'invite:create', { role: 'spectator', ttlDays: 0, maxUses: 0 })).ok, true);
    const fresh = await connect(gm.room.id, gm.token).then(async s => { const st = await s.firstState; s.disconnect(); return st; });
    const specToken = fresh.invites.find(i => i.role === 'spectator').token;
    const spec = await join(gm.room.id, specToken, 'Olho');
    assert.equal(spec.body.role, 'spectator');
    await act(gmSocket, 'invite:revoke', { token: specToken });
    assert.equal((await join(gm.room.id, specToken, 'Tarde')).status, 403);
  } finally { gmSocket.disconnect(); }
});

test('R1: espectador só lê; co-mestre gere a mesa mas não troca papéis', async () => {
  const gm = await createRoom();
  const gmSocket = await connect(gm.room.id, gm.token); await gmSocket.firstState;
  try {
    await act(gmSocket, 'invite:create', { role: 'spectator' });
    await act(gmSocket, 'invite:create', { role: 'coGm' });
    const invites = await connect(gm.room.id, gm.token).then(async s => { const st = await s.firstState; s.disconnect(); return st.invites; });
    const specToken = invites.find(i => i.role === 'spectator').token, coToken = invites.find(i => i.role === 'coGm').token;
    const spec = (await join(gm.room.id, specToken, 'Espec')).body;
    const co = (await join(gm.room.id, coToken, 'CoMestre')).body;
    const specSocket = await connect(gm.room.id, spec.token); await specSocket.firstState;
    const coSocket = await connect(gm.room.id, co.token); await coSocket.firstState;
    try {
      assert.equal((await act(specSocket, 'lore:update', { value: 'hack' })).ok, false);
      assert.equal((await act(specSocket, 'character:save', { character: { name: 'x' } })).ok, false);
      assert.equal((await act(coSocket, 'lore:update', { value: 'história do co-mestre' })).ok, true);
      assert.equal((await act(coSocket, 'member:role', { id: spec.userId, role: 'player' })).ok, false);
      assert.equal((await act(gmSocket, 'member:role', { id: spec.userId, role: 'player' })).ok, true);
    } finally { specSocket.disconnect(); coSocket.disconnect(); }
  } finally { gmSocket.disconnect(); }
});

test('R3: remover participante desconecta, libera vaga e mantém a ficha', async () => {
  const gm = await createRoom();
  const gmSocket = await connect(gm.room.id, gm.token); await gmSocket.firstState;
  try {
    const player = (await join(gm.room.id, gm.room.inviteToken, 'Vai')).body;
    const playerSocket = await connect(gm.room.id, player.token); await playerSocket.firstState;
    await act(playerSocket, 'character:save', { character: { name: 'Herói' } });
    const gone = new Promise(r => playerSocket.once('disconnect', r));
    await act(gmSocket, 'member:remove', { id: player.userId });
    await gone;
    assert.equal(playerSocket.connected, false);
    const after = await connect(gm.room.id, gm.token).then(async s => { const st = await s.firstState; s.disconnect(); return st; });
    assert.equal(after.players.some(p => p.id === player.userId), false);
    assert.equal(after.campaign.availableSeats, 5);
  } finally { gmSocket.disconnect(); }
});
