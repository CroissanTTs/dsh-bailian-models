#!/usr/bin/env node
/**
 * 自动适配器的离线测试：
 *  1. catalog.mjs 与 cordis.patch.yml 同步性
 *  2. computeRoutePatch 对真实用户路由形态的填补结果
 *  3. 合并后的候选配置用真实 dsh-llm-pi-ai Config schema 校验
 *  4. 幂等性（填补后再算应无缺口）
 *  5. apply() 全链路（mock settings 服务）：写入载荷、revision 传递、二次不重复写
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { apply, catalogFor, clampPresetModels, computeRoutePatch } from "../src/index.js";
import { MODELS, ROUTE_DEFAULTS } from "../src/catalog.mjs";
import { getSupportedThinkingLevels } from "@earendil-works/pi-ai";

const root = fileURLToPath(new URL("..", import.meta.url));
let passed = 0;
function ok(name, fn) {
	try {
		fn();
		passed++;
		console.log(`  ✓ ${name}`);
	} catch (error) {
		console.error(`  ✗ ${name}`);
		throw error;
	}
}

// ── 1. catalog 同步性 ──────────────────────────────────────────────
ok("catalog.mjs 与 cordis.patch.yml 同步", () => {
	const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
	const preset = doc.find((e) => e && e.id === "llm-pi-ai")?.config?.providers?.bailian;
	assert.deepEqual(MODELS, preset.models);
	assert.deepEqual(ROUTE_DEFAULTS.compat, preset.compat);
	assert.deepEqual(ROUTE_DEFAULTS.thinkingBudgets, preset.thinkingBudgets);
});

// 发布护栏：npm 只打包 package.json#files 覆盖到的路径。bundle patch 不在其中时
// 本地 link: 安装照常工作，但每个从 npm 装的用户都会因找不到 patch 而加载失败。
ok("files 覆盖 dsh.bundle.patch（否则 npm 安装会缺 patch 文件）", () => {
	const pkg = JSON.parse(readFileSync(root + "package.json", "utf8"));
	const patch = pkg.dsh?.bundle?.patch;
	assert.ok(patch, "package.json 必须声明 dsh.bundle.patch");
	const rel = patch.replace(/^\.\//, "");
	const covered = (pkg.files ?? []).some((entry) =>
		entry.endsWith("/") ? rel.startsWith(entry) : rel === entry
	);
	assert.ok(covered, `files ${JSON.stringify(pkg.files)} 未覆盖 ${rel}`);
	assert.ok(existsSync(root + rel), `${rel} 在仓库里不存在`);
});

// ── 2. computeRoutePatch 行为 ─────────────────────────────────────
const isBailianHost = (h) => /(^|\.)(dashscope(-intl|-us)?\.aliyuncs\.com|maas\.aliyuncs\.com)$/i.test(h);

// 一条已有百炼路由的典型形态：自建路由名、用户自己起的短名、部分字段已手写
const userRoute = {
	displayName: "My Bailian",
	apiKeyEnv: "MY_BAILIAN_KEY",
	api: "openai-completions",
	baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
	models: [
		{ id: "qwen3.8-max-0902", name: "3.8" },
		{ id: "deepseek-v4-flash-0731", name: "V4-Flash" },
		{ id: "glm-5.2-fast-preview", contextWindow: 1000000, name: "5.2" },
		{ id: "kimi-k3", name: "K3" },
	],
};

const patch = computeRoutePatch("my-bailian", userRoute, isBailianHost);

ok("识别百炼路由并产出补丁", () => assert.ok(patch));

ok("路由级 compat 填了方言开关", () => {
	assert.equal(patch.compat.thinkingFormat, "qwen");
	assert.equal(patch.compat.supportsStore, false);
	assert.equal(patch.compat.supportsDeveloperRole, false);
	assert.equal(patch.compat.supportsReasoningEffort, false);
});

ok("模型数组完整保留原条目与顺序", () => {
	assert.equal(patch.models.length, 4);
	assert.deepEqual(patch.models.map((m) => m.id), ["qwen3.8-max-0902", "deepseek-v4-flash-0731", "glm-5.2-fast-preview", "kimi-k3"]);
	assert.equal(patch.models[0].name, "3.8"); // 用户自定义名保留
});

ok("快照后缀匹配：qwen3.8-max-0902 继承 qwen3.8-max 的等级型档位", () => {
	const m = patch.models[0];
	assert.deepEqual(Object.keys(m.reasoningEfforts), ["off", "low", "medium", "xhigh"]);
	assert.equal(m.contextWindow, 1000000);
	assert.equal(m.compat.supportsReasoningEffort, true);
});

ok("deepseek-v4-flash-0731 → off/high/max", () => {
	assert.deepEqual(Object.keys(patch.models[1].reasoningEfforts), ["off", "high", "max"]);
});

ok("用户已写的 contextWindow 不被覆盖（glm-5.2-fast-preview 保持 1000000）", () => {
	assert.equal(patch.models[2].contextWindow, 1000000);
	assert.deepEqual(Object.keys(patch.models[2].reasoningEfforts), ["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
});

ok("仅思考模型 kimi-k3 只补容量、不加档位", () => {
	const m = patch.models[3];
	assert.equal(m.contextWindow, 1048576);
	assert.equal("reasoningEfforts" in m, false);
});

ok("deepseek-v4.1-flash：无 off、minimal→ultra 六档、视觉输入、1M/393k", () => {
	// ⚠️ harness 档位上限为 7 且 off 独占一格（pi-ai EXTENDED_THINKING_LEVELS），
	// 所以官方「minimal→ultra 共七级」不可能整份塞进去，必须丢一级。
	// 本目录丢高位 max、留低位 minimal（即不声明 off），最高档映射到官方 ultra。
	const route = {
		baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
		models: [{ id: "deepseek-v4.1-flash", name: "4.1-Flash" }],
	};
	const m = computeRoutePatch("my-bailian", route, isBailianHost).models[0];
	assert.deepEqual(m.reasoningEfforts, {
		minimal: "minimal",
		low: "low",
		medium: "medium",
		high: "high",
		xhigh: "xhigh",
		max: "ultra",
	});
	assert.equal("off" in m.reasoningEfforts, false, "不声明 off");
	assert.equal(m.contextWindow, 1000000);
	assert.equal(m.maxTokens, 393216);
	assert.deepEqual(m.input, ["text", "image"]);
	assert.equal(m.compat.supportsReasoningEffort, true);
	assert.equal(m.name, "4.1-Flash"); // 用户自定义名保留
});

ok("harness 档位上限 7 且 off 独占一格——minimal→ultra 七档不可能实现", () => {
	// 用真实 pi-ai 的 getSupportedThinkingLevels 验证：声明 k 个非 off 档位，
	// 解析出来就是 k 个（未声明档位被 dsh-llm-pi-ai 钉成 null 后剔除）。
	const pin = (declared) => {
		const out = {};
		for (const level of ["off", "minimal", "low", "medium", "high", "xhigh", "max"]) {
			const wire = declared[level];
			if (wire === undefined) out[level] = null;
			else if (wire !== null) out[level] = wire;
		}
		return out;
	};
	const six = { minimal: "minimal", low: "low", medium: "medium", high: "high", xhigh: "xhigh", max: "ultra" };
	const model = (map) => ({ reasoning: true, thinkingLevelMap: map });
	assert.deepEqual(getSupportedThinkingLevels(model(pin(six))), ["minimal", "low", "medium", "high", "xhigh", "max"]);
	// off 一旦缺席就补不回来：官方七级枚举塞不进 off+6 之外的任何形态
	assert.deepEqual(getSupportedThinkingLevels(model(pin({ off: null, ...six }))), ["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
	assert.equal(getSupportedThinkingLevels(model(pin(six))).length, 6, "六档就是上限");
});

ok("catalogFor 不错配：glm-5.1 不会落到 glm-5", () => {
	assert.equal(catalogFor("glm-5.1").maxTokens, 131072);
	assert.equal(catalogFor("glm-5").maxTokens, 16384);
	assert.equal(catalogFor("qwen3.7-max-2026-05-20").contextWindow, 1000000); // 日期型快照逐级剥离
	assert.equal(catalogFor("nonexistent-model-1"), undefined);
});

ok("非百炼路由不动；预置路由靠 base 层免主机判定", () => {
	assert.equal(computeRoutePatch("openai", { baseURL: "https://api.openai.com/v1", models: [{ id: "qwen3.8-max" }] }, isBailianHost), undefined);
	assert.equal(computeRoutePatch("x", { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" }, isBailianHost), undefined); // 无 models 列表
	// 预置 bailian 路由用户层不写 baseURL，照样按目录补齐；路由级 compat 由 base 提供，不重复写
	const p = computeRoutePatch("bailian", { apiKeyEnv: "MY_BAILIAN_KEY", models: [{ id: "qwen3.8-max" }] }, isBailianHost);
	assert.equal(p.compat, undefined);
	assert.deepEqual(Object.keys(p.models[0].reasoningEfforts), ["off", "low", "medium", "xhigh"]);
});

// 回归：用户把 GUI 模型页回写的清单挂在预置 bailian 路由上（数组整体替换 base 目录），
// 清单里的 deepseek-v4.1-flash 曾经因此拿不到任何档位 → 推理强度滑动条消失。
ok("预置路由 + 用户清单：deepseek-v4.1-flash 仍拿到档位", () => {
	const route = {
		apiKeyEnv: "MY_BAILIAN_KEY",
		models: [
			{ id: "qwen3.8-max-0902", name: "Qwen3.8 Max" },
			{ id: "glm-5.2-fast-preview", name: "GLM-5.2 Fast Preview" },
			{ id: "kimi-k3", name: "Kimi K3" },
			{ id: "deepseek-v4.1-flash", name: "4.1-Flash" },
		],
	};
	const p = computeRoutePatch("bailian", route, isBailianHost);
	assert.deepEqual(p.models.map((m) => m.id), ["qwen3.8-max-0902", "glm-5.2-fast-preview", "kimi-k3", "deepseek-v4.1-flash"]);
	const v41 = p.models[3];
	assert.deepEqual(v41.reasoningEfforts, {
		minimal: "minimal",
		low: "low",
		medium: "medium",
		high: "high",
		xhigh: "xhigh",
		max: "ultra",
	});
	assert.equal(v41.contextWindow, 1000000);
	assert.equal(v41.maxTokens, 393216);
	assert.deepEqual(v41.input, ["text", "image"]);
	assert.equal(v41.compat.supportsReasoningEffort, true);
	assert.equal(v41.name, "4.1-Flash"); // 用户自定义名保留
	// 仅思考型的 kimi-k3 只补容量、不加档位
	assert.equal(p.models[2].contextWindow, 1048576);
	assert.equal("reasoningEfforts" in p.models[2], false);
});

// ── 3. 合并 + 真实 schema 校验 ────────────────────────────────────
const merge = (base, patchObj) => {
	if (Array.isArray(base) || Array.isArray(patchObj) || typeof base !== "object" || base === null || typeof patchObj !== "object" || patchObj === null) return patchObj;
	const out = { ...base };
	for (const [k, v] of Object.entries(patchObj)) out[k] = k in out ? merge(out[k], v) : v;
	return out;
};

let mergedSection;
const { Config } = await import("@deepseek-ai/dsh-llm-pi-ai");
{
	const userSection = { providers: { "my-bailian": userRoute } };
	mergedSection = merge(userSection, { providers: { "my-bailian": patch } });
	const result = await Config["~standard"].validate(mergedSection);
	if (result.issues) {
		console.error(JSON.stringify(result.issues, null, 2));
		throw new Error("merged config failed schema validation");
	}
	console.log("  ✓ 合并用户层后通过真实 llm-pi-ai Config 校验");
	passed++;
}

// ── 4. 幂等性 ─────────────────────────────────────────────────────
ok("幂等：填补后再算无缺口", () => {
	const mergedRoute = mergedSection.providers["my-bailian"];
	assert.equal(computeRoutePatch("my-bailian", mergedRoute, isBailianHost), undefined);
});

// ── 4b. 上下文阈值 maxContext ───────────────────────────────────
ok("已有路由：目录源的 contextWindow 超过阈值被钳制，低于阈值不动", () => {
	const p = computeRoutePatch("my-bailian", structuredClone(userRoute), isBailianHost, 400000);
	// kimi-k3 目录值 1048576 → 钳到 400000；用户未写过 contextWindow
	assert.equal(p.models[3].contextWindow, 400000);
	// qwen3.8-max-0902 目录值 1000000 → 400000
	assert.equal(p.models[0].contextWindow, 400000);
});

ok("阈值只钳目录源值，用户显式写的 contextWindow 不动", () => {
	const route = { ...structuredClone(userRoute), models: [{ id: "kimi-k3", name: "K3", contextWindow: 800000 }] };
	const p = computeRoutePatch("my-bailian", route, isBailianHost, 400000);
	assert.equal(p.models[0].contextWindow, 800000); // 用户显式 800000，不钳
});

ok("无阈值时目录值原样（1M）", () => {
	const p = computeRoutePatch("my-bailian", structuredClone(userRoute), isBailianHost);
	assert.equal(p.models[3].contextWindow, 1048576);
});

ok("clampPresetModels：base 超阈值钳制、低阈值不动、无阈值返回 undefined", () => {
	const base = { models: MODELS };
	const clamped = clampPresetModels(base, 400000);
	assert.ok(clamped, "应产出补丁");
	const byId = new Map(clamped.models.map((m) => [m.id, m]));
	assert.equal(byId.get("qwen3.8-max").contextWindow, 400000);     // 1M → 400k
	assert.equal(byId.get("kimi-k3").contextWindow, 400000);          // 1M → 400k
	assert.equal(byId.get("qwen3-max").contextWindow, 262144);        // 262144 < 400k，不动
	assert.equal(byId.get("qwen-turbo").contextWindow, 131072);       // 不动
	assert.equal(clampPresetModels(base, undefined), undefined);
	assert.equal(clampPresetModels({ models: MODELS }, 2_000_000), undefined, "阈值高于所有值 → 不产补丁");
});

// 真实 settings 服务在合并后与现状 deepEqual 时不发事件、不增 revision——
// 这是自动适配器幂等止循环的关键；mock 必须复刻这一步（尤其 maxContext 场景
// 下 clampPresetModels 读静态 base、永远产出补丁）。
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── 5. apply() 全链路（mock settings 服务） ───────────────────────
async function testApply() {
	const document = { "llm-pi-ai": { providers: { "my-bailian": structuredClone(userRoute) } } };
	let revision = 1;
	const updates = [];
	const listeners = [];
	const ctx = {
		logger: { info() {}, warn() {} },
		on: (event, fn) => listeners.push([event, fn]),
		settings: {
			describe: () => [{ ns: "llm-pi-ai", user: document["llm-pi-ai"], revision }],
			async update(ns, patchObj, expectedRevision) {
				assert.equal(ns, "llm-pi-ai");
				assert.equal(expectedRevision, revision);
				const candidate = merge(document[ns], patchObj);
				const result = await Config["~standard"].validate(candidate);
				if (result.issues) throw new Error("validation failed");
				if (equal(document[ns], candidate)) return; // 无变化：止循环
				document[ns] = candidate;
				revision++;
				updates.push(patchObj);
				for (const [, fn] of listeners.filter(([e]) => e === "settings/document-updated")) fn(ns);
			},
		},
	};
	apply(ctx, { autoAdapt: true });
	await new Promise((r) => setTimeout(r, 50)); // 等初始 pass + 事件触发的重跑

	assert.equal(updates.length, 1, "只应写入一次（事件重跑时幂等）");
	const filled = document["llm-pi-ai"].providers["my-bailian"];
	assert.equal(filled.compat.thinkingFormat, "qwen");
	assert.equal(filled.models[0].name, "3.8");
	assert.deepEqual(Object.keys(filled.models[0].reasoningEfforts), ["off", "low", "medium", "xhigh"]);
	console.log("  ✓ apply() 全链路：一次写入、事件不循环、字段正确");
	passed++;
}
await testApply();

// ── 6. apply() + maxContext：预置路由阈值钳制 + 改值重新生效 + 幂等 ─
async function testMaxContext() {
	// base 层 = 插件预置的 bailian 路由（catalog 原值）
	const baseBailian = { compat: ROUTE_DEFAULTS.compat, thinkingBudgets: ROUTE_DEFAULTS.thinkingBudgets, models: MODELS.map((m) => ({ ...m })) };
	const document = { "llm-pi-ai": { providers: { "my-bailian": structuredClone(userRoute) } } };
	let revision = 1;
	const updates = [];
	const listeners = [];
	const ctx = {
		logger: { info() {}, warn() {} },
		on: (event, fn) => listeners.push([event, fn]),
		settings: {
			describe: () => [{ ns: "llm-pi-ai", base: { providers: { bailian: baseBailian } }, user: document["llm-pi-ai"], revision }],
			async update(ns, patchObj, expectedRevision) {
				assert.equal(expectedRevision, revision);
				const candidate = merge(document[ns], patchObj);
				const result = await Config["~standard"].validate(candidate);
				if (result.issues) throw new Error("validation failed");
				if (equal(document[ns], candidate)) return; // 无变化：止循环
				document[ns] = candidate;
				revision++;
				updates.push(patchObj);
				for (const [, fn] of listeners.filter(([e]) => e === "settings/document-updated")) fn(ns);
			},
		},
	};
	apply(ctx, { autoAdapt: true, maxContext: 400000 });
	await new Promise((r) => setTimeout(r, 50));

	// 第一次写入：my-bailian 缺口补齐 + bailian 阈值钳制，应在同一次 update 里
	assert.equal(updates.length, 1, "一次写入");
	const u = updates[0].providers;
	assert.ok(u["my-bailian"], "已有路由被补齐");
	assert.ok(u.bailian?.models, "预置路由被阈值钳制");
	const byId = new Map(u.bailian.models.map((m) => [m.id, m]));
	assert.equal(byId.get("qwen3.8-max").contextWindow, 400000);
	assert.equal(byId.get("qwen3-max").contextWindow, 262144, "低于阈值不动");

	// 合并后 resolved 的 bailian：用户层钳制值覆盖 base（数组替换）
	const resolvedBailian = document["llm-pi-ai"].providers.bailian;
	assert.equal(new Map(resolvedBailian.models.map((m) => [m.id, m])).get("kimi-k3").contextWindow, 400000);

	console.log("  ✓ apply()+maxContext：预置路由钳制、合并过 schema、止循环");
	passed++;
}
await testMaxContext();

// ── 7. apply() + 预置路由上的用户清单（GUI 回写形态） ─────────────
async function testPresetUserModels() {
	const baseBailian = { compat: ROUTE_DEFAULTS.compat, thinkingBudgets: ROUTE_DEFAULTS.thinkingBudgets, models: MODELS.map((m) => ({ ...m })) };
	const presetRoute = {
		apiKeyEnv: "MY_BAILIAN_KEY",
		models: [
			{ id: "qwen3.8-max-0902", name: "3.8" },
			{ id: "glm-5.2-fast-preview", name: "5.2" },
			{ id: "kimi-k3", name: "K3" },
			{ id: "deepseek-v4.1-flash", name: "4.1-Flash" },
		],
	};
	const document = { "llm-pi-ai": { providers: { bailian: structuredClone(presetRoute) } } };
	let revision = 1;
	const updates = [];
	const listeners = [];
	const ctx = {
		logger: { info() {}, warn() {} },
		on: (event, fn) => listeners.push([event, fn]),
		settings: {
			describe: () => [{ ns: "llm-pi-ai", base: { providers: { bailian: baseBailian } }, user: document["llm-pi-ai"], revision }],
			async update(ns, patchObj, expectedRevision) {
				assert.equal(expectedRevision, revision);
				const candidate = merge(document[ns], patchObj);
				const result = await Config["~standard"].validate(candidate);
				if (result.issues) throw new Error("validation failed");
				if (equal(document[ns], candidate)) return; // 无变化：止循环
				document[ns] = candidate;
				revision++;
				updates.push(patchObj);
				for (const [, fn] of listeners.filter(([e]) => e === "settings/document-updated")) fn(ns);
			},
		},
	};
	apply(ctx, { autoAdapt: true });
	await new Promise((r) => setTimeout(r, 50));

	assert.equal(updates.length, 1, "只写一次（事件重跑幂等）");
	const filled = document["llm-pi-ai"].providers.bailian;
	assert.equal(filled.models.length, 4, "用户清单不被 base 的 37 个模型顶掉");
	assert.deepEqual(filled.models.map((m) => m.id), presetRoute.models.map((m) => m.id));
	assert.deepEqual(Object.keys(filled.models[3].reasoningEfforts), ["minimal", "low", "medium", "high", "xhigh", "max"]);
	assert.equal(filled.models[3].reasoningEfforts.max, "ultra");
	assert.equal(filled.models[3].contextWindow, 1000000);
	assert.equal(filled.apiKeyEnv, "MY_BAILIAN_KEY"); // 用户字段原样保留
	console.log("  ✓ apply()+预置路由用户清单：一次写入、清单不被顶掉、v4.1-flash 拿到六档");
	passed++;
}
await testPresetUserModels();

console.log(`\n全部通过（${passed} 项）`);
