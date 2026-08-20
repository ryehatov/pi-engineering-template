# Pi Engineering Environment Specification

**File:** `pi-spec.md`  
**Status:** Baseline  
**Revision date:** 2026-08-19  
**Scope:** General-purpose software engineering

## 1. Purpose

This specification defines the global Pi engineering environment.

The environment optimizes:

- engineering capability;
- task completion quality;
- execution speed;
- model-use efficiency;
- maintainability;
- extensibility;
- controlled rolling-latest adoption;
- clear responsibility ownership.

Deterministic mechanisms own deterministic concerns. Models own semantic decisions.

The permanent Pi extension set is:

```text
Pi
├── pi-subagents
├── pi-web-access
├── pi-lens
├── @ff-labs/pi-fff
├── pi-context-view
├── @piex-dev/dap
├── @narumitw/pi-statusline
├── @plannotator/pi-extension
└── @narumitw/pi-btw
```

Docker Sandbox is the execution environment around Pi.

---

## 2. Architecture

```text
Host
│
├── canonical Git repository
├── Docker Sandbox template
└── Docker Sandbox lifecycle
        │
        ▼
Docker Sandbox microVM
│
├── private Git clone
├── private filesystem
├── private Docker Engine
│
└── Pi
    │
    ├── Terra parent
    │   └── task-local execution graph
    │       ├── Flash scout
    │       ├── Luna researcher
    │       ├── Flash worker
    │       ├── Luna reviewer
    │       └── Sol oracle
    │
    ├── engineering tools
    │   ├── pi-web-access
    │   ├── pi-lens
    │   ├── pi-fff
    │   └── DAP
    │
    ├── interaction surfaces
    │   ├── Plannotator
    │   └── pi-btw
    │
    └── observability
        ├── pi-context-view
        └── pi-statusline
```

### 2.1 Responsibility ownership

| Concern | Owner |
| --- | --- |
| Execution environment | Docker Sandbox |
| Repository isolation | Docker clone mode |
| Container execution | Sandbox-private Docker daemon |
| Canonical repository | Host Git |
| User intent and integration | Parent |
| Task-local graph topology | Parent |
| Specialist execution and model routing | `pi-subagents` |
| Repository reconnaissance | Scout |
| External research and synthesis | Researcher |
| Delegated implementation | Worker |
| Independent semantic review | Reviewer |
| High-impact decision analysis | Oracle |
| External acquisition | `pi-web-access` |
| Edit-time diagnostics and code intelligence | `pi-lens` |
| Fast repository discovery | `pi-fff` |
| Runtime debugging | DAP |
| Human plan, diff, and document review | Plannotator |
| User side questions | `pi-btw` |
| Context diagnostics | `pi-context-view` |
| Continuous operating state | `pi-statusline` |
| Authoritative project validation | Repository tooling |

Responsibility ownership defines accountability. It does not restrict tool capability unless explicitly configured.

---

## 3. Design rules

### 3.1 One primary owner per concern

Each system concern has one primary owner. Pi, Docker Sandbox, Git, repository tooling, and extensions provide their native mechanisms directly. Global configuration defines only deliberate baseline choices.

### 3.2 Deterministic mechanisms own deterministic work

Use:

```text
Docker Sandbox
    execution containment and lifecycle

Git clone/worktree
    repository and writer-state isolation

pi-subagents
    specialist execution and model routing

repository tooling
    authoritative build, test, lint, type-check, benchmark, and project automation

Lens / FFF / DAP
    structured engineering operations
```

### 3.3 Prefer the smallest sufficient implementation

Reuse repository code, language/runtime facilities, platform capabilities, and installed dependencies before introducing new abstractions or dependencies.

Keep each change coherent and limited to the implementation required by the task.

### 3.4 Use a task-local execution graph

The Parent composes a shallow execution graph from direct work and specialist calls.

Use branches for useful specialization or parallelism. Use fresh review branches for independent evaluation. Join results at the Parent for integration and final decisions.

Use implementation-review loops when observable evidence indicates another iteration is useful.

### 3.5 Preserve implementation capability

Role separation defines responsibility while retaining the required implementation tool surface. The Worker inherits the ambient Pi tools.

### 3.6 Keep current truth executable and historical knowledge advisory

Current code, configuration, governing specifications, and repository-owned
verification are authoritative for present behavior. Documentation must not
copy information that the environment can recover cheaply. Preserve only
non-obvious rationale, failed approaches, constraints, invariants, and other
findings whose rediscovery cost justifies their maintenance and stale-data risk.

Load historical knowledge on demand. Revalidate it against current repository
evidence before use.

---

## 4. Docker Sandbox

### 4.1 Workspace mode

Use clone mode:

```text
--clone
```

The sandbox works in an independent Git clone. The host checkout remains the canonical repository.

A clone-mode sandbox can contain multiple branches and worktrees for isolated parallel work.

### 4.2 Template

Use the Docker Sandbox `shell-docker` base template.

