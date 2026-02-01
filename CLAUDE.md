# Token Miser

## Two-Phase Development Model

This project uses a phase-aware development workflow. The current phase is stored in `.claude/phase`.

### Vibe Phase (`vibe`)

Exploration mode. Build features, try approaches, discard things. Accept that code will be messy and abstractions will be wrong.

**What's enforced:**

- ESLint + TypeScript type checking on every commit
- Dead code detection runs but warns only (does not block)

**What's blocked:**

- Test file creation is blocked by a Claude Code hook. Do not create `.test.ts`, `.test.tsx`, `.spec.ts`, or files in `__tests__/` directories. Tests written during vibe phase become anchors that resist refactoring and cost more to audit and delete than to write fresh later.

**What's expected:**

- Types must pass, lint must pass
- Architecture will change — that's fine
- Dead code will accumulate — that's fine, knip tracks it
- Focus on making things work, not making things clean

### Mature Phase (`mature`)

Stability mode. Architecture is settled. Now add tests, remove dead code, enforce strict quality gates.

**What's enforced:**

- Everything from vibe phase, plus:
- Dead code detection blocks commits
- Security scanning (semgrep) blocks commits
- Tests must pass to commit
- Commit messages must follow conventional commits format

**Transition:** Run `/mature` to switch phases. This runs a structured sequence: architecture diagrams, dead code audit, mutation-guided test generation, strict hook activation.

## Architecture

```
User (React UI)
    |
TerminalInterface (conversation + budget meter)
    |
POST /api/chat-stream (SSE)
    |
Vercel Function
    |-- Budget Tracker (canAfford, update, personality tier)
    |-- System Prompt Builder (character voice + budget context + response format)
    |-- Claude Haiku 4.5 (streaming response)
    |-- SSE Event Envelopes (sequence-numbered, typed)
    |
Frontend EventBuffer (reorder events)
    |
React State Updates -> Terminal + Budget Meter
```

## Project Structure

- `src/` — React frontend (TypeScript, Vite)
- `api/` — Vercel serverless functions (backend)
- `api/lib/budgetTracker.ts` — Budget management logic
- `api/lib/prompts/` — System prompt construction
- `src/components/` — UI components
- `src/shared/` — Shared utilities (personality helper, budget formatter)
- `src/services/` — Backend communication (SSE client)

## Conventions

- TypeScript strict mode, no `any` types
- React 19 with function components
- Server-Sent Events for streaming (not WebSockets)
- Sequence-numbered event protocol
- ESLint complexity limit: max 10
- ESLint strictTypeChecked ruleset — the linter enforces type safety beyond what `tsc` catches

## TypeScript Design Guidance

- Prefer discriminated unions over boolean flags or string enums for state modeling. The `switch-exhaustiveness-check` rule enforces that all cases are handled.
- Use `satisfies` over `as` for type narrowing — `as` silences the compiler, `satisfies` validates against it.
- Let TypeScript infer return types. Don't annotate what the compiler already knows — explicit return types add maintenance burden without safety.
- Catch blocks should type-narrow errors (`if (error instanceof Error)`) rather than casting to `any`.
- Avoid `!` non-null assertions. If a value might be null, handle the null case or restructure to eliminate it.
