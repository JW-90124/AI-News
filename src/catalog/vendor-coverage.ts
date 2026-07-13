import type { CuratedEventSeed } from "./history.js";

export interface PriorityVendorCoverage {
  slug: string;
  name: string;
  region: "CN" | "GLOBAL";
  aliases: readonly string[];
  sourceSlugs: readonly string[];
}

/**
 * The minimum vendor matrix that must remain visible in the public event graph.
 * A Source row alone is not coverage: every vendor also needs a curated,
 * searchable Event backed by one of its registered first-party sources.
 */
export const priorityVendorCoverage: readonly PriorityVendorCoverage[] = [
  {
    slug: "openai",
    name: "OpenAI",
    region: "GLOBAL",
    aliases: ["openai", "chatgpt", "gpt", "codex"],
    sourceSlugs: ["openai", "openai-codex-releases"],
  },
  {
    slug: "anthropic",
    name: "Anthropic / Claude",
    region: "GLOBAL",
    aliases: ["anthropic", "claude"],
    sourceSlugs: ["anthropic", "anthropic-python-releases"],
  },
  {
    slug: "google",
    name: "Google / Gemini",
    region: "GLOBAL",
    aliases: ["google", "deepmind", "gemini"],
    sourceSlugs: ["deepmind", "google-ai"],
  },
  {
    slug: "meta",
    name: "Meta / Llama",
    region: "GLOBAL",
    aliases: ["meta", "llama"],
    sourceSlugs: ["meta-ai", "meta-llama-updates"],
  },
  {
    slug: "xai",
    name: "xAI / Grok",
    region: "GLOBAL",
    aliases: ["xai", "spacexai", "grok"],
    sourceSlugs: ["xai", "xai-release-notes", "xai-model-docs"],
  },
  {
    slug: "mistral",
    name: "Mistral AI",
    region: "GLOBAL",
    aliases: ["mistral"],
    sourceSlugs: ["mistral", "mistral-inference-updates"],
  },
  {
    slug: "cohere",
    name: "Cohere",
    region: "GLOBAL",
    aliases: ["cohere", "command a"],
    sourceSlugs: ["cohere", "cohere-release-notes"],
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    region: "GLOBAL",
    aliases: ["perplexity", "comet", "sonar"],
    sourceSlugs: ["perplexity", "perplexity-changelog"],
  },
  {
    slug: "deepseek",
    name: "DeepSeek",
    region: "CN",
    aliases: ["deepseek", "深度求索"],
    sourceSlugs: ["deepseek", "deepseek-r1-releases"],
  },
  {
    slug: "qwen",
    name: "Qwen / 通义千问",
    region: "CN",
    aliases: ["qwen", "通义", "千问", "alibaba"],
    sourceSlugs: ["qwen", "qwen-agent-releases"],
  },
  {
    slug: "bytedance",
    name: "ByteDance Seed / 豆包",
    region: "CN",
    aliases: ["bytedance", "字节跳动", "seed", "豆包", "doubao"],
    sourceSlugs: ["bytedance-seed", "bytedance-seed-blog"],
  },
  {
    slug: "tencent",
    name: "Tencent Hunyuan / 腾讯混元",
    region: "CN",
    aliases: ["tencent", "腾讯", "hunyuan", "混元"],
    sourceSlugs: ["tencent-hunyuan", "tencent-hunyuan-updates"],
  },
  {
    slug: "baidu",
    name: "Baidu ERNIE / 百度文心",
    region: "CN",
    aliases: ["baidu", "百度", "ernie", "文心"],
    sourceSlugs: ["baidu-ernie", "baidu-ernie-updates"],
  },
  {
    slug: "zhipu",
    name: "Zhipu AI / Z.ai / GLM",
    region: "CN",
    aliases: ["zhipu", "智谱", "z.ai", "glm"],
    sourceSlugs: ["zhipu", "zai-release-notes", "zai-glm5-updates"],
  },
  {
    slug: "minimax",
    name: "MiniMax",
    region: "CN",
    aliases: ["minimax", "稀宇科技"],
    sourceSlugs: ["minimax", "minimax-model-releases"],
  },
  {
    slug: "moonshot",
    name: "Moonshot AI / Kimi",
    region: "CN",
    aliases: ["moonshot", "月之暗面", "kimi"],
    sourceSlugs: ["moonshot", "moonshot-kimi-updates"],
  },
  {
    slug: "stepfun",
    name: "StepFun / 阶跃星辰",
    region: "CN",
    aliases: ["stepfun", "阶跃星辰", "step 3.5"],
    sourceSlugs: ["stepfun", "stepfun-model-updates"],
  },
  {
    slug: "01ai",
    name: "01.AI / 零一万物",
    region: "CN",
    aliases: ["01.ai", "01ai", "零一万物", "yi-1.5"],
    sourceSlugs: ["01-ai", "01ai-yi-updates"],
  },
  {
    slug: "baichuan",
    name: "Baichuan / 百川智能",
    region: "CN",
    aliases: ["baichuan", "百川智能", "baichuan-m3"],
    sourceSlugs: ["baichuan", "baichuan-m3-updates"],
  },
  {
    slug: "modelbest",
    name: "ModelBest / 面壁智能 / MiniCPM",
    region: "CN",
    aliases: ["modelbest", "面壁智能", "minicpm", "openbmb"],
    sourceSlugs: ["modelbest", "modelbest-minicpm-updates"],
  },
  {
    slug: "sensetime",
    name: "SenseTime / 商汤日日新",
    region: "CN",
    aliases: ["sensetime", "商汤", "sensenova", "日日新"],
    sourceSlugs: ["sensetime", "sensetime-news-en"],
  },
  {
    slug: "iflytek",
    name: "iFlytek Spark / 讯飞星火",
    region: "CN",
    aliases: ["iflytek", "科大讯飞", "讯飞星火", "spark x1"],
    sourceSlugs: ["iflytek", "iflytek-spark-docs"],
  },
] as const;

export function eventSearchText(event: CuratedEventSeed): string {
  return [event.title, event.company, event.fact, event.summary, ...event.keywords]
    .join(" ")
    .toLowerCase();
}

export function eventsForVendor(
  events: readonly CuratedEventSeed[],
  vendor: PriorityVendorCoverage,
): CuratedEventSeed[] {
  return events.filter((event) => {
    const search = eventSearchText(event);
    return vendor.aliases.some((alias) => search.includes(alias.toLowerCase()));
  });
}
