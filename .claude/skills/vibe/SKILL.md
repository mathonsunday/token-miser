---
name: vibe
description: Switch to vibe coding phase — exploration mode with no test enforcement
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Bash
---

# Switch to Vibe Phase

Set the project to vibe coding phase.

1. Write `vibe` to `.claude/phase`
2. Confirm the phase switch by reading `.claude/phase`
3. Tell the user what constraints are now active:
   - ESLint + TypeScript type checking enforced on commit
   - Dead code detection runs but warns only
   - Test file creation is BLOCKED — do not create test files
   - Focus on features and exploration, not cleanup
