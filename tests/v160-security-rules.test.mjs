import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolveRoll, RECORDED_KINDS } from '../src/domain/serverDice.mjs';
const require = createRequire(import.meta.url);
const { sniffFamily, contentMatchesMime, extensionFor, safeStoragePath, uploadAllowed } = require('../server/fileSecurity.js');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = Buffer.from('%PDF-1.4\n%');
const HTML = Buffer.from('<!doctype html><script>alert(1)</script>');
const rng = n => () => n;

test('A2: tipo real pelo conteúdo, não pelo MIME declarado', () => {
  assert.equal(sniffFamily(PNG), 'png');
  assert.equal(sniffFamily(PDF), 'pdf');
  assert.equal(sniffFamily(HTML), null);
  assert.equal(contentMatchesMime(PNG, 'image/png'), true);
  assert.equal(contentMatchesMime(HTML, 'image/png'), false);
  assert.equal(contentMatchesMime(PDF, 'image/png'), false);
  assert.equal(contentMatchesMime(Buffer.from('ID3\x03\x00'), 'audio/mpeg'), true);
  assert.equal(contentMatchesMime(Buffer.from('OggS\x00\x02'), 'audio/ogg'), true);
});
test('A2: extensão vem do tipo verificado, nunca do nome enviado', () => {
  assert.equal(extensionFor('image/png'), '.png');
  assert.equal(extensionFor('audio/x-m4a'), '.m4a');
  assert.equal(extensionFor('text/html'), '.bin');
});
test('A1/A4: caminhos com travessia ou fora da sala são recusados', () => {
  assert.deepEqual(safeStoragePath('sala1', 'sala1/jogador/abc.pdf'), ['sala1', 'jogador', 'abc.pdf']);
  for (const bad of ['sala1/jogador/../gm/doc.pdf', 'sala1/jogador/../../sala2/gm/x.pdf', 'sala1//x.pdf', 'sala2/gm/x.pdf', 'sala1/gm/./x.pdf', 'sala1/gm', 'sala1\\gm\\x.pdf', '']) {
    assert.equal(safeStoragePath('sala1', bad), null, bad);
  }
});
test('A3: permissão de upload pelo papel e pelo tipo, não pelo kind do cliente', () => {
  assert.equal(uploadAllowed('player', 'public', 'image/webp'), true);
  assert.equal(uploadAllowed('player', 'public', 'application/pdf'), false);
  assert.equal(uploadAllowed('player', 'public', 'audio/mpeg'), false);
  assert.equal(uploadAllowed('player', 'private', 'application/pdf'), true);
  assert.equal(uploadAllowed('player', 'private', 'image/png'), false);
  assert.equal(uploadAllowed('player', 'community', 'application/pdf'), true);
  assert.equal(uploadAllowed('player', 'community', 'audio/mpeg'), false);
  assert.equal(uploadAllowed('gm', 'public', 'audio/mpeg'), true);
  assert.equal(uploadAllowed('gm', 'private', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), true);
  assert.equal(uploadAllowed('gm', 'public', 'text/html'), false);
});
test('A5: o servidor sorteia; parâmetros inválidos são recusados', () => {
  assert.deepEqual(resolveRoll({ kind: 'triangle' }, rng(0.51)).dice, [3, 3, 3, 3, 3, 3]);
  assert.equal(resolveRoll({ kind: 'dnd', params: { attributeScore: 14, proficiency: 2 } }, rng(0.5)).detail.startsWith('11 +2 atributo +2 proficiência'), true);
  assert.equal(resolveRoll({ kind: 'cthulhu', params: { skill: 40 } }, rng(0)).title, 'Crítico');
  assert.equal(resolveRoll({ kind: 'free', params: { sides: 100, count: 2 } }, rng(0.999)).dice.join(), '100,100');
  assert.throws(() => resolveRoll({ kind: 'free', params: { sides: 7, count: 1 } }, rng(0)));
  assert.throws(() => resolveRoll({ kind: 'free', params: { sides: 6, count: 500 } }, rng(0)));
  assert.throws(() => resolveRoll({ kind: 'vampireV5', params: { pool: 0 } }, rng(0)));
  assert.throws(() => resolveRoll({ kind: 'ordem', params: { skillSides: 'd7', attributeSides: 'd6' } }, rng(0)));
  assert.throws(() => resolveRoll({ kind: 'expression', params: { expression: 'ataque' } }, rng(0)));
  assert.throws(() => resolveRoll({ kind: 'hack' }, rng(0)));
  assert.equal(RECORDED_KINDS.triangle, 'Triangle Agency');
});
test('A5: rerrolagem do Alpha 2.0 só sobre a última rolagem do servidor', () => {
  const first = resolveRoll({ kind: 'alpha2', params: { pool: 4, hunger: 1 } }, rng(0));
  const last = { id: 'r1', result: first, rerolled: false };
  assert.throws(() => resolveRoll({ kind: 'alpha2Reroll', params: { rollId: 'outro', indices: [0] } }, rng(0.99), { lastAlpha: last }));
  assert.throws(() => resolveRoll({ kind: 'alpha2Reroll', params: { rollId: 'r1', indices: [3] } }, rng(0.99), { lastAlpha: last }), /Fome/);
  assert.throws(() => resolveRoll({ kind: 'alpha2Reroll', params: { rollId: 'r1', indices: [0] } }, rng(0.99), { lastAlpha: { ...last, rerolled: true } }));
  assert.equal(resolveRoll({ kind: 'alpha2Reroll', params: { rollId: 'r1', indices: [0, 1] } }, rng(0.99), { lastAlpha: last }).dice.slice(0, 2).join(), '10,10');
});
