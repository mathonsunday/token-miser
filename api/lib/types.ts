export interface MessageCost {
  messageNumber: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  timestamp: number;
  userInputPreview: string;
}

export interface BudgetInfo {
  totalBudgetTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  toolCallCount: number;
  maxToolCalls: number;
  messageHistory: MessageCost[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type PersonalityTier = 'generous' | 'grumbling' | 'scrooge';

export interface ScroogeState {
  budget: BudgetInfo;
  conversationHistory: ConversationMessage[];
  personalityTier: PersonalityTier;
  isBankrupt: boolean;
}

export const DEFAULT_BUDGET: BudgetInfo = {
  totalBudgetTokens: 20_000,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheCreationTokens: 0,
  totalCacheReadTokens: 0,
  toolCallCount: 0,
  maxToolCalls: 15,
  messageHistory: [],
};
