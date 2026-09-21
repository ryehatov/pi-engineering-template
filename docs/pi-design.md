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
  +-- Ponytail ---------- implementation-minimization context
  +-- pi-subagents ------ child lifecycle, capabilities, isolation, authority
  +-- supporting tools -- search, diagnostics, web, UI, context inspection
  |
  +-- executable configuration
       settings.json
       models.json
       subagent-config.json
       pstack-models.json
       sol-pi.json
```

There is intentionally no template-level `AGENTS.md` between the runtime and these mechanisms.

## Why no global agent contract

A global prompt is appropriate only for instructions that the model must judge globally and that no lower layer can provide. This template no longer has such generic instructions.

Model allowlists, thinking ceilings, tool access, concurrency, scheduling authority, provider configuration, and SoL-Pi mechanism selection are machine-readable controls. Repeating them in `AGENTS.md` would add prompt tokens without strengthening enforcement and would create a second policy copy that can drift.

Pstack and Ponytail already provide their own runtime guidance. SoL-Pi operates through extension hooks and tools. When the operator starts a session by inspecting pstack state and enabling `/poteto-mode`, duplicating any of those mechanisms in a repository-global prompt is unnecessary.

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
| SoL-Pi mechanism enablement and cache ratio | `sol-pi.json` |
| Pstack method and Poteto Mode | `@zenspc/pi-pstack` runtime |
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

The verifier therefore checks that every configured role resolves to an explicitly allowed model and that Command Code thinking selectors are supported. It does not require model-routing prose to exist anywhere.

This allows a future model rebalance to change configuration and rationale without also editing a global prompt.

## Provider boundary

Command Code is registered directly through Pi's native OpenAI-compatible provider path. Provider URL, adapter, authentication, compatibility, and model metadata live in `models.json`.

Provider policy therefore stays in executable configuration instead of a behavioral request to the model.

## Delegation boundary

`pi-subagents` owns child execution mechanics. The template configures fresh delegated context, finite depth and concurrency, model scope, tool capability, and authority policy there.

The parent model may decide whether delegation is useful for the current task, but it does not enforce the resource or authority limits itself. Those limits remain effective even if model behavior is imperfect.

SoL-Pi installation does not weaken this boundary. Whether an individual child sees ambient extensions follows `pi-subagents` child-host and tool-plan behavior; the template does not force SoL-Pi into children by widening capability or changing isolation policy.

## Delegated tool surface

Tool ownership follows the same separation as model ownership. `pi-subagents` package roles keep their package-defined tools unless this template has a reason to impose a narrower capability ceiling. `researcher` therefore has no local `tools` override, while `worker` and `poteto-agent` use `tools: "inherit"`. This lets package-required research tools and ambient extension tools evolve without a second stale copy in the template.

`scout`, `reviewer`, and `oracle` use explicit allowlists because their analysis capability is intentionally narrower. Those allowlists are a Pi capability ceiling, not a prompt convention. The verifier binds them to the audited tool set. `reviewer` retains the current `watchdog_diff` and native `contact_supervisor` surfaces; `scout` retains `contact_supervisor`.

Pi-Lens 4.2.1 folds the old standalone `lsp_diagnostics` tool into `lens_diagnostics` with `source=lsp`. The explicit analysis roles use the current read-oriented surfaces `project_report`, `module_report`, `read_symbol`, `read_enclosing`, `symbol_search`, and `ast_grep_search`. `ast_grep_search` is situational, so `pi_lens_activate_tools` is allowlisted as its loader. Pi filters the registered tool registry through the role allowlist, so the loader cannot add a tool that is outside that ceiling.

The explicit analysis roles do not receive `ast_grep_replace` or `lens_diagnostic_mark`. They also do not receive `lsp_navigation`: that single tool includes read operations such as definition and references, but also mutation-capable operations such as rename, code actions, and command execution. Granting the whole tool would be a wider capability than the roles need. Writers that inherit the ambient tool set can use those surfaces when appropriate.

FFF runs in `override` mode. Its current `multi_grep` implementation is therefore included in the explicit analysis allowlists alongside the overridden `grep` and `find` names.

## Verification strategy

Verification is layered by failure class:

1. `scripts/verify-template.mjs` checks static configuration structure and consistency, including the audited package matrix, explicit subagent tool contracts, SoL-Pi flags, cache ratio, commit pin, and Docker wiring.
2. Docker build checks that pinned packages install together and files land at the intended paths.
3. Live Pi smoke checks authentication, registry resolution, thinking translation, extension loading, SoL-Pi mechanisms, and provider availability.
4. A nested pstack smoke checks that Poteto/delegation behavior still composes with the parent optimization layer.
5. The developed project supplies its own artifact-specific tests.

The static verifier intentionally avoids natural-language assertions such as requiring specific phrases in `AGENTS.md`. It validates executable state instead.
