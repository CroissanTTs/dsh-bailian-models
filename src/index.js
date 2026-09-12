/**
 * dsh-bailian-models — 百炼（DashScope）路由自动适配器。
 *
 * 职责：监听 `llm-pi-ai` 设置分节，发现 baseURL 指向百炼端点的路由时，
 * 按本包内置目录（src/catalog.mjs，由 cordis.patch.yml 生成，YAML 是唯一事实源）
 * 补齐缺失的 compat 方言、模型 contextWindow / maxTokens / reasoningEfforts。
 * 用户已手写的字段一律保留（只补空缺），写入经 llm-pi-ai 自己的 schema 校验。
 *
 * 上下文阈值 `maxContext`：百炼不少模型支持 1M 上下文，而工程上 1M 与 400k
 * 效果相近、却远好于 262k 默认值；设一个部署级阈值，把目录里超过它的
 * contextWindow 钳制到阈值，其余不动。
 *
 * 幂等：每次设置变化后重算"缺口补丁"，无缺口则不写，因此自身写入触发的
 * `settings/document-updated` 事件不会造成循环。
 *
 * 本包零运行时依赖：catalog 为静态数据，config 手工归一化，任何安装方式
 * （npm / link: / file:）下都不会有裸导入解析失败。
 *
 * @module dsh-bailian-models
 */
import { MODELS, ROUTE_DEFAULTS } from "./catalog.mjs";

/** Cordis plugin name (diagnostics). */
const name = "bailian-models";
/** 只需要设置缝；事件监听是 cordis 核心能力，无需注入。 */
const inject = ["settings"];

/** 预置路由名：它由本包的 bundle patch 完整提供。 */
const PRESET_ROUTE = "bailian";
/** llm-pi-ai 的设置命名空间。 */
const NS = "llm-pi-ai";

/** 百炼官方端点主机名（各地域与国际站、模型工作室 maas 端点）。 */
const BAILIAN_HOST = /(^|\.)(dashscope(-intl|-us)?\.aliyuncs\.com|maas\.aliyuncs\.com)$/i;

/** 归一化插件配置（无 schema 依赖；非法值回落默认）。 */
function normalizeConfig(config) {
	const raw = config && typeof config === "object" ? config : {};
	const maxContext = typeof raw.maxContext === "number" && Number.isFinite(raw.maxContext) && raw.maxContext >= 1
		? Math.floor(raw.maxContext)
		: undefined;
	return {
		autoAdapt: typeof raw.autoAdapt === "boolean" ? raw.autoAdapt : true,
		maxContext,
		extraHosts: Array.isArray(raw.extraHosts) ? raw.extraHosts.filter((h) => typeof h === "string") : [],
	};
}

/** 目录查找表（id → 条目，不含 id 本身）。 */
const CATALOG = new Map(MODELS.map(({ id, ...rest }) => [id, rest]));

/** 取 URL 的小写主机名；解析失败返回 undefined。 */
function hostOf(baseURL) {
	if (typeof baseURL !== "string") return undefined;
	try {
		return new URL(baseURL).hostname.toLowerCase();
	} catch {
		return undefined;
	}
}

/**
 * 目录查找：先精确匹配，再逐段剥掉尾部数字段（-0902、-2026-05-20 这类快照后缀）
 * 直到命中。只剥数字段，不会把 glm-5.1 错配到 glm-5。
 */
function catalogFor(modelId) {
	let id = modelId;
	while (true) {
		const entry = CATALOG.get(id);
		if (entry) return entry;
		const stripped = id.replace(/-\d{2,4}$/, "");
		if (stripped === id) return undefined;
		id = stripped;
	}
}

/** 把一个 contextWindow 值按阈值钳制（maxContext 为空则原值返回）。 */
function clampContext(value, maxContext) {
	if (maxContext === undefined || typeof value !== "number") return value;
	return value > maxContext ? maxContext : value;
}

/**
 * 计算一条已有路由的"缺口补丁"：只填用户未设置的字段。
 * @param routeKey - 路由名。
 * @param routeCfg - 该路由在用户层的原始配置。
 * @param isBailianHost - 主机名判定（含 extraHosts）。
 * @param maxContext - 上下文阈值；目录源的 contextWindow 超过它即钳制。
 * @returns 需要 merge 进用户层的补丁，或 undefined（非百炼/无缺口/不适用）。
 */
