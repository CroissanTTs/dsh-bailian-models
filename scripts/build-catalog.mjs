#!/usr/bin/env node
/**
 * 从 cordis.patch.yml（唯一事实源，手写、带注释）生成 src/catalog.mjs。
 * 改了 patch 后运行：npm run build
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const doc = yaml.load(readFileSync(root + "cordis.patch.yml", "utf8"));
const row = doc.find((entry) => entry && entry.id === "llm-pi-ai");
const preset = row?.config?.providers?.bailian;
if (!preset) throw new Error("cordis.patch.yml 中找不到 bailian 预置路由");

const out = `// 由 scripts/build-catalog.mjs 从 cordis.patch.yml 生成——请勿手改。
export const ROUTE_DEFAULTS = ${JSON.stringify({
	compat: preset.compat ?? {},
	thinkingBudgets: preset.thinkingBudgets,
}, null, "\t")};
export const MODELS = ${JSON.stringify(preset.models ?? [], null, "\t")};
`;
writeFileSync(root + "src/catalog.mjs", out);
console.log(`src/catalog.mjs: ${preset.models.length} 个模型已生成`);
