---
name: engineering-cache
description: Use when prior non-obvious investigation, failed approaches, external constraints, or project-specific findings may affect the current engineering task, or after verified work when deciding whether a finding is worth preserving for reuse.
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

## Distill only after verification

After the task is verified, preserve a finding only when rediscovering it is likely to cost more than maintaining it and the risk of stale guidance.

Route the result as follows:

- **Discard**: easy to rediscover from one file, one command, Git history, or standard documentation.
- **ADR**: hard to reverse, surprising without context, and the result of a genuine trade-off.
- **Cache note**: project-specific finding, failed approach, invariant, external constraint, counterexample, or verification assumption that was expensive to establish.
- **Skill**: a procedure that has succeeded repeatedly and is useful beyond one project.

Do not record task summaries, file listings, current API inventories, line numbers, or prose copies of configuration.

## Cache note contract

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
