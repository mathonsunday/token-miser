import type { PersonalityTier } from '../../api/lib/types';
import { formatTokenCount, formatBudgetBar } from '../shared/budgetFormatter';
import { getAccentColor, getTierLabel } from '../shared/personalityHelper';
import './BudgetMeter.css';

interface BudgetMeterProps {
  totalBudget: number;
  totalUsed: number;
  toolCallCount: number;
  maxToolCalls: number;
  tier: PersonalityTier;
}

export function BudgetMeter({
  totalBudget,
  totalUsed,
  toolCallCount,
  maxToolCalls,
  tier,
}: BudgetMeterProps) {
  const remaining = Math.max(0, totalBudget - totalUsed);
  const remainingPct = (remaining / totalBudget) * 100;
  const accentColor = getAccentColor(tier);
  const label = getTierLabel(tier);

  return (
    <div className="budget-meter" style={{ borderColor: accentColor }}>
      <div className="budget-meter__header">
        <span className="budget-meter__label" style={{ color: accentColor }}>
          {label}
        </span>
      </div>
      <div className="budget-meter__bar">
        <span style={{ color: accentColor }}>
          BUDGET: {formatBudgetBar(remainingPct)} {remainingPct.toFixed(0)}%
        </span>
      </div>
      <div className="budget-meter__stats">
        <span>Tokens: {formatTokenCount(totalUsed)} / {formatTokenCount(totalBudget)}</span>
        <span>API Calls: {toolCallCount} / {maxToolCalls}</span>
      </div>
    </div>
  );
}
