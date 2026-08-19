# Pi Engineering Environment Setup and Operations Guide

**File:** `pi-design.md`
**Revision date:** 2026-08-19
**Companion specification:** `pi-spec.md`

## 1. Host setup

Install:

- Docker Desktop with Docker Sandboxes;
- `sbx`;
- Git.

Authenticate Docker Sandboxes:

```bash
sbx login
```

Initialize unrestricted sandbox networking:

```bash
sbx policy init allow-all
```

---

## 2. Create the template source

Create:

```text
pi-engineering-template/
├── Dockerfile
├── settings.json
├── subagent-config.json
├── web-search.json
├── pi-btw.json
└── AGENTS.md
```

Use a revisioned image name:

```text
local/pi-engineering:<revision>
```

Each revision uses exact package versions and an exact base-image digest.

---

## 3. Create `settings.json`

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

---

## 4. Create `subagent-config.json`

Use:

```json
{
  "toolDescriptionMode": "compact",

  "maxSubagentDepth": 1,

  "missions": {
    "enabled": false
  },

  "scheduledRuns": {
    "enabled": false
  },

  "authorityPolicy": {
    "discardWorktree": "auto",
    "destructiveCleanup": "auto",
    "scheduleCreate": "forbid"
  }
}
```

Destination:

```text
~/.pi/agent/extensions/subagent/config.json
```

---

## 5. Create `web-search.json`

Use:

```json
{
  "workflow": "none"
}
```

Destination:

```text
~/.pi/web-search.json
```

---

## 6. Create `pi-btw.json`

Use:

```json
{
  "model": "opencode-go/gpt-5.6-luna"
}
```

Destination:

```text
~/.pi/agent/pi-btw.json
```

---

## 7. Create global `AGENTS.md`

Use:

```markdown
# Global Engineering Instructions

Communicate with the user in Japanese unless requested otherwise.

Use English for agent-to-agent delegation, coordination, and handoff by
default. Preserve authoritative Japanese text verbatim when translation could
change its meaning.

The parent owns task decomposition, integration, and the final response.
Use configured subagent roles when specialization, parallel work, or an
independent perspective provides useful separation.

Prefer repository governing sources and repository-provided commands over
generic assumptions. Inspect the relevant implementation before changing it.

Prefer the smallest sufficient change. Reuse existing repository,
language/runtime, platform, and installed-dependency capabilities before
adding new abstractions or dependencies.

Keep changes coherent and scoped. Report build, test, lint, type-check,
benchmark, and other command results from commands actually run.
```

Destination:

```text
~/.pi/agent/AGENTS.md
```

---

## 8. Create the Dockerfile

Resolve an exact base-image digest and exact npm versions for the revision, then substitute them for the placeholders below.

```dockerfile
ARG BASE_IMAGE=docker/sandbox-templates:shell-docker@sha256:<digest>
FROM ${BASE_IMAGE}

USER root

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
 && rm -rf /var/lib/apt/lists/*

ARG PI_VERSION=<version>

RUN npm install -g --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}"

USER agent

RUN mkdir -p \
    /home/agent/.pi/agent/extensions/subagent \
    /home/agent/.pi

COPY --chown=agent:agent settings.json \
    /home/agent/.pi/agent/settings.json

COPY --chown=agent:agent subagent-config.json \
    /home/agent/.pi/agent/extensions/subagent/config.json

COPY --chown=agent:agent web-search.json \
    /home/agent/.pi/web-search.json

COPY --chown=agent:agent pi-btw.json \
    /home/agent/.pi/agent/pi-btw.json

COPY --chown=agent:agent AGENTS.md \
    /home/agent/.pi/agent/AGENTS.md

ARG PI_SUBAGENTS_VERSION=<version>
ARG PI_WEB_ACCESS_VERSION=<version>
ARG PI_LENS_VERSION=<version>
ARG PI_FFF_VERSION=<version>
ARG PI_CONTEXT_VIEW_VERSION=<version>
ARG DAP_VERSION=<version>
ARG PI_STATUSLINE_VERSION=<version>
ARG PLANNOTATOR_VERSION=<version>
ARG PI_BTW_VERSION=<version>

RUN pi install "npm:pi-subagents@${PI_SUBAGENTS_VERSION}" \
 && pi install "npm:pi-web-access@${PI_WEB_ACCESS_VERSION}" \
 && pi install "npm:pi-lens@${PI_LENS_VERSION}" \
 && pi install "npm:@ff-labs/pi-fff@${PI_FFF_VERSION}" \
 && pi install "npm:pi-context-view@${PI_CONTEXT_VIEW_VERSION}" \
 && pi install "npm:@piex-dev/dap@${DAP_VERSION}" \
 && pi install "npm:@narumitw/pi-statusline@${PI_STATUSLINE_VERSION}" \
 && pi install "npm:@plannotator/pi-extension@${PLANNOTATOR_VERSION}" \
 && pi install "npm:@narumitw/pi-btw@${PI_BTW_VERSION}"
```

The Dockerfile is the exact revision manifest.

---

## 9. Build and load the template

Build the pinned revision:

```bash
docker build \
  -t local/pi-engineering:<revision> \
  .
```

Export it:

```bash
docker image save \
  local/pi-engineering:<revision> \
  -o pi-engineering.tar
```

Load it into Docker Sandboxes:

```bash
sbx template load pi-engineering.tar
```

---

## 10. Create a project sandbox

