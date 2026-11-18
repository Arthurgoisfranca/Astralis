import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANCESTRIES, ARMOR, CARDS, CLASSES, COMMUNITIES, DH_BUILD, DH_PLAY, TRANSFORMATIONS, WEAPONS,
  availableCards, builderStatus, canUseClass, cardInfo, classGear, classInfo, damageTaken, demoGabriel, derive, domainCards, duality,
  emptyBuild, featureDescription, progression, readBuild, readPlay, readyCard, resolveDuality, rest, rollCombo, startingPlay,
  storeStats, suggestedTraits, weaponDamage,
} from '../src/domain/daggerheartStudio.mjs';

function random(...values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

test('catálogo do SRD e de The Void tem domínios completos e Fundação em todas as classes', () => {
  assert.equal(Object.keys(CLASSES).length, 15);
  assert.equal(Object.values(CLASSES).flatMap(cls => Object.keys(cls.subclasses)).length, 31);
  assert.equal(Object.keys(ANCESTRIES).length, 24);
  assert.equal(Object.keys(COMMUNITIES).length, 15);
  assert.equal(Object.keys(TRANSFORMATIONS).length, 6);
  const domains = new Set(Object.values(CLASSES).flatMap(cls => cls.domains));
  assert.equal(domains.size, 11);
  for (const domain of domains) {
    assert.equal(Object.values(CARDS).filter(card => card.domain === domain).length, 21);
    assert.equal(Object.values(CARDS).filter(card => card.domain === domain && card.level === 1).length, 3);
  }
  for (const cls of Object.values(CLASSES)) {
    for (const sub of Object.values(cls.subclasses)) assert.ok(sub.foundation?.length, `${cls.name} · ${sub.name}`);
    assert.equal(availableCards(cls, 1).length, 6);
  }
  assert.equal(WEAPONS['primary-casting-dagger'].trait, 'instinct');
  assert.equal(WEAPONS['secondary-rune-shield'].feature, 'Protective');
  assert.deepEqual([ARMOR['mage-robes'].major, ARMOR['mage-robes'].severe], [4, 10]);
});

test('Gabriel mantém criações completas, roda a Conjuração com Conhecimento e atualiza os campos legados', () => {
  const { name, build, play, details } = demoGabriel();
  const status = builderStatus(build, name, details), stats = derive(build, play);
  assert.deepEqual(status.stages, [0, 0, 0, 0, 0]);
  assert.deepEqual(stats.traits, { agility: 0, strength: -1, finesse: 0, instinct: 2, presence: 1, knowledge: 1 });
  assert.equal(stats.spellcast, 'knowledge');
  assert.equal(stats.evasion, 10);
  assert.equal(stats.maxArmor, 3);
  assert.deepEqual([stats.major, stats.severe], [6, 12]);
  assert.deepEqual([stats.maxHP, stats.maxStress, play.hope], [6, 6, 2]);
  assert.equal(builderStatus({ ...build, traits: ['instinct', 'instinct', 'presence', 'knowledge'] }, name).remaining.traits, 1);
  const saved = storeStats({ olderKey: 'preservado' }, build, { ...play, hp: 2, tokens: 1, usedArmor: 1 }, details);
  assert.deepEqual([saved.hp, saved.armor, saved.ac, saved.olderKey], ['2/6', '2/3', '10', 'preservado']);
  assert.equal(readBuild(saved[DH_BUILD]).subclass, 'hedge');
  assert.equal(readPlay(saved[DH_PLAY], build).tokens, 1);
});

test('nível só conta avanços válidos, mantém os limites por patamar e libera domínio da multiclasse', () => {
  const { build } = demoGabriel();
  const choices = (tier, list) => list.map(([kind, a = '', b = '', c = '']) => ({ kind, tier, a, b, c }));
  const advanced = {
    ...build, level: 5,
    advances: [
      { exp: 'Alquimista', card: 'dread-voice-of-dread', choices: choices(2, [['traits', 'agility', 'knowledge'], ['hp']]) },
      { card: 'sage-vicious-entangle', choices: choices(2, [['traits', 'agility', 'presence'], ['stress']]) },
      { card: 'sage-gifted-tracker', choices: choices(2, [['evasion'], ['experience', '0', '1']]) },
      { exp: 'Erudito', card: 'arcana-rune-ward', choices: choices(3, [['multiclass', 'druid', 'Arcana', 'warden-of-renewal']]) },
    ],
  };
  const result = progression(readBuild(advanced));
  assert.equal(result.pending[2], 0);
  assert.equal(result.pending[3], 1);
  assert.equal(result.pending[4], 0);
  assert.equal(result.pending[5], 0);
  assert.equal(result.secondDomain, 'Arcana');
  assert.ok(result.known.includes('arcana-rune-ward'));
  assert.equal(result.proficiency, 3);
  assert.equal(result.experiences[0].bonus, 3);
});

test('Dualidade cobra recursos uma vez e respeita crítico e Fearless', () => {
  const { build, play } = demoGabriel();
  const stats = derive(build, play);
  const critical = duality({ title: 'Teste', trait: 1, difficulty: 35 }, random(0.2, 0.2));
  assert.equal(critical.good, true);
  assert.equal(critical.critical, true);
  assert.deepEqual(resolveDuality({ ...play, stress: 2 }, critical, stats).stress, 1);
  assert.equal(resolveDuality(play, { ...critical, confirmed: true }, stats), play);
  const failure = duality({ title: 'Teste', difficulty: 35 }, random(0.2, 0.8));
  assert.equal(failure.good, false);
  assert.equal(failure.withHope, false);
  assert.deepEqual([resolveDuality(play, failure, stats, true).hope, resolveDuality(play, failure, stats, true).stress], [3, 2]);
  assert.equal(resolveDuality({ ...play, stress: 5 }, failure, stats, true), null);
  assert.equal(duality({ title: 'Teste', difficulty: null }, random(0.2, 0.8)).good, null);
});

test('dano, descanso e resgate respeitam limiares, fichas e disponibilidade', () => {
  const { build, play } = demoGabriel();
  const stats = derive(build, play);
  assert.deepEqual([0, 1, 6, 12, 24].map(amount => damageTaken(amount, stats, true, true)), [0, 0, 1, 2, 3]);
  assert.equal(weaponDamage(WEAPONS['primary-casting-dagger'], 2, true, random(0, 0)).total, 14);
  const next = rest({ ...play, stress: 5, hp: 4, tokens: 2, shadows: 4, uses: ['commune', 'talisman'] }, build, false, ['stress', 'hp'], random(0, 0));
  assert.deepEqual([next.stress, next.hp, next.tokens, next.shadows, next.shorts], [3, 2, 0, 0, 1]);
  assert.deepEqual(next.uses, ['commune']);
  assert.equal(rest({ ...next, shorts: 3 }, build, false, []), null);
  assert.equal(rest({ ...next, shorts: 3 }, build, true, []).uses.length, 0);
  assert.equal(readyCard({ ...play, stress: 6 }, 'sage-vicious-entangle'), null);
  assert.equal(readyCard({ ...play, stress: 6 }, 'sage-vicious-entangle', '', true)?.stress, 6);
});

test('The Void seleciona as quatro fichas arquivadas e respeita as duas fontes de playtest adicionais', () => {
  const released = emptyBuild();
  const archive = { ...released, sources: { hope: false, void15: true, void4: false, void5: false } };
  for (const [id, hope, foundation] of [
    ['assassin', 'Grim Resolve', 'Envenomate'],
    ['brawler', 'Staggering Strike', 'Powerhouse'],
    ['warlock', 'Patron’s Boon', 'Deadly Devotion'],
    ['witch', 'Witch’s Charm', 'Tethered Talisman'],
  ]) {
    const published = classInfo(released, id), original = classInfo(archive, id);
    assert.equal(published.source, 'hope');
    assert.equal(original.source, 'void15');
    assert.equal(original.hope, hope);
    assert.ok(original.reference.endsWith('-v1.5-The-Void.pdf'));
    assert.ok(Object.values(original.subclasses).some(sub => sub.foundation.includes(foundation)));
    assert.ok(canUseClass(original, archive.sources));
    assert.ok(original.equipment.filter(Boolean).every(item => WEAPONS[item] || ARMOR[item]));
    assert.ok(availableCards(original, 1, '', '', archive.sources).length === 6);
  }
  const legacy = readBuild({ ...released, classId: 'witch', subclass: 'hedge', sources: { hope: true, void4: true, void5: false } });
  assert.match(featureDescription(classInfo(legacy), 'Hex'), /bônus igual ao patamar/);
  assert.match(featureDescription(classInfo(released, 'witch'), 'Hex'), /Dificuldade e o dano do alvo diminuem/);
  assert.equal(legacy.subclass, 'hedge');
  assert.ok(classGear(legacy).includes('Crânio falante'));
  assert.equal(canUseClass(classInfo(legacy, 'blood-hunter'), legacy.sources), true);
  assert.equal(canUseClass(classInfo(legacy, 'summoner'), legacy.sources), false);
});

test('os 11 domínios estão completos e Dread alterna metadados sem perder o ID de uma carta salva', () => {
  const sources = { void15: true };
  const standard = domainCards(), archive = domainCards(sources);
  assert.deepEqual(standard.map(card => card.id), archive.map(card => card.id));
  for (const version of [standard, archive]) {
    assert.equal(version.length, 231);
    const domains = new Set(version.map(card => card.domain));
    assert.equal(domains.size, 11);
    for (const domain of domains) {
      const counts = Array.from({ length: 10 }, (_, i) => version.filter(card => card.domain === domain && card.level === i + 1).length);
      assert.deepEqual(counts, [3, 2, 2, 2, 2, 2, 2, 2, 2, 2], domain);
    }
  }
  assert.equal(cardInfo('dread-horror').name, 'Horror');
  assert.equal(cardInfo('dread-horror', sources).name, 'Summon Horror');
  assert.equal(cardInfo('dread-savor-the-anguish', sources).kind, 'Spell');
  assert.match(cardInfo('dread-voice-of-dread', sources).description, /Vulnerável/);
  assert.match(cardInfo('dread-terrify', sources).reference, /Witch-v1.5-The-Void\.pdf#page=4$/);
  assert.equal(archive.filter(card => card.source === 'void15' && card.description).length, 21);
  assert.equal(readyCard({ cards: [], stress: 6 }, 'dread-jump-scare'), null);
  assert.equal(readyCard({ cards: [], stress: 6 }, 'dread-jump-scare', '', false, 6, sources)?.stress, 6);
});

test('Favor, combo, talismã e benefícios de comunidade usam os recursos da ficha da edição', () => {
  const sources = { void15: true };
  const warlock = { ...emptyBuild(), classId: 'warlock', subclass: 'pact-of-the-endless', sources };
  warlock.traits = suggestedTraits(warlock);
  const initial = startingPlay(warlock);
  assert.equal(initial.favor, 3);
  assert.deepEqual(readPlay({ ...initial, favor: 7, patron: 'O Corvo', spheres: ['Natureza', 'Segredos'] }, warlock).spheres, ['Natureza', 'Segredos']);
  assert.equal(rest(initial, warlock, false, ['tithe']).favor, 5);
  const brawler = { ...emptyBuild(), classId: 'brawler', subclass: 'juggernaut', sources, level: 2,
    advances: [{ exp: 'Lutador', card: 'bone-deft-maneuvers', choices: [{ kind: 'combo', tier: 2 }, { kind: 'combo', tier: 2 }] }] };
  const stats = derive(brawler);
  assert.equal(stats.evasion, 11);
  assert.equal(stats.combo, 6);
  assert.equal(stats.pending[2], 1);
  assert.equal(weaponDamage(stats.unarmed, 2, true, random(0, 0, 0, 0)).total, 36);
  assert.deepEqual(rollCombo(6, random(0.25, 0.5, 0.1)), [2, 4, 1]);
  const { build, play } = demoGabriel();
  assert.equal(rest({ ...play, tokens: 1 }, { ...build, sources }, true, []).tokens, 1);
  assert.ok(Object.values(COMMUNITIES).every(item => item.description && item.benefit && item.features.length === 1));
  assert.equal(rest({ ...play, hp: 3 }, { ...build, community: 'frostborne' }, true, []).hp, 2);
  assert.ok(startingPlay({ ...build, community: 'wanderborne' }).items.includes('Mochila nômade'));
});
