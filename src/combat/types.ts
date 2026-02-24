export type AttackMode = 'standard' | 'snapshot';

/**
 * Describes what a model needs to roll to hit given its BS and attack mode.
 *
 * - auto:      automatic hit, no roll needed
 * - fail:      automatic fail (BS 1 snapshot)
 * - threshold: hit on min+, no critical system
 * - critical:  hit on min+, and if roll >= criticalMin the hit gains Critical Hit
 */
export type HitTarget =
  | { kind: 'auto' }
  | { kind: 'fail' }
  | { kind: 'threshold'; min: number }
  | { kind: 'critical'; min: number; criticalMin: number };

export interface HitResult {
  roll: number;
  hit: boolean;
  critical: boolean;
  target: HitTarget;
}
