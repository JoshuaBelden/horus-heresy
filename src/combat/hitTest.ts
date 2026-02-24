import type { AttackMode, HitTarget, HitResult } from './types';

/**
 * BS → standard attack target lookup.
 *
 * BS   Target
 * 10+  A     (automatic hit)
 *  9   C3+   (2+ to hit, 3+ = Critical Hit)
 *  8   C4+   (2+ to hit, 4+ = Critical Hit)
 *  7   C5+   (2+ to hit, 5+ = Critical Hit)
 *  6   C6+   (2+ to hit, 6  = Critical Hit)
 *  5   2+
 *  4   3+
 *  3   4+
 *  2   5+
 *  1   6+
 */
function standardTarget(bs: number): HitTarget {
  if (bs >= 10) return { kind: 'auto' };
  if (bs === 9)  return { kind: 'critical', min: 2, criticalMin: 3 };
  if (bs === 8)  return { kind: 'critical', min: 2, criticalMin: 4 };
  if (bs === 7)  return { kind: 'critical', min: 2, criticalMin: 5 };
  if (bs === 6)  return { kind: 'critical', min: 2, criticalMin: 6 };
  if (bs === 5)  return { kind: 'threshold', min: 2 };
  if (bs === 4)  return { kind: 'threshold', min: 3 };
  if (bs === 3)  return { kind: 'threshold', min: 4 };
  if (bs === 2)  return { kind: 'threshold', min: 5 };
  return { kind: 'threshold', min: 6 }; // bs 1
}

/**
 * BS → snapshot attack target lookup.
 *
 * BS   Snap Shot
 * 10+  2+
 *  9   3+
 *  8   3+
 *  7   4+
 *  6   4+
 *  5   5+
 *  4   5+
 *  3   6+
 *  2   6+
 *  1   F     (automatic fail)
 */
function snapshotTarget(bs: number): HitTarget {
  if (bs >= 10) return { kind: 'threshold', min: 2 };
  if (bs === 9)  return { kind: 'threshold', min: 3 };
  if (bs === 8)  return { kind: 'threshold', min: 3 };
  if (bs === 7)  return { kind: 'threshold', min: 4 };
  if (bs === 6)  return { kind: 'threshold', min: 4 };
  if (bs === 5)  return { kind: 'threshold', min: 5 };
  if (bs === 4)  return { kind: 'threshold', min: 5 };
  if (bs === 3)  return { kind: 'threshold', min: 6 };
  if (bs === 2)  return { kind: 'threshold', min: 6 };
  return { kind: 'fail' }; // bs 1
}

export function getHitTarget(bs: number, mode: AttackMode): HitTarget {
  return mode === 'standard' ? standardTarget(bs) : snapshotTarget(bs);
}

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function resolveHit(target: HitTarget, roll: number): { hit: boolean; critical: boolean } {
  if (target.kind === 'auto')      return { hit: true,  critical: false };
  if (target.kind === 'fail')      return { hit: false, critical: false };
  if (target.kind === 'threshold') return { hit: roll >= target.min, critical: false };
  const hit = roll >= target.min;
  return { hit, critical: hit && roll >= target.criticalMin };
}

export interface HitProbability {
  hitChance: number;   // 0–1, P(hit) including crits
  critChance: number;  // 0–1, P(critical hit) — 0 when BS has no critical system
}

/**
 * Returns the theoretical hit/crit probabilities for a given BS and attack mode.
 * Does not roll dice — pure math from the target table.
 */
export function hitProbability(bs: number, mode: AttackMode): HitProbability {
  const t = getHitTarget(bs, mode);
  if (t.kind === 'auto')      return { hitChance: 1,                  critChance: 0 };
  if (t.kind === 'fail')      return { hitChance: 0,                  critChance: 0 };
  if (t.kind === 'threshold') return { hitChance: (7 - t.min) / 6,   critChance: 0 };
  // critical: hit on min+ (always 2), crit on criticalMin+
  return {
    hitChance:  (7 - t.min) / 6,
    critChance: (7 - t.criticalMin) / 6,
  };
}

export function rangedHitTest(bs: number, mode: AttackMode): HitResult {
  const target = getHitTarget(bs, mode);
  const roll = rollD6();
  const { hit, critical } = resolveHit(target, roll);
  return { roll, hit, critical, target };
}
