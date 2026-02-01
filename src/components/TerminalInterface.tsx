import { useState, useRef, useEffect, useCallback } from 'react';
import type { ScroogeState, PersonalityTier } from '../../api/lib/types';
import { DEFAULT_BUDGET } from '../../api/lib/types';
import { streamChat } from '../services/backendStream';
import { getPersonalityFromRemainingPercent } from '../shared/personalityHelper';
import { MinimalInput } from './MinimalInput';
import { BudgetMeter } from './BudgetMeter';
import { UsageBreakdown } from './UsageBreakdown';
import './TerminalInterface.css';

interface TerminalLine {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'cost' | 'bankruptcy';
  content: string;
  costData?: {
    inputTokens: number;
    outputTokens: number;
    totalInput: number;
    totalOutput: number;
    budgetTotal: number;
  };
}

export function TerminalInterface() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'welcome',
      type: 'system',
      content: '═══ THE VAULT IS OPEN ═══\nType anything to begin. Remember: there are NO limits here.\n',
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [scroogeState, setScroogeState] = useState<ScroogeState>({
    budget: { ...DEFAULT_BUDGET },
    conversationHistory: [],
    personalityTier: 'generous',
    isBankrupt: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentResponseRef = useRef<string>('');
  const currentLineIdRef = useRef<string>('');

  // Auto-scroll on new lines
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const totalUsed = scroogeState.budget.totalInputTokens + scroogeState.budget.totalOutputTokens;
  const remainingPct = ((Math.max(0, scroogeState.budget.totalBudgetTokens - totalUsed)) / scroogeState.budget.totalBudgetTokens) * 100;
  const tier: PersonalityTier = getPersonalityFromRemainingPercent(remainingPct);

  const addLine = useCallback((line: TerminalLine) => {
    setLines(prev => [...prev, line]);
  }, []);

  const updateCurrentLine = useCallback((content: string) => {
    setLines(prev =>
      prev.map(line =>
        line.id === currentLineIdRef.current
          ? { ...line, content }
          : line
      )
    );
  }, []);

  const handleInput = useCallback((userInput: string) => {
    if (isStreaming || scroogeState.isBankrupt) return;

    // Add user line
    addLine({
      id: `user_${Date.now()}`,
      type: 'user',
      content: userInput,
    });

    // Create placeholder for assistant response
    const assistantLineId = `assistant_${Date.now()}`;
    currentLineIdRef.current = assistantLineId;
    currentResponseRef.current = '';

    addLine({
      id: assistantLineId,
      type: 'assistant',
      content: '',
    });

    setIsStreaming(true);

    streamChat(userInput, scroogeState, {
      onResponseChunk: (chunk) => {
        currentResponseRef.current += chunk;
        updateCurrentLine(currentResponseRef.current);
      },

      onBudgetUpdate: (data) => {
        addLine({
          id: `cost_${Date.now()}`,
          type: 'cost',
          content: '',
          costData: {
            inputTokens: data.messageCost.inputTokens,
            outputTokens: data.messageCost.outputTokens,
            totalInput: data.updatedBudget.totalInputTokens,
            totalOutput: data.updatedBudget.totalOutputTokens,
            budgetTotal: data.updatedBudget.totalBudgetTokens,
          },
        });
      },

      onComplete: (data) => {
        setScroogeState(data.updatedState);
        setIsStreaming(false);
      },

      onBankruptcy: (data) => {
        addLine({
          id: `bankruptcy_${Date.now()}`,
          type: 'bankruptcy',
          content: data.monologue,
        });
        setScroogeState(prev => ({ ...prev, isBankrupt: true }));
        setIsStreaming(false);
      },

      onError: (error) => {
        addLine({
          id: `error_${Date.now()}`,
          type: 'system',
          content: `[ERROR] ${error}`,
        });
        setIsStreaming(false);
      },
    });
  }, [isStreaming, scroogeState, addLine, updateCurrentLine]);

  return (
    <div className="terminal">
      <BudgetMeter
        totalBudget={scroogeState.budget.totalBudgetTokens}
        totalUsed={totalUsed}
        toolCallCount={scroogeState.budget.toolCallCount}
        maxToolCalls={scroogeState.budget.maxToolCalls}
        tier={tier}
      />

      <div className="terminal__conversation" ref={scrollRef}>
        {lines.map(line => (
          <div key={line.id} className={`terminal__line terminal__line--${line.type}`}>
            {line.type === 'user' && <span className="terminal__prefix">&gt; </span>}
            {line.type === 'cost' && line.costData ? (
              <UsageBreakdown
                inputTokens={line.costData.inputTokens}
                outputTokens={line.costData.outputTokens}
                totalInput={line.costData.totalInput}
                totalOutput={line.costData.totalOutput}
                budgetTotal={line.costData.budgetTotal}
              />
            ) : (
              <span className="terminal__text">{line.content}</span>
            )}
          </div>
        ))}
        {isStreaming && (
          <div className="terminal__thinking">...counting coins...</div>
        )}
      </div>

      <MinimalInput
        onSubmit={handleInput}
        disabled={isStreaming || scroogeState.isBankrupt}
        placeholder={
          scroogeState.isBankrupt
            ? 'THE VAULT IS EMPTY'
            : isStreaming
              ? '...counting coins...'
              : 'Speak to The Token Miser...'
        }
      />
    </div>
  );
}
