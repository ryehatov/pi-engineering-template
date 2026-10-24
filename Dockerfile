ARG BASE_IMAGE=docker/sandbox-templates:shell-docker@sha256:d86a6cdc105a1b299667a20c40bcf8d0584e56f21d44490a0737bb1baeb44299
FROM ${BASE_IMAGE}

USER root

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      tzdata \
 && rm -rf /var/lib/apt/lists/*

ARG PI_VERSION=1.4.0
ARG BUN_VERSION=1.4.3
ARG CLAUDE_CODE_VERSION=2.1.308

# Pi 1.4.0 and pi-claude-code require Node >=22.19.0. Fail on older base images.
RUN node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major<22 || (major===22 && minor<19)) throw new Error("pi-claude-code requires Node >=22.19.0")'

RUN npm install -g --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
 && npm install -g "bun@${BUN_VERSION}" \
 && bun --version \
 && npm install -g "@anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}" \
 && claude --version

# The sandbox injects provider placeholders into each exec environment.
# Wrap both executables: Pi (and its children) need a sanitized environment,
# and direct Claude Code needs the same isolated subscription configuration.
COPY --chmod=755 scripts/pstack-auth-launcher.sh /usr/local/libexec/pstack-auth-launcher
RUN set -eu; \
    for tool in pi claude; do \
      binary="$(command -v "$tool")"; \
      test -x "$binary"; \
      test ! -e "$binary.pstack-upstream"; \
      mv "$binary" "$binary.pstack-upstream"; \
      ln -s /usr/local/libexec/pstack-auth-launcher "$binary"; \
    done

USER agent

RUN mkdir -p /home/agent/.pi/agent/extensions /home/agent/.pi/agent/skills

ARG PI_ACCOUNTS_VERSION=0.53.2
ARG PONYTAIL_VERSION=5.3.2
ARG PI_WEB_ACCESS_VERSION=0.44.0
ARG PI_LENS_VERSION=4.4.4
ARG PI_FFF_VERSION=0.11.0
ARG PI_CONTEXT_VIEW_VERSION=0.7.2
ARG PI_POWERLINE_FOOTER_VERSION=0.20.2
ARG PI_REWIND_HOOK_VERSION=1.8.7
ARG PI_BTW_VERSION=0.62.0

# Official pstack-claude pinned by an immutable Git commit.
ARG PSTACK_CLAUDE_REF=903e7385382389806c59d6989b6274e24165082b

# Pi provider bridge through the official Claude Code CLI.
ARG PI_CLAUDE_CODE_REF=70abb65186592ca788b29b3db22c3160d629c41f

# Official SoL-Pi pinned by an immutable Git commit.
ARG SOL_PI_REF=219568034fa54ed121ede80961655e33dfb9d0e3

RUN pi install "npm:@narumitw/pi-accounts@${PI_ACCOUNTS_VERSION}" \
 && pi install "git:github.com/michael-denyer/pstack-claude@${PSTACK_CLAUDE_REF}" \
 && test -f /home/agent/.pi/agent/git/github.com/michael-denyer/pstack-claude/plugins/pstack/pi/index.ts \
 && pi install "git:github.com/earendil-works/pi-claude-code@${PI_CLAUDE_CODE_REF}" \
 && test -f /home/agent/.pi/agent/git/github.com/earendil-works/pi-claude-code/src/index.ts \
 && pi install "npm:@dietrichgebert/ponytail@${PONYTAIL_VERSION}" \
 && pi install "npm:pi-web-access@${PI_WEB_ACCESS_VERSION}" \
 && pi install "npm:pi-lens@${PI_LENS_VERSION}" \
 && pi install "npm:@ff-labs/pi-fff@${PI_FFF_VERSION}" \
 && pi install "npm:pi-context-view@${PI_CONTEXT_VIEW_VERSION}" \
 && pi install "npm:pi-powerline-footer@${PI_POWERLINE_FOOTER_VERSION}" \
 && pi install "npm:pi-rewind-hook@${PI_REWIND_HOOK_VERSION}" \
 && pi install "npm:@narumitw/pi-btw@${PI_BTW_VERSION}" \
 && pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_REF}"

# Installed package declarations belong to Pi. Keep dependency installation
# before the configurable settings and skills so ordinary edits hit the cache.
COPY --chown=agent:agent scripts/merge-pi-settings.mjs /tmp/merge-pi-settings.mjs
COPY --chown=agent:agent settings.json /tmp/pi-template-settings.json
RUN node /tmp/merge-pi-settings.mjs \
      /tmp/pi-template-settings.json \
      /home/agent/.pi/agent/settings.json \
 && rm /tmp/merge-pi-settings.mjs /tmp/pi-template-settings.json

COPY --chown=agent:agent pstack-models.md /home/agent/.pi/agent/pstack-models.md
COPY --chown=agent:agent sol-pi.json /home/agent/.pi/agent/sol-pi.json
COPY --chown=agent:agent pi-context-view.json /home/agent/.pi/agent/extensions/pi-context-view.json
COPY --chown=agent:agent web-search.json /home/agent/.pi/agent/web-search.json
COPY --chown=agent:agent pi-btw.json /home/agent/.pi/agent/pi-btw.json
COPY --chown=agent:agent pi-fff.json /home/agent/.pi/agent/pi-fff.json

# Project skill add-ons. pstack-claude's 65 skills load from its own Pi package.
COPY --chown=agent:agent skills/ /home/agent/.pi/agent/skills/

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Tokyo
ENV POWERLINE_NERD_FONTS=1
