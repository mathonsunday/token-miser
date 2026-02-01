import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { ScroogeState } from './lib/types.js';
import { canAffordRequest, updateBudget, getPersonalityFromBudget } from './lib/budgetTracker.js';
import { buildSystemPrompt } from './lib/prompts/systemPromptBuilder.js';
import {
  resetSequence,
  sendTextMessageStart,
  sendTextContent,
  sendTextMessageEnd,
  sendBudgetUpdate,
  sendResponseComplete,
  sendBankruptcy,
  sendError,
} from './lib/streamEventSequencer.js';

export default async (request: VercelRequest, response: VercelResponse) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');

  resetSequence();

  try {
    const { userInput, scroogeState } = request.body as {
      userInput: string;
      scroogeState: ScroogeState;
    };

    if (!userInput || typeof userInput !== 'string') {
      sendError(response, 'MISSING_INPUT', 'Missing userInput');
      return response.end();
    }

    if (userInput.length > 2000) {
      sendError(response, 'INPUT_TOO_LONG', 'Input too long (max 2000 characters)');
      return response.end();
    }

    // Check budget BEFORE calling Anthropic
    const budgetCheck = canAffordRequest(scroogeState.budget);
    if (!budgetCheck.allowed) {
      sendBankruptcy(response, scroogeState);
      return response.end();
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      sendError(response, 'SERVER_CONFIG_ERROR', 'Missing API key');
      return response.end();
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const tier = getPersonalityFromBudget(scroogeState.budget);
    const systemPrompt = buildSystemPrompt(scroogeState.budget, tier);

    // Build conversation messages for context
    const messages: Anthropic.MessageParam[] = [
      ...scroogeState.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user' as const, content: userInput },
    ];

    const messageId = `msg_${Date.now()}`;
    sendTextMessageStart(response, messageId);

    // Stream Claude's response
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    });

    let fullResponse = '';
    let chunkIndex = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const chunk = event.delta.text;
        fullResponse += chunk;
        sendTextContent(response, chunk, chunkIndex++);
      }
    }

    sendTextMessageEnd(response, chunkIndex);

    // Get usage from the final message
    const finalMessage = await stream.finalMessage();
    const usage = finalMessage.usage;

    // Update budget with actual usage
    const updatedBudget = updateBudget(
      scroogeState.budget,
      {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cache_creation_input_tokens: (usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: (usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
      },
      userInput
    );

    const newTier = getPersonalityFromBudget(updatedBudget);
    const lastCost = updatedBudget.messageHistory[updatedBudget.messageHistory.length - 1];

    // Parse Claude's JSON response for the display text
    let displayText = fullResponse;
    try {
      const firstBrace = fullResponse.indexOf('{');
      const lastBrace = fullResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const parsed = JSON.parse(fullResponse.substring(firstBrace, lastBrace + 1));
        if (parsed.response) {
          displayText = parsed.response;
          if (parsed.budget_commentary) {
            displayText += `\n\n  [${parsed.budget_commentary}]`;
          }
          if (parsed.internal_monologue) {
            displayText += `\n  (${parsed.internal_monologue})`;
          }
        }
      }
    } catch {
      // If JSON parsing fails, use the raw response
    }

    const updatedState: ScroogeState = {
      budget: updatedBudget,
      conversationHistory: [
        ...scroogeState.conversationHistory,
        { role: 'user', content: userInput, timestamp: Date.now() },
        { role: 'assistant', content: displayText, timestamp: Date.now() },
      ],
      personalityTier: newTier,
      isBankrupt: false,
    };

    sendBudgetUpdate(response, lastCost, updatedBudget);
    sendResponseComplete(response, updatedState);
    response.end();
  } catch (error) {
    console.error('Streaming error:', error);
    sendError(response, 'STREAM_ERROR', error instanceof Error ? error.message : 'Unknown error');
    response.end();
  }
};
