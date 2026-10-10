# Pi Engineering Design

## Design goal

The template separates enforcement, contextual method, runtime optimization, and documentation. A rule lives at the lowest layer that can enforce or supply it correctly.

```text
operator
  |
  v
Pi parent ---------------- native session, model registry, compaction primitives
  |
  +-- SoL-Pi ------------ parent tool/result/context optimization
  +-- pi-pstack --------- playbooks, Poteto Mode, role selection context
  +-- pi-goal ----------- bounded autonomous continuation
  +-- Ponytail ---------- implementation-minimization context
  +-- pi-subagents ------ child lifecycle, capabilities, isolation, authority
  +-- supporting tools -- search, diagnostics, web, UI, context inspection
  |
  +-- executable configuration
       settings.json
       subagent-config.json
       pstack-models.json
       sol-pi.json
```

There is intentionally no template-level `AGENTS.md` between the runtime and these mechanisms.

## Why no global agent contract

A global prompt is appropriate only for instructions that the model must judge globally and that no lower layer can provide. This template no longer has such generic instructions.

Model allowlists, thinking ceilings, tool access, concurrency, scheduling authority, provider configuration, and SoL-Pi mechanism selection are machine-readable controls. Repeating them in `AGENTS.md` would add prompt tokens without strengthening enforcement and would create a second policy copy that can drift.

Pstack and Ponytail already provide their own runtime guidance. SoL-Pi operates through extension hooks and tools. When the operator starts a session by inspecting /pstack status and enabling `/poteto-mode`, duplicating any of those mechanisms in a repository-global prompt is unnecessary.

Downstream repositories remain free to add project-specific agent instructions for local architecture, domain constraints, compatibility contracts, or other facts that the harness cannot infer.

## Source-of-truth boundaries

| Concern | Authoritative surface |
| --- | --- |
| Pi parent defaults | `settings.json` |
| Generic subagent routing and tool capabilities | `settings.json` |
| Allowed delegated models | `settings.json` `modelScope` |
| Subscription providers | Pi native `openai` and `anthropic` OAuth |
| Delegation context, limits, and authority | `subagent-config.json` |
| Pstack role selectors | `pstack-models.json` |
| SoL-Pi mechanism enablement and cache ratio | `sol-pi.json` |
| Pstack method and Poteto Mode | `@zenspc/pi-pstack` runtime |
| Autonomous continuation | `pi-goal.json`, `@narumitw/pi-goal` runtime |
| Parent tool/result/context optimization | SoL-Pi runtime |
| Ponytail implementation guidance | Ponytail runtime |
| Human rationale | `docs/model-policy.md`, this document |
| Operator procedures | `docs/operations.md` |
| Cross-file invariant checking | `scripts/verify-template.mjs` |

Documentation explains the configuration but does not override it.

## Parent context-efficiency boundary

SoL-Pi is a parent-runtime optimization layer, not a workflow orchestrator.

- **Action Fusion** augments Pi's mutation tools so a requested post-mutation validation can execute in the same tool observation. It does not decide what should be implemented or what validation is sufficient.
- **ObservationPack** changes how large text observations are replayed into later provider requests while preserving exact recall from session-derived storage. It does not replace artifact verification.
- **Evidence-Preserving Reducer (EPR)** is disabled in the committed profile.
- **Online Context Compact (OCC)** is disabled in the committed profile.

SoL-Pi may archive observations under the Pi session-derived storage root. It does not define a second persistent storage location.

The template enables Action Fusion and ObservationPack, while EPR and OCC remain disabled. Their configuration remains isolated in `sol-pi.json` so it can be reviewed or reverted independently from model routing and delegation policy.

## Model portfolio

The portfolio is intentionally small and role-oriented. Its current assignments are documented in `docs/model-policy.md`; the executable assignments are only the JSON configuration files.

The verifier checks that implementation roles resolve to OpenAI, reviewers to native Anthropic models, and pstack selectors match the strict model scope. Pstack injects the table as guidance into the parent; the strict pi-subagents model scope is the runtime boundary. The verifier does not require model-routing prose to exist anywhere.

This allows a future model rebalance to change configuration and rationale without also editing a global prompt.

## Provider boundary

Pi's native `openai` provider uses Sign in with ChatGPT, and its native `anthropic` provider supports Claude Pro/Max subscription OAuth. No external Claude CLI adapter is required.

Provider policy therefore stays in executable configuration instead of a behavioral request to the model.

## Delegation boundary

`pi-subagents` owns child execution mechanics. The template configures fresh delegated context, finite depth and concurrency, model scope, tool capability, and authority policy there.

The parent model may decide whether delegation is useful for the current task, but it does not enforce the resource or authority limits itself. Those limits remain effective even if model behavior is imperfect.

SoL-Pi installation does not weaken this boundary. Whether an individual child sees ambient extensions follows `pi-subagents` child-host and tool-plan behavior; the template does not force SoL-Pi into children by widening capability or changing isolation policy.

## Delegated tool surface

Pi-subagents 0.77.0's built-in role definitions own their tool sets. The `scout` keeps shell inspection and artifact writing, `researcher` keeps Web evidence tools, `reviewer` keeps `watchdog_diff` plus read-only search, and `oracle` keeps shell inspection. The pstack `comment-sicko` and local `how-analyst` likewise keep role-specific profiles. Do not shadow these definitions with stale static lists.

Only implementation roles `worker` and `poteto-agent` use `tools: "inherit"`, to access *currently registered* mutation, FFF, Pi-Lens and other extension tools. This is a deliberate exception, not blanket parity with the parent. Built-in `grep`/`find` survive when optional FFF indexing is unavailable; conditional `multi_grep` and Pi-Lens activation tools are never startup prerequisites.

Pstack's independent Anthropic reviewers run as ordinary Pi `reviewer` children with package-defined source-inspection tools. Failed independent reviews remain visible rather than silently falling back to a different model.
## Verification strategy

Verification is layered by failure class:

1. `scripts/verify-template.mjs` checks static configuration structure and consistency, including the audited package matrix, explicit subagent tool contracts, SoL-Pi flags, cache ratio, commit pin, and Docker wiring.
2. Docker build checks that pinned packages install together and files land at the intended paths.
3. Live Pi smoke checks authentication, registry resolution, thinking translation, extension loading, SoL-Pi mechanisms, and provider availability.
4. A nested pstack smoke checks that Poteto/delegation behavior still composes with the parent optimization layer.
5. The developed project supplies its own artifact-specific tests.

The static verifier intentionally avoids natural-language assertions such as requiring specific phrases in `AGENTS.md`. It validates executable state instead.
