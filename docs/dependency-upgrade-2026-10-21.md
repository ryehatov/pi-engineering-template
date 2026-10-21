# Pi and extension upgrade — 2026-10-21

The following GitHub releases were inspected on 2026-10-21. Docker pins exact versions and the SoL-Pi commit, not moving `latest` tags.

| Component | Previous | Pinned | Upstream source |
| --- | --- | --- | --- |
| Pi coding-agent | 1.1.0 | 1.3.0 | [release](https://github.com/earendil-works/pi/releases/tag/v1.3.0) |
| pi-accounts | 0.53.1 | 0.53.2 | [release](https://github.com/narumiruna/pi-extensions/releases/tag/%40narumitw/pi-accounts%400.53.2) |
| pi-subagents | 0.77.0 | 0.80.0 | [release](https://github.com/nicobailon/pi-subagents/releases/tag/v0.80.0) |
| pi-pstack | 0.6.0 | 0.6.0 | [release](https://github.com/zenspc/pi-extensions/releases/tag/%40zenspc/pi-pstack%400.6.0) |
| Ponytail | 5.1.0 | 5.3.2 | [release](https://github.com/DietrichGebert/ponytail/releases/tag/v5.3.2) |
| pi-web-access | 0.38.0 | 0.44.0 | [release](https://github.com/nicobailon/pi-web-access/releases/tag/v0.44.0) |
| pi-lens | 4.4.2 | 4.4.4 | [release](https://github.com/apmantza/pi-lens/releases/tag/v4.4.4) |
| pi-fff | 0.11.0 | 0.11.0 | [release](https://github.com/dmtrKovalenko/fff/releases/tag/v0.11.0) |
| pi-context-view | 0.6.0 | 0.7.2 | [release](https://github.com/dimk90/pi-context-view/releases/tag/v0.7.2) |
| pi-powerline-footer | 0.20.0 | 0.20.2 | [release](https://github.com/nicobailon/pi-powerline-footer/releases/tag/v0.20.2) |
| pi-rewind-hook | 1.8.7 | 1.8.7 | [release](https://github.com/nicobailon/pi-rewind-hook/releases/tag/v1.8.7) |
| pi-btw | 0.61.1 | 0.62.0 | [release](https://github.com/narumiruna/pi-extensions/releases/tag/%40narumitw/pi-btw%400.62.0) |
| pi-goal | 0.54.8 | 0.54.13 | [release](https://github.com/narumiruna/pi-extensions/releases/tag/%40narumitw/pi-goal%400.54.13) |
| SoL-Pi | `03529c710269d3e3336a033cead49a95189987f1` | `219568034fa54ed121ede80961655e33dfb9d0e3` | [commit](https://github.com/NVlabs/SoL-Pi/commit/219568034fa54ed121ede80961655e33dfb9d0e3) |

The Bun 1.4.3 and Docker base image digest pins are retained because this audit targets Pi and its extensions.

## Compatibility and migration decisions

- Pi 1.3.0 fixes mixed-version internal packages, changes model-switch thinking history, and restores session tool selections on resume. Use its published `settings.json` schema and additive `+codemode` with `codemode.mode: "on"`, not `"only"`.
- pi-subagents 0.80.0 requires Pi >=1.2.0; it improves idle async wakes, per-child `cwd`/`model` in workflows, and prompt cache stability. Explicit `toolActivation: "auto"`, `pinToolDeclarations: true`, max 4 active parent async runs and max 128 cumulative session spawns implement the intended resource boundary.
- pi-context-view 0.7.2 requires Pi 1.3.0 and handles previous-model thinking removal. The optional silent probe is disabled to avoid synthetic extension-hook activity. Real request inspection still works.
- pi-web-access 0.44.0 strips sensitive provider auth on cross-origin redirects. Keep `toolExposure: "direct"` and `toolActivation: "auto"`: the package-defined native `researcher` needs `web_search`, `fetch_content`, `source_check`, and `get_search_content`. Deferred-only access would need separate child tool activation.
- SoL-Pi's new commit has Pi 1.3.0 compatibility coverage for its mechanisms and Codemode. This template continues to enable only Action Fusion and ObservationPack; EPR/OCC stay disabled.
- Pi-Lens 4.4.4 supports Pi 1.2/1.3. Ponytail, BTW, Goal, Accounts and Powerline include UI, lifecycle, prompt-cache, or error recovery updates. pi-pstack, pi-fff and pi-rewind-hook have no newer stable tags in the checked sources.

## Verification required

Run `node scripts/verify-template.mjs`, `node --test scripts/verify-template.test.mjs`, and `docker build -t pi-engineering-template:pstack .`. The static checks are not a Docker runtime qualification. After authenticating providers, check model registry resolution, native Claude review, Web researcher, nested Poteto delegation, Codemode alongside direct tools, SoL-Pi Action Fusion and ObservationPack, and extension load errors. See [operations](operations.md).

Native Anthropic OAuth authentication does not prove that third-party-client use is covered by the subscription. Check current billing and entitlement policy.
