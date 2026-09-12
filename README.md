# dsh-bailian-models

English | [中文](README.zh.md)

A DeepSeek Harness (DSH) plugin that ships a preset **Alibaba Bailian (DashScope)** provider route: **36 major text models** with correct context windows, max output tokens, and per-family **reasoning effort controls** (`enable_thinking` / `reasoning_effort` / `thinking_budget`).

Once installed, Bailian models appear in the DSH model picker with working reasoning-effort levels — no hand-written `settings.yaml` required.

## Why

DSH's built-in pi-ai adapter does not recognize the `dashscope.aliyuncs.com` endpoint: requests fall back to the plain OpenAI dialect (wrong `store`/`developer` fields, no `enable_thinking`), and model entries carry no context-window or reasoning metadata — so reasoning strength is fixed and context is unknown. This bundle supplies the correct dialect, effort levels, and capacities for every listed model.

## Install

**DSH Desktop / Web (community market)**: search for `dsh-bailian-models` in the market and confirm the install.

**CLI**:

```bash
dsh plugin --profile web add dsh-bailian-models
```

Set your API key (referenced by env var name only — keys are never stored by this plugin):

```bash
export DASHSCOPE_API_KEY=sk-...
```

You can later edit the `bailian` route in DSH settings (Models page) to use a different env var name or regional endpoint.

## How reasoning levels map to the wire

Bailian model families speak incompatible thinking dialects; the bundle adapts each one:

| Family type | Wire params | DSH level behavior |
|---|---|---|
| A. Effort levels | `enable_thinking` + `reasoning_effort` | Selecting a level sends that effort; Off disables thinking |
| B. Budgets | `enable_thinking` + `thinking_budget` | Levels map to token budgets: minimal 1024 / low 4096 / medium 16384 / high 65536 (clamped per model) |
| C. Toggle | `enable_thinking` only | Off / High (High = thinking on) |
| D. Always-thinking | none (model always thinks) | No levels offered — sending any toggle risks a 400; reasoning content still displays |

> With no level selected, type A/B/C models explicitly send `enable_thinking: false` (predictable cost). Type D models are unaffected.

## Model table

All capacities from the official Alibaba Bailian docs. Context / max output in tokens.

**A. Effort levels** — qwen3.8-max, qwen3.8-max-0902, qwen3.8-flash (off/low/medium/xhigh, 1M ctx, 131k out, text+image) · glm-5.2, glm-5.2-us, glm-5.2-fast-preview (off…max, 1,048,576 ctx) · glm-5.1, glm-5 (off…xhigh) · deepseek-v4-pro, deepseek-v4-pro-0813, deepseek-v4-flash, deepseek-v4-flash-0731 (off/high/max, 1M ctx, 393,216 out).

**B. Budgets** — qwen3.7-max/plus/flash, qwen3.6-plus/flash, qwen3.5-plus/flash, qwen3-max, qwen-plus (off/minimal/low/medium/high).

**C. Toggle** — qwen-flash, qwen-turbo, deepseek-v3.2, deepseek-v3.2-exp, deepseek-v3.1, kimi-k2.6, kimi-k2.5.

**D. Always-thinking** — kimi-k3, kimi-k2.7-code, kimi-k2-thinking, MiniMax-M2.5, MiniMax-M2.1, deepseek-r1, deepseek-r1-0528, qwq-plus.

The full per-model table with sources lives in [README.zh.md](README.zh.md#模型速查表).

## Customizing

The bundle writes into the composition **base layer**; anything you put in the `llm-pi-ai:` section of `~/.dsh/settings.yaml` (or edit in the Models page) merges over it per provider key and applies without a restart:

```yaml
llm-pi-ai:
  providers:
    bailian:
      baseURL: https://dashscope-intl.aliyuncs.com/compatible-mode/v1  # Singapore
      apiKeyEnv: MY_BAILIAN_KEY
```

**Uninstall** removes the base-layer route; any user-layer overrides of `bailian` stay harmless but inert — delete them too if you like.

## How it works (for maintainers)

This is a **pure-config bundle** — no code. `package.json`'s `dsh.bundle.patch` points to [`cordis.patch.yml`](cordis.patch.yml), which overrides (by `id`) the dormant `llm-pi-ai` row in the `dsh-base` composition, injecting the `bailian` route into the base layer. The `name` field is a drift guard: if a future base composition mounts a different plugin under that id, this patch is skipped with a warning instead of silently corrupting configuration.

Serialization is done by `@deepseek-ai/dsh-llm-pi-ai` (pi-ai runtime): with the `qwen` thinking dialect it sends `enable_thinking` / `reasoning_effort` / `thinking_budget`, and reasoning streams back via `reasoning_content`.

Validate after editing the patch:

```bash
npm install
npm run validate   # validates cordis.patch.yml against the real dsh-llm-pi-ai Config schema
```

## Platform constraints worth knowing

- Thinking mode requires streaming — DSH always streams, so this is a non-issue.
- `reasoning_effort` and `thinking_budget` are **mutually exclusive** on the qwen3.8 family, hence no budget levels on type-A Qwen models.
- kimi-k3, deepseek-r1, MiniMax-M2.x, qwq-plus etc. are **always-thinking** models; thinking cannot be disabled — a platform behavior, not a plugin defect.
- The bundle cannot see deprecations; if Bailian retires a model, delete its entry in settings.

## Contributing

Add or fix a model by editing [`cordis.patch.yml`](cordis.patch.yml): copy the entry shape of its family and attach a link to the official Bailian doc page for the numbers. Run `npm run validate` before submitting.

## License

MIT
