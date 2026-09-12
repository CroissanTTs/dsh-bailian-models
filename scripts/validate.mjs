#!/usr/bin/env node
/**
 * Validate cordis.patch.yml against the real dsh-llm-pi-ai Config schema.
 *
 * Usage:
 *   npm install        # installs @deepseek-ai/dsh-llm-pi-ai + js-yaml (dev deps)
 *   npm run validate
 *
 * Exits non-zero and prints schema issues when the preset is invalid.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

const patchPath = fileURLToPath(new URL("../cordis.patch.yml", import.meta.url));
const doc = yaml.load(readFileSync(patchPath, "utf8"));
if (!Array.isArray(doc)) throw new Error("cordis.patch.yml must be a top-level YAML array");

const row = doc.find((entry) => entry && entry.id === "llm-pi-ai");
if (!row) throw new Error('no patch row with id "llm-pi-ai" found');
if (row.name !== "@deepseek-ai/dsh-llm-pi-ai")
  throw new Error(`row name guard mismatch: ${JSON.stringify(row.name)}`);
if (row.config == null || typeof row.config !== "object")
  throw new Error("row carries no config object");

const { Config } = await import("@deepseek-ai/dsh-llm-pi-ai");
const result = await Config["~standard"].validate(row.config);
if (result.issues) {
  console.error("Schema issues:");
  console.error(JSON.stringify(result.issues, null, 2));
  process.exit(1);
}

const providers = result.value.providers ?? {};
for (const [key, provider] of Object.entries(providers)) {
  console.log(`provider "${key}": ${provider.models?.length ?? 0} models`);
}
console.log("OK — patch config validates against the installed dsh-llm-pi-ai schema.");
