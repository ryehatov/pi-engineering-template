ARG BASE_IMAGE=docker/sandbox-templates:shell-docker@sha256:d86a6cdc105a1b299667a20c40bcf8d0584e56f21d44490a0737bb1baeb44299
FROM ${BASE_IMAGE}

USER root

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      tzdata \
 && rm -rf /var/lib/apt/lists/*

ARG PI_VERSION=0.86.0
ARG BUN_VERSION=1.4.2

RUN npm install -g --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
 && npm install -g "bun@${BUN_VERSION}" \
 && bun --version

USER agent

RUN mkdir -p \
    /home/agent/.pi/agent/extensions/subagent \
    /home/agent/.pi/agent/pstack \
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

COPY --chown=agent:agent sol-pi.json \
    /home/agent/.pi/agent/sol-pi.json

ARG PI_ACCOUNTS_VERSION=0.52.0
ARG PI_SUBAGENTS_VERSION=0.70.0
ARG PI_PSTACK_VERSION=0.6.0
ARG PONYTAIL_VERSION=4.10.0
ARG PI_WEB_ACCESS_VERSION=0.30.0
ARG PI_LENS_VERSION=4.2.1
ARG PI_FFF_VERSION=0.10.6
ARG PI_CONTEXT_VIEW_VERSION=0.5.2
ARG PI_POWERLINE_FOOTER_VERSION=0.17.1
ARG PI_REWIND_HOOK_VERSION=1.8.6
ARG PLANNOTATOR_VERSION=0.27.16
ARG PI_BTW_VERSION=0.60.0
ARG SOL_PI_COMMIT=bd005888b9b8a3fcdb511feb91fc27d3dfa8f2b1

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
 && pi install "npm:@plannotator/pi-extension@${PLANNOTATOR_VERSION}" \
 && pi install "npm:@narumitw/pi-btw@${PI_BTW_VERSION}" \
 && pi install "git:github.com/NVlabs/SoL-Pi@${SOL_PI_COMMIT}"

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Tokyo
ENV POWERLINE_NERD_FONTS=1
ENV PI_SUBAGENT_TASK_DELIVERY=file

ENV PLANNOTATOR_REMOTE=1
ENV PLANNOTATOR_BROWSER=xdg-open
