import { formatMessageCost, formatRunningTotal } from '../shared/budgetFormatter';
import './UsageBreakdown.css';

interface UsageBreakdownProps {
  inputTokens: number;
  outputTokens: number;
  totalInput: number;
  totalOutput: number;
  budgetTotal: number;
}

export function UsageBreakdown({
  inputTokens,
  outputTokens,
  totalInput,
  totalOutput,
  budgetTotal,
}: UsageBreakdownProps) {
  return (
    <div className="usage-breakdown">
      <div className="usage-breakdown__line">
        [COST] {formatMessageCost(inputTokens, outputTokens)}
      </div>
      <div className="usage-breakdown__line">
        [COST] {formatRunningTotal(totalInput, totalOutput, budgetTotal)}
      </div>
    </div>
  );
}
