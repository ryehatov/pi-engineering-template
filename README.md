# Pi Engineering Template

`pi-engineering-template` is a general-purpose software engineering environment
for the Pi coding agent on Docker Sandboxes.

It combines sandbox isolation, role-based subagent routing, global engineering
instructions, lifecycle Skills, and executable checks for template invariants.
The revision-controlled files in each branch are the source of truth.

## Published branches

This repository publishes two environment variants:

| Branch | Role routing |
| --- | --- |
| `main` | Flash/Luna-oriented specialist routing |
| `hy3` | Hy3-oriented scout, researcher, and worker routing with a Flash reviewer |

Use `settings.json` and `pi-btw.json` in the selected branch as the authoritative
model configuration. Do not infer current model or reasoning settings from this
README.

## Requirements

- Docker Desktop with Docker Sandboxes and `sbx`;
- Git;
- credentials for the model providers selected by the chosen branch.

See `docs/pi-design.md` for host setup and provider authentication.

## Verify the template

Run the repository verifier before you build an image:

```bash
node scripts/verify-template.mjs
```

The verifier checks structural and security-relevant configuration invariants.
A successful result does not verify external packages, model providers, or
Docker Sandbox behavior.

## Build and load

Select the required branch and verify it:

```bash
git switch main # or: git switch hy3
node scripts/verify-template.mjs
```

Build and load a revisioned image:

```bash
REVISION="$(git rev-parse --short HEAD)"
docker build -t "local/pi-engineering:${REVISION}" .
docker image save \
  "local/pi-engineering:${REVISION}" \
  -o pi-engineering.tar
sbx template load pi-engineering.tar
```

The generated `pi-engineering.tar` file is not repository source and is ignored
by Git.

## Create a project sandbox

Run the following command from the main checkout of the target Git repository:

```bash
sbx run \
  --clone \
  --name pi-<project> \
  --template "local/pi-engineering:${REVISION}" \
  shell \
  .
```

Start Pi inside the sandbox:

```bash
pi
```

For the complete operating lifecycle, see `docs/pi-design.md`.

## Design

The environment separates responsibilities among:

- Docker Sandbox for execution isolation;
- Git clone mode for repository isolation;
- the Pi parent for user intent, decomposition, integration, and final decisions;
- Pi subagents for specialized work and independent review;
- repository tooling for authoritative build and validation;
- global Skills for lifecycle policy and reusable engineering procedures.

The main documents are:

- `docs/pi-spec.md`: architecture, invariants, and governing specification;
- `docs/pi-design.md`: setup and operating guide.

Repository-changing work uses the global `development-loop` Skill.
Project-specific historical findings use the `engineering-cache` Skill when the
lifecycle policy selects them for durable caching.

## Security assumptions

Docker Sandbox isolation does not make downloaded code, packages, extensions,
or model-provider integrations trusted.

The documented baseline initializes Docker Sandboxes with the `balanced` network
preset. It permits common development services and denies other destinations by
default. Add explicit allow rules only when the active project or provider needs
them.

Clone mode protects the host repository from modification, not inspection. The
read-only source mount includes untracked and ignored files. Keep secrets outside
the repository tree or use Docker Sandbox credential isolation.

Review third-party packages and Pi extensions before you add them to the
template. Do not commit model-provider credentials, authentication state, API
keys, or other secrets to this repository.

## Upstream projects

- Pi: <https://github.com/earendil-works/pi>
- Docker Sandboxes: <https://docs.docker.com/ai/sandboxes/>

Third-party packages installed by this template retain their own licenses and
security properties.

## License

This repository is licensed under the MIT License. See `LICENSE`.
