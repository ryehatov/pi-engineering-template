ARG BASE_IMAGE=docker/sandbox-templates:shell-docker@sha256:d86a6cdc105a1b299667a20c40bcf8d0584e56f21d44490a0737bb1baeb44299
FROM ${BASE_IMAGE}

USER root

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      tzdata \
 && rm -rf /var/lib/apt/lists/*

ARG PI_VERSION=0.87.1
ARG BUN_VERSION=1.4.2

RUN npm install -g --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
 && npm install -g "bun@${BUN_VERSION}" \
 && bun --version

USER agent

RUN mkdir -p \
    /home/agent/.pi/agent/extensions/subagent \
    /home/agent/.pi/agent/agents \
    /home/agent/.pi/agent/pstack \
    /home/agent/.pi/agent/skills \
    /home/agent/.pi

COPY --chown=agent:agent settings.json \
    /home/agent/.pi/agent/settings.json

COPY --chown=agent:agent models.json \
    /home/agent/.pi/agent/models.json

COPY --chown=agent:agent subagent-config.json \
    /home/agent/.pi/agent/extensions/subagent/config.json

COPY --chown=agent:agent pstack-models.json \
    /home/agent/.pi/agent/pstack/models.json

RUN chmod 600 \
    /home/agent/.pi/agent/models.json \
    /home/agent/.pi/agent/pstack/models.json

COPY --chown=agent:agent web-search.json \
    /home/agent/.pi/agent/web-search.json

COPY --chown=agent:agent pi-btw.json \
    /home/agent/.pi/agent/pi-btw.json

COPY --chown=agent:agent pi-fff.json \
    /home/agent/.pi/agent/pi-fff.json

COPY --chown=agent:agent pi-goal.json \
    /home/agent/.pi/agent/pi-goal.json

COPY --chown=agent:agent sol-pi.json \
    /home/agent/.pi/agent/sol-pi.json

# mattpocock/skills@c55ee46073ed923f86ce59a5eb3b6d895095d1b7; two Pi skill-loader adapters.
COPY --chown=agent:agent skills/ \
    /home/agent/.pi/agent/skills/

COPY --chown=agent:agent agents/ \
    /home/agent/.pi/agent/agents/

ARG PI_ACCOUNTS_VERSION=0.52.2
ARG PI_SUBAGENTS_VERSION=0.71.0
ARG PI_PSTACK_VERSION=0.6.0
ARG PONYTAIL_VERSION=4.10.0
ARG PI_WEB_ACCESS_VERSION=0.31.0
ARG PI_LENS_VERSION=4.3.0
ARG PI_FFF_VERSION=0.11.0
ARG PI_CONTEXT_VIEW_VERSION=0.6.0
ARG PI_POWERLINE_FOOTER_VERSION=0.18.0
ARG PI_REWIND_HOOK_VERSION=1.8.6
ARG PI_BTW_VERSION=0.61.1
ARG PI_GOAL_VERSION=0.54.8
ARG SOL_PI_COMMIT=1559b5cb12c72da4a485bc50fe326586b216fb19

RUN pi install "npm:@narumitw/pi-accounts@${PI_ACCOUNTS_VERSION}" \
 && pi install "npm:pi-subagents@${PI_SUBAGENTS_VERSION}" \
 && pi install "npm:@zenspc/pi-pstack@${PI_PSTACK_VERSION}" \
 && pi install "npm:@dietrichgebert/ponytail@${PONYTAIL_VERSION}" \
 && pi install "npm:pi-web-access@${PI_WEB_ACCESS_VERSION}" \
 && pi install "npm:pi-lens@${PI_LENS_VERSION}" \
 && pi install "npm:@ff-labs/pi-fff@${PI_FFF_VERSION}" \
 && pi install "npm:pi-context-view@${PI_CONTEXT_VIEW_VERSION}" \
 && pi install "npm:pi-powerline-footer@${PI_POWERLINE_FOOTER_VERSION}" \
 && pi install "npm:pi-rewind-hook@${PI_REWIND_HOOK_VERSION}" \
 && pi install "npm:@narumitw/pi-btw@${PI_BTW_VERSION}" \
 && pi install "npm:@narumitw/pi-goal@${PI_GOAL_VERSION}" \
 && pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_COMMIT}"

COPY --chown=agent:agent scripts/patch-pstack.mjs /tmp/patch-pstack.mjs
RUN node /tmp/patch-pstack.mjs /home/agent/.pi/agent/npm/node_modules/@zenspc/pi-pstack \
 && rm /tmp/patch-pstack.mjs

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Tokyo
ENV POWERLINE_NERD_FONTS=1
ENV PI_SUBAGENT_TASK_DELIVERY=file
