import type { BudgetInfo, MessageCost, PersonalityTier } from './types.js';

interface BudgetCheckResult {
  allowed: boolean;
  reason?: 'TOKEN_BUDGET_EXCEEDED' | 'TOOL_CALL_LIMIT_EXCEEDED';
}

export function canAffordRequest(budget: BudgetInfo): BudgetCheckResult {
  const totalUsed = budget.totalInputTokens + budget.totalOutputTokens;
  if (totalUsed >= budget.totalBudgetTokens) {
    return { allowed: false, reason: 'TOKEN_BUDGET_EXCEEDED' };
  }
  if (budget.toolCallCount >= budget.maxToolCalls) {
    return { allowed: false, reason: 'TOOL_CALL_LIMIT_EXCEEDED' };
  }
  return { allowed: true };
}

interface UsageData {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export function updateBudget(
  budget: BudgetInfo,
  usage: UsageData,
  userInputPreview: string,
  webSearchCount = 0
): BudgetInfo {
  const messageCost: MessageCost = {
    messageNumber: budget.messageHistory.length + 1,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    webSearchCount,
    timestamp: Date.now(),
    userInputPreview: userInputPreview.slice(0, 50),
  };

  return {
    ...budget,
    totalInputTokens: budget.totalInputTokens + usage.input_tokens,
    totalOutputTokens: budget.totalOutputTokens + usage.output_tokens,
    totalCacheCreationTokens: budget.totalCacheCreationTokens + (usage.cache_creation_input_tokens ?? 0),
    totalCacheReadTokens: budget.totalCacheReadTokens + (usage.cache_read_input_tokens ?? 0),
    toolCallCount: budget.toolCallCount + 1,
    webSearchCount: budget.webSearchCount + webSearchCount,
    messageHistory: [...budget.messageHistory, messageCost],
  };
}

export function getRemainingPercent(budget: BudgetInfo): number {
  const totalUsed = budget.totalInputTokens + budget.totalOutputTokens;
  const remaining = Math.max(0, budget.totalBudgetTokens - totalUsed);
  return (remaining / budget.totalBudgetTokens) * 100;
}

export function getPersonalityFromBudget(budget: BudgetInfo): PersonalityTier {
  const pct = getRemainingPercent(budget);
  if (pct > 66) return 'generous';
  if (pct > 33) return 'grumbling';
  return 'scrooge';
}
