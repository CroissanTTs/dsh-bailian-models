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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { apply, catalogFor, computeRoutePatch } from "../src/index.js";
import { MODELS, ROUTE_DEFAULTS } from "../src/catalog.mjs";

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

// ── 2. computeRoutePatch 行为 ─────────────────────────────────────
const isBailianHost = (h) => /(^|\.)(dashscope(-intl|-us)?\.aliyuncs\.com|maas\.aliyuncs\.com)$/i.test(h);

// 用户当前真实路由形态（取自 ~/.dsh/settings.yaml）
const userRoute = {
	displayName: "Zane",
	apiKeyEnv: "ARK_CODING_PLAN_API_KEY",
	api: "openai-completions",
	baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
	models: [
		{ id: "qwen3.8-max-0902", name: "3.8" },
		{ id: "deepseek-v4-flash-0731", name: "V4-Flash" },
		{ id: "glm-5.2-fast-preview", contextWindow: 1000000, name: "5.2" },
		{ id: "kimi-k3", name: "K3" },
	],
};

const patch = computeRoutePatch("ark-coding-plan", userRoute, isBailianHost);

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

ok("catalogFor 不错配：glm-5.1 不会落到 glm-5", () => {
	assert.equal(catalogFor("glm-5.1").maxTokens, 131072);
	assert.equal(catalogFor("glm-5").maxTokens, 16384);
	assert.equal(catalogFor("qwen3.7-max-2026-05-20").contextWindow, 1000000); // 日期型快照逐级剥离
	assert.equal(catalogFor("nonexistent-model-1"), undefined);
});

ok("非百炼路由与预置路由不动", () => {
	assert.equal(computeRoutePatch("openai", { baseURL: "https://api.openai.com/v1", models: [{ id: "qwen3.8-max" }] }, isBailianHost), undefined);
	assert.equal(computeRoutePatch("bailian", { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", models: [{ id: "qwen3.8-max" }] }, isBailianHost), undefined);
	assert.equal(computeRoutePatch("x", { baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1" }, isBailianHost), undefined); // 无 models 列表
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
	const userSection = { providers: { "ark-coding-plan": userRoute } };
	mergedSection = merge(userSection, { providers: { "ark-coding-plan": patch } });
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
	const mergedRoute = mergedSection.providers["ark-coding-plan"];
	assert.equal(computeRoutePatch("ark-coding-plan", mergedRoute, isBailianHost), undefined);
});

// ── 5. apply() 全链路（mock settings 服务） ───────────────────────
async function testApply() {
	const document = { "llm-pi-ai": { providers: { "ark-coding-plan": structuredClone(userRoute) } } };
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
				// 模拟真实服务：merge → schema 校验 → 提交 → revision++ → 事件
				const candidate = merge(document[ns], patchObj);
				const result = await Config["~standard"].validate(candidate);
				if (result.issues) throw new Error("validation failed");
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
	const filled = document["llm-pi-ai"].providers["ark-coding-plan"];
	assert.equal(filled.compat.thinkingFormat, "qwen");
	assert.equal(filled.models[0].name, "3.8");
	assert.deepEqual(Object.keys(filled.models[0].reasoningEfforts), ["off", "low", "medium", "xhigh"]);
	console.log("  ✓ apply() 全链路：一次写入、事件不循环、字段正确");
	passed++;
}
await testApply();

console.log(`\n全部通过（${passed} 项）`);
