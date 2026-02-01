---
name: mature
description: Transition from vibe to mature phase — structured maturation sequence
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
---

# Transition to Mature Phase

Run the full maturation sequence. This is an interactive process — pause for user review at each step.

## Steps

### 1. Switch phase

Write `mature` to `.claude/phase`.

### 2. Check dependencies

Verify these dev dependencies are installed. If any are missing, install them:

- `husky`
- `lint-staged`
- `@commitlint/cli`
- `@commitlint/config-conventional`
- `prettier`
- `knip`
- `eslint-plugin-redos`
- `@mathonsunday/mutation-test-gen`

Run `npm install` if anything was added.

### 3. Generate architecture diagram

Create a mermaid diagram of the current architecture by reading through `src/` and `api/`. Present it to the user for review. Ask if anything should be simplified or removed before proceeding.

### 4. Dead code audit

Run `npx knip` and present the results. Ask the user which unused exports, files, or dependencies should be removed. Remove what they approve.

### 5. Mutation-guided test generation

Run `npx mutation-test-gen` on the core modules:

- `api/lib/budgetTracker.ts`
- `src/shared/personalityHelper.ts`
- `src/shared/budgetFormatter.ts`
- Any other files the user identifies as core

Present the mutations and use them to guide writing tests that catch real bugs. Focus on boundary conditions and error paths.

### 6. Confirm activation

Tell the user:

- Strict pre-commit hooks are now active
- Dead code detection blocks commits
- Security scanning blocks commits
- Tests must pass to commit
- Commit messages must follow conventional commits format
- Run `/vibe` to switch back if needed
