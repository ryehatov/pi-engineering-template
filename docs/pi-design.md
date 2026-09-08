# Pi Engineering Design

## Design goal

The template separates enforcement, contextual method, and documentation. A rule lives at the lowest layer that can enforce or supply it correctly.

```text
operator
  |
  v
Pi parent
  |
  +-- pi-pstack -------- playbooks, Poteto Mode, role selection context
  +-- Ponytail --------- implementation-minimization context
  +-- pi-subagents ----- child lifecycle, capabilities, isolation, authority
  +-- supporting tools - search, diagnostics, web, UI, context inspection
  |
  +-- executable configuration
       settings.json
       models.json
       subagent-config.json
       pstack-models.json
```

There is intentionally no template-level `AGENTS.md` between the runtime and these mechanisms.

## Why no global agent contract

A global prompt is appropriate only for instructions that the model must judge globally and that no lower layer can provide. This template no longer has such generic instructions.

Model allowlists, thinking ceilings, tool access, concurrency, scheduling authority, and provider configuration are machine-readable controls. Repeating them in `AGENTS.md` would add prompt tokens without strengthening enforcement and would create a second policy copy that can drift.

Pstack and Ponytail already provide their own runtime guidance. When the operator starts a session by inspecting pstack state and enabling `/poteto-mode`, duplicating those methods in a repository-global prompt is also unnecessary.

Downstream repositories remain free to add project-specific agent instructions for local architecture, domain constraints, compatibility contracts, or other facts that the harness cannot infer.

## Source-of-truth boundaries

| Concern | Authoritative surface |
| --- | --- |
| Pi parent defaults | `settings.json` |
| Generic subagent routing and tool capabilities | `settings.json` |
| Allowed delegated models | `settings.json` `modelScope` |
| Command Code transport | `models.json` |
| Delegation context, limits, and authority | `subagent-config.json` |
| Pstack role selectors | `pstack-models.json` |
| Pstack method and Poteto Mode | `@zenspc/pi-pstack` runtime |
| Ponytail implementation guidance | Ponytail runtime |
| Human rationale | `docs/model-policy.md`, this document |
| Operator procedures | `docs/operations.md` |
| Cross-file invariant checking | `scripts/verify-template.mjs` |

Documentation explains the configuration but does not override it.

## Model portfolio

The portfolio is intentionally small and role-oriented. Its current assignments are documented in `docs/model-policy.md`; the executable assignments are only the JSON configuration files.

The verifier therefore checks that every configured role resolves to an explicitly allowed model and that Command Code thinking selectors are supported. It does not require model-routing prose to exist anywhere.

This allows a future model rebalance to change configuration and rationale without also editing a global prompt.

## Provider boundary

Command Code is registered directly through Pi's native OpenAI-compatible provider path. Provider URL, adapter, authentication, compatibility, and model metadata live in `models.json`.

Provider policy therefore stays in executable configuration instead of a behavioral request to the model.

## Delegation boundary

`pi-subagents` owns child execution mechanics. The template configures fresh delegated context, finite depth and concurrency, model scope, tool capability, and authority policy there.

The parent model may decide whether delegation is useful for the current task, but it does not enforce the resource or authority limits itself. Those limits remain effective even if model behavior is imperfect.

## Verification strategy

Verification is layered by failure class:

1. `scripts/verify-template.mjs` checks static configuration structure and consistency.
2. Docker build checks that pinned packages install together and files land at the intended paths.
3. Live Pi smoke checks authentication, registry resolution, thinking translation, and provider availability.
4. The developed project supplies its own artifact-specific tests.

The static verifier intentionally avoids natural-language assertions such as requiring specific phrases in `AGENTS.md`. It validates executable state instead.
