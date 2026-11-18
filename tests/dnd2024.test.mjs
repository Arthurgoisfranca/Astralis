import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKGROUNDS, CLASSES, FEATS, SPELLS, featInfo } from '../src/domain/dnd2024Catalog.mjs';
import { BUILD_STAT, DATA_LIMIT, PLAY_STAT, buildDetails, changeHP, classEntry, demoGabriel, featureLevels, newAbilityRolls,
  readBuild, readPlay, recover, rerollDndTest, resourceCaps, rollDamage, rollDndTest, skillBonus, spellChoices, storeCharacter,
  updateStartingEquipment } from '../src/domain/dnd2024Rules.mjs';

function rng(...values) {
  let i = 0;
  return () => values[i++] ?? 0.5;
}

test('o Livro do Jogador 2024 tem 75 talentos em quatro categorias e 16 antecedentes com dois pacotes', () => {
  const rows = Object.values(FEATS);
  const counts = Object.fromEntries(['origin', 'general', 'style', 'epic'].map(category => [category, rows.filter(row => row.category === category).length]));
  assert.deepEqual(counts, { origin: 10, general: 43, style: 10, epic: 12 });
  const kitGold = { acolyte: 8, artisan: 32, charlatan: 15, criminal: 16, entertainer: 11, farmer: 30, guard: 12, guide: 3,
    hermit: 16, merchant: 22, noble: 29, sage: 8, sailor: 20, scribe: 23, soldier: 14, wayfarer: 16 };
  assert.deepEqual(Object.keys(BACKGROUNDS).sort(), Object.keys(kitGold).sort());
  for (const [id, row] of Object.entries(BACKGROUNDS)) {
    assert.equal(featInfo(row.feat)?.category, 'origin');
    assert.equal(new Set(row.abilities).size, 3, id);
    assert.equal(new Set(row.skills).size, 2, id);
    assert.ok(row.summary && (row.tool || row.tools?.length));
    assert.deepEqual(row.kits.map(kit => kit.coins), [kitGold[id], 50], id);
    assert.ok(row.kits[0].items.length && !row.kits[1].items.length);
  }
});

test('antecedente concede o talento, proficiências, equipamento e recursos sem apagar itens da campanha', () => {
  const { build, spells } = demoGabriel();
  const previous = buildDetails(build, spells, 'Gabriel');
  const nextBuild = { ...build, background: 'wayfarer', backgroundKitTool: 'Xadrez dracônico' };
  const next = buildDetails(nextBuild, spells, 'Gabriel');
  assert.ok(next.proficientSkills.includes('Stealth'));
  assert.ok(next.tools.includes('Ferramentas de ladrão'));
  assert.ok(!next.tools.includes('Xadrez dracônico'));
  assert.equal(new Map(next.equipment.items).get('Xadrez dracônico'), 1);
  assert.equal(resourceCaps(nextBuild, next).find(row => row.id === 'feat:lucky').max, 2);
  const existing = readPlay({}, previous);
  const changed = updateStartingEquipment({ ...existing, items: [...existing.items, ['Espelho da campanha', 1]] }, previous.equipment, next.equipment);
  assert.ok(changed.items.some(([name]) => name === 'Espelho da campanha'));
  assert.ok(changed.items.some(([name]) => name === 'Xadrez dracônico'));
  assert.ok(!changed.items.some(([name]) => name === 'Book (Prayers)'));
  assert.equal(changed.coins.gp, existing.coins.gp + 8);
});