function computeRoutePatch(routeKey, routeCfg, isBailianHost, maxContext) {
	if (routeKey === PRESET_ROUTE) return undefined;
	if (!routeCfg || typeof routeCfg !== "object") return undefined;
	const host = hostOf(routeCfg.baseURL);
	if (!host || !isBailianHost(host)) return undefined;
	if (!Array.isArray(routeCfg.models)) return undefined;

	const patch = {};
	const routeCompat = routeCfg.compat ?? {};

	// 路由级 compat：补缺失的方言开关。
	const compatFill = {};
	for (const [key, value] of Object.entries(ROUTE_DEFAULTS.compat)) {
		if (!(key in routeCompat)) compatFill[key] = value;
	}
	if (Object.keys(compatFill).length > 0) patch.compat = compatFill;

	// 模型条目：settings 合并时数组整体替换，补丁必须携带完整数组（原条目 + 填补）。
	let modelsTouched = false;
	let anyBudgetModel = false;
	const models = routeCfg.models.map((entry) => {
		if (!entry || typeof entry.id !== "string") return entry;
		const cat = catalogFor(entry.id);
		if (!cat) return entry;
		const filled = { ...entry };
		for (const key of ["name", "contextWindow", "maxTokens", "input", "reasoningEfforts"]) {
			if (!(key in filled) && cat[key] !== undefined) {
				// 上下文阈值只钳制目录源（非用户显式）的值。
				const val = key === "contextWindow" ? clampContext(cat[key], maxContext) : cat[key];
				filled[key] = val;
				modelsTouched = true;
			}
		}
		if (cat.compat) {
			const existing = entry.compat ?? {};
			const modelCompat = {};
			for (const [key, value] of Object.entries(cat.compat)) {
				if (key in existing) continue; // 用户模型级手写优先
				// 路由层（已有或本次填补）的有效值与目录一致时才省略模型级声明。
				const effective = key in compatFill ? compatFill[key] : routeCompat[key];
				if (effective !== value) modelCompat[key] = value;
			}
			if (Object.keys(modelCompat).length > 0) {
				filled.compat = { ...existing, ...modelCompat };
				modelsTouched = true;
			}
		}
		if ((filled.compat ?? compatFill).thinkingTokenBudgetField) anyBudgetModel = true;
		return filled;
	});
	if (modelsTouched) patch.models = models;

	// 预算型模型需要路由级 thinkingBudgets 映射才有档位语义。
	if (anyBudgetModel && ROUTE_DEFAULTS.thinkingBudgets && routeCfg.thinkingBudgets === undefined) {
		patch.thinkingBudgets = ROUTE_DEFAULTS.thinkingBudgets;
	}

	return Object.keys(patch).length > 0 ? patch : undefined;
}

/**
 * 计算预置 bailian 路由的"阈值补丁"：base 层里 contextWindow 超过 maxContext
 * 的模型钳制到阈值。返回完整 models 数组（settings 合并时整体替换 base）。
 *
 * 只读 base 层原始值来钳制，不读用户层——这样改变 maxContext 能干净地重新生效；
 * 代价是启用阈值后预置路由的 models 会落到用户层（机制限制：数组只能整体替换）。
 * @param baseBailian - descriptor.base.providers.bailian（本包 base 层）。
 * @param maxContext - 阈值；为空返回 undefined。
 * @returns {models: [...]} 或 undefined。
 */
function clampPresetModels(baseBailian, maxContext) {
	if (maxContext === undefined) return undefined;
	const models = Array.isArray(baseBailian?.models) ? baseBailian.models : [];
	let touched = false;
	const clamped = models.map((entry) => {
		if (!entry || typeof entry.contextWindow !== "number") return entry;
		if (entry.contextWindow <= maxContext) return entry;
		touched = true;
		return { ...entry, contextWindow: maxContext };
	});
	return touched ? { models: clamped } : undefined;
}

/**
 * 插件入口。
 * @param ctx - cordis 插件上下文（inject: settings）。
 * @param rawConfig - bundle patch 里该行的 config（手工归一化）。
 */
function apply(ctx, rawConfig) {
	const config = normalizeConfig(rawConfig);
	if (!config.autoAdapt) return;
	const isBailianHost = (host) => BAILIAN_HOST.test(host) || config.extraHosts.includes(host);
	let running = false;
	let queued = false;

	async function adaptAll() {
		if (running) {
			queued = true;
			return;
		}
		running = true;
		try {
			do {
				queued = false;
				await adaptOnce();
			} while (queued);
		} finally {
			running = false;
		}
	}

	async function adaptOnce() {
		const descriptor = ctx.settings.describe().find((d) => d.ns === NS);
		if (!descriptor) return; // llm-pi-ai 尚未注册分节；由重试/事件兜底
		const patch = {};

		// 已有用户路由：按缺口补齐（含上下文阈值钳制目录源值）。
		const userProviders = descriptor.user?.providers;
		if (userProviders && typeof userProviders === "object") {
			for (const [route, cfg] of Object.entries(userProviders)) {
				const routePatch = computeRoutePatch(route, cfg, isBailianHost, config.maxContext);
				if (routePatch) patch[route] = routePatch;
			}
		}

		// 预置 bailian 路由：base 层原始值按阈值钳制（启用阈值时才写）。
		const presetClamp = clampPresetModels(descriptor.base?.providers?.[PRESET_ROUTE], config.maxContext);
		if (presetClamp) patch[PRESET_ROUTE] = { ...(patch[PRESET_ROUTE] ?? {}), ...presetClamp };

		if (Object.keys(patch).length === 0) return;
		try {
			await ctx.settings.update(NS, { providers: patch }, descriptor.revision);
			ctx.logger.info(`dsh-bailian-models: 已补齐百炼路由：${Object.keys(patch).join(", ")}${config.maxContext ? `（上下文阈值 ${config.maxContext}）` : ""}`);
		} catch (error) {
			// 冲突（用户正在编辑）→ 下次事件再试；校验失败 → 保留现状并告警。
			if (error?.name === "SettingsConflictError") return;
			ctx.logger.warn("dsh-bailian-models: 自动补齐被拒绝（不影响现有配置）");
			ctx.logger.warn(error);
		}
	}

	// llm-pi-ai 的分节可能比我们晚注册；短重试覆盖启动时序。
	let attempts = 0;
	const retry = () => {
		attempts += 1;
		void adaptAll().then(() => {
			const registered = ctx.settings.describe().some((d) => d.ns === NS);
			if (!registered && attempts < 10) setTimeout(retry, 1000);
		}, () => {});
	};
	retry();
	ctx.on("settings/document-updated", (ns) => {
		if (ns === NS) void adaptAll().catch(() => {});
	}, { global: true });
}

export { apply, catalogFor, clampContext, clampPresetModels, computeRoutePatch, inject, name, normalizeConfig };
