export type DamageSeverity = "none" | "minor" | "major" | "severe";
export interface DamageResult {
  readonly severity: DamageSeverity;
  readonly overflow: number;
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

export function isWithinDamageThresholds(thresholds: Readonly<{ minor: number; major: number; severe: number }>): boolean {
  return thresholds.minor >= 0 && thresholds.major >= thresholds.minor && thresholds.severe >= thresholds.major;
}