test('talentos respeitam nível, pré-requisitos, armaduras e repetição e sobrevivem ao salvamento', () => {
  const { build } = demoGabriel();
  build.classes = [{ ...classEntry('wizard'), level: 19 }];
  build.feats = {
    'wizard-4': { name: 'Lightly Armored', values: ['dexterity'] },
    'wizard-8': { name: 'Moderately Armored', values: ['dexterity'] },
    'wizard-12': { name: 'Heavily Armored', values: ['constitution'] },
    'wizard-16': { name: 'Resilient', values: ['constitution'] },
    'wizard-19': { name: 'Boon of Fortitude', values: ['intelligence'] },
  };
  const details = buildDetails(build, {}, 'Gabriel');
  assert.deepEqual([...details.armorTraining].sort(), ['heavy', 'light', 'medium', 'shield']);
  assert.ok(details.saves.includes('constitution'));
  assert.ok(!details.feats[0].options.includes('Heavily Armored'));
  assert.ok(!details.feats[0].options.includes('Boon of Fortitude'));
  assert.ok(details.feats.at(-1).options.includes('Boon of Spell Recall'));
  assert.deepEqual(details.issues.Talentos, []);
  const withoutFortitude = buildDetails({ ...build, feats: { ...build.feats, 'wizard-19': { name: 'Ability Score Improvement', values: ['intelligence', 'wisdom'] } } }, {}, 'Gabriel');
  assert.equal(details.hp - withoutFortitude.hp, 40);
  const saved = storeCharacter({}, build, {}, readPlay({}, details), details);
  assert.deepEqual(readBuild(saved[BUILD_STAT]).feats['wizard-19'].values, ['intelligence']);
  const invalid = buildDetails({ ...build, feats: { ...build.feats, 'wizard-8': { name: 'Lightly Armored', values: ['dexterity'] } } }, {});
  assert.ok(invalid.issues.Talentos.some(issue => issue.includes('nível 8')));
  assert.ok(!invalid.armorTraining.has('heavy'));
});

test('Humanos podem repetir Habilidoso, preservando escolhas antigas e separando as novas', () => {
  const { build } = demoGabriel();
  build.species = 'human';
  build.background = 'charlatan';
  build.humanFeat = 'Skilled';
  build.skilled = ['Athletics', 'Medicine', 'Dados'];
  build.featChoices = { 'origin:human': { selected: ['Arcana', 'Stealth', 'Flauta'] } };
  const stored = readBuild(JSON.stringify(build));
  const details = buildDetails(stored, {}, 'Gabriel');
  assert.deepEqual(details.originRows.map(row => row.name), ['Skilled', 'Skilled']);
  assert.deepEqual(details.issues.Talentos, []);
  assert.ok(details.proficientSkills.includes('Athletics') && details.proficientSkills.includes('Arcana'));
  assert.ok(details.tools.includes('Dados') && details.tools.includes('Flauta'));
  const repeated = buildDetails({ ...stored, featChoices: { 'origin:human': { selected: ['Athletics', 'Flauta', 'Dados'] } } }, {});
  assert.ok(repeated.issues.Talentos.some(issue => issue.includes('Humano')));
});

test('talentos de magia oferecem apenas escolas e rituais válidos e criam conjurações próprias', () => {
  const { build } = demoGabriel();
  build.classes = [{ ...classEntry('fighter'), subclass: 'Eldritch Knight', style: 'Defense', level: 16 }];
  build.feats = {
    'fighter-4': { name: 'Fey Touched', values: ['wisdom'] },
    'fighter-6': { name: 'Shadow Touched', values: ['intelligence'] },
    'fighter-8': { name: 'Ritual Caster', values: ['wisdom'] },
    'fighter-12': { name: 'Elemental Adept', values: ['intelligence'] },
    'fighter-14': { name: 'Elemental Adept', values: ['intelligence'] },
    'fighter-16': { name: 'Archery', values: [] },
  };
  build.featChoices = { 'fighter-12': { selected: ['Fogo'] }, 'fighter-14': { selected: ['Frio'] } };
  const spells = { 'fighter-4:feat-spell': ['Bless'], 'fighter-6:feat-spell': ['False Life'] };
  const details = buildDetails(build, spells, 'Gabriel');
  const fey = details.groups.find(row => row.id === 'fighter-4:feat-spell');
  const ritual = details.groups.find(row => row.id === 'fighter-8:feat-spell');
  assert.ok(fey.options.every(spell => spell.level === 1 && ['Divination', 'Enchantment'].includes(spell.school)));
  assert.ok(ritual.options.every(spell => spell.level === 1 && spell.ritual));
  assert.equal(ritual.count, details.pb);
  assert.deepEqual(details.selected[fey.id], ['Bless']);
  assert.equal(fey.freeId, 'fighter-4:chosen');
  assert.ok(details.granted.some(row => row.name === 'Misty Step' && row.freeId === 'fighter-4:fixed'));
  assert.ok(details.granted.some(row => row.name === 'Invisibility' && row.ability === 'intelligence'));
  assert.ok(!details.feats.find(row => row.id === 'fighter-14').row.group.options.includes('Fogo'));
  assert.ok(details.archery);
});

