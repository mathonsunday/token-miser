import type { ScroogeState } from '../../api/lib/types';
import type { EventEnvelope } from '../types/events';

interface BudgetUpdateData {
  messageCost: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  updatedBudget: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalBudgetTokens: number;
    toolCallCount: number;
    maxToolCalls: number;
    remainingTokens: number;
    remainingPercent: number;
  };
}

export interface StreamCallbacks {
  onMessageStart?: (messageId: string) => void;
  onResponseChunk?: (chunk: string) => void;
  onWebSearchStart?: (query: string) => void;
  onWebSearchResult?: (summary: string) => void;
  onBudgetUpdate?: (data: BudgetUpdateData) => void;
  onComplete?: (data: { updatedState: ScroogeState }) => void;
  onBankruptcy?: (data: { monologue: string; finalState: ScroogeState }) => void;
  onError?: (error: string) => void;
}

class EventBuffer {
  private buffer = new Map<number, EventEnvelope>();
  private nextSequence = 0;
  private readonly maxBufferSize = 100;

  add(envelope: EventEnvelope): EventEnvelope[] {
    if (envelope.sequence_number === this.nextSequence) {
      this.nextSequence++;
      const ordered: EventEnvelope[] = [envelope];
      while (this.buffer.has(this.nextSequence)) {
        const next = this.buffer.get(this.nextSequence)!;
        this.buffer.delete(this.nextSequence);
        ordered.push(next);
        this.nextSequence++;
      }
      return ordered;
    }
    if (envelope.sequence_number > this.nextSequence) {
      if (this.buffer.size >= this.maxBufferSize) {
        const toFlush = Math.ceil(this.maxBufferSize * 0.25);
        const entries = Array.from(this.buffer.entries()).sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < toFlush && i < entries.length; i++) {
          this.buffer.delete(entries[i][0]);
        }
      }
      this.buffer.set(envelope.sequence_number, envelope);
    }
    return [];
  }

  flush(): EventEnvelope[] {
    const remaining = Array.from(this.buffer.values())
      .sort((a, b) => a.sequence_number - b.sequence_number);
    this.buffer.clear();
    return remaining;
  }
}

function handleEvent(envelope: EventEnvelope, callbacks: StreamCallbacks): void {
  const data = envelope.data as Record<string, unknown>;

  switch (envelope.type) {
    case 'TEXT_MESSAGE_START':
      callbacks.onMessageStart?.(data.message_id as string);
      break;
    case 'TEXT_CONTENT':
      callbacks.onResponseChunk?.(data.chunk as string);
      break;
    case 'TEXT_MESSAGE_END':
      break;
    case 'WEB_SEARCH_START':
      callbacks.onWebSearchStart?.(data.query as string);
      break;
    case 'WEB_SEARCH_RESULT':
      callbacks.onWebSearchResult?.(data.summary as string);
      break;
    case 'BUDGET_UPDATE':
      callbacks.onBudgetUpdate?.(data as unknown as BudgetUpdateData);
      break;
    case 'RESPONSE_COMPLETE':
      callbacks.onComplete?.(data as unknown as { updatedState: ScroogeState });
      break;
    case 'BANKRUPTCY':
      callbacks.onBankruptcy?.(data as unknown as { monologue: string; finalState: ScroogeState });
      break;
    case 'ERROR':
      callbacks.onError?.(data.message as string);
      break;
  }
}

export function streamChat(
  userInput: string,
  scroogeState: ScroogeState,
  callbacks: StreamCallbacks
): { promise: Promise<void> } {
  const promise = (async () => {
    const apiUrl = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      const response = await fetch(`${apiUrl}/api/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, scroogeState }),
      });

      if (!response.ok) {
        const error = await response.json();
        callbacks.onError?.(error.message || `HTTP ${response.status}`);
        return;
      }

      if (!response.body) {
        callbacks.onError?.('No response body');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const eventBuffer = new EventBuffer();
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as EventEnvelope;
            const ordered = eventBuffer.add(parsed);
            for (const evt of ordered) {
              handleEvent(evt, callbacks);
            }
          } catch {
            // Skip malformed events
          }
        }
      }

      // Flush any remaining buffered events
      const remaining = eventBuffer.flush();
      for (const evt of remaining) {
        handleEvent(evt, callbacks);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      callbacks.onError?.(message);
    }
  })();

  return { promise };
}
