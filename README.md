# pi-engineering-template

A Docker Sandbox template for rigorous software engineering with Pi.

The `pstack` branch keeps engineering policy in the runtime mechanisms that can enforce it. It does not ship a repository-global `AGENTS.md` for generic workflow or safety rules.

## Architecture

- **Pi** is the interactive parent runtime.
- **pi-subagents** owns delegated execution, isolation, tool capability, model scope, concurrency, fallback selection, and authority controls.
- **@zenspc/pi-pstack** supplies engineering playbooks, Poteto Mode, review topology, and role-oriented model selection.
- **Ponytail** supplies YAGNI-first implementation guidance when active.
- Supporting extensions provide capabilities such as structural search, diagnostics, web access, context inspection, and UI.

The executable sources of truth are:

- `settings.json` for Pi and generic subagent routing/capabilities;
- `models.json` for the Command Code provider transport and model metadata;
- `subagent-config.json` for delegated execution and authority policy;
- `pstack-models.json` for pstack role routing.

`docs/model-policy.md` explains the routing rationale. It is descriptive, not an enforcement surface.

## Authentication

Command Code uses Pi's native OpenAI-compatible provider path. Provide its API key only at runtime:

```sh
export COMMAND_CODE_API_KEY='...'
```

The committed profile does not force Command Code ZDR routing. This keeps models such as DeepSeek and GLM available when a ZDR-capable upstream is unavailable. Data handling therefore follows the active Command Code and upstream-provider terms. Do not treat this profile as a zero-retention boundary.

OpenAI Codex authentication remains independent and uses Pi's normal `openai-codex` path.

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

After activation, pstack supplies the workflow context. The template does not duplicate Poteto Mode or Ponytail instructions in a global agent prompt.

See `docs/operations.md` for authentication, smoke checks, upgrades, and failure handling. See `docs/pi-design.md` and `docs/pi-spec.md` for ownership boundaries and invariants.
