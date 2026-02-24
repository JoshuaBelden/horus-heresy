import type { SpecialRule } from './types';

export const specialRules: SpecialRule[] = [
  {
    name: 'Fury of the Legion',
    description:
      'When a Model with this Special Rule makes a Shooting Attack with a bolter, the bolter gains the Heavy (FP) Special Rule until that Shooting Attack is fully resolved.',
  },
];

export const specialRuleMap: Record<string, SpecialRule> = Object.fromEntries(
  specialRules.map((r) => [r.name, r])
);