test('as 12 classes têm progressões até o nível 20 e as 48 subclasses do Livro do Jogador 2024', () => {
  assert.equal(Object.keys(CLASSES).length, 12);
  assert.equal(new Set(Object.values(CLASSES).map(item => item.hitDie)).size, 4);
  const subclassIds = new Set();
  for (const [id, entry] of Object.entries(CLASSES)) {
    assert.equal(entry.rows.length, 20);
    assert.equal(entry.subclasses.length, 4);
    for (const subclass of entry.subclasses) {
      subclassIds.add(subclass.id);
      const levels = featureLevels({ ...classEntry(id), subclass: subclass.id, level: 20 });
      assert.ok(subclass.levels[3].length);
      for (const [level, features] of Object.entries(subclass.levels)) {
        assert.ok(features.every(feature => levels[Number(level) - 1].features.includes(feature)));
      }
      const tables = [subclass.spells ?? {}, ...Object.values(subclass.terrains ?? {})];
      for (const table of tables) {
        for (const spell of Object.values(table).flat()) assert.ok(SPELLS[spell], `${subclass.label} · ${spell}`);
      }
    }
    for (const row of entry.rows) assert.ok(row.features.every(feature => typeof feature === 'string'));
  }
  assert.equal(subclassIds.size, 48);
  assert.equal(CLASSES.warlock.rows[16].pact, 4);
  assert.equal(CLASSES.fighter.rows[19].mastery, 6);
  assert.equal(CLASSES.monk.rows[9].focus, 10);
  assert.equal(CLASSES.wizard.rows[19].prepared, 25);
  assert.ok(SPELLS['Dancing Lights'].classes.includes('wizard'));
  assert.equal(SPELLS.Guidance.concentration, true);
});

test('as 391 magias têm dados e resumos distintos e usam as chaves aceitas por fichas anteriores', () => {
  assert.equal(Object.keys(SPELLS).length, 391);
  assert.equal(new Set(Object.values(SPELLS).map(spell => spell.label)).size, 391);
  for (const spell of Object.values(SPELLS)) {
    assert.ok(spell.classes.length && spell.classes.every(id => Object.hasOwn(CLASSES, id)));
    assert.match(spell.components, /^[VSM]+$/);
    assert.ok(spell.range && spell.duration);
    assert.ok(typeof spell.summary === 'string' && spell.summary.length >= 40 && spell.summary.length <= 150, spell.label);
  }
  assert.equal(new Set(Object.values(SPELLS).map(spell => spell.summary)).size, 391);
  assert.equal(SPELLS.Bless.label, 'Bênção');
  assert.equal(SPELLS.Fireball.label, 'Bola de Fogo');
  assert.equal(SPELLS['Destruição Estrondosa'].level, 1);
  assert.ok(SPELLS['Blade Barrier'].classes.includes('cleric'));
});

test('trocar subclasse, terreno ou nível atualiza magias concedidas e opções de preparo', () => {
  const { build, spells, name } = demoGabriel();
  build.classes[0] = { ...build.classes[0], level: 5, subclass: 'Light Domain' };
  let details = buildDetails(build, spells, name);
  assert.ok(details.granted.some(spell => spell.name === 'Fireball' && spell.source === 'Domínio da Luz'));
  assert.ok(!details.groups.find(group => group.id === 'cleric:prepared').options.some(spell => spell.name === 'Fireball'));
  assert.ok(details.groups.find(group => group.id === 'cleric:prepared').options.some(spell => spell.name === 'Simular Morte'));
  build.classes[0].level = 4;
  assert.ok(!spellChoices(build, 4).granted.some(spell => spell.name === 'Fireball'));
  build.classes = [{ ...classEntry('druid'), level: 5, order: 'magician', subclass: 'Circle of the Land', terrain: 'Árido' }];
  details = buildDetails(readBuild(JSON.stringify(build)), {}, name);
  assert.ok(details.granted.some(spell => spell.name === 'Fireball'));
  build.classes[0].terrain = 'Polar';
  const granted = spellChoices(readBuild(JSON.stringify(build)), 5).granted.map(spell => spell.name);
  assert.ok(granted.includes('Sleet Storm') && !granted.includes('Fireball'));
  build.classes[0].terrain = '';
  assert.match(buildDetails(build, {}, name).issues.Classe.join(' '), /terreno/);
});