The custom template contains:

- Pi;
- the permanent extension set;
- global Pi settings;
- subagent runtime settings;
- Web Access settings;
- `pi-btw` settings;
- global `AGENTS.md`.

Project/runtime dependencies remain repository-owned. Analysis tools installed and managed privately by an extension remain extension-owned.

### 4.3 Network

Use:

```text
allow-all
```

Unrestricted external retrieval is a baseline capability for package managers, source hosts, registries, model providers, development services, and Web Access.

### 4.4 Lifetime

Use one named sandbox for an active project or work period.

The sandbox retains packages, configuration, repository state, and private Docker images across stop/start cycles. Remove the sandbox when the environment is no longer useful.

---

## 5. Model architecture

| Role | Model | Reasoning | Responsibility |
| --- | --- | ---: | --- |
| Parent | `openai-codex/gpt-5.6-terra` | `medium` | Intent, architecture, decomposition, integration, direct work, final response |
| Scout | `opencode-go/deepseek-v4-flash` | `low` | Fast repository reconnaissance |
| Researcher | `opencode-go/gpt-5.6-luna` | `high` | External research and source synthesis |
| Worker | `opencode-go/deepseek-v4-flash` | `max` | Bounded implementation |
| Reviewer | `opencode-go/gpt-5.6-luna` | `xhigh` | Independent semantic review |
| Oracle | `openai-codex/gpt-5.6-sol` | `high` | Difficult, high-impact decision analysis |

Model routing follows semantic responsibility:

```text
responsibility
      ↓
configured role
      ↓
configured model
```

---

## 6. `pi-subagents`

`pi-subagents` owns specialist orchestration.

Use the upstream built-in roles:

```text
scout
researcher
worker
reviewer
oracle
```

Override only the baseline model, reasoning, and Worker tool assignments.

The Worker uses:

```text
tools = inherit
```

Permit only:

```text
opencode-go/deepseek-v4-flash
opencode-go/gpt-5.6-luna
openai-codex/gpt-5.6-sol
```

Use strict model-scope enforcement. Terra remains the Parent tier.

Set:

```text
maxSubagentDepth = 1
toolDescriptionMode = compact
```

Use session-oriented specialist execution:

```text
missions.enabled       = false
scheduledRuns.enabled  = false
scheduleCreate         = forbid
```

Use sandbox-local worktree cleanup:

```text
discardWorktree    = auto
destructiveCleanup = auto
```

Use upstream behavior for remaining runtime behavior.

---

## 7. Engineering extensions

### 7.1 `pi-web-access`

Responsibility:

```text
external acquisition
```

Set:

```json
{
  "workflow": "none"
}
```

The Parent or Researcher owns synthesis.

### 7.2 `pi-lens`

Responsibility:

```text
edit-time diagnostics, deterministic formatting/autofix,
and language-aware code intelligence
```

Use upstream defaults.

Lens feedback is incremental. Repository-provided commands remain authoritative for build, test, lint, type-check, benchmark, and acceptance behavior.

Lens-private analysis tools belong to Lens. Repository project/runtime dependencies belong to the repository.

Repository-specific Lens configuration belongs in `.pi-lens.json` when required by that repository.

### 7.3 `@ff-labs/pi-fff`

Responsibility:

```text
fast repository discovery
```

Use the upstream default tool-and-UI mode.

FFF complements Pi native exact search and Lens semantic navigation.

### 7.4 `@piex-dev/dap`

Responsibility:

```text
structured runtime debugging
```

Use upstream defaults. Debugger adapters remain project/runtime dependencies.

---

## 8. Interaction and observability extensions

### 8.1 `@plannotator/pi-extension`

Responsibility:

```text
human review and annotation
```

Use upstream defaults.

Normal Pi execution starts in standard mode. Use Plannotator plan mode when explicit plan review adds value. Use its review and annotation surfaces directly for current changes, Markdown documents, and the latest assistant response.

Approved plans execute in the current Parent session.

### 8.2 `@narumitw/pi-btw`

Responsibility:

```text
user side questions
```

Use Luna for side threads:

```json
{
  "model": "opencode-go/gpt-5.6-luna"
}
```

Side threads inherit the current Pi thinking level and remain separate from the main conversation until selected content is brought into the main editor.

### 8.3 `pi-context-view`

Responsibility:

```text
deep context diagnostics
```

Use upstream defaults and inspect effective context, injections, and tool-schema cost on demand.

### 8.4 `@narumitw/pi-statusline`

Responsibility:

```text
continuous operational visibility
```

Use upstream defaults. Statusline provides the continuous summary; Context View provides detailed inspection.

---

## 9. Global Pi configuration

Use:

