import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANCESTRIES, ARMOR, CARDS, CLASSES, COMMUNITIES, DH_BUILD, DH_PLAY, TRANSFORMATIONS, WEAPONS,
  availableCards, builderStatus, damageTaken, demoGabriel, derive, duality, progression, readBuild, readPlay,
  readyCard, resolveDuality, rest, storeStats, weaponDamage,
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
