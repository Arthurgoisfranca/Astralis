import type { AbilityScores, ResourceTrack } from "./characterSheets";

export type DamageSeverity = "none" | "minor" | "major" | "severe";
export interface DamageResult {
  readonly severity: DamageSeverity;
  readonly overflow: number;
}

export function dndAbilityModifier(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.floor((score - 10) / 2);
}

export function dndSkillBonus(score: number, proficiencyBonus: number, proficient: boolean, expertise = false): number {
  const proficiency = proficient ? proficiencyBonus * (expertise ? 2 : 1) : 0;
  return dndAbilityModifier(score) + proficiency;
}

export function dndAbilityModifiers(scores: AbilityScores): AbilityScores {
  return Object.freeze({
    strength: dndAbilityModifier(scores.strength),
    dexterity: dndAbilityModifier(scores.dexterity),
    constitution: dndAbilityModifier(scores.constitution),
    intelligence: dndAbilityModifier(scores.intelligence),
    wisdom: dndAbilityModifier(scores.wisdom),
    charisma: dndAbilityModifier(scores.charisma),
  });
}

export function callOfCthulhuThresholds(base: number): Readonly<{ regular: number; hard: number; extreme: number }> {
  const safeBase = Math.max(0, Math.trunc(Number.isFinite(base) ? base : 0));
  return Object.freeze({ regular: safeBase, hard: Math.floor(safeBase / 2), extreme: Math.floor(safeBase / 5) });
}

export function daggerheartDamage(amount: number, thresholds: Readonly<{ minor: number; major: number; severe: number }>): DamageResult {
  const damage = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const ordered = [thresholds.minor, thresholds.major, thresholds.severe].map(value => Math.max(0, value)).sort((a, b) => a - b);
  const [minor, major, severe] = ordered;
  if (damage <= 0) return Object.freeze({ severity: "none", overflow: 0 });
  if (damage <= minor) return Object.freeze({ severity: "minor", overflow: 0 });
  if (damage <= major) return Object.freeze({ severity: "major", overflow: 0 });
  if (damage <= severe) return Object.freeze({ severity: "severe", overflow: 0 });
  return Object.freeze({ severity: "severe", overflow: damage - severe });
}

export function vampireDicePool(pool: number, hunger: number): Readonly<{ normalDice: number; hungerDice: number }> {
  const safePool = Math.max(0, Math.trunc(Number.isFinite(pool) ? pool : 0));
  const safeHunger = Math.min(5, Math.max(0, Math.trunc(Number.isFinite(hunger) ? hunger : 0)));
  const hungerDice = Math.min(safePool, safeHunger);
  return Object.freeze({ normalDice: safePool - hungerDice, hungerDice });
}

export function updateResource(track: ResourceTrack, delta: number): ResourceTrack {
  const max = Math.max(0, Number.isFinite(track.max) ? track.max : 0);
  const current = Math.min(max, Math.max(0, (Number.isFinite(track.current) ? track.current : 0) + (Number.isFinite(delta) ? delta : 0)));
  return Object.freeze({ current, max });
}

export function isWithinDamageThresholds(thresholds: Readonly<{ minor: number; major: number; severe: number }>): boolean {
  return thresholds.minor >= 0 && thresholds.major >= thresholds.minor && thresholds.severe >= thresholds.major;
}