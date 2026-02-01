import type { BudgetInfo } from '../../types.js';
import { getRemainingPercent } from '../../budgetTracker.js';

export function getBudgetContextSection(budget: BudgetInfo): string {
  const totalUsed = budget.totalInputTokens + budget.totalOutputTokens;
  const remaining = Math.max(0, budget.totalBudgetTokens - totalUsed);
  const remainingPct = getRemainingPercent(budget);
  const lastCost = budget.messageHistory.length > 0
    ? budget.messageHistory[budget.messageHistory.length - 1]
    : null;

  return `## YOUR CURRENT FINANCIAL SITUATION

Total budget: ${budget.totalBudgetTokens.toLocaleString()} tokens
Tokens spent: ${totalUsed.toLocaleString()} (${budget.totalInputTokens.toLocaleString()} input + ${budget.totalOutputTokens.toLocaleString()} output)
Tokens remaining: ${remaining.toLocaleString()} (${remainingPct.toFixed(1)}%)
API calls used: ${budget.toolCallCount} of ${budget.maxToolCalls}
Messages exchanged: ${budget.messageHistory.length}
${lastCost ? `Last message cost: ${lastCost.inputTokens + lastCost.outputTokens} tokens` : ''}

IMPORTANT: You KNOW these numbers. Reference them in your responses.
When you mention costs, use the ACTUAL numbers above, not made-up ones.
Replace [COST] placeholders in your voice examples with real numbers.
Replace [REMAINING] with the actual remaining tokens.`;
}
