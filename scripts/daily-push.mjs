#!/usr/bin/env node
/**
 * Daily digest pusher.
 *
 * Reads dist/data/timeline.json (produced by `npm run export`), selects the
 * most impactful events from the last DIGEST_WINDOW_HOURS, then:
 *   1. Sends a WeCom (企业微信) news-card message to the self-built app so the
 *      digest lands in the owner's personal WeChat via the WeChat plugin.
 *   2. Writes a WeChat Official Account (公众号) ready HTML draft plus a plain
 *      markdown copy under digests/.
 *
 * Required env for the WeCom push (skipped with a warning when absent):
 *   WECOM_CORP_ID, WECOM_APP_SECRET, WECOM_AGENT_ID
 * Optional env:
 *   TIMELINE_PATH (default dist/data/timeline.json)
 *   DIGEST_DIR (default digests)
 *   DIGEST_WINDOW_HOURS (default 26)
 *   DIGEST_MAX_EVENTS (default 8)
 *   WECOM_TO_USER (default @all)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TIMELINE_PATH = process.env.TIMELINE_PATH ?? "dist/data/timeline.json";
const DIGEST_DIR = process.env.DIGEST_DIR ?? "digests";
const WINDOW_HOURS = Number(process.env.DIGEST_WINDOW_HOURS ?? 26);
const MAX_EVENTS = Number(process.env.DIGEST_MAX_EVENTS ?? 8);

const trackNames = {
  "tech-evolution": "模型能力与研究",
  "agi-progress": "Agent 与软件重构",
  commercialization: "产品与商业验证",
  "model-economics": "基础设施与成本",
  investing: "资本与公司演化",
  "global-innovation": "全球创新版图",
};

function beijingDateString(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(date);
}

function pickEvents(timeline) {
  const cutoff = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const fresh = timeline.events.filter((e) => Date.parse(e.publishedAt ?? e.happenedAt) >= cutoff);
  const pool =
    fresh.length > 0
      ? fresh
      : [...timeline.events]
          .sort(
            (a, b) =>
              Date.parse(b.publishedAt ?? b.happenedAt) - Date.parse(a.publishedAt ?? a.happenedAt),
          )
          .slice(0, 5);
  return {
    isFresh: fresh.length > 0,
    events: pool.sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0)).slice(0, MAX_EVENTS),
  };
}

function primaryLink(event, siteUrl) {
  const primary = event.evidence?.find((e) => e.role === "primary") ?? event.evidence?.[0];
  return primary?.url ?? siteUrl ?? "https://github.com";
}

// ---------- WeCom push ----------

async function wecomFetch(url, init) {
  const res = await fetch(url, init);
  const body = await res.json();
  if (body.errcode !== 0) {
    throw new Error(`WeCom API error ${body.errcode}: ${body.errmsg}`);
  }
  return body;
}

async function sendWecomDigest({ events, isFresh }, siteUrl, dateStr) {
  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_APP_SECRET;
  const agentId = process.env.WECOM_AGENT_ID;
  if (!corpId || !secret || !agentId) {
    console.warn("WECOM_* secrets missing; skipping WeCom push.");
    return false;
  }
  const { access_token } = await wecomFetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`,
  );

  const headline = isFresh
    ? `📰 AI 日报 · ${dateStr} · 今日 ${events.length} 条重点`
    : `📰 AI 日报 · ${dateStr} · 今日无新事件，回顾近期 ${events.length} 条`;

  const articles = [
    {
      title: headline,
      description: "点击查看完整时间线与证据链",
      url: siteUrl ?? "https://github.com",
    },
    ...events.map((e, i) => ({
      title: `${i + 1}. ${e.title}`,
      description: e.factSummary ?? "",
      url: primaryLink(e, siteUrl),
    })),
  ].slice(0, 8); // WeCom news message allows at most 8 articles

  await wecomFetch(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${access_token}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        touser: process.env.WECOM_TO_USER ?? "@all",
        msgtype: "news",
        agentid: Number(agentId),
        news: { articles },
      }),
    },
  );
  return true;
}

// ---------- 公众号 draft ----------

const S = {
  h2: "margin:32px 0 12px;font-size:17px;font-weight:bold;color:#0b7a6b;border-left:4px solid #0b7a6b;padding-left:10px;line-height:1.5;",
  p: "margin:8px 0;font-size:15px;color:#3f3f3f;line-height:1.8;",
  label: "color:#0b7a6b;font-weight:bold;",
  meta: "margin:4px 0 10px;font-size:13px;color:#9a9a9a;",
  quote:
    "margin:10px 0;padding:10px 14px;background:#f6f8f7;border-radius:6px;font-size:14px;color:#575757;line-height:1.8;",
  foot: "margin:28px 0 8px;font-size:13px;color:#9a9a9a;line-height:1.8;",
};

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMpDraft({ events, isFresh }, dateStr, siteUrl) {
  const intro = isFresh
    ? `今天从 400+ 官方信源中筛出 ${events.length} 条通过证据门控的行业事件。`
    : "今天没有新事件通过质量门控，以下为近期重点回顾。";

  const sections = events
    .map((e, i) => {
      const track = e.tracks?.[0]?.name ?? trackNames[e.category] ?? e.category;
      const evidence = (e.evidence ?? [])
        .map(
          (ev) =>
            `<p style="${S.meta}">🔗 ${escapeHtml(ev.source ?? "来源")}：${escapeHtml(ev.title ?? ev.url ?? "")}</p>`,
        )
        .join("");
      const parts = [
        ["事实", e.factSummary],
        ["技术视角", e.technicalInsight],
        ["行业影响", e.industryInsight],
        ["值得关注", e.futureOutlook],
      ]
        .filter(([, v]) => v)
        .map(
          ([k, v]) =>
            `<p style="${S.p}"><span style="${S.label}">${k}｜</span>${escapeHtml(v)}</p>`,
        )
        .join("");
      return `<h2 style="${S.h2}">${i + 1}. ${escapeHtml(e.title)}</h2>
<p style="${S.meta}">${escapeHtml(track)}${e.company ? ` · ${escapeHtml(e.company)}` : ""} · 影响力 ${e.impactScore ?? "—"}</p>
${parts}
${evidence}`;
    })
    .join("\n");

  return `<section style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;">
<p style="${S.quote}">AI 日报 · ${dateStr}<br/>${intro}</p>
${sections}
<p style="${S.foot}">—<br/>数据由自动化情报流水线生成，每条事件均绑定原始证据。完整时间线：${escapeHtml(siteUrl ?? "")}</p>
</section>
`;
}

function renderMarkdown({ events, isFresh }, dateStr, siteUrl) {
  const lines = [`# AI 日报 · ${dateStr}`, ""];
  lines.push(isFresh ? `今日 ${events.length} 条重点事件。` : "今日无新事件，以下为近期回顾。", "");
  for (const [i, e] of events.entries()) {
    lines.push(`## ${i + 1}. ${e.title}`, "");
    if (e.factSummary) lines.push(`- **事实**：${e.factSummary}`);
    if (e.technicalInsight) lines.push(`- **技术视角**：${e.technicalInsight}`);
    if (e.industryInsight) lines.push(`- **行业影响**：${e.industryInsight}`);
    if (e.futureOutlook) lines.push(`- **值得关注**：${e.futureOutlook}`);
    for (const ev of e.evidence ?? []) {
      lines.push(`- 证据：[${ev.title ?? ev.source ?? "来源"}](${ev.url})`);
    }
    lines.push("");
  }
  lines.push(`> 完整时间线：${siteUrl ?? ""}`);
  return `${lines.join("\n")}\n`;
}

// ---------- main ----------

const timeline = JSON.parse(await readFile(TIMELINE_PATH, "utf8"));
const dateStr = beijingDateString();
const picked = pickEvents(timeline);
console.log(`Selected ${picked.events.length} events (fresh window: ${picked.isFresh}).`);

await mkdir(DIGEST_DIR, { recursive: true });
await writeFile(
  join(DIGEST_DIR, `${dateStr}.html`),
  renderMpDraft(picked, dateStr, timeline.siteUrl),
  "utf8",
);
await writeFile(
  join(DIGEST_DIR, `${dateStr}.md`),
  renderMarkdown(picked, dateStr, timeline.siteUrl),
  "utf8",
);
console.log(`Digest written to ${DIGEST_DIR}/${dateStr}.{html,md}`);

const pushed = await sendWecomDigest(picked, timeline.siteUrl, dateStr);
console.log(pushed ? "WeCom push sent." : "WeCom push skipped.");
