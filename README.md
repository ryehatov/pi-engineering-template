# pi-engineering-template

A Docker Sandbox template for rigorous software engineering with Pi.

The `pstack` branch keeps engineering policy in the runtime mechanisms that can enforce it. It does not ship a repository-global `AGENTS.md` for generic workflow or safety rules.

## Architecture

- **Pi** is the interactive parent runtime and owns the native session, model registry, and compaction primitives.
- **SoL-Pi** optimizes parent-session tool/result/context handling: Action Fusion, ObservationPack, Evidence-Preserving Reducer, and Online Context Compact.
- **pi-subagents** owns delegated execution, isolation, tool capability, model scope, concurrency, fallback selection, and authority controls.
- **@zenspc/pi-pstack** supplies engineering playbooks, Poteto Mode, review topology, and role-oriented model selection.
- **Ponytail** supplies YAGNI-first implementation guidance when active.
- Supporting extensions provide capabilities such as structural search, diagnostics, web access, context inspection, and UI.

The executable sources of truth are:

- `settings.json` for Pi and generic subagent routing/capabilities;
- `models.json` for the Command Code provider transport and model metadata;
- `subagent-config.json` for delegated execution and authority policy;
- `pstack-models.json` for pstack role routing;
- `sol-pi.json` for SoL-Pi mechanism enablement, EPR reducer routing, and OCC cache economics.

`docs/model-policy.md` explains the routing rationale. It is descriptive, not an enforcement surface.

## Authentication

Command Code uses Pi's native OpenAI-compatible provider path. Provide its API key only at runtime:

```sh
export COMMAND_CODE_API_KEY='...'
```

The committed profile does not force Command Code ZDR routing. This keeps models such as DeepSeek and GLM available when a ZDR-capable upstream is unavailable. Data handling therefore follows the active Command Code and upstream-provider terms. Do not treat this profile as a zero-retention boundary.

SoL-Pi EPR uses the existing `commandcode-goat/deepseek/deepseek-v4.1-flash` model-registry route. It does not define a second provider or credential path.

OpenAI Codex uses Pi's native `openai-codex` provider. `@narumitw/pi-accounts` owns named Pi account selection. CodexBar authentication is separate and uses native Codex profile homes; the template does not copy or synchronize OAuth tokens between Pi and CodexBar. See `docs/operations.md`.

## Build and validate

```sh
docker build -t pi-engineering-template:pstack .
node scripts/verify-template.mjs
```

The verifier checks machine-readable configuration invariants and cross-file consistency. It does not validate prompt wording.

## Operate

The normal interactive startup routine is to inspect pstack state and enable Poteto Mode:

```text
pstack state
/poteto-mode
```

After activation, pstack supplies the workflow context. SoL-Pi remains a runtime optimization layer rather than a second engineering workflow. The template does not duplicate Poteto Mode, Ponytail, or SoL-Pi behavior in a global agent prompt.

See `docs/operations.md` for authentication, smoke checks, upgrades, and failure handling. See `docs/pi-design.md` and `docs/pi-spec.md` for ownership boundaries and invariants.
