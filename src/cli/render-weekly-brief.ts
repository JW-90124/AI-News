import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const weeklyBriefMarker = (week: string) => `<!-- agent-pulse-weekly-brief:${week} -->`;

interface WeeklyEvent {
  slug: string;
  title: string;
  happenedAt: string;
  category: string;
  factSummary: string;
  industryInsight: string;
  futureOutlook: string;
  impactScore?: number;
  valueScore?: number;
  evidence?: Array<{ source?: string; publishedAt?: string }>;
  tracks?: Array<{ slug: string; name: string }>;
}

interface WeeklyScout {
  title: string;
  hypothesis: string;
  suggestedAction: string;
  counterSignals?: string;
  confidenceScore: number;
  publishedAt: string;
}

interface WeeklyBriefInput {
  timeline: { generatedAt?: string; events: WeeklyEvent[] };
  scout: { insights: WeeklyScout[] };
  product: {
    version?: string;
    evaluation?: { overallScore?: number; evidenceCoverage?: number } | null;
    sourceCoverage?: { total?: number; active?: number; observing?: number };
  };
  siteUrl?: string;
}

const strategicTracks = [
  ["tech-evolution", "模型能力与研究"],
  ["agi-progress", "Agent 与软件重构"],
  ["commercialization", "产品与商业验证"],
  ["model-economics", "基础设施与成本"],
  ["investing", "资本与公司演化"],
  ["global-innovation", "全球创新版图"],
] as const;

