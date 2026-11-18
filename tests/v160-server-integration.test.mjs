import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = 3900 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astralis-test-'));
let server;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const PDF = Buffer.from('%PDF-1.4\n% teste\n');
const json = (url, body, headers = {}) => fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
const upload = (roomId, token, scope, mime, buffer, name = 'arquivo') => fetch(`${base}/api/rooms/${roomId}/uploads?scope=${scope}`, { method: 'POST', headers: { 'Content-Type': mime, 'x-room-token': token, 'x-file-name': encodeURIComponent(name) }, body: buffer });
async function createRoom(seats = 4, system = 'Triangle Agency') {
  const response = await json('/api/rooms', { title: 'Mesa de teste', system, gmName: 'Mestre', totalSeats: seats });
  return response.json();
}
async function join(roomId, inviteToken, name) { const r = await json(`/api/rooms/${roomId}/join`, { name, inviteToken }); return { status: r.status, body: await r.json() }; }
function connect(roomId, token) {
  return new Promise((resolve, reject) => {
    const socket = io(base, { auth: { roomId, token }, transports: ['websocket'], forceNew: true });
    // Captura o primeiro estado desde já: ele pode chegar no mesmo pacote do "connect".
    socket.firstState = new Promise(resolveState => socket.once('room:state', resolveState));
    socket.once('connect', () => resolve(socket)); socket.once('connect_error', reject);
  });
}
const emit = (socket, event, payload) => new Promise(resolve => socket.emit(event, payload, resolve));

before(async () => {
  const env = { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'test' };
  for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete env[key];
  server = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env, stdio: 'ignore' });
  for (let i = 0; i < 100; i += 1) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch (_) { /* iniciando */ }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Servidor de teste não iniciou.');
});
after(async () => {
  if (server && server.exitCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited; }
  try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (_) { /* pasta temporária; o SO limpa depois */ }
});

test('A1: jogador não lê arquivo privado do Mestre por travessia de caminho', async () => {
  const gm = await createRoom();
  const savedGm = await (await upload(gm.room.id, gm.token, 'private', 'application/pdf', PDF, 'segredo.pdf')).json();
  assert.ok(savedGm.path.startsWith(gm.room.id + '/gm/'));
  const player = (await join(gm.room.id, gm.room.inviteToken, 'Jogador')).body;
  const traversal = `${gm.room.id}/${player.userId}/../gm/${savedGm.path.split('/')[2]}`;
  const attack = await fetch(`${base}/api/rooms/${gm.room.id}/private-file?path=${encodeURIComponent(traversal)}&token=${player.token}`);
  assert.equal(attack.status, 403);
  const direct = await fetch(`${base}/api/rooms/${gm.room.id}/private-file?path=${encodeURIComponent(savedGm.path)}&token=${player.token}`);
  assert.equal(direct.status, 403);
  const owner = await fetch(`${base}/api/rooms/${gm.room.id}/private-file?path=${encodeURIComponent(savedGm.path)}&token=${gm.token}`);
  assert.equal(owner.status, 200);
  assert.equal(owner.headers.get('x-content-type-options'), 'nosniff');
});

