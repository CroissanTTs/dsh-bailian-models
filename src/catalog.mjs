// 由 scripts/build-catalog.mjs 从 cordis.patch.yml 生成——请勿手改。
export const ROUTE_DEFAULTS = {
	"compat": {
		"thinkingFormat": "qwen",
		"supportsStore": false,
		"supportsDeveloperRole": false,
		"supportsReasoningEffort": false
	},
	"thinkingBudgets": {
		"minimal": 1024,
		"low": 4096,
		"medium": 16384,
		"high": 65536
	}
};
export const MODELS = [
	{
		"id": "qwen4-max",
		"name": "Qwen4 Max",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		}
	},
	{
		"id": "qwen3.8-max",
		"name": "Qwen3.8 Max",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"low": "low",
			"medium": "medium",
			"xhigh": "xhigh"
		}
	},
	{
		"id": "qwen3.8-max-0902",
		"name": "Qwen3.8 Max (0902 快照)",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"low": "low",
			"medium": "medium",
			"xhigh": "xhigh"
		}
	},
	{
		"id": "qwen3.8-flash",
		"name": "Qwen3.8 Flash",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"low": "low",
			"medium": "medium",
			"xhigh": "xhigh"
		}
	},
	{
		"id": "glm-5.3",
		"name": "GLM-5.3",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true,
			"thinkingFormat": "openai"
		},
		"reasoningEfforts": {
			"low": "low",
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "glm-5.3-prime",
		"name": "GLM-5.3 Prime",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true,
			"thinkingFormat": "openai"
		},
		"reasoningEfforts": {
			"low": "low",
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		}
	},
	{
		"id": "glm-5.2-us",
		"name": "GLM-5.2 (US)",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		}
	},
	{
		"id": "glm-5.2-fast-preview",
		"name": "GLM-5.2 Fast Preview",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "max"
		}
	},
	{
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"contextWindow": 202745,
		"maxTokens": 131072,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh"
		}
	},
	{
		"id": "glm-5",
		"name": "GLM-5",
		"contextWindow": 202752,
		"maxTokens": 16384,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh"
		}
	},
	{
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "deepseek-v4-pro-0813",
		"name": "DeepSeek V4 Pro (0813 快照)",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "deepseek-v4-flash-0731",
		"name": "DeepSeek V4 Flash (0731 快照)",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"off": null,
			"high": "high",
			"max": "max"
		}
	},
	{
		"id": "deepseek-v4.1-flash",
		"name": "DeepSeek V4.1 Flash",
		"contextWindow": 1000000,
		"maxTokens": 393216,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsReasoningEffort": true
		},
		"reasoningEfforts": {
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high",
			"xhigh": "xhigh",
			"max": "ultra"
		}
	},
	{
		"id": "qwen3.7-max",
		"name": "Qwen3.7 Max",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.7-plus",
		"name": "Qwen3.7 Plus",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.7-flash",
		"name": "Qwen3.7 Flash",
		"contextWindow": 1000000,
		"maxTokens": 131072,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.6-plus",
		"name": "Qwen3.6 Plus",
		"contextWindow": 1000000,
		"maxTokens": 65536,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.6-flash",
		"name": "Qwen3.6 Flash",
		"contextWindow": 1000000,
		"maxTokens": 65536,
		"input": [
			"text",
			"image"
		],
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.5-plus",
		"name": "Qwen3.5 Plus",
		"contextWindow": 1000000,
		"maxTokens": 65536,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3.5-flash",
		"name": "Qwen3.5 Flash",
		"contextWindow": 1000000,
		"maxTokens": 65536,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen3-max",
		"name": "Qwen3 Max",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen-plus",
		"name": "Qwen Plus",
		"contextWindow": 1000000,
		"maxTokens": 32768,
		"compat": {
			"supportsThinkingTokenBudget": true,
			"thinkingTokenBudgetField": "thinking_budget"
		},
		"reasoningEfforts": {
			"off": null,
			"minimal": "minimal",
			"low": "low",
			"medium": "medium",
			"high": "high"
		}
	},
	{
		"id": "qwen-flash",
		"name": "Qwen Flash",
		"contextWindow": 1000000,
		"maxTokens": 32768,
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "qwen-turbo",
		"name": "Qwen Turbo",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "deepseek-v3.2",
		"name": "DeepSeek V3.2",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "deepseek-v3.2-exp",
		"name": "DeepSeek V3.2 Exp",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "deepseek-v3.1",
		"name": "DeepSeek V3.1",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"input": [
			"text",
			"image"
		],
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"input": [
			"text",
			"image"
		],
		"reasoningEfforts": {
			"off": null,
			"high": "high"
		}
	},
	{
		"id": "kimi-k3",
		"name": "Kimi K3",
		"contextWindow": 1048576,
		"maxTokens": 1048576
	},
	{
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"input": [
			"text",
			"image"
		]
	},
	{
		"id": "kimi-k2-thinking",
		"name": "Kimi K2 Thinking",
		"contextWindow": 262144,
		"maxTokens": 16384
	},
	{
		"id": "MiniMax-M2.5",
		"name": "MiniMax M2.5",
		"contextWindow": 204800,
		"maxTokens": 32768
	},
	{
		"id": "MiniMax-M2.1",
		"name": "MiniMax M2.1",
		"contextWindow": 204800,
		"maxTokens": 32768
	},
	{
		"id": "deepseek-r1",
		"name": "DeepSeek R1",
		"contextWindow": 131072,
		"maxTokens": 16384
	},
	{
		"id": "deepseek-r1-0528",
		"name": "DeepSeek R1 (0528)",
		"contextWindow": 131072,
		"maxTokens": 16384
	},
	{
		"id": "qwq-plus",
		"name": "QwQ Plus",
		"contextWindow": 131072,
		"maxTokens": 8192
	}
];
