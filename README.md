# dsh-bailian-models

English | [中文](README.zh.md)

A DeepSeek Harness (DSH) plugin for **Alibaba Bailian (DashScope)**:

1. **Preset route**: a ready-to-use `bailian` provider route with a built-in catalog of **36 major text models** — context windows, max output tokens, and per-family reasoning effort controls (`enable_thinking` / `reasoning_effort` / `thinking_budget`);
2. **Auto-adapter**: detects any of your **existing** provider routes whose `baseURL` points at Bailian and fills in the missing dialect, reasoning levels, and capacity declarations — fields you wrote yourself are always kept.

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

## Auto-adapting existing routes

Beyond the preset `bailian` route, the bundle mounts an auto-adapter: it watches the `llm-pi-ai` settings section, and any existing route whose `baseURL` hostname matches a Bailian endpoint (`dashscope.aliyuncs.com` / `dashscope-intl` / `dashscope-us` / `*.maas.aliyuncs.com`) gets filled in automatically:

- route-level dialect compat (`thinkingFormat: qwen`, `supportsStore: false`, `supportsDeveloperRole: false`);
- `contextWindow` / `maxTokens` / `input` / `reasoningEfforts` / model-level `compat` for models known to the bundled catalog (snapshot suffixes like `-0902` or `-2026-05-20` fall back to the parent model);
- the route-level `thinkingBudgets` level map when budget-type models are present.

**Only gaps are filled — values you wrote are never overwritten**; unknown model ids are left untouched. Every write is validated against `dsh-llm-pi-ai`'s own schema first; if a write is rejected, your config stays as-is and a warning is logged. Disable per profile by disabling the `bailian-models-autoadapt` patch row, or set its `config.autoAdapt: false`; self-hosted gateways can be added via `config.extraHosts`.

> Auto-filled fields land in the **user layer** of your settings (`settings.yaml`), so they survive uninstalling the plugin (harmlessly); the preset `bailian` route disappears with uninstall.

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

**A. Effort levels** — qwen4-max (off…max — all seven levels; 1M ctx, 393,216 out, text+image) · qwen3.8-max, qwen3.8-max-0902, qwen3.8-flash (off/low/medium/xhigh, 1M ctx, 131k out, text+image) · glm-5.3, glm-5.3-prime (low/high/max — thinking cannot be disabled; 1M ctx, 131k out) · glm-5.2, glm-5.2-us, glm-5.2-fast-preview (off…max, 1,048,576 ctx) · glm-5.1, glm-5 (off…xhigh) · deepseek-v4-pro, deepseek-v4-pro-0813, deepseek-v4-flash, deepseek-v4-flash-0731 (off/high/max, 1M ctx, 393,216 out) · deepseek-v4.1-flash (minimal…max — six levels, no `off`; 1M ctx, 393,216 out, text+image).

> **deepseek-v4.1-flash levels**: the official docs say `reasoning_effort` takes an integer 1–100, but the live `compatible-mode` endpoint rejects integers (`'reasoning_effort' must be an object with 'effort' field or a String`) and only accepts the enum `minimal/low/medium/high/xhigh/max/ultra` — `ultra` being one level beyond the documented set.
>
> ⚠️ The harness caps the level list at **7**, and `off` occupies one of those slots (pi-ai's `EXTENDED_THINKING_LEVELS = off/minimal/low/medium/high/xhigh/max`; undeclared levels are dropped). The official enum has exactly seven values, so "drop `off`, minimal→ultra = seven levels" is **physically impossible** in the harness — that would be eight. The choice is "off + 6 levels" or "no off, 6 levels". This catalog picks the latter: the slider's floor is `minimal` (thinking cannot be disabled for this model), and `max` maps to the official top tier `ultra` — i.e. the high `max` is sacrificed to keep the low `minimal`. `enable_thinking:false` does genuinely disable thinking (tested), so this is a deliberate trade-off; to restore "can disable thinking", add an empty `off:` line to `reasoningEfforts` (the top then becomes `xhigh`).
>
> **glm-5.3 / glm-5.3-prime levels**: only `low / high / max`, and thinking **cannot be disabled**. The docs say passing `enable_thinking=false` "has no effect", but the live endpoint returns a hard **400** (`InternalError.Algo.InvalidParameter: The value of the enable_thinking parameter is restricted`) — this catalog follows the measured behaviour: three levels, no `off`.
>
> Because the harness's `qwen` dialect sends `enable_thinking: false` when no level is selected (a guaranteed 400 here), this entry overrides `thinkingFormat` from the route's `qwen` to **`openai`** in its model-level compat. pi-ai then sends `reasoning_effort` only when a level is picked and **sends nothing at all** otherwise, falling back to the model default (thinking on). The levels do scale depth: on the same hard problem, `low` ≈ 10, `high` ≈ 59, `max` ≈ 686 reasoning tokens.

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
      # Narrow the model list. Note that settings merges arrays wholesale, so this
      # list replaces the base-layer catalog; fields you leave out are restored by
      # the auto-adapter by id (including reasoningEfforts) — the id alone suffices.
      models:
        - id: qwen3.8-max
```

> ⚠️ **Careful when editing the Bailian list on the Models page**: the GUI writes the resolved list back into `settings.yaml` as `models`, replacing the base-layer catalog (this is how a 37-model route shrinks to a handful). The auto-adapter restores the missing fields by id on the next settings change, so effort levels survive — but if you want the whole catalog, delete that `models:` block from the user layer.

**Uninstall** removes the base-layer route; any user-layer overrides of `bailian` stay harmless but inert — delete them too if you like.

## How it works (for maintainers)

Two parts:

1. **Pure-config preset**: `package.json`'s `dsh.bundle.patch` points to [`cordis.patch.yml`](cordis.patch.yml), which overrides (by `id`) the dormant `llm-pi-ai` row in the `dsh-base` composition, injecting the `bailian` route into the base layer. The `name` field is a drift guard: if a future base composition mounts a different plugin under that id, this patch is skipped with a warning instead of silently corrupting configuration.
2. **Auto-adapter** (`src/index.js`, mounted by the same patch's `insert` row): listens to `settings/document-updated`, detects Bailian routes by hostname, and fills gaps via an idempotent pure function (`computeRoutePatch`). The model catalog is generated from `cordis.patch.yml` (`npm run build` → `src/catalog.mjs`); the YAML is the single source of truth. Zero runtime dependencies.

Serialization is done by `@deepseek-ai/dsh-llm-pi-ai` (pi-ai runtime): with the `qwen` thinking dialect it sends `enable_thinking` / `reasoning_effort` / `thinking_budget`, and reasoning streams back via `reasoning_content`.

Validate after editing the patch:

```bash
npm install
npm test   # schema-validates cordis.patch.yml + catalog sync + auto-adapter behavior (22 assertions)
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
