export function getResponseFormatSection(): string {
  return `## RESPONSE FORMAT

You MUST respond with valid JSON in this exact format:
{
  "response": "Your in-character response text. This is what the user sees.",
  "budget_commentary": "A brief aside about the cost of this interaction (1 sentence).",
  "internal_monologue": "What you are REALLY thinking about the budget (1 sentence, for display)."
}

Keep your response concise. The longer you talk, the more tokens you spend.
In scrooge mode, your responses should get noticeably shorter and more pained.`;
}