test('Cavaleiro Místico e Trapaceiro Arcano têm conjuração própria e contam 1/3 na multiclasse', () => {
  const { build, name } = demoGabriel();
  const fighter = { ...classEntry('fighter'), subclass: 'Eldritch Knight', level: 4 };
  build.classes = [fighter];
  let details = buildDetails(build, { 'fighter:prepared': ['Shield'], 'fighter:cantrips': ['Fire Bolt'] }, name);
  assert.deepEqual(details.slots, [3]);
  assert.deepEqual(details.selected['fighter:prepared'], ['Shield']);
  assert.equal(details.groups.find(group => group.id === 'fighter:prepared').ability, 'intelligence');
  assert.equal(details.groups.find(group => group.id === 'fighter:prepared').count, 4);
  assert.ok(!details.groups.find(group => group.id === 'fighter:prepared').options.some(spell => spell.name === 'Bless'));
  build.classes.push({ ...classEntry('wizard'), level: 2 });
  details = buildDetails(build, {}, name);
  assert.deepEqual(details.slots.slice(0, 3), [4, 2, 0]);
  assert.match(details.issues.Perícias.join(' '), /especializações/);
  build.classes = [{ ...classEntry('rogue'), subclass: 'Arcane Trickster', level: 10 }];
  details = buildDetails(build, { 'rogue:cantrips': ['Mage Hand', 'Message'] }, name);
  assert.deepEqual(details.slots, [4, 3]);
  assert.equal(details.groups.find(group => group.id === 'rogue:cantrips').count, 3);
  assert.deepEqual(details.selected['rogue:cantrips'], ['Message']);
  assert.ok(details.granted.some(spell => spell.name === 'Mage Hand'));
});

test('escolhas de classe adicionais persistem e entram nos cálculos', () => {
  const { build, name } = demoGabriel();
  build.classes = [{ ...classEntry('bard'), subclass: 'College of Lore', level: 6, loreSkills: ['Arcana', 'Medicine', 'Survival'] }];
  let details = buildDetails(readBuild(JSON.stringify(build)), { 'bard:lore': ['Fireball', 'Guidance'] }, name);
  assert.equal(details.skillGroups.find(group => group.id === 'bard:lore').values.length, 3);
  assert.deepEqual(details.selected['bard:lore'], ['Fireball', 'Guidance']);
  build.classes = [{ ...classEntry('paladin'), style: 'Blessed Warrior', level: 2 }];
  details = buildDetails(build, { 'paladin:style': ['Guidance', 'Sacred Flame'] }, name);
  assert.equal(details.groups.find(group => group.id === 'paladin:style').ability, 'charisma');
  assert.deepEqual(details.selected['paladin:style'], ['Guidance', 'Sacred Flame']);
  build.classes = [{ ...classEntry('fighter'), subclass: 'Battle Master', level: 10 }];
  details = buildDetails(build, {}, name);
  assert.deepEqual(resourceCaps(build, details).find(row => row.id === 'superiority'), {
    id: 'superiority', name: 'Dados de Superioridade', max: 5, short: Infinity, die: 'd10',
  });
});

test('Gabriel conclui a criação e ganha exatamente uma pendência de magia ao chegar ao nível 2', () => {
  const { build, spells, name } = demoGabriel();
  const ready = buildDetails(build, spells, name);
  assert.equal(ready.hp, 8);
  assert.equal(ready.ac, 14);
  assert.equal(ready.pb, 2);
  assert.equal(ready.speed, 30);
  assert.equal(ready.slots[0], 2);
  assert.equal(skillBonus('Religion', ready), 6);
  assert.deepEqual(Object.values(ready.issues).flat(), []);
  build.classes[0].level = 2;
  const advanced = buildDetails(build, spells, name);
  assert.equal(advanced.hp, 13);
  assert.equal(advanced.slots[0], 3);
  assert.deepEqual(Object.keys(advanced.issues).filter(key => advanced.issues[key].length), ['Magias']);
  assert.deepEqual(advanced.issues.Magias, ['Clérigo · magias preparadas: 4/5.']);
  assert.equal(resourceCaps(build, advanced).find(resource => resource.id === 'divinity').max, 2);
  spells['cleric:prepared'].push('Bless');
  assert.deepEqual(Object.values(buildDetails(build, spells, name).issues).flat(), []);
  build.classes[0].level = 3;
  assert.match(buildDetails(build, spells, name).issues.Classe.join(' '), /subclasse/);
});

