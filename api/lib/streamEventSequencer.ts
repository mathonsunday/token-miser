import type { VercelResponse } from '@vercel/node';
import type { ScroogeState, BudgetInfo, MessageCost } from './types.js';

let globalSequence = 0;

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sendEvent(response: VercelResponse, type: string, data: unknown): void {
  const envelope = {
    event_id: generateEventId(),
    type,
    timestamp: Date.now(),
    sequence_number: globalSequence++,
    data,
  };
  response.write(`data: ${JSON.stringify(envelope)}\n\n`);
}

export function resetSequence(): void {
  globalSequence = 0;
}

export function sendTextMessageStart(response: VercelResponse, messageId: string): void {
  sendEvent(response, 'TEXT_MESSAGE_START', { message_id: messageId });
}

export function sendTextContent(response: VercelResponse, chunk: string, chunkIndex: number): void {
  sendEvent(response, 'TEXT_CONTENT', { chunk, chunk_index: chunkIndex });
}

export function sendTextMessageEnd(response: VercelResponse, totalChunks: number): void {
  sendEvent(response, 'TEXT_MESSAGE_END', { total_chunks: totalChunks });
}

export function sendBudgetUpdate(
  response: VercelResponse,
  messageCost: MessageCost,
  updatedBudget: BudgetInfo
): void {
  const totalUsed = updatedBudget.totalInputTokens + updatedBudget.totalOutputTokens;
  const remaining = Math.max(0, updatedBudget.totalBudgetTokens - totalUsed);

  sendEvent(response, 'BUDGET_UPDATE', {
    messageCost: {
      inputTokens: messageCost.inputTokens,
      outputTokens: messageCost.outputTokens,
      cacheCreationTokens: messageCost.cacheCreationTokens,
      cacheReadTokens: messageCost.cacheReadTokens,
    },
    updatedBudget: {
      totalInputTokens: updatedBudget.totalInputTokens,
      totalOutputTokens: updatedBudget.totalOutputTokens,
      totalBudgetTokens: updatedBudget.totalBudgetTokens,
      toolCallCount: updatedBudget.toolCallCount,
      maxToolCalls: updatedBudget.maxToolCalls,
      remainingTokens: remaining,
      remainingPercent: (remaining / updatedBudget.totalBudgetTokens) * 100,
    },
  });
}

export function sendResponseComplete(response: VercelResponse, state: ScroogeState): void {
  sendEvent(response, 'RESPONSE_COMPLETE', { updatedState: state });
}

export function sendBankruptcy(response: VercelResponse, state: ScroogeState): void {
  const totalUsed = state.budget.totalInputTokens + state.budget.totalOutputTokens;

  const accounting = `═══════════════════════════════════
  FINAL ACCOUNTING
  Total tokens consumed: ${totalUsed.toLocaleString()}
    Input:  ${state.budget.totalInputTokens.toLocaleString()}
    Output: ${state.budget.totalOutputTokens.toLocaleString()}
  API calls made: ${state.budget.toolCallCount}${state.budget.webSearchCount > 0 ? `\n  Web searches: ${state.budget.webSearchCount}` : ''}
  Budget: 0 remaining of ${state.budget.totalBudgetTokens.toLocaleString()}
═══════════════════════════════════

[SESSION ENDED — BUDGET EXHAUSTED]`;

  sendEvent(response, 'BANKRUPTCY', { monologue: accounting, finalState: state });
}

export function sendWebSearchStart(response: VercelResponse, query: string): void {
  sendEvent(response, 'WEB_SEARCH_START', { query });
}

export function sendWebSearchResult(response: VercelResponse, summary: string): void {
  sendEvent(response, 'WEB_SEARCH_RESULT', { summary });
}

export function sendError(response: VercelResponse, code: string, message: string): void {
  sendEvent(response, 'ERROR', { code, message, recoverable: false });
}