export function renderWeeklyBrief(
  input: WeeklyBriefInput,
  endDate: string,
  timeZone = "Asia/Shanghai",
): string {
  const window = isoWeekWindow(endDate);
  const events = input.timeline.events
    .filter((event) => {
      const date = eventDate(event, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort(
      (left, right) =>
        (right.impactScore ?? 0) - (left.impactScore ?? 0) ||
        (right.valueScore ?? 0) - (left.valueScore ?? 0) ||
        right.happenedAt.localeCompare(left.happenedAt),
    );
  const research = events.filter((event) => ["research", "paper"].includes(event.category));
  const scout = input.scout.insights
    .filter((item) => {
      const date = zonedDate(item.publishedAt, timeZone);
      return date >= window.start && date <= window.end;
    })
    .sort((left, right) => right.confidenceScore - left.confidenceScore);
  const sourceCount = new Set(
    events.flatMap((event) => event.evidence?.map((item) => item.source).filter(Boolean) ?? []),
  ).size;
  const siteUrl = input.siteUrl ?? "https://barretlee.github.io/agent-pulse/";
  const judgmentStatus = events.length
    ? `本周有 ${events.length} 个通过公开门禁的新证据节点，需要逐项核对当前判断。`
    : "本周没有足以改变当前判断的新证据；当前判断保持不变。";
  const lines = [
    weeklyBriefMarker(window.week),
    `# Agent Pulse AI 周报 · ${window.week}`,
    "",
    `> ${window.start}—${window.end}：${judgmentStatus} 周报不为固定频率制造趋势。`,
    "",
    `本周收录 ${events.length} 个公开行业变化、${research.length} 篇研究、${scout.length} 条行动参考，来自 ${sourceCount} 个本周事实信源。`,
    "",
    `[打开 Agent Pulse 完整版](${siteUrl}) · [查看全部趋势](${siteUrl.replace(/\/?$/, "/")}lines/)`,
    "",
    "## 本周是否需要更新判断",
    "",
  ];

  for (const [slug, name] of strategicTracks) {
    const trackEvents = events.filter((event) =>
      event.tracks?.some((track) => track.slug === slug),
    );
    lines.push(`### ${name} · ${trackEvents.length} 个节点`, "");
    if (!trackEvents.length) {
      lines.push("没有足以改变这条主线判断的新证据；保持原判断，等待下一验证信号。", "");
      continue;
    }
    for (const event of trackEvents.slice(0, 5)) {
      lines.push(
        `- [${safe(event.title, 150)}](${eventUrl(siteUrl, event.slug)})：${safe(event.industryInsight, 280)}`,
      );
    }
    const next = trackEvents.find((event) => event.futureOutlook)?.futureOutlook;
    if (next) lines.push("", `**下一观察**：${safe(next, 320)}`);
    lines.push("");
  }

  lines.push("## 本周最值得深读", "");
  if (!events.length) lines.push("本周没有足以改变当前判断的新事件。", "");
  for (const [index, event] of events.slice(0, 10).entries()) {
    lines.push(
      `${index + 1}. [${safe(event.title, 150)}](${eventUrl(siteUrl, event.slug)}) — ${safe(event.factSummary, 260)}`,
    );
  }

  lines.push("", "## 研究与反向信号", "");
  if (!research.length) lines.push("本周尚无通过方法、证据与影响门禁的新研究。", "");
  for (const event of research.slice(0, 8)) {
    lines.push(
      `- [${safe(event.title, 150)}](${eventUrl(siteUrl, event.slug)}) — ${safe(event.futureOutlook, 280)}`,
    );
  }

  lines.push("", "## 下周可验证动作", "");
  if (!scout.length) lines.push("本周尚无达到公开门槛的新行动参考。", "");
  for (const item of scout.slice(0, 8)) {
    lines.push(
      `### ${safe(item.title, 140)}`,
      "",
      `${safe(item.hypothesis, 300)}`,
      "",
      `- **最小动作**：${safe(item.suggestedAction, 300)}`,
      `- **失效条件**：${safe(item.counterSignals ?? "回到原始证据继续验证。", 280)}`,
      `- **置信度**：${boundedScore(item.confidenceScore)}/100`,
      "",
    );
  }

  lines.push(
    "## 公开覆盖状态",
    "",
    `- 站点版本：${safe(input.product.version ?? "unknown", 30)}`,
    `- 系统评测：${boundedScore(input.product.evaluation?.overallScore)}/100`,
    `- 证据覆盖：${boundedScore(input.product.evaluation?.evidenceCoverage)}%`,
    `- 来源目录：${Math.max(0, Math.round(input.product.sourceCoverage?.total ?? 0))} 个；active ${Math.max(0, Math.round(input.product.sourceCoverage?.active ?? 0))}；observing ${Math.max(0, Math.round(input.product.sourceCoverage?.observing ?? 0))}`,
    `- 快照生成：${safe(input.timeline.generatedAt ?? "unknown", 40)}`,
    "",
    "---",
    "此周报由 GitHub Actions 使用公开、隐私安全的静态 DTO 生成；来源目录不等于事实证据，具体判断以事件页的原始资料为准。",
  );
  return `${lines.join("\n")}\n`;
}

export async function runWeeklyBriefCli(args = process.argv.slice(2)): Promise<void> {
  const timelinePath = requiredValue(args, "--timeline");
  const scoutPath = requiredValue(args, "--scout");
  const productPath = requiredValue(args, "--product");
  const timeZone = valueFor(args, "--time-zone") ?? "Asia/Shanghai";
  const endDate = valueFor(args, "--end-date") ?? zonedDate(new Date().toISOString(), timeZone);
  const [timeline, scout, product] = await Promise.all(
    [timelinePath, scoutPath, productPath].map(async (path) =>
      JSON.parse(await readFile(resolve(path), "utf8")),
    ),
  );
  process.stdout.write(renderWeeklyBrief({ timeline, scout, product }, endDate, timeZone));
}

function isoWeekWindow(date: string): { start: string; end: string; week: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Weekly brief date must be YYYY-MM-DD");
  const current = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(current.valueOf())) throw new Error(`Invalid date: ${date}`);
  const weekday = current.getUTCDay() || 7;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - weekday + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / 86_400_000 + yearStart.getUTCDay() + 1) / 7,
  );
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
    week: `${year}-W${String(week).padStart(2, "0")}`,
  };
}

function eventDate(event: WeeklyEvent, timeZone: string): string {
  const latest = [event.happenedAt, ...(event.evidence ?? []).map((item) => item.publishedAt ?? "")]
    .filter(Boolean)
    .sort()
    .at(-1);
  return zonedDate(latest ?? event.happenedAt, timeZone);
}

function zonedDate(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid timestamp: ${value}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function eventUrl(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/?$/, "/")}events/${encodeURIComponent(slug)}/`;
}

function safe(value: string, max: number): string {
  return value
    .replace(/[\r\n<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function boundedScore(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value ?? 0))) : 0;
}

function requiredValue(args: string[], flag: string): string {
  const value = valueFor(args, flag);
  if (!value) throw new Error(`Missing required option: ${flag}`);
  return value;
}

function valueFor(args: string[], flag: string): string | undefined {
  const inline = args.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runWeeklyBriefCli();