Run from the repository's main checkout:

```bash
sbx run \
  --clone \
  --name pi-<project> \
  --template local/pi-engineering:<revision> \
  shell \
  .
```

Inside the sandbox, create a working branch:

```bash
git switch -c agent/<task>
```

Start Pi:

```bash
pi
```

---

## 11. Authenticate model providers

Authenticate the required providers through Pi inside the named sandbox.

Required routes:

```text
openai-codex/gpt-5.6-terra
openai-codex/gpt-5.6-sol
opencode-go/gpt-5.6-luna
opencode-go/deepseek-v4-flash
```

Use Pi's provider authentication flow, including `/login` where supported.

The named sandbox retains provider state while it exists.

---

## 12. Normal operation

Reattach to the project sandbox:

```bash
sbx run --name pi-<project>
```

Start Pi from the private clone:

```bash
pi
```

The normal model topology is:

```text
Terra medium parent
│
├── Flash low scout
├── Luna high researcher
├── Flash max worker
├── Luna xhigh reviewer
└── Sol high oracle
```

The Parent chooses the smallest useful execution graph for each task:

```text
direct
    Parent

specialized
    Parent -> specialist -> Parent

parallel
    Parent -> specialists in parallel -> Parent

implementation review
    Parent -> Worker -> fresh Reviewer -> Parent/Worker -> Parent
```

Use direct Parent execution when it is the simplest useful path.

---

## 13. Repository work

### 13.1 Discovery

Use the simplest discovery surface that answers the current question:

```text
Pi native find/grep
    direct exact search

FFF
    indexed, fuzzy, and frecency search

Lens
    language-aware semantic navigation and edit-time diagnostics
```

### 13.2 Implementation and validation

The Worker uses:

```text
tools = inherit
```

Delegated implementation can use the ambient Pi tools, extensions, shell, repository tooling, and sandbox-private Docker Engine.

Use repository-provided build, test, lint, type-check, benchmark, and generation commands as the authoritative project validation surface.

### 13.3 Runtime debugging

Use the DAP `debug` tool for structured runtime debugging. Install the debugger adapter required by the active project inside the sandbox when needed.

### 13.4 External research

Use:

```text
Researcher
    selects and evaluates evidence

pi-web-access
    searches and retrieves sources

Researcher
    synthesizes the result
```

### 13.5 Human review

Enter reviewed planning when explicit plan approval adds value:

```text
/plannotator-plan-mode
```

or:

```bash
pi --plan
```

Use the review surfaces directly when useful:

```text
/plannotator-review
/plannotator-annotate <file.md>
/plannotator-last
```

### 13.6 Side questions

Use:

```text
/btw <question>
```

or open the side-thread menu with:

```text
/btw
```

Side questions use Luna and inherit the current Pi thinking level.

### 13.7 Context inspection

Use `pi-statusline` for continuous operating-state visibility and `pi-context-view` for detailed context inspection.

---

## 14. Parallel work

A clone-mode sandbox can contain multiple Git branches and worktrees.

Use `pi-subagents` worktree execution for independent writer tasks that benefit from isolated working state:

```text
Docker clone
├── main task branch
├── worker worktree A
└── worker worktree B
```

The Parent integrates the resulting work.

---

## 15. Pause and resume

Pause the environment:

```bash
sbx stop pi-<project>
```

Resume it:

```bash
sbx run --name pi-<project>
```

The named sandbox retains its filesystem, repository state, installed packages, and private Docker images.

---

## 16. Transfer work to the host

Commit useful work inside the sandbox:

```bash
git add -A
git commit
```

Keep the sandbox running while fetching its clone-mode remote from the host:

```bash
git fetch sandbox-pi-<project>
```

Inspect the sandbox branch:

```bash
git log sandbox-pi-<project>/agent/<task>
```

Create a host-side branch from it:

```bash
git switch -c agent/<task> \
  sandbox-pi-<project>/agent/<task>
```

The host repository owns the integrated result.

---

## 17. Remove a sandbox

After retaining the desired Git branches, remove the project environment:

```bash
sbx rm pi-<project>
```

---

## 18. Project `AGENTS.md`

Use repository `AGENTS.md` only for project facts that materially improve engineering work:

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

Global model routing, extension topology, Docker behavior, and generic engineering policy remain in the global environment.

---

## 19. Update the baseline

Resolve the current base template digest:

```bash
docker pull docker/sandbox-templates:shell-docker

docker image inspect \
  docker/sandbox-templates:shell-docker \
  --format '{{index .RepoDigests 0}}'
```

Resolve current npm releases:

```bash
docker run --rm node:lts-alpine sh -c '
for package in \
  @earendil-works/pi-coding-agent \
  pi-subagents \
  pi-web-access \
  pi-lens \
  @ff-labs/pi-fff \
  pi-context-view \
  @piex-dev/dap \
  @narumitw/pi-statusline \
  @plannotator/pi-extension \
  @narumitw/pi-btw
do
  printf "%s %s\\n" "$package" "$(npm view "$package" version)"
done
'
```

Update the exact pins in the Dockerfile and assign a new revision tag.

Build and load the new revision:

```bash
docker build \
  -t local/pi-engineering:<new-revision> \
  .

docker image save \
  local/pi-engineering:<new-revision> \
  -o pi-engineering.tar

sbx template load pi-engineering.tar
```

Create new project sandboxes from the new revision. Existing named sandboxes remain on their current revision.
