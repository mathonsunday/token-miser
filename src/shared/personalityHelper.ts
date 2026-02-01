import type { PersonalityTier } from '../../api/lib/types';

export function getPersonalityFromRemainingPercent(remainingPercent: number): PersonalityTier {
  if (remainingPercent > 66) return 'generous';
  if (remainingPercent > 33) return 'grumbling';
  return 'scrooge';
}

export function getAccentColor(tier: PersonalityTier): string {
  switch (tier) {
    case 'generous': return 'var(--accent-generous)';
    case 'grumbling': return 'var(--accent-grumbling)';
    case 'scrooge': return 'var(--accent-scrooge)';
  }
}

export function getTierLabel(tier: PersonalityTier): string {
  switch (tier) {
    case 'generous': return 'FLUSH WITH WEALTH';
    case 'grumbling': return 'GETTING NERVOUS';
    case 'scrooge': return 'FULL PANIC MODE';
  }
}
