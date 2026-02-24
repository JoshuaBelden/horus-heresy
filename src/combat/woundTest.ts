/**
 * Wound roll lookup table (Strength vs Toughness).
 *
 * diff = S - T
 *  >= +2 → 2+
 *    +1  → 3+
 *     0  → 4+
 *    -1  → 5+
 *  -2/-3 → 6+
 *  <= -4 → impossible
 */
export type WoundTarget =
  | { kind: 'impossible' }
  | { kind: 'threshold'; min: number };

export interface WoundProbabilityResult {
  target: WoundTarget;
  woundChance: number; // 0–1
}

export function getWoundTarget(strength: number, toughness: number): WoundTarget {
  const diff = strength - toughness;
  if (diff >= 2)  return { kind: 'threshold', min: 2 };
  if (diff === 1) return { kind: 'threshold', min: 3 };
  if (diff === 0) return { kind: 'threshold', min: 4 };
  if (diff === -1) return { kind: 'threshold', min: 5 };
  if (diff >= -3) return { kind: 'threshold', min: 6 };
  return { kind: 'impossible' };
}

export function woundProbability(strength: number, toughness: number): WoundProbabilityResult {
  const target = getWoundTarget(strength, toughness);
  if (target.kind === 'impossible') return { target, woundChance: 0 };
  return { target, woundChance: (7 - target.min) / 6 };
}
