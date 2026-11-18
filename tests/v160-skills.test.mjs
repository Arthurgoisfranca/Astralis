import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { cocSkillValues, dndSkillBonus, v5SkillDots, COC_SKILLS } from '../src/systemSheetBlueprints.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const require = createRequire(import.meta.url);

function loadSheets() {
  const ts = require('typescript'), Module = require('node:module');
  const file = path.join(root, 'src/domain/characterSheets.ts');
  const js = ts.transpileModule(read('src/domain/characterSheets.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(file); mod.filename = file; mod.paths = Module._nodeModulePaths(root); mod._compile(js, file);
  return mod.exports;
}

test('A9: Ordem Paranormal 2 grava o dado de treino em skills', () => {
  const { buildCharacterSheet } = loadSheets();
  const sheet = buildCharacterSheet('Ordem Paranormal 2', 'p', 'p', { name: 'T', stats: { pericias: 'Acrobacia=d6|d8\nPercepção=d10|d6' } });
  assert.deepEqual({ ...sheet.skills }, { Acrobacia: 6, 'Percepção': 10 });
  assert.equal(sheet.diceSkills['Acrobacia'].attributeDie, 8);
});

test('M1: Call of Cthulhu usa e grava os valores-base não editados', () => {
  const values = cocSkillValues({ dex: '55', edu: '70', skills: 'Escalar=60' });
  assert.equal(values['Escalar'], 60);
  assert.equal(values['Esquivar'], 27);
  assert.equal(values['Idioma · Nativo'], 70);
  assert.equal(values['Encontrar'], 25);
  assert.equal(Object.keys(values).length, COC_SKILLS.length);
  const { buildCharacterSheet } = loadSheets();
  const skills = Object.entries(values).map(([name, value]) => name + '=' + value).join('\n');
  const sheet = buildCharacterSheet('Call of Cthulhu', 'p', 'p', { name: 'T', stats: { skills } });
  assert.equal(sheet.skills['Esquivar'], 27);
  assert.equal(sheet.skills['Escalar'], 60);
});

test('A8: D&D calcula o bônus da perícia pela ficha', () => {
  const stats = { dexterity: '16', wisdom: '13', proficiencyBonus: '3', skillProficiencies: 'Furtividade=expertise\nPercepção=proficient' };
  assert.deepEqual(dndSkillBonus('Furtividade', stats), { ability: 'dexterity', score: 16, proficiency: 6, training: 'expertise' });
  assert.equal(dndSkillBonus('Percepção', stats).proficiency, 3);
  assert.equal(dndSkillBonus('Acrobacia', stats).proficiency, 0);
});

test('A8: V5 lê os pontos da perícia nos dois grupos', () => {
  const stats = { skillsPhysical: 'Atletismo=3', skillsSocialMental: 'Lábia=2' };
  assert.equal(v5SkillDots('Atletismo', stats), 3);
  assert.equal(v5SkillDots('Lábia', stats), 2);
  assert.equal(v5SkillDots('Ocultismo', stats), 0);
});

test('A8/A5: a aba Rolagens oferece perícias da ficha e não sorteia no navegador', () => {
  const source = read('src/CharacterStudio.jsx');
  assert.match(source, /Perícia da ficha/);
  assert.match(source, /pickDndSkill/);
  assert.match(source, /pickCocSkill/);
  assert.match(source, /pickV5/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.match(source, /roll\("free"/);
});

test('A7: o Lobby não apaga edições não salvas da campanha', () => {
  const source = read('src/AppShell.jsx');
  assert.doesNotMatch(source, /useEffect\(\(\) => setForm\(room\.campaign\), \[room\.campaign\]\)/);
  assert.match(source, /if \(!dirty\) setForm\(room\.campaign\)/);
});
