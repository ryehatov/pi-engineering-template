# Pi Engineering Environment Setup and Operations Guide

**File:** `pi-design.md`
**Revision date:** 2026-08-21
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

Initialize the balanced sandbox network policy:

```bash
sbx policy init balanced
```

If a required provider, package host, registry, or development service is
blocked, inspect `sbx policy log` and add the narrowest required allow rule.

---

## 2. Create the template source

Create:

```text
pi-engineering-template/
├── .gitignore
├── README.md
├── LICENSE
├── Dockerfile
├── settings.json
├── subagent-config.json
├── web-search.json
├── pi-btw.json
├── AGENTS.md
├── docs/
│   ├── pi-spec.md
│   └── pi-design.md
├── scripts/
│   └── verify-template.mjs
└── skills/
    ├── development-loop/
    │   ├── SKILL.md
    │   └── agents/openai.yaml
    └── engineering-cache/
        ├── SKILL.md
        ├── agents/openai.yaml
        └── scripts/cache.mjs
```

Use a revisioned image name:

```text
local/pi-engineering:<revision>
```

---

## 3. Create `settings.json`

Use the revision-controlled `settings.json`. It is authoritative for provider,
model, trust, model-scope, and role-routing values. Do not duplicate those
values in this guide.

---

## 4. Create `subagent-config.json`

Use the revision-controlled `subagent-config.json`. It is the authoritative
subagent runtime configuration for the template. Subagent artifacts are
session-scoped so execution metadata does not modify the project working tree.

Destination:

```text
~/.pi/agent/extensions/subagent/config.json
```

---

## 5. Create `web-search.json`

Use the revision-controlled `web-search.json`. Do not duplicate its values in
this guide.

Destination:

```text
~/.pi/web-search.json
```

---

## 6. Create `pi-btw.json`

Use the revision-controlled `pi-btw.json`. It is authoritative for the side
thread model and reasoning behavior.

Destination:

```text
~/.pi/agent/pi-btw.json
```

---

## 7. Create global `AGENTS.md`

Use the revision-controlled `AGENTS.md`. Keep it short because it is always in
agent context. It points repository-changing work to `development-loop` while
detailed lifecycle and cache procedures remain in on-demand Skills.

Destination:

```text
~/.pi/agent/AGENTS.md
```

---

## 8. Create the Dockerfile

Use the revision-controlled `Dockerfile` as the image definition. It owns the
installed global tools, configuration destinations, and global Skill
installation. Do not maintain a second Dockerfile copy in this guide.

---

## 9. Build and load the template

Build the selected revision:

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

Clone mode protects the host checkout from modification, not inspection. The
read-only source mount includes untracked and ignored files. Keep secrets
outside the repository tree or use Docker Sandbox credential isolation.

---

## 11. Authenticate model providers

Authenticate the providers referenced by the current `settings.json` and
`pi-btw.json` through Pi inside the named sandbox. Use Pi's provider
authentication flow, including `/login` where supported.

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

The normal role topology is:

```text
Parent
│
├── Scout
├── Researcher
├── Worker
├── Reviewer
└── Oracle
```

`settings.json` is authoritative for the model and reasoning level assigned to
each role.

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

`pi-btw.json` is authoritative for the side-thread model and reasoning behavior.

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

## 19. Update the template

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

Update the selected Dockerfile dependencies and assign a new revision tag.

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


---

## 20. Verify the template and preserve engineering knowledge

Before committing a template revision, run:

```bash
node scripts/verify-template.mjs
```

The verifier checks branch-independent invariants such as required role
configuration, strict model scope, subagent safety settings, extension and Skill
installation, and bundled script syntax. Branch variants remain free to select
different allowed models and toolchains.

For repository-changing work, global `AGENTS.md` requires `development-loop`
before the first repository write and again at completion. The Skill supplies
risk-scaled engineering gates while preserving the user's original request as
authoritative intent. It uses existing planning, subagent, review, and
repository-verification mechanisms rather than introducing another workflow
engine.

When `docs/engineering/cache/` exists, `development-loop` performs one narrow
task-relevant cache lookup before non-trivial investigation. `engineering-cache`
owns freshness checks and selected note storage. After verification,
`development-loop` always classifies durable knowledge as discard, ADR, cache,
or reusable Skill. Cache notes remain advisory history; current governing
sources, code, tests, and verification evidence remain authoritative.
