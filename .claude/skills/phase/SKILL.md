---
name: phase
description: Show the current development phase and what's enforced
disable-model-invocation: true
allowed-tools:
  - Read
  - Bash
---

# Show Current Phase

1. Read `.claude/phase` to get the current phase
2. Display the current phase and explain what's enforced:

**If vibe:**

- ESLint + TypeScript type checking on commit
- Dead code detection warns only (does not block)
- Test file creation is BLOCKED
- Focus: features and exploration

**If mature:**

- ESLint + TypeScript type checking on commit
- Dead code detection BLOCKS commits
- Security scanning (semgrep) BLOCKS commits
- Tests must pass to commit
- Commit messages must follow conventional commits
- Test file creation is allowed
- Focus: stability, testing, cleanup
