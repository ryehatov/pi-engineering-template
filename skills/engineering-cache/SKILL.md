---
name: engineering-cache
description: Use when development-loop selects a narrow lookup of repository cache notes, or when verified project-specific knowledge has been selected for cache storage. Handles non-obvious investigation results, failed approaches, constraints, invariants, counterexamples, and verification assumptions.
---

# Engineering Cache

Treat repository cache notes as advisory historical computation, never as current authority. Current governing sources, code, configuration, tests, and verification evidence take precedence.

## Retrieve narrowly

If `docs/engineering/cache/` does not exist, continue without a cache.

Search only for terms relevant to the current task. Do not load the directory wholesale. Use repository-native search, FFF, or exact grep. For each candidate note, check its invalidation surface before relying on it:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs check <note.md>
```

Interpret `fresh-candidate` only as "no declared invalidating repository change was detected." It is not proof that the note is correct. Revalidate material claims against current repository evidence.

## Store selected findings

Create a cache note only after verified work has established an expensive project-specific finding that is worth preserving. Lifecycle policy, ADR selection, and reusable-Skill promotion belong to `development-loop`, not this skill.

Do not record task summaries, file listings, current API inventories, line numbers, or prose copies of configuration.

Create notes lazily with:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs new <slug> [watch-path ...]
```

Use stable files or directories as `watch` paths. Do not use globs. Keep one finding per note and keep the note short. Record:

- `Finding`: the non-obvious conclusion.
- `Evidence`: current tests, commands, code, specifications, or primary external sources.
- `Do not retry`: a failed approach only when repeating it is plausible and costly.
- `Revalidate when`: semantic conditions that can invalidate the finding beyond the declared watch paths.

Run schema checks with:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs lint
```

A stale or unknown note is a pointer for renewed investigation, not an instruction.
