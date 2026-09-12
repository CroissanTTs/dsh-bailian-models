# dsh-bailian-models

[English](README.md) | 中文

DeepSeek Harness（DSH）插件：一条预置的**阿里云百炼（DashScope）** provider 路由，内置 **36 个主流文本模型**的完整适配——每个模型的上下文窗口、最大输出，以及按百炼各模型家族逐一适配的**推理强度控制**（`enable_thinking` / `reasoning_effort` / `thinking_budget`）。

安装后在 DSH 的模型选择器里直接选用百炼模型，推理强度档位出现在会话的推理强度控件中；不需要手写任何 `settings.yaml`。

## 为什么需要它

DSH 自带的 pi-ai 适配器不认识 `dashscope.aliyuncs.com` 这个端点：直接配置百炼 URL 时会按 OpenAI 默认方言发送请求（错误的 `store`/`developer` 字段、不会发 `enable_thinking`），模型条目也没有上下文窗口和推理能力信息——表现就是"只能跑标准大小、调不了推理强度"。本插件把每个模型的正确方言、推理档位与容量声明补齐。

## 安装

**DSH 桌面端 / Web（社区市场）**：在市场里搜索 `dsh-bailian-models`，确认安装即可（安装后按提示重载 profile）。

**命令行**：

```bash
dsh plugin --profile web add dsh-bailian-models
```

**手动**（调试插件本身时）：把本仓库克隆到本地，在 profile 的 `package.json` 里 `pnpm add <本仓库路径>`，并把 `dsh-bailian-models` 追加到 `dsh.profile.bundles`。

安装后设置 API Key（插件只引用环境变量名，永不落盘密钥）：

```bash
export DASHSCOPE_API_KEY=sk-...
```

也可以在 DSH 设置 → 模型里编辑 `bailian` 路由、改用自己的环境变量名或地域端点。

## 推理强度是怎么映射的

百炼不同模型家族的思考参数互不兼容，插件按官方文档分成四类适配：

| 类型 | 线上参数 | DSH 档位行为 |
|---|---|---|
| A. 等级型 | `enable_thinking` + `reasoning_effort` | 选档即发送对应 effort；Off 关闭思考 |
| B. 预算型 | `enable_thinking` + `thinking_budget` | 档位映射 token 预算：minimal 1024 / low 4096 / medium 16384 / high 65536（按模型上限钳制） |
| C. 开关型 | 仅 `enable_thinking` | Off / High 两档（High = 开思考） |
| D. 仅思考型 | 模型始终思考，无参数 | 不提供档位（发任何开关参数都可能被 400 拒绝），思考内容正常显示 |

> 未选择档位时，A/B/C 类模型会显式发送 `enable_thinking: false`（即可预测地关闭思考，控制成本）；D 类模型不受影响。

## 模型速查表

