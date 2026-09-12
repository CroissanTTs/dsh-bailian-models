# 发布指南（Publishing）

本文档描述如何把 `dsh-bailian-models` 发布到开源社区并让 DSH 用户可安装。

## 0. 发布前检查

```bash
npm install
npm run validate        # schema 校验必须全绿
npm pack --dry-run      # 确认 files 字段只打包 patch + README + LICENSE
```

硬性门槛（DSH 社区市场自动安装的要求）：

- npm 上存在**精确稳定版本**（`1.0.0` 这种，**不能带 prerelease 后缀**；市场复核的是 `latest` 标签）。
- `package.json` 含合法的 `dsh.bundle.patch` 字段：相对路径、无 `\` / `..` / `:`、≤512 字符。本仓库已满足。
- 版本号每次发布递增；发布前更新 `README` 的模型表与 `CHANGELOG`。

## 1. GitHub

```bash
git init
git add -A
git commit -m "feat: Bailian (DashScope) model catalog preset for DeepSeek Harness"
git remote add origin git@github.com:<your-github>/dsh-bailian-models.git
git push -u origin main
```

推之前把 `package.json` 里 `repository.url` 的 `<your-github>` 换成真实账号。

## 2. npm

```bash
npm login               # 需要 npm 账号
npm publish             # 包是未 scope 的公开包，无需 --access 参数
```

> 注意：`devDependencies` 里的 `@deepseek-ai/dsh-llm-pi-ai` 仅用于本地校验，
> 不会被打包发布；用户侧由 DSH 组合自带该适配器。

## 3. 社区市场目录（让用户在 GUI 里一键安装）

DSH 社区市场采用「目录登记」制，无默认源；三条路径任选，也可都做：

### 3a. 1024Store（内置源，提交收录）

向 [github.com/imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) 提 PR，按该仓库 README 的条目格式登记。注意：

- `install` 字段文本必须严格形如 `dsh plugin --profile … add dsh-bailian-models`（市场侧会做命令形状校验，异形文本会被丢弃）。
- 条目信息（描述、仓库地址）与 npm 包保持一致。

### 3b. dshfind

按 dshfind 目录的收录流程提交（DSH 设置 → 市场里可启用该源查看现有条目格式）。

### 3c. 自建标准来源（零审批，立即可用）

任何实现了标准目录协议的 HTTPS 端点都能成为用户可添加的市场源：提供一个 manifest URL + `GET /v1/plugins` 列表端点（同源、443 端口）。最小示例见 DSH 内置文档 `dsh-community-market/docs/examples/`。用户在「设置 → 市场 → 添加来源」里登记你的 manifest URL 即可看到并安装插件。

### 3d. GitHub 钉 commit 直装（不经过任何目录）

DSH 也支持直接从 GitHub 安装：目录条目带 `repository` + `installSource: { kind: "github", commit: "<sha>" }`，Host 会复核 `raw.githubusercontent.com` 上的 `package.json` 后执行 `pnpm add github:owner/repo#<commit>`。适合发布前的灰度验证。

## 4. 发布后验证

1. 在 DSH 里添加你的市场源（或等 1024Store 收录）。
2. 安装插件，重载 profile。
3. 打开 设置 → 模型：应出现 `bailian` 路由与 36 个模型；逐个抽查：
   - qwen3.8-max 的推理档位为 off/low/medium/xhigh；
   - glm-5.2 为 off…max 七档；
   - qwen3.7-max 为 off/minimal/low/medium/high（预算型）；
   - kimi-k3 无档位（仅思考）。
4. 跑一次真实会话，确认请求里带上了 `enable_thinking` / `reasoning_effort` / `thinking_budget`（可开代理抓包验证）。

## 5. 安全与责任边界

DSH 市场**无签名机制**，明示「收录 ≠ 审核」，插件以用户权限本地运行。作为作者请遵守：

- 永不收取/存储用户密钥——本插件只引用环境变量名（`apiKeyEnv`）。
- patch 中不使用 `!!js` 表达式（纯数据配置），保持可静态审计。
- 安全问题响应：在 GitHub 仓库开启 Security Policy，或沿用市场侧公布的安全邮箱。

## 6. 版本维护节奏建议

- 百炼上新模型/改参数 → 改 `cordis.patch.yml` → `npm run validate` → 升 minor/patch → publish。
- DSH 侧 `dsh-llm-pi-ai` 的 Config schema 若升级（比如新增字段），CI 里的 validate 会第一时间抓到漂移。
