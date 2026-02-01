export function formatTokenCount(n: number): string {
  return n.toLocaleString();
}

export function formatBudgetBar(remainingPercent: number, width: number = 20): string {
  const filled = Math.round((remainingPercent / 100) * width);
  const empty = width - filled;
  return '[' + '='.repeat(filled) + ' '.repeat(empty) + ']';
}

export function formatMessageCost(inputTokens: number, outputTokens: number): string {
  const total = inputTokens + outputTokens;
  return `This response: ${formatTokenCount(inputTokens)} input + ${formatTokenCount(outputTokens)} output = ${formatTokenCount(total)} tokens`;
}

export function formatRunningTotal(
  totalInput: number,
  totalOutput: number,
  budgetTotal: number
): string {
  const totalUsed = totalInput + totalOutput;
  const remaining = Math.max(0, budgetTotal - totalUsed);
  const pct = ((remaining / budgetTotal) * 100).toFixed(1);
  return `Running total: ${formatTokenCount(totalUsed)} / ${formatTokenCount(budgetTotal)} tokens (${pct}% remaining)`;
}