数据来源：阿里云百炼官方文档（各模型信息页 + [深度思考模型的用法](https://help.aliyun.com/zh/model-studio/deep-thinking)）。`上下文 / 最大输出` 单位均为 token。

### A. 等级型（reasoning_effort）

| 模型 | 可选档位 | 上下文 | 最大输出 | 输入 |
|---|---|---|---|---|
| qwen3.8-max | off · low · medium · xhigh | 1,000,000 | 131,072 | 文+图 |
| qwen3.8-max-0902（快照） | 同上 | 1,000,000 | 131,072 | 文+图 |
| qwen3.8-flash | 同上 | 1,000,000 | 131,072 | 文+图 |
| glm-5.2 / glm-5.2-us / glm-5.2-fast-preview | off · minimal · low · medium · high · xhigh · max | 1,048,576 | 131,072 | 文 |
| glm-5.1 | off · minimal ~ xhigh | 202,745 | 131,072 | 文 |
| glm-5 | 同上 | 202,752 | 16,384 | 文 |
| deepseek-v4-pro / -0813、deepseek-v4-flash / -0731 | off · high · max | 1,000,000 | 393,216 | 文 |

### B. 预算型（thinking_budget）

| 模型 | 档位 | 上下文 | 最大输出 | 思维链上限 |
|---|---|---|---|---|
| qwen3.7-max / plus / flash | off · minimal · low · medium · high | 1,000,000 | 131,072 | 262,144 |
| qwen3.6-plus / flash | 同上 | 1,000,000 | 65,536 | 81,920 / 131,072 |
| qwen3.5-plus / flash | 同上 | 1,000,000 | 65,536 | 81,920 |
| qwen3-max | 同上 | 262,144 | 65,536 | 81,920 |
| qwen-plus | 同上 | 1,000,000 | 32,768 | 81,920 |

### C. 开关型（off / high）

qwen-flash（1M / 32k）、qwen-turbo（128k / 16k）、deepseek-v3.2 / v3.2-exp / v3.1（128k / 65k）、kimi-k2.6、kimi-k2.5（256k / 16k，支持图片）。

### D. 仅思考型（无档位，始终思考）

kimi-k3（1M / 1M）、kimi-k2.7-code（256k / 16k，支持图片）、kimi-k2-thinking（256k / 16k）、MiniMax-M2.5 / M2.1（204.8k / 32k）、deepseek-r1 / r1-0528（128k / 16k）、qwq-plus（128k / 8k）。

## 自定义与覆盖

插件写入的是组合的 **base 层**；你在 `~/.dsh/settings.yaml` 的 `llm-pi-ai:` 分节（或设置界面）里的任何修改都按 provider 键合并覆盖它，重启前即生效。常见覆盖：

```yaml
llm-pi-ai:
  providers:
    bailian:
      # 换地域端点（新加坡）
      baseURL: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
      # 换凭据环境变量
      apiKeyEnv: MY_BAILIAN_KEY
      # 收窄模型列表（整体替换），或给某个模型改容量
      models:
        - id: qwen3.8-max   # 其余字段继承插件 base 层同名条目
```

**卸载**：市场/命令行卸载本插件后，`bailian` 路由随 base 层一起消失；你在用户层对 `bailian` 的覆盖仍会保留但不再有任何效果，可一并删除。

## 工作原理（给维护者）

这是一个**纯配置 bundle**：没有代码。`package.json` 的 `dsh.bundle.patch` 指向 [`cordis.patch.yml`](cordis.patch.yml)，后者按 id 覆盖 dsh-base 组合里休眠的 `llm-pi-ai` 行（该行无 config），把 `bailian` 路由注入组合 base 层。`name` 字段是防漂移护栏：若未来 base 组合在该 id 挂载了别的插件，本 patch 会被跳过并告警而非静默写坏配置。

请求的实际序列化由 `@deepseek-ai/dsh-llm-pi-ai`（pi-ai 运行时）完成：`thinkingFormat: qwen` 方言下发送 `enable_thinking` / `reasoning_effort` / `thinking_budget`；思考内容经 `reasoning_content` 回流显示。

本地校验（改动 patch 后跑一遍）：

```bash
npm install
npm run validate   # 用真实 dsh-llm-pi-ai 的 Config schema 校验 cordis.patch.yml
```

## 已知的百炼平台约束

- **思考模式必须流式调用**：DSH 始终流式，不受影响。
- `reasoning_effort` 与 `thinking_budget` 在 qwen3.8 系列上**互斥**，因此 A 类模型不提供预算档。
- 部分模型（kimi-k3、deepseek-r1、MiniMax-M2.x、qwq-plus 等）是**仅思考模式**，不能关闭思考——这是平台行为，不是插件缺陷。
- 插件不查询余额/不感知模型下线；百炼下线某模型后，在设置里删掉对应条目即可。

## 贡献

新增/修正模型条目只需改 [`cordis.patch.yml`](cordis.patch.yml)：参照同家族现有条目补 `contextWindow` / `maxTokens` / `reasoningEfforts`，数据请附百炼官方文档链接。提交前跑 `npm run validate`。

## License

MIT
