import type { CatalogSource, SourceCategory } from "./sources.js";

type VendorSourceSeed = {
  slug: string;
  name: string;
  homepageUrl: string;
  endpoint: string;
  region: string;
  language: string;
  category: SourceCategory;
  acquisition: Extract<CatalogSource["acquisition"], "html" | "rss">;
  topics: string[];
  identityHosts: string[];
};

const xaiIdentityHosts = ["x.ai", "docs.x.ai", "github.com"];
const zaiIdentityHosts = ["z.ai", "docs.z.ai", "github.com"];

const seeds: VendorSourceSeed[] = [
  {
    slug: "xai-release-notes",
    name: "SpaceXAI API Release Notes",
    homepageUrl: "https://docs.x.ai/developers/release-notes",
    endpoint: "https://docs.x.ai/developers/release-notes",
    region: "US",
    language: "en",
    category: "frontier-lab",
    acquisition: "html",
    topics: ["xai", "grok", "model-release", "api", "agent"],
    identityHosts: xaiIdentityHosts,
  },
  {
    slug: "xai-model-docs",
    name: "SpaceXAI Model Documentation",
    homepageUrl: "https://docs.x.ai/developers/models",
    endpoint: "https://docs.x.ai/developers/models",
    region: "US",
    language: "en",
    category: "frontier-lab",
    acquisition: "html",
    topics: ["xai", "grok", "models", "context", "pricing"],
    identityHosts: xaiIdentityHosts,
  },
  {
    slug: "xai-grok1-updates",
    name: "xAI Grok-1 Repository Updates",
    homepageUrl: "https://github.com/xai-org/grok",
    endpoint: "https://github.com/xai-org/grok/commits/main.atom",
    region: "US",
    language: "en",
    category: "open-source",
    acquisition: "rss",
    topics: ["xai", "grok-1", "open-weights", "moe"],
    identityHosts: xaiIdentityHosts,
  },
  {
    slug: "xai-sdk-python-updates",
    name: "xAI Python SDK Updates",
    homepageUrl: "https://github.com/xai-org/xai-sdk-python",
    endpoint: "https://github.com/xai-org/xai-sdk-python/commits/main.atom",
    region: "US",
    language: "en",
    category: "agent-devtool",
    acquisition: "rss",
    topics: ["xai", "grok", "api", "sdk", "python"],
    identityHosts: xaiIdentityHosts,
  },
  {
    slug: "xai-cookbook-updates",
    name: "xAI Cookbook Updates",
    homepageUrl: "https://github.com/xai-org/xai-cookbook",
    endpoint: "https://github.com/xai-org/xai-cookbook/commits/main.atom",
    region: "US",
    language: "en",
    category: "agent-devtool",
    acquisition: "rss",
    topics: ["xai", "grok", "api", "examples", "tool-use"],
    identityHosts: xaiIdentityHosts,
  },
  {
    slug: "zai-release-notes",
    name: "Z.ai Model Release Notes",
    homepageUrl: "https://docs.z.ai/release-notes/new-released",
    endpoint: "https://docs.z.ai/release-notes/new-released",
    region: "CN",
    language: "zh-CN",
    category: "china-lab",
    acquisition: "html",
    topics: ["zhipu", "zai", "glm", "model-release", "agent"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-model-docs",
    name: "Z.ai Model Documentation",
    homepageUrl: "https://docs.z.ai/guides/overview/overview",
    endpoint: "https://docs.z.ai/guides/overview/overview",
    region: "CN",
    language: "zh-CN",
    category: "china-lab",
    acquisition: "html",
    topics: ["zhipu", "zai", "glm", "models", "api"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-glm4-updates",
    name: "Z.ai GLM-4 Repository Updates",
    homepageUrl: "https://github.com/zai-org/GLM-4",
    endpoint: "https://github.com/zai-org/GLM-4/commits/main.atom",
    region: "CN",
    language: "zh-CN",
    category: "open-source",
    acquisition: "rss",
    topics: ["zhipu", "zai", "glm-4", "open-weights", "multimodal"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-glm5-updates",
    name: "Z.ai GLM-5 Repository Updates",
    homepageUrl: "https://github.com/zai-org/GLM-5",
    endpoint: "https://github.com/zai-org/GLM-5/commits/main.atom",
    region: "CN",
    language: "zh-CN",
    category: "open-source",
    acquisition: "rss",
    topics: ["zhipu", "zai", "glm-5", "agentic-coding", "long-horizon"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-glmv-updates",
    name: "Z.ai GLM-V Repository Updates",
    homepageUrl: "https://github.com/zai-org/GLM-V",
    endpoint: "https://github.com/zai-org/GLM-V/commits/main.atom",
    region: "CN",
    language: "zh-CN",
    category: "open-source",
    acquisition: "rss",
    topics: ["zhipu", "zai", "glm-v", "vision", "multimodal-agent"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-glm-ocr-updates",
    name: "Z.ai GLM-OCR Repository Updates",
    homepageUrl: "https://github.com/zai-org/GLM-OCR",
    endpoint: "https://github.com/zai-org/GLM-OCR/commits/main.atom",
    region: "CN",
    language: "zh-CN",
    category: "open-source",
    acquisition: "rss",
    topics: ["zhipu", "zai", "glm-ocr", "document-ai", "vision"],
    identityHosts: zaiIdentityHosts,
  },
  {
    slug: "zai-glm-skills-updates",
    name: "Z.ai GLM Skills Repository Updates",
    homepageUrl: "https://github.com/zai-org/GLM-skills",
    endpoint: "https://github.com/zai-org/GLM-skills/commits/main.atom",
    region: "CN",
    language: "zh-CN",
    category: "agent-devtool",
    acquisition: "rss",
    topics: ["zhipu", "zai", "glm", "skills", "agent-tooling"],
    identityHosts: zaiIdentityHosts,
  },
];

export const vendorEvidenceSources20260714: CatalogSource[] = seeds.map((seed) => ({
  ...seed,
  adapter: seed.acquisition === "rss" ? "rss" : "web-scraper",
  tier: 1,
  role: "primary",
  authorityScore: 92,
  qualityScore: 86,
  enabled: false,
  lifecycleStatus: "shadow",
  maintenanceStatus: "candidate",
  cadence: "6h",
  licenseNote:
    "Official public metadata and short excerpts only; preserve provenance, link to the original, and never republish full source content.",
}));