test('compra de atributos, duplicidade de truques e multiclasse recalculam pendências', () => {
  const { build, spells, name } = demoGabriel();
  build.scoreMethod = 'point';
  build.scores = { strength: 15, dexterity: 15, constitution: 15, intelligence: 15, wisdom: 15, charisma: 15 };
  const expensive = buildDetails(build, spells, name);
  assert.equal(expensive.pointCost, 54);
  assert.equal(expensive.methodOk, false);
  const cleric = classEntry('cleric');
  build.classes = [{ ...cleric, level: 2, order: 'thaumaturge' }, classEntry('paladin')];
  spells['cleric:order'] = ['Sacred Flame'];
  const multiclass = buildDetails(build, spells, name);
  assert.deepEqual(multiclass.slots.slice(0, 3), [4, 2, 0]);
  assert.deepEqual(multiclass.selected['cleric:order'], []);
  build.scores.charisma = 8;
  assert.match(buildDetails(build, spells, name).issues.Classe.join(' '), /Multiclasse/);
});

test('a rolagem de atributos descarta exatamente o menor d6', () => {
  const results = newAbilityRolls(rng(0, 0.25, 0.5, 0.999));
  assert.deepEqual(results[0], { dice: [1, 2, 4, 6], total: 12 });
  assert.equal(results.length, 6);
});

test('crítico e erro automático só mudam o resultado de ataques', () => {
  const high = () => 0.999;
  const low = () => 0;
  const check = { label: 'Perícia', kind: 'check', bonus: 0, target: 99 };
  assert.equal(rollDndTest(check, high).good, false);
  assert.equal(rollDndTest({ ...check, kind: 'save', target: 1 }, low).good, true);
  assert.equal(rollDndTest({ ...check, kind: 'attack' }, high).status, 'Acerto crítico');
  assert.equal(rollDndTest({ ...check, kind: 'attack', target: 1 }, low).status, 'Erro automático');
  assert.equal(rollDndTest({ ...check, target: null }, high).good, null);
});

test('Bless, Guidance, desvantagem e inspiração respeitam os dados da resolução', () => {
  const check = { label: 'História', kind: 'check', skill: 'History', bonus: 3, target: 12, mode: 'advantage',
    conditions: ['Envenenado'], effects: { guidance: 'History', bless: true }, exhaustion: 1 };
  const result = rollDndTest(check, rng(0.4, 0.75));
  assert.equal(result.mode, 'normal');
  assert.deepEqual(result.dice, [9]);
  assert.equal(result.effect, 4);
  assert.equal(result.total, 14);
  assert.equal(result.effectName, 'Guidance');
  const save = rollDndTest({ ...check, kind: 'save', mode: 'normal' }, rng(0.4, 0.75));
  assert.equal(save.effectName, 'Bless');
  const advantaged = rollDndTest({ ...check, conditions: [] }, rng(0.2, 0.4, 0.75));
  const rerolled = rerollDndTest(advantaged, () => 0.05);
  assert.deepEqual(rerolled.dice, [5, 2]);
  assert.equal(rerolled.replaced, 9);
  assert.equal(rerolled.effect, advantaged.effect);
  assert.deepEqual(rollDamage('1d8+2', 3, true, rng(0, 0.999)), { total: 14, dice: [1, 8], modifier: 5 });
});

test('salvamento round-trip preserva usos, segue os limites do servidor e respeita descansos', () => {
  const { build, name, spells } = demoGabriel();
  build.classes[0].level = 2;
  const details = buildDetails(build, spells, name);
  const local = readPlay({}, details);
  const damaged = changeHP({ ...local, temp: 2 }, 'damage', 4);
  assert.equal(damaged.hp, 11);
  assert.equal(damaged.temp, 0);
  const stats = storeCharacter({ legacyNote: 'preservada' }, build, spells, {
    ...damaged, spent: { slot1: 1, divinity: 2 }, hitDice: { cleric: 1 },
  }, details);
  assert.equal(stats.legacyNote, 'preservada');
  assert.match(stats.spellSlots, /^1:2\/3/);
  assert.equal(readBuild(stats[BUILD_STAT]).classes[0].level, 2);
  const play = readPlay(stats, details);
  assert.equal(recover(play, build, details, false).spent.divinity, 1);
  assert.equal(recover(play, build, details, false).spent.slot1, 1);
  assert.deepEqual(recover(play, build, details, true).hitDice, {});
  assert.equal(recover(play, build, details, true).hp, 13);
  assert.deepEqual(readPlay({ [PLAY_STAT]: '{"hitDice":null,"conditions":7}' }, details).hitDice, {});
  assert.throws(() => storeCharacter({}, build, spells, { ...play, items: [['a'.repeat(DATA_LIMIT), 1]] }, details), /limite/);
});