test('A2: HTML disfarçado de imagem é recusado; extensão vem do tipo', async () => {
  const gm = await createRoom();
  const html = await upload(gm.room.id, gm.token, 'public', 'image/png', Buffer.from('<html><script>alert(1)</script></html>'), 'x.html');
  assert.equal(html.status, 415);
  const ok = await (await upload(gm.room.id, gm.token, 'public', 'image/png', PNG, 'mapa.html')).json();
  assert.match(ok.path, /\.png$/);
  const served = await fetch(base + ok.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.match(served.headers.get('content-security-policy') || '', /sandbox/);
});

test('A3: jogador só envia retrato, ficha em PDF e PDF da biblioteca', async () => {
  const gm = await createRoom();
  const player = (await join(gm.room.id, gm.room.inviteToken, 'Jogador')).body;
  assert.equal((await upload(gm.room.id, player.token, 'public', 'image/png', PNG)).status, 200);
  assert.equal((await upload(gm.room.id, player.token, 'private', 'application/pdf', PDF)).status, 200);
  assert.equal((await upload(gm.room.id, player.token, 'community', 'application/pdf', PDF)).status, 200);
  assert.equal((await upload(gm.room.id, player.token, 'public', 'application/pdf', PDF)).status, 403);
  assert.equal((await upload(gm.room.id, player.token, 'private', 'image/png', PNG)).status, 403);
  const chunked = await json(`/api/rooms/${gm.room.id}/uploads/start`, { scope: 'private', kind: 'character', fileName: 'x.mp3', mime: 'audio/mpeg', size: 10 }, { 'x-room-token': player.token });
  assert.equal(chunked.status, 403);
});

test('A4: URL assinada recusa bucket desconhecido e caminho com travessia', async () => {
  const gm = await createRoom();
  const player = (await join(gm.room.id, gm.room.inviteToken, 'Jogador')).body;
  const headers = { 'x-room-token': player.token };
  assert.equal((await json(`/api/rooms/${gm.room.id}/files/signed-url`, { bucket: 'outro-bucket', path: `${gm.room.id}/${player.userId}/a.pdf` }, headers)).status, 400);
  assert.equal((await json(`/api/rooms/${gm.room.id}/files/signed-url`, { bucket: 'mesa-private', path: `${gm.room.id}/${player.userId}/../gm/a.pdf` }, headers)).status, 400);
  assert.equal((await json(`/api/rooms/${gm.room.id}/files/signed-url`, { bucket: 'mesa-private', path: `${gm.room.id}/gm/a.pdf` }, headers)).status, 403);
});

test('A5: rolagens sorteadas no servidor; valores e autor do cliente são ignorados', async () => {
  const gm = await createRoom();
  const player = (await join(gm.room.id, gm.room.inviteToken, 'Ana')).body;
  const socket = await connect(gm.room.id, player.token);
  try {
    const ack = await emit(socket, 'dice:roll', { kind: 'triangle', params: { dice: [3, 3, 3, 3, 3, 3] } });
    assert.equal(ack.ok, true);
    assert.equal(ack.recorded, true);
    assert.equal(ack.result.dice.length, 6);
    const legacy = await emit(socket, 'room:action', { type: 'dice:record', payload: { system: 'Triangle Agency', dice: [3, 3, 3, 3, 3, 3], actor: 'Mestre' } });
    assert.equal(legacy.ok, false);
    const gmSocket = await connect(gm.room.id, gm.token);
    const gmState = await gmSocket.firstState;
    gmSocket.disconnect();
    assert.equal(gmState.gmShield.tracker.rolls.length, 1);
    assert.ok(gmState.gmShield.tracker.rolls.every(roll => roll.actor === 'Ana'));
    const free = await emit(socket, 'dice:roll', { kind: 'free', params: { sides: 20, count: 3 } });
    assert.equal(free.result.dice.length, 3);
    assert.ok(free.result.dice.every(v => v >= 1 && v <= 20));
    assert.equal((await emit(socket, 'dice:roll', { kind: 'free', params: { sides: 20, count: 999 } })).ok, false);
  } finally { socket.disconnect(); }
});

test('A6: entradas simultâneas não perdem jogadores nem passam das vagas', async () => {
  const gm = await createRoom(3);
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => join(gm.room.id, gm.room.inviteToken, 'J' + i)));
  assert.equal(results.filter(r => r.status === 200).length, 3);
  assert.equal(results.filter(r => r.status === 403).length, 3);
  const socket = await connect(gm.room.id, gm.token);
  const state = await socket.firstState;
  socket.disconnect();
  assert.equal(state.players.length, 3);
  assert.equal(state.campaign.availableSeats, 0);
});