```json
{
  "defaultProvider": "openai-codex",
  "defaultModel": "gpt-5.6-terra",
  "defaultThinkingLevel": "medium",

  "defaultProjectTrust": "never",

  "subagents": {
    "modelScope": {
      "enforce": true,
      "strict": true,
      "allow": [
        "opencode-go/deepseek-v4-flash",
        "opencode-go/gpt-5.6-luna",
        "openai-codex/gpt-5.6-sol"
      ]
    },

    "agentOverrides": {
      "scout": {
        "model": "opencode-go/deepseek-v4-flash",
        "thinking": "low"
      },

      "researcher": {
        "model": "opencode-go/gpt-5.6-luna",
        "thinking": "high"
      },

      "worker": {
        "model": "opencode-go/deepseek-v4-flash",
        "thinking": "max",
        "tools": "inherit"
      },

      "reviewer": {
        "model": "opencode-go/gpt-5.6-luna",
        "thinking": "xhigh"
      },

      "oracle": {
        "model": "openai-codex/gpt-5.6-sol",
        "thinking": "high"
      },

      "delegate": {
        "disabled": true
      },

      "gpt-pro": {
        "disabled": true
      }
    }
  }
}
```

`defaultProjectTrust: "never"` keeps Pi project-local settings, executable Pi resources, packages, and extensions outside the baseline unless explicitly trusted. Repository context files such as `AGENTS.md` remain available. Global extensions may consume their own repository-local configuration according to their extension contract.

Package state is owned by `pi install`.

---

## 10. Subagent runtime configuration

`subagent-config.json` is the authoritative runtime configuration. This
specification owns the invariants, not a prose copy of the JSON values:

- task graphs remain shallow;
- missions and scheduled runs remain disabled by default;
- schedule creation remains forbidden;
- isolated worktree cleanup follows the configured authority policy.

---

## 11. Global `AGENTS.md`

The revision-controlled `AGENTS.md` is authoritative. Keep always-loaded
instructions concise. It points repository-changing work to the global
`development-loop` Skill and keeps the original user request authoritative.
Conditional lifecycle and cache procedures belong in on-demand Skills instead
of being duplicated here.

---

## 12. Global and project boundary

### 12.1 Global environment

The global environment owns:

- Docker Sandbox execution;
- the permanent extension set;
- Parent model;
- specialist model routing;
- orchestration topology;
- generic engineering tools;
- generic engineering instructions;
- user interaction surfaces.

### 12.2 Repository

The repository owns:

- specifications;
- architecture decisions;
- build and development commands;
- tests;
- lint and type checks;
- benchmarks;
- generated-artifact rules;
- repository-specific conventions;
- repository-specific tool configuration.

A normal repository uses `AGENTS.md` only for facts that materially improve work on that repository:

```markdown
# Project Instructions

## Governing Sources

- Specification: `<path>`
- Architecture decisions: `<path>`

## Commands

- Build: `<command>`
- Test: `<command>`
- Lint / type check: `<command>`

## Generated Artifacts

- `<path>` is generated by `<command>`.

## Repository Notes

- `<non-obvious repository fact>`
```

---

## 13. Baseline revision model

Each template revision pins:

- the `shell-docker` base image by digest;
- the Pi release by exact version;
- every permanent Pi extension by exact version.

The Dockerfile is the revision manifest.

Rolling-latest adoption occurs by resolving current releases, updating the pins, and building a new template revision. Existing named sandboxes remain on the revision from which they were created.

The persistent global customization surface is:

```text
Dockerfile
settings.json
subagent-config.json
web-search.json
pi-btw.json
AGENTS.md
skills/development-loop/
skills/engineering-cache/
scripts/verify-template.mjs
```


---

## 14. Engineering knowledge cache

Pi uses native Skill progressive disclosure for reusable procedures and
repository-owned Markdown for expensive project-specific historical findings.
The global `development-loop` Skill owns risk-scaled lifecycle gates and durable
knowledge routing. The global `engineering-cache` Skill owns only cache
retrieval, freshness checks, and cache-note storage.

Repository cache notes, when useful, live under:

```text
docs/engineering/cache/
```

They are advisory history, not implementation authority. Each note declares a
Git `verified_at` revision, stable `watch` paths that approximate its
invalidation surface, and current evidence. A note with no detected changes to
its declared watch paths is only a `fresh-candidate`; semantic correctness still
requires current evidence.

Do not introduce a memory database, vector index, background consolidation, or
additional orchestration layer until measured retrieval failures justify the
extra owner and maintenance cost.

---

## 15. Development lifecycle policy

`development-loop` is a gate-oriented engineering policy, not a workflow
controller. The user's original request remains authoritative and is not
replaced by a generated task prompt.

The Skill requires current repository evidence before completion, resolves
material uncertainty before speculative implementation when cheaper, and scales
planning, proof, and independent review with risk. It uses the existing Parent,
subagents, Plannotator, and repository verification mechanisms rather than
owning a second execution graph or task-state machine.

After verified work, it routes durable knowledge to discard, ADR,
`engineering-cache`, or a reusable Skill. Keep translation, dynamic system-prompt
generation, lifecycle persistence, and hard enforcement out of the baseline
until behavioral evidence demonstrates a specific failure that requires them.
