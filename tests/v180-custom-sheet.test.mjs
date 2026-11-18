import test from 'node:test';
import assert from 'node:assert/strict';
import { evalFormula, normalizeTemplate, validateTemplate, computeCalculated, CUSTOM_TEMPLATES } from '../src/domain/customSheet.mjs';

test('evalFormula: precedência, parênteses e referências', () => {
  assert.equal(evalFormula('2 + 3 * 4').value, 14);
  assert.equal(evalFormula('(2 + 3) * 4').value, 20);
  assert.equal(evalFormula('({forca} - 10) / 2', { forca: '16' }).value, 3);
  assert.equal(evalFormula('-{x} + 5', { x: '2' }).value, 3);
});

test('evalFormula: erros não quebram, viram aviso', () => {
  assert.equal(evalFormula('1 / 0').ok, false);
  assert.equal(evalFormula('2 +').ok, false);
  assert.equal(evalFormula('2 ** 3').ok, false);
  assert.equal(evalFormula('alert(1)').ok, false);
  assert.equal(evalFormula('{faltante} + 1', {}).value, 1); // campo ausente = 0
});

test('normalizeTemplate: chaves únicas, tipos válidos, limites', () => {
  const t = normalizeTemplate({ sections: [{ title: 'S', fields: [{ label: 'Força', type: 'atributo' }, { label: 'Força', type: 'numero' }, { label: 'X', type: 'invalido' }] }] });
  const keys = t.sections[0].fields.map(f => f.key);
  assert.equal(new Set(keys).size, keys.length); // sem chaves duplicadas
  assert.equal(t.sections[0].fields[2].type, 'texto'); // tipo inválido vira texto
  assert.equal(t.version, 1);
});

test('validateTemplate: recusa JSON inválido', () => {
  assert.equal(validateTemplate('{bad').ok, false);
  assert.equal(validateTemplate('{"foo":1}').ok, false);
  assert.equal(validateTemplate(JSON.stringify(CUSTOM_TEMPLATES['d20 básico'])).ok, true);
});

test('R4.2: valor de campo removido do template é preservado no stats do jogador', () => {
  // A migração não apaga stats; só o render ignora chaves fora do template.
  const template = normalizeTemplate({ sections: [{ title: 'G', fields: [{ key: 'novo', label: 'Novo', type: 'texto' }] }] });
  const stats = { antigo: 'valor preservado', novo: 'x' };
  const calc = computeCalculated(template, stats);
  assert.equal(stats.antigo, 'valor preservado');
  assert.deepEqual(calc, {});
});

test('modelo d20 calcula o modificador', () => {
  const t = CUSTOM_TEMPLATES['d20 básico'];
  const calc = computeCalculated(normalizeTemplate(t), { forca: '14' });
  assert.equal(calc.mod_forca.value, 2);
});
