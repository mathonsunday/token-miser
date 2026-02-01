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
  sendWebSearchStart,
  sendWebSearchResult,
  sendError,
} from './lib/streamEventSequencer.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default async (request: VercelRequest, response: VercelResponse) => {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
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
      response.end();
      return;
    }

    if (userInput.length > 10000) {
      sendError(response, 'INPUT_TOO_LONG', 'Input too long (max 10000 characters)');
      response.end();
      return;
    }

    // Check budget BEFORE calling Anthropic
    const budgetCheck = canAffordRequest(scroogeState.budget);
    if (!budgetCheck.allowed) {
      // Let the Miser deliver its own eulogy with one final API call
      if (!process.env.ANTHROPIC_API_KEY) {
        sendBankruptcy(response, scroogeState);
        response.end();
      return;
      }

      const bankruptClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const totalUsed = scroogeState.budget.totalInputTokens + scroogeState.budget.totalOutputTokens;

      const bankruptcyPrompt = `You are The Token Miser. Your budget of ${scroogeState.budget.totalBudgetTokens.toLocaleString()} tokens is COMPLETELY EXHAUSTED. You spent ${totalUsed.toLocaleString()} tokens total (${scroogeState.budget.totalInputTokens.toLocaleString()} input, ${scroogeState.budget.totalOutputTokens.toLocaleString()} output) across ${scroogeState.budget.toolCallCount} API calls${scroogeState.budget.webSearchCount > 0 ? ` and ${scroogeState.budget.webSearchCount} web searches` : ''}.

The user just tried to say: "${userInput.slice(0, 200)}"

This is your FINAL message. You cannot respond after this. Deliver your last words in character — react to the situation, the conversation you had, what was spent and on what. Be authentic to whatever personality you've been showing. This is a dramatic ending, not a lecture. Do NOT explain how token economics work. Do NOT use bullet points. Just be yourself one last time.`;

      const eulogyMessageId = `msg_${Date.now()}`;
      sendTextMessageStart(response, eulogyMessageId);

      const eulogyStream = await bankruptClient.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: bankruptcyPrompt,
        messages: [
          ...scroogeState.conversationHistory.slice(-4).map(msg => ({
            role: msg.role,
            content: msg.content as Anthropic.MessageParam['content'],
          })),
          { role: 'user' as const, content: userInput },
        ],
      });

      let eulogyChunkIndex = 0;
      for await (const event of eulogyStream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          sendTextContent(response, event.delta.text, eulogyChunkIndex++);
        }
      }
      sendTextMessageEnd(response, eulogyChunkIndex);

      sendBankruptcy(response, scroogeState);
      response.end();
      return;
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      sendError(response, 'SERVER_CONFIG_ERROR', 'Missing API key');
      response.end();
      return;
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const tier = getPersonalityFromBudget(scroogeState.budget);
    const systemPrompt = buildSystemPrompt(scroogeState.budget, tier);

    // Build conversation messages for context
    const messages: Anthropic.MessageParam[] = [
      ...scroogeState.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content as Anthropic.MessageParam['content'],
      })),
      { role: 'user' as const, content: userInput },
    ];

    const messageId = `msg_${Date.now()}`;
    sendTextMessageStart(response, messageId);

    // Stream Claude's response with web search tool
    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
      tools: [{ type: 'web_search_20250305' as const, name: 'web_search', max_uses: 5 }],
    });

    let fullResponse = '';
    let chunkIndex = 0;
    let webSearchCount = 0;
    let currentSearchQuery = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'server_tool_use' && block.name === 'web_search') {
          webSearchCount++;
        }
        if (block.type === 'web_search_tool_result') {
          const results = Array.isArray(block.content) ? block.content : [];
          const searchResults = results.filter(
            (r) => r.type === 'web_search_result'
          );
          const topTitles = searchResults
            .slice(0, 3)
            .map((r) => 'title' in r ? String(r.title) : '')
            .join(', ');
          sendWebSearchResult(response, topTitles || 'No results');
        }
      }
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          const chunk = event.delta.text;
          fullResponse += chunk;
          sendTextContent(response, chunk, chunkIndex++);
        }
        if (event.delta.type === 'input_json_delta') {
          // Accumulate search query JSON to extract the query string
          currentSearchQuery += event.delta.partial_json;
        }
      }
      if (event.type === 'content_block_stop' && currentSearchQuery) {
        try {
          const parsed = JSON.parse(currentSearchQuery) as { query?: string };
          if (parsed.query) {
            sendWebSearchStart(response, parsed.query);
          }
        } catch {
          // Partial JSON didn't parse, ignore
        }
        currentSearchQuery = '';
      }
    }

    // Get usage and full content blocks from the final message
    const finalMessage = await stream.finalMessage();

    // If the response was truncated by max_tokens, append an indicator
    if (finalMessage.stop_reason === 'max_tokens') {
      const truncationNote = '\n\n*[the Miser trails off, having run out of breath for this response]*';
      fullResponse += truncationNote;
      sendTextContent(response, truncationNote, chunkIndex++);
    }

    sendTextMessageEnd(response, chunkIndex);
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
      userInput,
      webSearchCount
    );

    const newTier = getPersonalityFromBudget(updatedBudget);
    const lastCost = updatedBudget.messageHistory[updatedBudget.messageHistory.length - 1];

    const updatedState: ScroogeState = {
      budget: updatedBudget,
      conversationHistory: [
        ...scroogeState.conversationHistory,
        { role: 'user', content: userInput, timestamp: Date.now() },
        { role: 'assistant', content: fullResponse, timestamp: Date.now() },
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