test('2.2.1: envio em blocos confere o conteúdo gravado em disco ao concluir', async () => {
  const gm = await createRoom();
  const headers = { 'x-room-token': gm.token };
  const start = await (await json(`/api/rooms/${gm.room.id}/uploads/start`, { scope: 'public', kind: 'map', fileName: 'mapa.png', mime: 'image/png', size: PNG.length }, headers)).json();
  const { createHash } = await import('node:crypto');
  const put = await fetch(`${base}/api/rooms/${gm.room.id}/uploads/${start.uploadId}/chunks/0`, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'x-chunk-sha256': createHash('sha256').update(PNG).digest('hex') }, body: PNG });
  assert.equal(put.status, 200);
  // Simula uma sessão adulterada no disco (ou anterior às regras atuais).
  fs.writeFileSync(path.join(dataDir, 'upload-chunks', start.uploadId, '0.part'), Buffer.from('<html>x</html>'));
  const done = await fetch(`${base}/api/rooms/${gm.room.id}/uploads/${start.uploadId}/complete`, { method: 'POST', headers });
  assert.equal(done.status, 415);
  assert.equal(fs.existsSync(path.join(dataDir, 'upload-chunks', start.uploadId)), false);
});

test('2.4.1: PDF servido sem sandbox; imagem com sandbox; ambos com nosniff', async () => {
  const gm = await createRoom();
  const pdf = await (await upload(gm.room.id, gm.token, 'community', 'application/pdf', PDF, 'livro.pdf')).json();
  const served = await fetch(base + pdf.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');
  assert.doesNotMatch(served.headers.get('content-security-policy') || '', /sandbox/);
});

test('3.2: envio único acima de 30 MB responde 413 em JSON', async () => {
  const gm = await createRoom();
  const big = Buffer.alloc(31 * 1024 * 1024 + 1, 0);
  const response = await upload(gm.room.id, gm.token, 'public', 'image/png', big);
  assert.equal(response.status, 413);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.ok((await response.json()).error);
});

test('2.10: limite de rolagens e rerrolagem Alpha 2.0 presa à última rolagem do servidor', async () => {
  const gm = await createRoom();
  const socket = await connect(gm.room.id, gm.token);
  try {
    const first = await emit(socket, 'dice:roll', { kind: 'alpha2', params: { pool: 4, hunger: 0, difficulty: 2 } });
    assert.equal(first.ok, true);
    assert.ok(first.rollId);
    assert.equal((await emit(socket, 'dice:roll', { kind: 'alpha2Reroll', params: { rollId: 'outro', indices: [0] } })).ok, false);
    const reroll = await emit(socket, 'dice:roll', { kind: 'alpha2Reroll', params: { rollId: first.rollId, indices: [0] } });
    assert.equal(reroll.ok, true);
    assert.equal((await emit(socket, 'dice:roll', { kind: 'alpha2Reroll', params: { rollId: first.rollId, indices: [1] } })).ok, false);
    assert.equal((await emit(socket, 'dice:roll', { kind: 'vampireV5', params: { pool: 2.9 } })).ok, false);
    const burst = [];
    for (let i = 0; i < 20; i += 1) burst.push(await emit(socket, 'dice:roll', { kind: 'free', params: { sides: 6, count: 1 } }));
    assert.equal(burst.at(-1).ok, false);
    assert.match(burst.at(-1).error, /Muitas rolagens/);
  } finally { socket.disconnect(); }
});

test('3.5: Daggerheart mantém Medo até 12 e histórico de 30 rolagens', async () => {
  const gm = await createRoom(4, 'Daggerheart');
  const gmSocket = await connect(gm.room.id, gm.token);
  await gmSocket.firstState;
  assert.equal((await emit(gmSocket, 'room:action', { type: 'gm:tracker:update', payload: { key: 'fear', value: 12 } })).ok, true);
  const players = await Promise.all(['A', 'B'].map(name => join(gm.room.id, gm.room.inviteToken, name)));
  const sockets = await Promise.all(players.map(p => connect(gm.room.id, p.body.token)));
  try {
    for (const socket of sockets) for (let i = 0; i < 18; i += 1) assert.equal((await emit(socket, 'dice:roll', { kind: 'daggerheart', params: {} })).recorded, true);
    const check = await connect(gm.room.id, gm.token);
    const state = await check.firstState;
    check.disconnect();
    assert.equal(state.gmShield.tracker.fear, 12);
    assert.equal(state.gmShield.tracker.rolls.length, 30);
  } finally { sockets.forEach(s => s.disconnect()); gmSocket.disconnect(); }
});
