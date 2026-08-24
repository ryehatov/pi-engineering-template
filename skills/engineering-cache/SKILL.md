---
name: engineering-cache
description: Use when development-loop selects a narrow lookup of repository cache notes, or when verified project-specific knowledge has been selected for cache storage. Handles non-obvious investigation results, failed approaches, constraints, invariants, counterexamples, and verification assumptions.
---

# Engineering Cache

Treat repository cache notes as advisory historical computation, never as current authority. Current governing sources, code, configuration, tests, and verification evidence take precedence.

## Retrieve narrowly

If `docs/engineering/cache/` does not exist, continue without a cache.

Search only for terms relevant to the current task. Do not load the directory wholesale. Use repository-native search, FFF, or exact grep. For each relevant candidate, check its invalidation surface before relying on it:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs check <note.md>
```

Use only active `fresh-candidate` notes as retrieval candidates. `fresh-candidate` means only that the declared watch surface still matches the verified repository state; it is not proof that the finding remains semantically correct. Revalidate material claims against current repository evidence. Treat stale, unknown, and superseded notes only as pointers for renewed investigation.

Legacy notes without `watch_fingerprint` remain supported through commit-history checks. New notes use a content fingerprint so equivalent watched state can survive rebases, cherry-picks, squashes, and other history rewrites.

## Store selected findings

Create a cache note only after verified work has established an expensive project-specific finding that is worth preserving. Lifecycle policy, ADR selection, and reusable-Skill promotion belong to `development-loop`, not this skill.

Do not record task summaries, file listings, current API inventories, line numbers, or prose copies of configuration. Before creating a note, search narrowly for an active note with the same durable finding. Update or supersede existing knowledge instead of duplicating it.

Create notes lazily with:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs new <slug> [watch-path ...]
```

`new` fingerprints the prospective Git state of the declared watch surface without modifying the real index. This permits a verified implementation change and its cache note to enter the same commit. A watch path may name an absent future path when its later appearance should invalidate the finding.

Use stable files or directories as `watch` paths. Do not use globs or duplicate paths. Keep one finding per note and keep the note short. Record:

- `Finding`: the non-obvious conclusion.
- `Evidence`: current tests, commands, code, specifications, or primary external sources.
- `Do not retry`: a failed approach only when repeating it is plausible and costly.
- `Revalidate when`: semantic conditions that can invalidate the finding beyond the declared watch paths.

When a finding is replaced, mark the old note `status: superseded` and add `superseded_by: K-<replacement>`.

Run schema checks with:

```bash
node ~/.pi/agent/skills/engineering-cache/scripts/cache.mjs lint
```
