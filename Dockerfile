ARG BASE_IMAGE=docker/sandbox-templates:shell-docker@sha256:d86a6cdc105a1b299667a20c40bcf8d0584e56f21d44490a0737bb1baeb44299
FROM ${BASE_IMAGE}

USER root

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
 && rm -rf /var/lib/apt/lists/*

# pi
ARG PI_VERSION=0.84.4

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

COPY --chown=agent:agent pi-fff.json \
    /home/agent/.pi/agent/pi-fff.json

COPY --chown=agent:agent AGENTS.md \
    /home/agent/.pi/agent/AGENTS.md

COPY --chown=agent:agent skills \
    /home/agent/.pi/agent/skills

ARG PI_SUBAGENTS_VERSION=0.63.0
ARG PI_WEB_ACCESS_VERSION=0.27.0
ARG PI_LENS_VERSION=4.1.3
ARG PI_FFF_VERSION=0.10.6
ARG PI_CONTEXT_VIEW_VERSION=0.5.0
ARG DAP_VERSION=0.1.1
ARG PI_POWERLINE_FOOTER_VERSION=0.16.0
ARG PI_REWIND_HOOK_VERSION=1.8.6
ARG PLANNOTATOR_VERSION=0.27.11
ARG PI_BTW_VERSION=0.56.0

RUN pi install "npm:pi-subagents@${PI_SUBAGENTS_VERSION}" \
 && pi install "npm:pi-web-access@${PI_WEB_ACCESS_VERSION}" \
 && pi install "npm:pi-lens@${PI_LENS_VERSION}" \
 && pi install "npm:@ff-labs/pi-fff@${PI_FFF_VERSION}" \
 && pi install "npm:pi-context-view@${PI_CONTEXT_VIEW_VERSION}" \
 && pi install "npm:@piex-dev/dap@${DAP_VERSION}" \
 && pi install "npm:pi-powerline-footer@${PI_POWERLINE_FOOTER_VERSION}" \
 && pi install "npm:pi-rewind-hook@${PI_REWIND_HOOK_VERSION}" \
 && pi install "npm:@plannotator/pi-extension@${PLANNOTATOR_VERSION}" \
 && pi install "npm:@narumitw/pi-btw@${PI_BTW_VERSION}"

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV POWERLINE_NERD_FONTS=1

ENV PLANNOTATOR_REMOTE=1
ENV PLANNOTATOR_BROWSER=xdg-open
