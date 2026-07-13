import type {
  DecisionLens,
  EnrichedEvent,
  IndustryNarratives,
  NarrativeStage,
  PublicActor,
  PublicInfluencer,
  PublicResource,
  PublicScoutInsight,
  PublicSignal,
  PublicSource,
  PublicTrack,
  Release,
  StaticSiteModel,
  TechnologyCoverage,
  TrackNarrative,
} from "./dto.js";
import type { Locale } from "./i18n.js";
import { t } from "./i18n.js";
import {
  analyzeTechnologyCoverage,
  eventDevelopments,
  eventTouchesNarrativeStage,
  evidenceForNarrativeStage,
  groupEventsByYearMonth,
  groupTimelineMonthItems,
  isRecentEvent,
  latestDevelopmentAt,
  latestNarrativeStageDevelopmentAt,
  sortEventsByLatestDevelopment,
  summarizeSourcePortfolio,
} from "./intelligence.js";
import { escapeHtml, formatDate, icon, pageLayout, safeExternalLink } from "./render.js";

const STRATEGIC_TRACKS = [
  "tech-evolution",
  "agi-progress",
  "commercialization",
  "investing",
  "global-innovation",
  "model-economics",
] as const;

export interface StaticPage {
  path: string;
  content: string;
}

const LOCALES: Locale[] = ["zh-CN", "en"];

export function renderStaticPages(model: StaticSiteModel): StaticPage[] {
  const pages: StaticPage[] = [];
  for (const locale of LOCALES) {
    pages.push(...renderPagesForLocale(model, locale));
  }
  // Single 404 at root
  pages.push({ path: "404.html", content: notFoundPage(model, "zh-CN") });
  return pages;
}

function renderPagesForLocale(model: StaticSiteModel, locale: Locale): StaticPage[] {
  const lp = locale === "en" ? "en/" : "";
  const defaultTrack = strategicTracks(model)[0];
  const pages: StaticPage[] = [
    page(
      model,
      `${lp}index.html`,
      0,
      "home",
      locale === "en"
        ? "Evidence-Led AI Industry Shifts · Agent Pulse"
        : "重要证据驱动的 AI 行业判断 · Agent Pulse",
      home(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}lines/index.html`,
      1,
      "lines",
      `${t("nav.lines", locale)} · Agent Pulse`,
      defaultTrack
        ? lineDetail(model, defaultTrack, locale, true)
        : emptyState(t("lines.noJudgment", locale), ""),
      locale,
    ),
    page(
      model,
      `${lp}industry-evolution/index.html`,
      1,
      "lines",
      `${locale === "en" ? "Industry Evolution" : "行业演化"} · Agent Pulse`,
      industryEvolutionPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}timeline/index.html`,
      1,
      "timeline",
      `${t("nav.timeline", locale)} · Agent Pulse`,
      timeline(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}signals/index.html`,
      1,
      "signals",
      `${locale === "en" ? "Source Updates" : "来源动态"} · Agent Pulse`,
      signalsPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "scout",
      `${t("tab.scout", locale)} · Agent Pulse`,
      scoutPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "actors",
      `${t("tab.actors", locale)} · Agent Pulse`,
      actorsPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "resources",
      `${t("tab.resources", locale)} · Agent Pulse`,
      resourcesPage(model, locale),
      locale,
    ),
    toolPage(
      model,
      "product",
      `${t("tab.product", locale)} · Agent Pulse`,
      productPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}changelog/index.html`,
      1,
      "changelog",
      `Changelog · Agent Pulse`,
      changelogPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}sources/index.html`,
      1,
      "sources",
      `${t("footer.sources", locale)} · Agent Pulse`,
      sourcesPage(model, locale),
      locale,
    ),
    page(
      model,
      `${lp}legal/index.html`,
      1,
      "legal",
      `${t("footer.legal", locale)} · Agent Pulse`,
      legalPage(model, locale),
      locale,
    ),
  ];

  for (const track of strategicTracks(model)) {
    pages.push(
      page(
        model,
        `${lp}lines/${track.slug}/index.html`,
        2,
        "lines",
        `${track.name} · Agent Pulse`,
        lineDetail(model, track, locale),
        locale,
      ),
    );
  }
  for (const event of model.events) {
    pages.push(
      page(
        model,
        `${lp}events/${event.slug}/index.html`,
        2,
        "timeline",
        `${event.title} · Agent Pulse`,
        eventPage(model, event, locale),
        locale,
        event.factSummary,
        { jsonLd: eventJsonLd(event, locale) },
      ),
    );
  }

  return pages;
}

function page(
  model: StaticSiteModel,
  path: string,
  depth: number,
  active: Parameters<typeof pageLayout>[0]["active"],
  title: string,
  body: string,
  locale: Locale,
  description?: string,
  extra?: Partial<
    Pick<import("./render.js").PageChrome, "jsonLd" | "robots" | "baiduVerification">
  >,
): StaticPage {
  const route = path === "index.html" ? "/" : `/${path.replace(/index\.html$/, "")}`;
  const defaultDesc =
    locale === "en"
      ? "Primary-source AI intelligence for decisions that matter."
      : "用一手证据识别真正改变 AI 行业判断的变化。";
  return {
    path,
    content: pageLayout({
      title,
      description: clip(description ?? defaultDesc, 155),
      route,
      depth,
      active,
      body,
      locale,
      siteUrl: model.siteUrl,
      github: model.github,
      generatedAt: model.generatedAt,
      ...extra,
    }),
  };
}

function toolPage(
  model: StaticSiteModel,
  route: string,
  title: string,
  body: string,
  locale: Locale,
): StaticPage {
  const lp = locale === "en" ? "en/" : "";
  return page(
    model,
    `${lp}${route}/index.html`,
    1,
    route as "scout" | "actors" | "resources" | "product",
    title,
    body,
    locale,
  );
}

function home(model: StaticSiteModel, locale: Locale): string {
  const orderedEvents = sortEventsByLatestDevelopment(model.events);
  const recent: EnrichedEvent[] = [];
  for (const candidate of orderedEvents.filter((event) => hasPrimaryEvidence(event))) {
    if (isResearchEvent(candidate) && recent.some(isResearchEvent)) continue;
    recent.push(candidate);
    if (recent.length === 12) break;
  }
  const trendCandidates = strategicTracks(model)
    .map((track) => trendShiftCandidate(model, track, locale))
    .filter((candidate): candidate is string => Boolean(candidate));
  const latestShift = trendCandidates.length
    ? `<div class="random-trend-stack" data-random-trends>${trendCandidates
        .map(
          (candidate, index) =>
            `<div data-random-trend${index === 0 ? "" : " hidden"}>${candidate}</div>`,
        )
        .join("")}</div>`
    : emptyState(t("home.emptyTitle", locale), t("home.emptyDesc", locale));

  return `<section class="home-page-hero shell"><div><span class="section-kicker">AI INDUSTRY INTELLIGENCE</span><h1>${escapeHtml(locale === "en" ? "See the shifts shaping AI" : "看清 AI 行业的关键变化")}</h1><p>${escapeHtml(locale === "en" ? "Traceable evidence connects each shift to a trend and a practical next move." : "用可追溯的一手证据，连接变化、趋势与下一步行动。")}</p></div><div class="signal-field" aria-hidden="true"><svg viewBox="0 0 320 220"><path class="signal-link" d="M40 158 C79 127 100 139 132 103 S197 73 226 96 S269 108 294 61"/><path class="signal-link signal-link-secondary" d="M57 69 C91 93 115 71 149 89 S211 135 276 146"/><circle class="signal-pulse" cx="226" cy="96" r="12"/><circle class="signal-pulse signal-pulse-delay" cx="132" cy="103" r="12"/><circle class="signal-node signal-node-a" cx="40" cy="158" r="4"/><circle class="signal-node signal-node-b" cx="57" cy="69" r="3"/><circle class="signal-node signal-node-c" cx="132" cy="103" r="5"/><circle class="signal-node signal-node-d" cx="149" cy="89" r="3"/><circle class="signal-node signal-node-e" cx="226" cy="96" r="5"/><circle class="signal-node signal-node-f" cx="276" cy="146" r="3"/><circle class="signal-node signal-node-g" cx="294" cy="61" r="4"/></svg></div></section>
    <section class="today-section shell">
      <header class="today-heading"><div><span class="section-kicker">LATEST MATERIAL SHIFT</span><h2>${escapeHtml(locale === "en" ? "Latest Trend Judgment" : "最新趋势判断")}</h2></div></header>
      ${latestShift}
    </section>

    <section class="section section-tint" aria-labelledby="evidence-title"><div class="shell">
      ${sectionHead(t("home.sectionEvidence", locale), t("home.sectionEvidenceTitle", locale), t("home.sectionEvidenceDesc", locale))}
      <div class="recent-evidence" data-random-recent-list data-random-visible="6">${recent
        .map(
          (event, index) =>
            `<div class="random-recent-item" data-random-recent${index < 6 ? "" : " hidden"}>${recentEventRow(event, locale)}</div>`,
        )
        .join("")}</div>
      <a class="text-link" href="__PREFIX__timeline/">${t("home.openTimeline", locale)} ${icon("arrow-right")}</a>
    </div></section>

    <section class="section shell" aria-labelledby="lines-title">
      ${sectionHead("03 / INDUSTRY SHIFTS", t("home.sectionLinesTitle", locale), t("home.sectionLinesDesc", locale))}
      <div class="line-summary-grid">${strategicTracks(model)
        .map((track) => industryTrendBlock(model, track, locale))
        .join("")}</div>
    </section>

    <section class="manifesto section-tint"><div class="shell">
      <span>AGENT PULSE</span><h2>${t("home.manifestoTitle", locale)}</h2><p>${escapeHtml(t("home.manifestoDesc", locale))}</p>
      <div class="principles"><span>${escapeHtml(t("home.principle1", locale))}</span><span>${escapeHtml(t("home.principle2", locale))}</span><span>${escapeHtml(t("home.principle3", locale))}</span></div>
    </div></section>`;
}

function trendShiftCandidate(
  model: StaticSiteModel,
  activeTrack: PublicTrack,
  locale: Locale,
): string | null {
  const narrative = narrativeFor(model, activeTrack.slug);
  if (!narrative) return null;
  const trackEvents = sortEventsByLatestDevelopment(eventsForTrack(model.events, activeTrack.slug));
  const shiftEvidence = trackEvents.filter(hasPrimaryEvidence).slice(0, 3);
  if (!shiftEvidence.length) return null;
  const evidenceItems = trackEvents.flatMap((event) => event.evidence);
  const independentSources = evidenceSourceCountFor(evidenceItems);
  return `<article class="trend-shift-card reveal" data-trend-slug="${escapeHtml(activeTrack.slug)}" style="--track-color:${escapeHtml(activeTrack.color)}">
    <header class="trend-shift-header"><div><span>${escapeHtml(activeTrack.perspective)}</span><a href="__PREFIX__lines/${escapeHtml(activeTrack.slug)}/">${escapeHtml(activeTrack.name)} ${icon("arrow-right")}</a></div><button class="trend-shift-randomize" type="button" data-random-trend-next aria-label="${locale === "en" ? "Show another trend judgment" : "换一个趋势判断"}"><span aria-hidden="true">↻</span>${locale === "en" ? "Another" : "换一个"}</button></header>
    <div class="trend-shift-body"><section class="trend-shift-judgment"><span>${locale === "en" ? "CURRENT JUDGMENT" : "当前判断"}</span><h2>${escapeHtml(narrative.now)}</h2><div class="trend-shift-dimensions"><section><span>${locale === "en" ? "What changed" : "判断变化"}</span><p>${escapeHtml(narrative.thesis)}</p></section><section><span>${locale === "en" ? "Next signal" : "下一信号"}</span><p>${escapeHtml(narrative.next)}</p></section></div></section><aside class="trend-shift-evidence"><header><div><span>${locale === "en" ? "LATEST EVIDENCE" : "最新证据"}</span><strong>${shiftEvidence.length} ${locale === "en" ? "signals behind this judgment" : "个支撑信号"}</strong></div><a href="__PREFIX__timeline/?track=${escapeHtml(activeTrack.slug)}">${locale === "en" ? "All evidence" : "全部证据"}</a></header><div>${shiftEvidence.map((event) => `<a data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"><time>${escapeHtml(formatDate(latestDevelopmentAt(event), locale))}</time><strong>${escapeHtml(event.title)}</strong><small>${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(event)))}</small></a>`).join("")}</div></aside></div>
    <footer class="trend-shift-footer"><div><span>${locale === "en" ? "Public events" : "公开事件"}<strong>${trackEvents.length}</strong></span><span>${locale === "en" ? "Evidence" : "证据"}<strong>${evidenceItems.length}</strong></span><span>${locale === "en" ? "Independent sources" : "独立信源"}<strong>${independentSources}</strong></span></div><a class="button primary" href="__PREFIX__lines/${escapeHtml(activeTrack.slug)}/">${locale === "en" ? "Open trend judgment" : "查看趋势判断"} ${icon("arrow-right")}</a></footer>
  </article>`;
}

function signalsPage(model: StaticSiteModel, locale: Locale): string {
  const sourceCount = new Set(model.signals.map((signal) => signal.sourceSlug)).size;
  const latest = model.signals[0]?.publishedAt;
  const initial = model.signals.slice(0, 48);
  return `<section class="page-hero compact has-motion shell"><span class="section-kicker">SOURCE OBSERVATIONS</span><h1>${escapeHtml(locale === "en" ? "Source Updates" : "来源动态")}</h1><p>${escapeHtml(locale === "en" ? "Browse source titles, concise context and original links before they converge into evidence-backed Events." : "浏览信源标题、简短上下文与原文链接；未完成收敛的条目不会替代通过证据门禁的 Event。")}</p>${pageStatus(`${model.signals.length} ${locale === "en" ? "observations" : "条观察"}`, `${sourceCount} ${locale === "en" ? "sources" : "个信源"}`, latest ? formatDate(latest, locale) : "—")}${heroMotion("signals")}</section>
    <section class="section section-tint"><div class="shell signal-browser" data-signal-browser data-signals-src="__ASSET_PREFIX__data/signals.json" data-page-size="48">
      <div class="signal-browser-toolbar"><label>${icon("search")}<input type="search" data-signal-search placeholder="${locale === "en" ? "Search title, source, category or tag" : "搜索标题、来源、分类或标签"}"></label><div class="signal-region-control"><select data-signal-region aria-label="${locale === "en" ? "Filter by region" : "按地域筛选"}"><option value="all">${locale === "en" ? "All regions" : "全部地域"}</option>${[
        ...new Set(model.signals.map((signal) => signal.sourceRegion)),
      ]
        .sort()
        .map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
        .join("")}</select>${icon("chevron-down")}</div></div>
      <div class="signal-stream" data-signal-list>${initial.map((signal) => signalCard(signal, locale)).join("")}</div>
      <div class="signal-browser-footer"><span data-signal-count>${Math.min(initial.length, model.signals.length)} / ${model.signals.length}</span><button class="button quiet" type="button" data-signal-more>${locale === "en" ? "Load more" : "加载更多"}</button></div>
    </div></section>`;
}

function signalCard(signal: PublicSignal, locale: Locale): string {
  const url = safeExternalLink(signal.url);
  if (!url) return "";
  return `<article class="signal-observation-card" data-signal-search-value="${escapeHtml([signal.title, signal.description, signal.sourceName, signal.sourceSlug, signal.category, signal.sourceRegion, ...signal.tags].join(" ").toLowerCase())}" data-signal-region-value="${escapeHtml(signal.sourceRegion)}"><div><span>${escapeHtml(signal.category)} · ${escapeHtml(signal.sourceRegion)}</span><time>${escapeHtml(formatDate(signal.publishedAt, locale))}</time></div><h2>${escapeHtml(signal.title)}</h2>${signal.description ? `<p>${escapeHtml(signal.description)}</p>` : ""}<footer><span>${escapeHtml(signal.sourceName)} · Tier ${signal.sourceTier}</span><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${locale === "en" ? "Open source" : "查看原文"} ${icon("external-link")}</a></footer></article>`;
}

function industryEvolutionPage(model: StaticSiteModel, locale: Locale): string {
  return `<section class="page-hero compact lines-overview-hero has-motion shell">
      <span class="section-kicker">2022 → TODAY</span><h1>${escapeHtml(locale === "en" ? "Industry Evolution" : "行业演化")}</h1><p>${escapeHtml(locale === "en" ? "The major product, platform, and capability shifts that shaped the current AI landscape." : "沿产品、平台与能力转折，回看今天的 AI 行业格局如何形成。")}</p>
      ${heroMotion("lines")}
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("INDUSTRY ARC", locale === "en" ? "Evolution Timeline" : "演化脉络", t("lines.arcDesc", locale))}
      <div class="industry-arc">${model.narratives.eras.map((era) => eraCard(era, locale)).join("")}</div>
    </div></section>`;
}

function eraCard(era: IndustryNarratives["eras"][number], locale: Locale): string {
  const statusLabel = {
    active: locale === "en" ? "Active" : "持续发展",
    pivoted: locale === "en" ? "Pivoted" : "已转向",
    acquired: locale === "en" ? "Acquired" : "已收购",
    sunset: locale === "en" ? "Sunset" : "已停止",
  } as const;
  return `<article class="era-card"><header><span>${escapeHtml(era.period)}</span><h2>${escapeHtml(era.label)}</h2></header><p>${escapeHtml(era.summary)}</p><div class="era-projects">${era.projects
    .map(
      (project) =>
        `<a href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer"><span class="project-status ${escapeHtml(project.status)}">${escapeHtml(statusLabel[project.status])}</span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.note)}</small>${icon("external-link")}</a>`,
    )
    .join("")}</div></article>`;
}

function lineDetail(
  model: StaticSiteModel,
  track: PublicTrack,
  locale: Locale,
  defaultRoute = false,
): string {
  const narrative = narrativeFor(model, track.slug);
  const events = sortEventsByLatestDevelopment(eventsForTrack(model.events, track.slug));
  const sourcePool = sourcesForTrack(model.sources, track.slug);
  const stages = narrative?.stages ?? [];
  return `<div class="trend-detail" data-trend-detail style="--track-color:${escapeHtml(track.color)}"><section class="line-hero${defaultRoute ? " default-trend" : ""} shell">
      ${trendSwitcher(model, locale, track.slug, true, defaultRoute)}
      <div class="line-hero-grid"><div class="line-hero-copy"><span class="section-kicker">${escapeHtml(track.perspective.toUpperCase())} · ${t("lines.evidenceNodes", locale).replace("{count}", String(events.length))}</span><h1>${escapeHtml(track.name)}</h1><p class="line-now">${escapeHtml(narrative?.now || track.description)}</p>${defaultRoute ? heroMotion("lines") : ""}</div>
      <aside><span>${escapeHtml(t("lines.judgmentLabel", locale))}</span><strong>${escapeHtml(narrative?.thesis || track.description)}</strong><div><span>${escapeHtml(t("lines.nextLabel", locale))}</span><p>${escapeHtml(narrative?.next ?? t("lines.waitingNext", locale))}</p></div></aside></div>
    </section>
    <section class="section shell" data-module-expand-root>
      <header class="section-head section-head-action"><div><span class="section-kicker">${escapeHtml(t("lines.phases", locale))}</span><h2>${escapeHtml(t("lines.phasesTitle", locale))}</h2></div>${moduleExpandButton(locale === "en" ? "Expand trajectory" : "展开轨迹", locale === "en" ? "Collapse trajectory" : "收起轨迹", "section-module-toggle")}</header>
      <div class="phase-rail" tabindex="0" aria-label="${locale === "en" ? "Scrollable phase trajectory" : "可横向滚动的阶段轨迹"}">${stages.map((stage, index) => phaseCard(stage, eventsInStage(events, stage), locale, index)).join("") || emptyState(t("lines.noStages", locale), "")}</div>
    </section>
    <section class="section section-tint" data-no-scroll-reveal><div class="shell">
      ${sectionHead(t("lines.evidenceSpine", locale), t("lines.evidenceSpineTitle", locale), t("lines.evidenceSpineDesc", locale).replace("{count}", String(events.length)))}
      <div class="stage-evidence-atlas">${stages.map((stage, index) => stageEvidenceGroup(stage, eventsInStage(events, stage), locale, index)).join("") || emptyState(t("lines.noEvidence", locale), "")}</div>
      <a class="text-link" href="__PREFIX__timeline/?track=${escapeHtml(track.slug)}">${t("lines.viewTimeline", locale)} ${icon("arrow-right")}</a>
    </div></section>
    <section class="section shell">
      ${sectionHead(t("lines.lenses", locale), t("lines.lensesTitle", locale), t("lines.lensesDesc", locale))}
      <div class="role-grid">
        ${(narrative?.lenses ?? []).map((lens) => roleLens(lens, events, locale)).join("") || emptyState(t("lines.noJudgment", locale), "")}
      </div>
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead(locale === "en" ? "04 / OBSERVATION POOL" : "04 / OBSERVATION POOL", locale === "en" ? "Observation Pool" : "观察源池", locale === "en" ? "Catalog coverage supports future discovery; it is not counted as factual evidence until a public Event passes the evidence gates." : "来源目录用于持续发现；只有通过证据门禁并绑定公开 Event 后，才计入事实证据。")}
      <div class="trend-source-module" data-module-expand-root><div class="trend-source-pool">${sourcePool.map((source, index) => trendSource(source, locale, index >= 12)).join("") || emptyState(locale === "en" ? "No matching observation source" : "暂无匹配观察源", "")}</div>${sourcePool.length > 12 ? moduleExpandButton(locale === "en" ? `View all ${sourcePool.length} sources` : `查看全部 ${sourcePool.length} 个观察源`, locale === "en" ? "Show fewer sources" : "收起观察源") : ""}</div>
      <a class="text-link" href="__PREFIX__sources/">${t("lines.openSourceMap", locale)} ${icon("arrow-right")}</a>
    </div></section>
    </div></section></div>`;
}

function timeline(model: StaticSiteModel, locale: Locale): string {
  const events = sortEventsByLatestDevelopment(model.events);
  const chronology = groupEventsByYearMonth(events);
  const filters = strategicTracks(model)
    .map(
      (track) =>
        `<button type="button" data-filter-track="${escapeHtml(track.slug)}">${escapeHtml(track.name)}</button>`,
    )
    .join("");
  return `<section class="page-hero compact has-motion shell">
      <span class="section-kicker">EVIDENCE TIMELINE</span><h1>${escapeHtml(t("timeline.heroTitle", locale))}</h1><p>${escapeHtml(t("timeline.heroDesc", locale))}</p>
      ${heroMotion("timeline")}
    </section>
    <section class="timeline-shell shell" data-timeline>
      <div class="timeline-controls">
        <label class="search-box">${icon("search")}<input type="search" data-timeline-search placeholder="${escapeHtml(t("timeline.searchPlaceholder", locale))}" autocomplete="off"></label>
        <div class="chip-row" aria-label="${escapeHtml(t("timeline.searchLabel", locale))}"><button class="active" type="button" data-filter-track="all">${t("timeline.filterAll", locale)}</button><button type="button" data-filter-track="official">${t("timeline.filterPrimary", locale)}</button><button type="button" data-filter-track="research">${t("timeline.filterResearch", locale)}</button>${filters}</div>
        <span data-result-count>${t("timeline.nodes", locale).replace("{count}", String(events.length))}</span>
      </div>
      ${t("timeline.filterHelp", locale) ? `<p class="timeline-filter-help">${escapeHtml(t("timeline.filterHelp", locale))}</p>` : ""}
      <div class="timeline-chronology">${chronology.map((year) => timelineYearGroup(year, locale)).join("")}</div>
    </section>`;
}

function timelineYearGroup(
  group: ReturnType<typeof groupEventsByYearMonth>[number],
  locale: Locale,
): string {
  const initialMonth = group.months[0];
  if (!initialMonth) return "";
  const shortMonth = (month: number) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(group.year, month - 1, 1)));
  return `<section class="timeline-year" data-timeline-year="${group.year}"><header><span>${group.year}</span><strong data-timeline-current-month>${escapeHtml(shortMonth(initialMonth.month))}</strong></header><div>${group.months
    .map((month) => {
      const label = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
        year: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(Date.UTC(month.year, month.month - 1, 1)));
      const items = groupTimelineMonthItems(month.events)
        .map((item) =>
          item.kind === "research-day"
            ? researchDayGroup(item.key, item.events, locale)
            : timelineCard(item.event, locale),
        )
        .join("");
      return `<section class="timeline-month" data-timeline-month="${month.key}" data-timeline-label="${escapeHtml(shortMonth(month.month))}"><header><div><time datetime="${month.key}">${escapeHtml(label)}</time><span>${escapeHtml(t("timeline.monthEvents", locale).replace("{count}", String(month.events.length)))}</span></div><i></i></header><div class="timeline-list">${items}</div></section>`;
    })
    .join("")}</div></section>`;
}

function eventPage(model: StaticSiteModel, event: EnrichedEvent, locale: Locale): string {
  const related = model.events
    .filter(
      (item) =>
        item.slug !== event.slug &&
        item.tracks.some((track) => event.tracks.some((own) => own.slug === track.slug)),
    )
    .slice(0, 3);
  const publicLineSlugs = new Set(strategicTracks(model).map((track) => track.slug));
  return `<article class="event-page shell">
      <nav class="breadcrumb"><a href="__PREFIX__timeline/">${escapeHtml(t("event.breadcrumb", locale))}</a><span>/</span><span>${escapeHtml(categoryName(event.category, locale))}</span></nav>
      <header class="event-header"><div><span class="section-kicker">${escapeHtml(formatDate(event.happenedAt, locale))} · ${escapeHtml(event.company || t("event.unknownEntity", locale))}</span><h1>${escapeHtml(event.title)}</h1><div class="event-tags">${event.tracks.length ? event.tracks.map((track) => (publicLineSlugs.has(track.slug) ? `<a href="__PREFIX__lines/${escapeHtml(track.slug)}/">${escapeHtml(track.name)}</a>` : `<span>${escapeHtml(track.name)}</span>`)).join("") : `<span class="warning-tag">${escapeHtml(t("event.untracked", locale))}</span>`}</div></div>
      <aside><span class="evidence-badge">${escapeHtml(evidenceLabel(event, locale))}</span><strong>${t("event.evidenceCount", locale).replace("{count}", String(event.evidence.length))}</strong><p>${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(event)))}</p></aside></header>
      ${isResearchEvent(event) ? `<aside class="research-notice">${icon("search")}<div><strong>${escapeHtml(t("event.researchNoticeTitle", locale))}</strong><p>${escapeHtml(t("event.researchNoticeDesc", locale))}</p></div></aside>` : ""}
      <section class="event-fact"><span>${escapeHtml(t("event.factStatement", locale))}</span><p>${escapeHtml(event.factSummary)}</p></section>
      <section class="event-development-section">
        ${sectionHead("EVENT STORY", t("event.developmentTitle", locale), t("event.developmentDesc", locale))}
        ${eventJourney(event, locale)}
      </section>
      <div class="event-body">
        <div class="event-insights">
          ${insight(t("event.analysis", locale), event.summary, "analysis", locale)}
          ${insight(t("event.technical", locale), event.technicalInsight, "analysis", locale)}
          ${insight(t("event.industry", locale), event.industryInsight, "impact", locale)}
          ${insight(t("event.businessValue", locale), event.businessValue, "impact", locale)}
          ${insight(t("event.watchNext", locale), event.futureOutlook, "forecast", locale)}
        </div>
        <aside class="event-sidebar">
          <section><h2>${escapeHtml(t("event.estimates", locale))}</h2><div class="score-grid">${score(t("event.credibility", locale), event.confidenceScore, locale)}${score(t("event.heat", locale), event.heatScore, locale)}${score(t("event.impact", locale), event.impactScore, locale)}${score(t("event.value", locale), event.valueScore, locale)}</div><p class="fine-print">${escapeHtml(t("event.scoreDisclaimer", locale))}</p></section>
          <section><h2>${escapeHtml(t("event.evidence", locale))}</h2>${evidenceLinks(event, locale)}</section>
          <section><h2>${escapeHtml(t("event.relatedActors", locale))}</h2><div class="tag-list">${event.actors.map((actor) => `<span>${escapeHtml(actor.name)} · ${escapeHtml(actor.progressStage)}</span>`).join("") || `<span>${escapeHtml(t("event.noActors", locale))}</span>`}</div></section>
        </aside>
      </div>
    </article>
    <section class="section section-tint"><div class="shell">${sectionHead("RELATED", t("event.relatedSection", locale), t("event.relatedDesc", locale))}
      <div class="related-grid">${related.map((event) => eventCompact(event, locale)).join("") || emptyState(t("event.noRelated", locale), "")}</div></div></section>`;
}

function scoutPage(model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("sparkles", t("scout.heroTitle", locale), t("scout.heroDesc", locale), "scout", locale)}
  <section class="section shell scout-section"><div class="filter-toolbar"><button class="active" data-card-filter="all">${t("scout.filterAll", locale)}</button><button data-card-filter="venture">${t("scout.filterVenture", locale)}</button><button data-card-filter="media">${t("scout.filterMedia", locale)}</button><button data-card-filter="work">${t("scout.filterWork", locale)}</button><button data-card-filter="learning">${t("scout.filterLearning", locale)}</button><button data-card-filter="artifact">${t("scout.filterArtifact", locale)}</button><button data-card-filter="influence">${t("scout.filterInfluence", locale)}</button></div>
    <div class="scout-grid" data-filter-grid>${model.scout.map((insight) => scoutCard(insight, locale)).join("") || emptyState(t("scout.empty", locale), "")}</div></section>`;
}

function actorsPage(model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("users", t("actors.heroTitle", locale), t("actors.heroDesc", locale), "actors", locale)}
    <section class="section shell"><div class="filter-toolbar"><button class="active" data-card-filter="all">${t("actors.filterAll", locale)}</button><button data-card-filter="CN">${t("actors.filterChina", locale)}</button><button data-card-filter="GLOBAL">${t("actors.filterGlobal", locale)}</button><button data-card-filter="US">${t("actors.filterUS", locale)}</button></div>
    <div class="actor-grid" data-filter-grid>${[...model.actors]
      .sort((a, b) => b.tableScore - a.tableScore)
      .map((actor) => actorCard(actor, locale))
      .join("")}</div></section>`;
}

function resourcesPage(model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("box", t("resources.heroTitle", locale), t("resources.heroDesc", locale), "resources", locale)}
    <section class="section shell"><div class="resource-grid">${model.resources.map((resource) => resourceCard(resource, locale)).join("")}</div><p class="legal-note">${escapeHtml(t("resources.legalNote", locale))}</p></section>`;
}

function productPage(_model: StaticSiteModel, locale: Locale): string {
  return `${toolHeader("gauge", t("product.heroTitle", locale), t("product.heroDesc", locale), "product", locale)}
    <section class="section shell method-page">
      <div class="method-flow">
        ${methodStep("01", locale === "en" ? "Verify facts" : "核对事实", locale === "en" ? "Prefer primary material. A material claim needs one Tier 1 source or two independent Tier 2 sources." : "优先采用官方原始资料；重大事实至少需要一个 Tier 1 信源，或两个独立的 Tier 2 信源。")}
        ${methodStep("02", locale === "en" ? "Separate judgment" : "区分判断", locale === "en" ? "Facts, inference, opinion, forecast, and opportunity hypotheses are labeled separately." : "事实、推断、观点、预测与机会假设分别标注，不把分析包装成已经发生的事实。")}
        ${methodStep("03", locale === "en" ? "Recalibrate" : "持续校准", locale === "en" ? "A public view changes only when new evidence alters the phase, impact, or next signal." : "只有新证据改变阶段、影响或下一信号时，才更新公开判断。")}
      </div>
      <div class="method-boundaries"><article><span>${locale === "en" ? "VERIFIABLE" : "可直接核验"}</span><h2>${locale === "en" ? "Evidence and event history" : "证据与事件脉络"}</h2><p>${locale === "en" ? "Every public Event links back to source material and keeps later developments in the same thread." : "每个公开 Event 回链原始资料，并把后续进展保留在同一事件脉络中。"}</p><a class="text-link" href="__PREFIX__timeline/">${locale === "en" ? "Open event stories" : "查看事件脉络"} ${icon("arrow-right")}</a></article><article><span>${locale === "en" ? "USE JUDGMENT" : "需要独立决策"}</span><h2>${locale === "en" ? "Forecasts and action ideas" : "预测与行动参考"}</h2><p>${locale === "en" ? "Role assessments, opportunity hypotheses, cost comparisons, and future signals remain decision support, not conclusions." : "角色判断、机会假设、成本比较与未来信号只提供决策参考，不替代独立判断。"}</p><a class="text-link" href="__PREFIX__legal/">${locale === "en" ? "Read the boundary" : "查看使用边界"} ${icon("arrow-right")}</a></article></div>
    </section>`;
}

function methodStep(index: string, title: string, copy: string): string {
  return `<article><span>${escapeHtml(index)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></article>`;
}

function changelogPage(model: StaticSiteModel, locale: Locale): string {
  const latestReleaseIndex = model.product.releases.findIndex(
    (release) => release.status !== "unreleased",
  );
  return `<section class="page-hero shell"><span class="section-kicker">PRODUCT EVOLUTION</span><h1>${escapeHtml(t("changelog.heroTitle", locale))}</h1><p>${escapeHtml(t("changelog.heroDesc", locale))}</p>${pageStatus(t("changelog.status", locale).replace("{count}", String(model.product.releases.length)), t("changelog.current", locale).replace("{version}", model.product.version), t("changelog.nav", locale))}</section>
    <section class="section shell"><div class="changelog-rail">${model.product.releases.map((release, index) => releaseDetail(release, index === 0, index === latestReleaseIndex, locale)).join("")}</div></section>`;
}

function sourcesPage(model: StaticSiteModel, locale: Locale): string {
  const coverage = model.product.sourceCoverage;
  const technologyCoverage = analyzeTechnologyCoverage(model.sources);
  const portfolio = summarizeSourcePortfolio(model.sources);
  const gaps = technologyCoverage.filter((item) => item.status !== "covered").length;
  const automaticInfluencers = model.influencers.filter((item) => item.feedSourceSlug).length;
  const restrictedProfiles = model.influencers
    .flatMap((item) => item.profiles)
    .filter((profile) => profile.access === "restricted").length;
  return `<section class="page-hero shell"><span class="section-kicker">SOURCE MAP</span><h1>${escapeHtml(t("sources.heroTitle", locale))}</h1><p>${escapeHtml(t("sources.heroDesc", locale))}</p>${pageStatus(t("sources.statusTotal", locale).replace("{total}", String(coverage.total)), t("sources.statusObserving", locale).replace("{total}", String(coverage.observing)), t("sources.statusActive", locale).replace("{total}", String(coverage.active)))}</section>
    <section class="section shell source-portfolio-section">
      ${sectionHead("SOURCE PORTFOLIO", t("sources.portfolioTitle", locale), t("sources.portfolioDesc", locale))}
      <div class="source-portfolio-grid">
        ${sourcePortfolioCard(t("sources.portfolioCategory", locale), "category", portfolio.categories, model.sources.length, locale)}
        ${sourcePortfolioCard(t("sources.portfolioRegion", locale), "region", portfolio.regions, model.sources.length, locale)}
        ${sourcePortfolioCard(t("sources.portfolioChannel", locale), "acquisition", portfolio.acquisitions, model.sources.length, locale)}
        ${sourcePortfolioCard(t("sources.portfolioRuntime", locale), "health", portfolio.health, model.sources.length, locale)}
      </div>
    </section>
    <section class="section shell coverage-audit-section">
      ${sectionHead(t("sources.coverageKicker", locale), t("sources.coverageTitle", locale), t("sources.coverageDesc", locale))}
      <div class="coverage-summary">${metric(locale === "en" ? "Technology areas" : "重点技术领域", technologyCoverage.length)}${metric(locale === "en" ? "Need strengthening" : "需要补强", gaps)}${metric(locale === "en" ? "Recently healthy sources" : "最近健康来源", model.sources.filter((source) => source.healthStatus === "healthy").length)}${metric(locale === "en" ? "Unchecked sources" : "尚未验证来源", model.sources.filter((source) => source.healthStatus === "unchecked").length)}</div>
      <div class="filter-toolbar coverage-filters"><button class="active" data-card-filter="all">${locale === "en" ? "All" : "全部"}</button><button data-card-filter="gap">${t("sources.coverageGap", locale)}</button><button data-card-filter="watch">${t("sources.coverageWatch", locale)}</button><button data-card-filter="unchecked">${t("sources.coverageUnchecked", locale)}</button><button data-card-filter="covered">${t("sources.coverageCovered", locale)}</button></div>
      <div class="technology-coverage-grid" data-filter-grid>${technologyCoverage.map((item) => technologyCoverageCard(item, locale)).join("")}</div>
    </section>
    <section class="section shell influencer-section">
      ${sectionHead("KOL SIGNAL MATRIX", locale === "en" ? "Core Observers" : "核心观察者", locale === "en" ? "Personal feeds enter the normal evidence pipeline; restricted social profiles remain discovery signals and never become sole factual evidence." : "个人 RSS/Atom 进入正常证据链；X、LinkedIn、微博与即刻受限账号只作为发现线索，不会单独成为重大事实证据。")}
      <div class="coverage-summary">${metric(locale === "en" ? "Core people" : "核心个人", model.influencers.length)}${metric(locale === "en" ? "Automatic feeds" : "自动个人 Feed", automaticInfluencers)}${metric(locale === "en" ? "China" : "中国", model.influencers.filter((item) => item.region === "CN").length)}${metric(locale === "en" ? "Restricted profiles" : "平台受限入口", restrictedProfiles)}</div>
      <div class="influencer-grid">${model.influencers.map((item) => influencerCard(item, locale)).join("")}</div>
    </section>
    <section class="section section-tint"><div class="shell">
      ${sectionHead("SOURCE RUNTIME", t("sources.catalogTitle", locale), t("sources.catalogDesc", locale))}
      <div class="source-standard">${sourceLevel("E0", "Catalog", t("sources.levelE0Desc", locale))}${sourceLevel("E1", "Reachable", t("sources.levelE1Desc", locale))}${sourceLevel("E2", "Healthy", t("sources.levelE2Desc", locale))}${sourceLevel("E3", "Observing", t("sources.levelE3Desc", locale))}${sourceLevel("E4", "Production", t("sources.levelE4Desc", locale))}</div>
      <div class="source-toolbar"><label class="search-box">${icon("search")}<input data-source-search type="search" placeholder="${escapeHtml(t("sources.searchPlaceholder", locale))}"></label><div class="chip-row"><button class="active" data-source-filter="all">${t("sources.filterAll", locale)}</button><button data-source-filter="active">${t("sources.filterActive", locale)}</button><button data-source-filter="observing">${t("sources.filterObserving", locale)}</button><button data-source-filter="healthy">${locale === "en" ? "Healthy" : "最近健康"}</button><button data-source-filter="rss">RSS / Atom</button><button data-source-filter="github">GitHub</button><button data-source-filter="CN">${t("sources.filterChina", locale)}</button></div></div>
      <div class="source-table" data-source-grid>${model.sources.map((src) => sourceRow(src, locale)).join("")}</div>
      <div class="contribute-card"><div>${icon("git-pull-request")}<h2>${escapeHtml(t("sources.contributeTitle", locale))}</h2><p>${escapeHtml(t("sources.contributeDesc", locale))}</p></div><a class="button primary" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">${t("sources.contributeButton", locale)} ${icon("arrow-right")}</a></div>
    </div></section>`;
}

function sourcePortfolioCard(
  title: string,
  dimension: "category" | "region" | "acquisition" | "health",
  buckets: ReturnType<typeof summarizeSourcePortfolio>["categories"],
  total: number,
  locale: Locale,
): string {
  const rows = buckets
    .map((bucket) => {
      const share = total > 0 ? Math.max(2, Math.round((bucket.total / total) * 100)) : 0;
      const detail =
        dimension === "health"
          ? locale === "en"
            ? `${bucket.observing} observing`
            : `${bucket.observing} 个 E3 观察`
          : locale === "en"
            ? `${bucket.healthy} healthy · ${bucket.observing} observing`
            : `${bucket.healthy} 个健康 · ${bucket.observing} 个观察`;
      return `<li><div><strong>${escapeHtml(sourcePortfolioLabel(bucket.key, dimension, locale))}</strong><span>${escapeHtml(detail)}</span></div><b>${bucket.total}</b><i style="--source-share:${share}%"></i></li>`;
    })
    .join("");
  return `<article class="source-portfolio-card"><header><span>${escapeHtml(title)}</span><strong>${buckets.length}</strong></header><ol>${rows}</ol></article>`;
}

function sourcePortfolioLabel(
  key: string,
  _dimension: "category" | "region" | "acquisition" | "health",
  locale: Locale,
): string {
  if (locale === "en") return key;
  const labels: Record<string, string> = {
    "frontier-lab": "全球前沿实验室",
    "china-lab": "中国模型与产品",
    "research-eval": "研究与评测",
    "open-source": "开源生态",
    "agent-devtool": "Agent 与开发工具",
    robotics: "机器人与具身智能",
    "infra-chip-cloud": "基础设施、芯片与云",
    "capital-business": "资本与商业",
    "model-economics": "模型经济",
    policy: "政策与治理",
    expert: "专家观察",
    media: "媒体",
    "community-heat": "社区热度",
    aggregator: "聚合发现",
    GLOBAL: "全球",
    CN: "中国",
    US: "美国",
    EU: "欧洲",
    UK: "英国",
    github: "GitHub Release",
    rss: "RSS / Atom",
    api: "官方 API",
    arxiv: "arXiv",
    html: "公开网页",
    manual: "人工核验",
    social: "平台受限",
    healthy: "最近健康",
    degraded: "需要观察",
    failed: "检查失败",
    skipped: "策略跳过",
    unchecked: "尚未验证",
  };
  return labels[key] ?? key;
}

function influencerCard(item: PublicInfluencer, locale: Locale): string {
  const profiles = item.profiles
    .map((profile) => {
      const url = safeExternalLink(profile.url);
      if (!url) return "";
      const label = `${profile.platform === "x" ? "X" : profile.platform} · ${profile.handle}`;
      return `<a class="influencer-profile ${escapeHtml(profile.access)}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(label)}</span><small>${profile.access === "automatic" ? (locale === "en" ? "automatic" : "可自动采集") : locale === "en" ? "restricted" : "平台受限"}</small>${icon("external-link")}</a>`;
    })
    .join("");
  return `<article class="influencer-card"><header><span>${escapeHtml(item.region === "CN" ? (locale === "en" ? "China" : "中国") : locale === "en" ? "Global" : "全球")}</span><strong>${item.feedSourceSlug ? (locale === "en" ? "FEED ACTIVE" : "FEED 已接入") : locale === "en" ? "IDENTITY ONLY" : "身份观测"}</strong></header><h3>${escapeHtml(item.name)}</h3><p>${item.focus.map((focus) => escapeHtml(focus)).join(" · ")}</p><div>${profiles}</div></article>`;
}

function legalPage(model: StaticSiteModel, locale: Locale): string {
  return `<section class="page-hero shell"><span class="section-kicker">COPYRIGHT & SOURCE POLICY</span><h1>${escapeHtml(t("legal.heroTitle", locale))}</h1><p>${escapeHtml(t("legal.heroDesc", locale))}</p>${pageStatus(t("legal.statusCode", locale), t("legal.statusThirdParty", locale), t("legal.statusCorrection", locale))}</section>
    <section class="section shell legal-layout">
      <nav class="legal-nav"><a href="#scope">${escapeHtml(t("legal.navScope", locale))}</a><a href="#sources">${escapeHtml(t("legal.navSources", locale))}</a><a href="#correction">${escapeHtml(t("legal.navCorrection", locale))}</a><a href="#disclaimer">${escapeHtml(t("legal.navDisclaimer", locale))}</a><a href="#icons">${escapeHtml(t("legal.navIcons", locale))}</a></nav>
      <div class="legal-copy">
        <section id="scope"><span>01</span><h2>${escapeHtml(t("legal.scopeTitle", locale))}</h2><p>${escapeHtml(t("legal.scopeDesc", locale))}</p></section>
        <section id="sources"><span>02</span><h2>${escapeHtml(t("legal.sourcesTitle", locale))}</h2><p>${escapeHtml(t("legal.sourcesDesc", locale))}</p></section>
        <section id="correction"><span>03</span><h2>${escapeHtml(t("legal.correctionTitle", locale))}</h2><p>${escapeHtml(t("legal.correctionDesc", locale))}</p><a class="button quiet" href="${escapeHtml(model.github.repositoryUrl)}/issues/new/choose" target="_blank" rel="noopener noreferrer">${escapeHtml(t("legal.correctionButton", locale))}</a></section>
        <section id="disclaimer"><span>04</span><h2>${escapeHtml(t("legal.disclaimerTitle", locale))}</h2><p>${escapeHtml(t("legal.disclaimerDesc", locale))}</p></section>
        <section id="icons"><span>05</span><h2>${escapeHtml(t("legal.iconsTitle", locale))}</h2><p>${escapeHtml(t("legal.iconsDesc", locale))}</p><a class="text-link" href="__ASSET_PREFIX__assets/THIRD_PARTY_NOTICES.txt">${t("legal.viewNotices", locale)} ${icon("arrow-right")}</a></section>
      </div>
    </section>`;
}

function notFoundPage(model: StaticSiteModel, locale: Locale): string {
  return pageLayout({
    title: t("notFound.title", locale),
    description: t("notFound.desc", locale),
    route: "/404.html",
    depth: 0,
    active: "home",
    locale,
    body: `<section class="not-found shell"><span>404</span><h1>${escapeHtml(t("notFound.heading", locale))}</h1><p>${escapeHtml(t("notFound.body", locale))}</p><div><a class="button primary" href="./">${escapeHtml(t("notFound.home", locale))}</a><a class="button quiet" href="./lines/">${escapeHtml(t("notFound.lines", locale))}</a><a class="button quiet" href="./timeline/">${escapeHtml(t("notFound.timeline", locale))}</a></div></section>`,
    siteUrl: model.siteUrl,
    github: model.github,
    generatedAt: model.generatedAt,
  });
}

function toolHeader(
  _iconName: string,
  title: string,
  copy: string,
  tabActive: string,
  locale: Locale,
): string {
  return `<section class="page-hero compact tool-hero has-motion shell"><span class="section-kicker">${locale === "en" ? "DECISION TOOLS" : "决策工具"}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p>${heroMotion("action")}<nav class="tool-tabs" aria-label="${locale === "en" ? "Decision tools" : "决策工具"}">${toolTabs(tabActive, locale)}</nav></section>`;
}

function toolTabs(active: string, locale: Locale): string {
  const tabs: Array<[string, string]> = [
    ["scout", t("tab.scout", locale)],
    ["actors", t("tab.actors", locale)],
    ["resources", t("tab.resources", locale)],
  ];
  return tabs
    .map(
      ([route, label]) =>
        `<a href="__PREFIX__${route}/"${route === active ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
}

function pageStatus(left: string, middle: string, right: string): string {
  return `<div class="page-status"><span>${escapeHtml(left)}</span><span>${escapeHtml(middle)}</span><span>${escapeHtml(right)}</span></div>`;
}

function sectionHead(kicker: string, title: string, _copy: string): string {
  return `<header class="section-head"><div><span class="section-kicker">${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2></div></header>`;
}

function heroMotion(kind: "lines" | "timeline" | "signals" | "action"): string {
  if (kind === "lines") {
    return `<div class="hero-motion hero-motion-lines" aria-hidden="true"><svg viewBox="0 0 240 140"><circle class="motion-orbit" cx="120" cy="70" r="45"/><circle class="motion-orbit motion-orbit-inner" cx="120" cy="70" r="24"/><g class="motion-constellation"><circle cx="120" cy="25" r="4"/><circle cx="159" cy="48" r="4"/><circle cx="159" cy="92" r="4"/><circle cx="120" cy="115" r="4"/><circle cx="81" cy="92" r="4"/><circle cx="81" cy="48" r="4"/></g><circle class="motion-core" cx="120" cy="70" r="6"/></svg></div>`;
  }
  if (kind === "timeline") {
    return `<div class="hero-motion hero-motion-timeline" aria-hidden="true"><svg viewBox="0 0 240 140"><path d="M30 70 H210"/><circle cx="48" cy="70" r="4"/><circle cx="96" cy="70" r="4"/><circle cx="144" cy="70" r="4"/><circle cx="192" cy="70" r="4"/><circle class="motion-scan" cx="48" cy="70" r="13"/><path class="motion-history" d="M48 48 V92 M96 58 V82 M144 48 V92 M192 58 V82"/></svg></div>`;
  }
  if (kind === "signals") {
    return `<div class="hero-motion hero-motion-signals" aria-hidden="true"><svg viewBox="0 0 240 140"><path class="motion-signal-path path-a" d="M26 33 C72 33 72 70 118 70 S164 107 214 107"/><path class="motion-signal-path path-b" d="M26 106 C72 106 72 70 118 70 S164 34 214 34"/><circle class="motion-signal-source source-a" cx="26" cy="33" r="5"/><circle class="motion-signal-source source-b" cx="26" cy="106" r="5"/><circle class="motion-signal-hub" cx="118" cy="70" r="8"/><circle class="motion-signal-packet packet-a" cx="26" cy="33" r="4"/><circle class="motion-signal-packet packet-b" cx="26" cy="106" r="4"/><circle class="motion-signal-target" cx="214" cy="34" r="5"/><circle class="motion-signal-target" cx="214" cy="107" r="5"/></svg></div>`;
  }
  return `<div class="hero-motion hero-motion-action" aria-hidden="true"><svg viewBox="0 0 240 140"><path class="motion-action-path" d="M34 104 C72 90 83 42 120 68 S178 103 207 37"/><g class="motion-action-nodes"><rect x="29" y="99" width="10" height="10" rx="2"/><rect x="115" y="63" width="10" height="10" rx="2"/><rect x="202" y="32" width="10" height="10" rx="2"/></g><path class="motion-action-spark" d="M174 32 V50 M165 41 H183"/></svg></div>`;
}

function industryTrendBlock(model: StaticSiteModel, track: PublicTrack, locale: Locale): string {
  const narrative = narrativeFor(model, track.slug);
  const events = sortEventsByLatestDevelopment(eventsForTrack(model.events, track.slug))
    .filter(hasPrimaryEvidence)
    .slice(0, 6);
  const latest = events[0];
  const controls =
    events.length > 1
      ? `<div class="industry-carousel-controls"><div><button type="button" data-carousel-prev aria-label="${locale === "en" ? "Previous event" : "上一个事件"}">←</button><button type="button" data-carousel-next aria-label="${locale === "en" ? "Next event" : "下一个事件"}">→</button></div><div class="industry-carousel-dots" data-carousel-dots></div><span data-carousel-status aria-live="polite">1 / ${events.length}</span></div>`
      : "";
  return `<article class="industry-trend-block" data-industry-carousel tabindex="0" aria-roledescription="carousel" aria-label="${escapeHtml(track.name)}" style="--track-color:${escapeHtml(track.color)}"><a class="line-summary industry-trend-summary" href="__PREFIX__lines/${escapeHtml(track.slug)}/"><div><span>${escapeHtml(track.name)} · ${t("lines.nodes", locale).replace("{count}", String(events.length))}</span><h3>${escapeHtml(narrative?.now || track.description)}</h3><p>${escapeHtml(narrative?.thesis || track.description)}</p></div><footer><span>${latest ? t("lines.latest", locale).replace("{date}", formatDate(latestDevelopmentAt(latest), locale)) : t("lines.waitingEvidence", locale)}</span><strong>${t("lines.openLine", locale)} ${icon("arrow-right")}</strong></footer></a><div class="industry-event-viewport"><div class="industry-carousel-track" data-carousel-track>${events
    .map(
      (event, index) =>
        `<a class="industry-event-slide" data-carousel-slide data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/" aria-label="${index + 1} / ${events.length}"><time>${escapeHtml(formatDate(latestDevelopmentAt(event), locale))}</time><strong>${escapeHtml(event.title)}</strong><span>${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(event)))}</span></a>`,
    )
    .join("")}</div></div>${controls}</article>`;
}

function recentEventRow(event: EnrichedEvent, locale: Locale): string {
  const recent = isRecentEvent(event);
  const track = STRATEGIC_TRACKS.map((slug) =>
    event.tracks.find((item) => item.slug === slug),
  ).find((item) => item);
  return `<a class="event-row home-recent-row${recent ? " is-recent" : ""}" data-recent="${recent}" data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"${track ? ` style="--event-color:${escapeHtml(track.color)}"` : ""}><time>${escapeHtml(formatDate(latestDevelopmentAt(event), locale))}</time><div><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(event.company || t("event.unknownEntity", locale))} · ${t("home.sourceCount", locale).replace("{count}", String(evidenceSourceCount(event)))}</span><h3>${escapeHtml(event.title)}</h3></div>${icon("arrow-right")}</a>`;
}

function trendSwitcher(
  model: StaticSiteModel,
  locale: Locale,
  currentSlug?: string,
  compact = false,
  defaultRoute = false,
): string {
  const tabs = strategicTracks(model)
    .map((track, index) => {
      const isCurrent = track.slug === currentSlug;
      const route = defaultRoute && index === 0 ? "lines/" : `lines/${track.slug}/`;
      return `<a class="trend-tab" href="__PREFIX__${escapeHtml(route)}" style="--track-color:${escapeHtml(track.color)}"${isCurrent ? ' aria-current="page"' : ""}><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(track.name)}</strong>${compact ? "" : `<small>${escapeHtml(track.perspective)}</small>`}</a>`;
    })
    .join("");
  return `<nav class="trend-switcher${compact ? " compact" : ""}" aria-label="${locale === "en" ? "Six trend perspectives" : "六个趋势视角"}">${tabs}</nav>`;
}

function phaseCard(
  stage: NarrativeStage,
  events: EnrichedEvent[],
  locale: Locale,
  index: number,
): string {
  const stageEvidence = events.flatMap((event) => evidenceForNarrativeStage(event, stage));
  const sources = new Set(stageEvidence.map((item) => item.source.trim().toLowerCase()));
  return `<article style="--phase-index:${index}"><header><span class="phase-sequence"><b class="phase-sequence-index">${String(index + 1).padStart(2, "0")}</b>${escapeHtml(stage.period)}</span><small>${events.length} EVENT · ${sources.size} ${locale === "en" ? "SOURCES" : "信源"}</small></header><h3>${escapeHtml(stage.label)}</h3><p>${escapeHtml(stage.summary)}</p><div class="phase-interpretation"><strong>${locale === "en" ? "Why this phase matters" : "阶段解读"}</strong><p>${escapeHtml(stage.interpretation)}</p></div><div data-module-extra><strong>${locale === "en" ? "Next signal" : "下一验证信号"}</strong><p>${escapeHtml(stage.nextSignal)}</p></div></article>`;
}

function stageEvidenceGroup(
  stage: NarrativeStage,
  events: EnrichedEvent[],
  locale: Locale,
  index: number,
): string {
  const hiddenCount = Math.max(0, events.length - 2);
  const collapsedLabel = hiddenCount
    ? locale === "en"
      ? `View all ${events.length} events`
      : `查看全部 ${events.length} 条证据`
    : locale === "en"
      ? "Expand phase evidence"
      : "展开阶段证据";
  return `<section class="stage-evidence-group" data-module-expand-root><header><span class="phase-sequence"><b class="phase-sequence-index">${String(index + 1).padStart(2, "0")}</b>${escapeHtml(stage.period)}</span><h3>${escapeHtml(stage.label)}</h3></header><div class="stage-reading"><p><strong>${locale === "en" ? "Interpretation" : "阶段解读"}</strong>${escapeHtml(stage.interpretation)}</p><p data-module-extra><strong>${locale === "en" ? "Next signal" : "下一验证"}</strong>${escapeHtml(stage.nextSignal)}</p></div><div class="evidence-spine">${events.map((event, eventIndex) => eventRow(event, locale, eventIndex >= 2, stage, "module")).join("") || emptyState(locale === "en" ? "Evidence still needed for this phase" : "这一阶段仍需补充公开证据", stage.nextSignal)}${moduleExpandButton(collapsedLabel, locale === "en" ? "Show less" : "收起证据")}</div></section>`;
}

function roleLens(lens: DecisionLens, events: EnrichedEvent[], locale: Locale): string {
  const roleLabels = {
    ceo: t("lines.lensCEO", locale),
    investor: t("lines.lensInvestor", locale),
    cto: t("lines.lensCTO", locale),
    product: t("lines.lensPM", locale),
  } as const;
  const evidence = lens.evidenceSlugs
    .map((slug) => events.find((event) => event.slug === slug))
    .filter((event): event is EnrichedEvent => Boolean(event));
  return `<article data-module-expand-root><header><span>${escapeHtml(roleLabels[lens.role])}</span><small>${evidence.length} ${locale === "en" ? "EVIDENCE LINKS" : "条证据回链"}</small></header><h3>${escapeHtml(lens.question)}</h3><p class="role-answer">${escapeHtml(lens.answer)}</p><div class="role-detail" data-module-extra><section><strong>${locale === "en" ? "Implications" : "影响链"}</strong><ul>${lens.implications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section><strong>${locale === "en" ? "Actions" : "建议动作"}</strong><ul>${lens.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section></div><div class="role-watch"><strong>${locale === "en" ? "Keep watching" : "继续观察"}</strong><ul>${lens.watch.map((item, index) => `<li${index > 0 ? " data-module-extra" : ""}>${escapeHtml(item)}</li>`).join("")}</ul></div>${moduleExpandButton(locale === "en" ? "Expand judgment" : "展开完整判断", locale === "en" ? "Collapse judgment" : "收起完整判断")}${evidence.length ? `<footer>${evidence.map((event) => `<a data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/">${escapeHtml(event.title)} ${icon("arrow-right")}</a>`).join("")}</footer>` : ""}</article>`;
}

function moduleExpandButton(
  collapsedLabel: string,
  expandedLabel: string,
  extraClass = "",
): string {
  return `<button class="module-expand-toggle${extraClass ? ` ${escapeHtml(extraClass)}` : ""}" type="button" data-module-expand data-collapsed-label="${escapeHtml(collapsedLabel)}" data-expanded-label="${escapeHtml(expandedLabel)}" aria-expanded="false"><span>${escapeHtml(collapsedLabel)}</span>${icon("chevron-down")}</button>`;
}

function eventRow(
  event: EnrichedEvent,
  locale: Locale,
  extra = false,
  stage?: NarrativeStage,
  extraScope: "module" = "module",
): string {
  const recent = isRecentEvent(event);
  const stageEvidence = stage ? evidenceForNarrativeStage(event, stage) : event.evidence;
  const evidenceSummary = stage
    ? stageEvidence.length
      ? `${stageEvidence.length} ${locale === "en" ? "phase evidence" : "条阶段证据"}`
      : locale === "en"
        ? `event origin · ${event.evidence.length} total evidence`
        : `事件起点 · 共 ${event.evidence.length} 条证据`
    : `${event.evidence.length} ${locale === "en" ? "evidence" : "条证据"}`;
  const developmentAt = stage
    ? latestNarrativeStageDevelopmentAt(event, stage) || event.happenedAt
    : event.happenedAt;
  const extraAttribute = extra && extraScope === "module" ? " data-module-extra" : "";
  return `<a class="event-row${recent ? " is-recent" : ""}"${extraAttribute} data-recent="${recent}" data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"><time>${escapeHtml(formatDate(developmentAt, locale))}</time><div><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(event.company || t("event.unknownEntity", locale))} · ${escapeHtml(evidenceSummary)}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></div><small>${escapeHtml(evidenceLabelFor(stageEvidence.length ? stageEvidence : event.evidence, locale))}</small>${icon("arrow-right")}</a>`;
}

function eventsInStage(events: EnrichedEvent[], stage: NarrativeStage): EnrichedEvent[] {
  return events
    .filter((event) => eventTouchesNarrativeStage(event, stage))
    .sort(
      (left, right) =>
        Date.parse(latestNarrativeStageDevelopmentAt(right, stage) || "") -
        Date.parse(latestNarrativeStageDevelopmentAt(left, stage) || ""),
    );
}

const TRACK_SOURCE_TERMS: Record<string, string[]> = {
  "tech-evolution": [
    "research",
    "model",
    "benchmark",
    "evaluation",
    "multimodal",
    "reasoning",
    "robotics",
  ],
  "agi-progress": ["agent", "coding", "protocol", "automation", "browser", "robotics", "developer"],
  commercialization: [
    "product",
    "enterprise",
    "company",
    "commercial",
    "developer",
    "cloud",
    "application",
  ],
  investing: [
    "capital",
    "business",
    "filing",
    "funding",
    "investment",
    "earnings",
    "market",
    "finance",
  ],
  "global-innovation": [
    "open-source",
    "open model",
    "policy",
    "ecosystem",
    "regional",
    "governance",
    "model",
  ],
  "model-economics": [
    "infrastructure",
    "inference",
    "training",
    "chip",
    "cloud",
    "cost",
    "pricing",
    "hardware",
    "gpu",
  ],
};

function sourcesForTrack(sources: PublicSource[], slug: string): PublicSource[] {
  const terms = TRACK_SOURCE_TERMS[slug] ?? [];
  return sources
    .filter((source) => {
      if (slug === "global-innovation" && source.region !== "US") return true;
      const haystack = [source.slug, source.name, source.category, ...source.topics]
        .join(" ")
        .toLowerCase();
      return terms.some((term) => haystack.includes(term));
    })
    .sort(
      (left, right) =>
        Number(right.observationEnabled) - Number(left.observationEnabled) ||
        left.tier - right.tier ||
        right.qualityScore - left.qualityScore ||
        left.name.localeCompare(right.name),
    )
    .slice(0, 60);
}

function trendSource(source: PublicSource, locale: Locale, extra: boolean): string {
  const url = safeExternalLink(source.homepageUrl);
  const body = `<span><i class="source-runtime ${escapeHtml(source.healthStatus)}"></i>${escapeHtml(source.region)} · Tier ${source.tier} · ${escapeHtml(source.lifecycle)}</span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.role)} · ${escapeHtml(source.cadence)} · ${escapeHtml(sourceHealthLabel(source, locale))}</small>`;
  return url
    ? `<a${extra ? " data-module-extra" : ""} href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}${icon("external-link")}</a>`
    : `<div${extra ? " data-module-extra" : ""}>${body}</div>`;
}

function isResearchEvent(event: EnrichedEvent): boolean {
  return ["research", "paper"].includes(event.category.toLowerCase());
}

function isReviewedResearch(event: EnrichedEvent): boolean {
  return (
    isResearchEvent(event) &&
    hasPrimaryEvidence(event) &&
    event.technicalInsight.trim().length >= 80 &&
    event.industryInsight.trim().length >= 50 &&
    event.futureOutlook.trim().length >= 40
  );
}

function researchDayGroup(day: string, events: EnrichedEvent[], locale: Locale): string {
  const label = formatDate(`${day}T00:00:00.000Z`, locale);
  const topics = [...new Set(events.flatMap((event) => event.keywords))].slice(0, 6);
  return `<details class="research-day-group" data-research-group data-research-day="${escapeHtml(day)}"><summary><div><span>${escapeHtml(t("timeline.researchDigest", locale))} · ${escapeHtml(label)}</span><strong>${escapeHtml(t("timeline.researchDigestCount", locale).replace("{count}", String(events.length)))}</strong><p>${escapeHtml(topics.join(" · ") || t("timeline.researchDigestFallback", locale))}</p></div><span>${escapeHtml(t("timeline.expandResearch", locale))} ${icon("chevron-down")}</span></summary><div class="research-day-grid">${events.map((event) => timelineCard(event, locale)).join("")}</div></details>`;
}

function timelineCard(event: EnrichedEvent, locale: Locale): string {
  const search = [event.title, event.company, event.factSummary, ...event.keywords]
    .join(" ")
    .toLowerCase();
  const tracks = event.tracks.map((track) => track.slug).join(" ");
  const developments = eventDevelopments(event);
  const recent = isRecentEvent(event);
  return `<button class="timeline-card${isResearchEvent(event) ? " research" : ""}${recent ? " is-recent" : ""}" type="button" data-recent="${recent}" data-event="${escapeHtml(event.slug)}" data-search="${escapeHtml(search)}" data-tracks="${escapeHtml(tracks)}" data-category="${escapeHtml(event.category)}" data-research="${isResearchEvent(event)}" data-research-reviewed="${isReviewedResearch(event)}" data-primary="${hasPrimaryEvidence(event)}" aria-controls="event-drawer" aria-haspopup="dialog"><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(t("timeline.latestUpdate", locale).replace("{date}", formatDate(latestDevelopmentAt(event), locale)))} · ${escapeHtml(event.company || t("event.unknownEntity", locale))}</span><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.factSummary)}</p><div class="timeline-card-tags"><span>${escapeHtml(categoryName(event.category, locale))}</span>${event.keywords
    .slice(0, 3)
    .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
    .join(
      "",
    )}</div><footer><span>${escapeHtml(t("timeline.developments", locale).replace("{count}", String(developments.length)))}</span><strong>${escapeHtml(evidenceLabel(event, locale))}</strong></footer></button>`;
}

function eventJourney(event: EnrichedEvent, locale: Locale, compact = false): string {
  const developments = eventDevelopments(event);
  const visible = compact ? developments.slice(-4) : developments;
  const items = visible
    .map(({ kind, evidence }) => {
      const url = safeExternalLink(evidence.url);
      const body = `<span>${escapeHtml(developmentLabel(kind, locale))}</span><time>${escapeHtml(formatDate(evidence.publishedAt, locale))}</time><strong>${escapeHtml(evidence.title)}</strong><small>${escapeHtml(evidence.source)}</small>`;
      return `<li class="event-step ${escapeHtml(kind)}">${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${body}${icon("external-link")}</a>` : `<div>${body}</div>`}</li>`;
    })
    .join("");
  const assessment = event.industryInsight || event.summary;
  return `<ol class="event-journey${compact ? " compact" : ""}">${items}<li class="event-step assessment"><div><span>${escapeHtml(t("event.currentAssessment", locale))}</span><time>${escapeHtml(formatDate(latestDevelopmentAt(event), locale))}</time><strong>${escapeHtml(assessment || t("common.noJudgment", locale))}</strong><small>Agent Pulse · ${locale === "en" ? "analysis" : "分析"}</small></div></li></ol>`;
}

function developmentLabel(
  kind: ReturnType<typeof eventDevelopments>[number]["kind"],
  locale: Locale,
): string {
  const keys = {
    origin: "event.developmentOrigin",
    official: "event.developmentOfficial",
    discussion: "event.developmentDiscussion",
    response: "event.developmentResponse",
  } as const;
  return t(keys[kind], locale);
}

function insight(
  label: string,
  copy: string | null | undefined,
  kind: string,
  locale: Locale,
): string {
  return `<section class="insight ${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><p>${escapeHtml(copy || t("common.noJudgment", locale))}</p></section>`;
}

function score(label: string, value: number, locale: Locale): string {
  return `<div><strong>${escapeHtml(scoreBand(value, locale))}</strong><span>${escapeHtml(label)}</span><small>${value}/100</small></div>`;
}

function evidenceLinks(event: EnrichedEvent, locale: Locale): string {
  return event.evidence
    .map((evidence) => {
      const url = safeExternalLink(evidence.url);
      return url
        ? `<a class="evidence-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(evidence.title)}</strong><span>${escapeHtml(evidence.source)} · ${escapeHtml(evidenceRole(evidence.role, locale))} · ${escapeHtml(formatDate(evidence.publishedAt, locale))}</span>${icon("external-link")}</a>`
        : "";
    })
    .join("");
}

function eventCompact(event: EnrichedEvent, locale: Locale): string {
  const recent = isRecentEvent(event);
  return `<a class="${recent ? "is-recent" : ""}" data-recent="${recent}" data-event-link="${escapeHtml(event.slug)}" href="__PREFIX__events/${escapeHtml(event.slug)}/"><span>${recent ? `${recentBadge(locale)} · ` : ""}${escapeHtml(formatDate(event.happenedAt, locale))}</span><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.factSummary)}</p></a>`;
}

function recentBadge(locale: Locale): string {
  return locale === "en" ? "LAST 7 DAYS" : "近 7 天";
}

function scoutCard(insight: PublicScoutInsight, locale: Locale): string {
  return `<article class="scout-card" data-filter-value="${escapeHtml(insight.kind)}"><div class="scout-summary"><header><span>${escapeHtml(scoutKind(insight.kind, locale))}</span><span>${escapeHtml(insight.horizon)}</span><span>${locale === "en" ? "For" : "适合"} · ${escapeHtml(insight.targetAudience)}</span></header><h2>${escapeHtml(insight.title)}</h2><p class="scout-observation"><strong>${locale === "en" ? "Observed shift" : "触发变化"}</strong>${escapeHtml(insight.observation)}</p><p class="hypothesis">${escapeHtml(insight.hypothesis)}</p><div class="scout-metrics"><span>${locale === "en" ? "Confidence" : "置信度"} <strong>${insight.confidenceScore}</strong></span><span>${locale === "en" ? "Evidence" : "证据强度"} <strong>${insight.evidenceScore}</strong></span><span>${locale === "en" ? "Novelty" : "新颖度"} <strong>${insight.noveltyScore}</strong></span><span>${locale === "en" ? "Actionability" : "行动价值"} <strong>${insight.leverageScore}</strong></span></div></div><div class="scout-detail"><div class="scout-sections"><section><span>${locale === "en" ? "Why Now" : "为什么现在"}</span><p>${escapeHtml(insight.whyNow)}</p></section><section><span>${locale === "en" ? "Minimum Action" : "最小动作"}</span><p>${escapeHtml(insight.suggestedAction)}</p></section><section><span>${locale === "en" ? "Artifact" : "建议产物"}</span><p>${escapeHtml(insight.artifactIdea)}</p></section><section class="counter"><span>${locale === "en" ? "What Could Go Wrong" : "可能错在哪"}</span><p>${escapeHtml(insight.counterSignals)}</p></section></div><footer>${insight.evidence.map((item) => `<a data-event-link="${escapeHtml(item.slug)}" href="__PREFIX__events/${escapeHtml(item.slug)}/">${locale === "en" ? "Evidence" : "证据"} · ${escapeHtml(item.title)}</a>`).join("")}</footer></div></article>`;
}

function actorCard(actor: PublicActor, locale: Locale): string {
  const url = safeExternalLink(actor.websiteUrl);
  return `<article class="actor-card" data-filter-value="${escapeHtml(actor.region)}"><header><span>${escapeHtml(actor.region)} · ${escapeHtml(actor.type)}</span><strong>${escapeHtml(scoreBand(actor.tableScore, locale))}</strong></header><h2>${escapeHtml(actor.name)}</h2><p>${escapeHtml(actor.scale)} · ${escapeHtml(actor.domains.join(" / ") || t("actors.domainUnknown", locale))}</p>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("actors.website", locale))} ${icon("external-link")}</a>` : ""}</article>`;
}

function resourceCard(resource: PublicResource, locale: Locale): string {
  const purchase = safeExternalLink(resource.purchaseUrl);
  const source = safeExternalLink(resource.sourceUrl);
  return `<article class="resource-card"><header><span>${escapeHtml(resource.audience)} · ${resource.riskLevel === "official" ? t("resources.official", locale) : t("resources.reference", locale)}</span><strong>${escapeHtml(resource.region)}</strong></header><h2>${escapeHtml(resource.model)}</h2><p>${escapeHtml(resource.provider)} · ${escapeHtml(resource.planName)}</p><div class="price-pair"><div><span>${t("resources.input", locale)}</span><strong>${formatPrice(resource.inputPrice, resource.currency, locale)}</strong></div><div><span>${t("resources.output", locale)}</span><strong>${formatPrice(resource.outputPrice, resource.currency, locale)}</strong></div></div><small>${resource.unit ? `${resource.unit} · ` : ""}${t("resources.verified", locale).replace("{date}", formatDate(resource.verifiedAt, locale))}</small><footer>${purchase ? `<a href="${escapeHtml(purchase)}" target="_blank" rel="noopener noreferrer">${t("resources.officialLink", locale)} ${icon("external-link")}</a>` : ""}${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">${t("resources.priceSource", locale)} ${icon("external-link")}</a>` : ""}</footer></article>`;
}

function releaseDetail(
  release: Release,
  open: boolean,
  latestReleased: boolean,
  locale: Locale,
): string {
  const unreleased = release.status === "unreleased";
  const marker = unreleased ? t("changelog.next", locale) : `v${release.version}`;
  const label = unreleased
    ? t("changelog.inDevelopment", locale)
    : latestReleased
      ? t("changelog.latest", locale)
      : t("changelog.release", locale);
  const anchor = unreleased ? "unreleased" : `v${release.version.replaceAll(".", "-")}`;
  return `<article class="release-node" id="${escapeHtml(anchor)}"><div class="release-marker"><i></i><span>${escapeHtml(marker)}</span><time>${escapeHtml(release.date)}</time></div><details${open ? " open" : ""}><summary><div><span>${escapeHtml(label)}</span><h2>${escapeHtml(release.name)}</h2><p>${escapeHtml(release.summary)}</p></div>${icon("chevron-down")}</summary><div class="release-body"><section><h3>${escapeHtml(t("changelog.capabilities", locale))}</h3><div class="capability-pills">${release.capabilities.map((item) => `<span>${icon("check")} ${escapeHtml(item)}</span>`).join("")}</div></section><section><h3>${escapeHtml(t("changelog.changes", locale))}</h3><ol>${release.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ol></section></div></details></article>`;
}

function sourceLevel(level: string, title: string, copy: string): string {
  return `<article><strong>${escapeHtml(level)}</strong><span>${escapeHtml(title)}</span><p>${escapeHtml(copy)}</p></article>`;
}

function technologyCoverageCard(item: TechnologyCoverage, locale: Locale): string {
  const copy = technologyCoverageCopy(item, locale);
  const sourcePreview = [...item.sources]
    .sort((left, right) => {
      const itemName = item.name.toLowerCase();
      const leftExact = left.name.toLowerCase().includes(itemName) ? 1 : 0;
      const rightExact = right.name.toLowerCase().includes(itemName) ? 1 : 0;
      return (
        rightExact - leftExact || healthRank(right.healthStatus) - healthRank(left.healthStatus)
      );
    })
    .slice(0, 4)
    .map(
      (source) =>
        `<span class="source-health ${escapeHtml(source.healthStatus)}"><i></i>${escapeHtml(source.name)} · ${escapeHtml(sourceHealthLabel(source, locale))}</span>`,
    )
    .join("");
  return `<article class="technology-coverage-card ${escapeHtml(item.status)}" data-filter-value="${escapeHtml(item.status)}"><header><span>${escapeHtml(coverageStatusLabel(item.status, locale))}</span><strong>${escapeHtml(t("sources.coverageHealthyCount", locale).replace("{count}", String(item.healthySources)))}</strong></header><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(copy.description)}</p><div class="coverage-channels">${item.channels.map((channel) => `<span>${escapeHtml(coverageChannelLabel(channel, locale))}</span>`).join("") || `<span>${locale === "en" ? "No validated channel" : "暂无已验证渠道"}</span>`}</div><div class="coverage-sources"><small>${escapeHtml(t("sources.coverageSourceCount", locale).replace("{count}", String(item.sources.length)))}</small>${sourcePreview || `<span class="source-health unchecked"><i></i>${locale === "en" ? "No catalog source" : "目录暂无来源"}</span>`}</div>${item.missingChannels.length ? `<div class="coverage-missing"><span>${escapeHtml(t("sources.coverageMissing", locale))}</span><p>${item.missingChannels.map((channel) => escapeHtml(coverageChannelLabel(channel, locale))).join(" · ")}</p></div>` : ""}<footer><span>${escapeHtml(t("sources.coverageNext", locale))}</span><p>${escapeHtml(copy.nextAction)}</p></footer></article>`;
}

function sourceRow(source: PublicSource, locale: Locale): string {
  const filter = `${source.region} ${source.lifecycle} ${source.healthStatus} ${source.acquisition} ${source.observationEnabled ? "observing" : ""}`;
  const url = safeExternalLink(source.homepageUrl);
  return `<article data-source-value="${escapeHtml(filter)}" data-source-search-value="${escapeHtml([source.name, source.slug, source.region, source.category, ...source.topics].join(" ").toLowerCase())}"><div><strong>${escapeHtml(source.name)}</strong><span>${escapeHtml(source.slug)}</span></div><span>${escapeHtml(source.region)}</span><span>${escapeHtml(source.category)}</span><span>Tier ${source.tier}</span><span>${source.observationEnabled ? "E3 observing" : escapeHtml(source.lifecycle)}</span><span class="source-runtime ${escapeHtml(source.healthStatus)}"><i></i>${escapeHtml(sourceHealthLabel(source, locale))}</span>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${t("sources.ariaOpen", locale).replace("{name}", source.name)}">${icon("external-link")}</a>` : ""}</article>`;
}

function coverageStatusLabel(status: TechnologyCoverage["status"], locale: Locale): string {
  const keys = {
    covered: "sources.coverageCovered",
    watch: "sources.coverageWatch",
    gap: "sources.coverageGap",
    unchecked: "sources.coverageUnchecked",
  } as const;
  return t(keys[status], locale);
}

function coverageChannelLabel(channel: string, locale: Locale): string {
  const labels: Record<string, [string, string]> = {
    official: ["官方动态", "Official updates"],
    releases: ["版本发布", "Releases"],
    sdk: ["SDK / 协议", "SDK / protocol"],
    research: ["研究", "Research"],
    community: ["社区实践", "Community practice"],
    enterprise: ["企业采用", "Enterprise adoption"],
  };
  const label = labels[channel];
  return label ? label[locale === "en" ? 1 : 0] : channel;
}

function sourceHealthLabel(source: PublicSource, locale: Locale): string {
  const labels: Record<PublicSource["healthStatus"], [string, string]> = {
    healthy: ["最近健康", "healthy"],
    degraded: ["部分可用", "degraded"],
    failed: [
      source.healthErrorCode ? `失败 ${source.healthErrorCode}` : "检查失败",
      source.healthErrorCode ? `failed ${source.healthErrorCode}` : "failed",
    ],
    skipped: ["需人工核验", "manual review"],
    unchecked: ["尚未验证", "unchecked"],
  };
  return labels[source.healthStatus][locale === "en" ? 1 : 0];
}

function healthRank(status: PublicSource["healthStatus"]): number {
  return { healthy: 5, degraded: 4, failed: 3, skipped: 2, unchecked: 1 }[status];
}

function technologyCoverageCopy(
  item: TechnologyCoverage,
  locale: Locale,
): { description: string; nextAction: string } {
  if (locale !== "en") return { description: item.description, nextAction: item.nextAction };
  const copy: Record<string, { description: string; nextAction: string }> = {
    "claude-code": {
      description:
        "Product updates, hooks, subagents, SDK, memory, context compression, and enterprise practice.",
      nextAction:
        "Strengthen Anthropic engineering updates, Claude Code documentation changes, and high-quality community practice.",
    },
    "openai-codex": {
      description:
        "Models, Codex, SDKs, agent platforms, enterprise capabilities, and developer ecosystem.",
      nextAction:
        "Keep Codex, Agents SDK, model, and enterprise product updates on distinct evidence paths.",
    },
    "google-deepmind": {
      description:
        "Frontier research, Gemini capabilities, agent development stack, and product adoption.",
      nextAction:
        "Connect Gemini product updates, Google ADK, and research results into shared event stories.",
    },
    cursor: {
      description:
        "Editor capabilities, agent workflows, enterprise features, and product iteration.",
      nextAction: "Repair changelog parsing and add a stable official release channel.",
    },
    windsurf: {
      description: "Editor, agent capabilities, enterprise features, and ecosystem changes.",
      nextAction: "Repair the official update parser so the source is more than a catalog entry.",
    },
    lovable: {
      description:
        "AI app building, agent capabilities, platform integrations, business model, and governance.",
      nextAction:
        "Validate the official changelog over time and add independent community and enterprise signals.",
    },
    "vercel-ai": {
      description:
        "AI SDK, frontend agent experience, streaming interaction, and application infrastructure.",
      nextAction: "Add Vercel engineering articles and production practice beyond SDK releases.",
    },
    "cloudflare-ai": {
      description: "Workers AI, edge inference, AI Gateway, browser, and agent infrastructure.",
      nextAction:
        "Separate general Cloudflare updates from changes that move the AI engineering boundary.",
    },
    mcp: {
      description:
        "Specification, SDKs, ecosystem integrations, security boundaries, and enterprise adoption.",
      nextAction: "Add specification changes, adoption, and security events beyond SDK patches.",
    },
    a2a: {
      description: "Agent2Agent specification, SDKs, interoperability, and enterprise adoption.",
      nextAction:
        "Start with specification releases, then add SDK compatibility and real interoperability cases.",
    },
    "browser-use": {
      description: "Browser agents, reliability, security, evaluation, and production deployment.",
      nextAction: "Add browser-agent evaluation, security, and real production feedback.",
    },
    "ai-coding": {
      description:
        "Coding agents, IDEs, review, long-running work, memory, and engineering workflows.",
      nextAction:
        "Cross-check product updates against real engineering practice and independent evaluation.",
    },
    "ai-infra": {
      description:
        "Training, inference, chips, compilers, observability, and cloud infrastructure.",
      nextAction: "Counter release-count bias with cost, adoption, and performance evidence.",
    },
    "ai-agent": {
      description:
        "Agent frameworks, long-running work, memory, tool use, evaluation, and commercialization.",
      nextAction:
        "Converge framework releases, research, production adoption, and business outcomes into shared evidence chains.",
    },
  };
  return copy[item.slug] ?? { description: item.description, nextAction: item.nextAction };
}

function readingMetric(value: string | number): string {
  return escapeHtml(String(value));
}

function metric(label: string, value: string | number): string {
  return `<div><span>${escapeHtml(label)}</span><strong>${readingMetric(value)}</strong></div>`;
}

function emptyState(title: string, copy: string): string {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong>${copy ? `<p>${escapeHtml(copy)}</p>` : ""}</div>`;
}

function strategicTracks(model: StaticSiteModel): PublicTrack[] {
  return STRATEGIC_TRACKS.map((slug) => model.tracks.find((track) => track.slug === slug)).filter(
    (track): track is PublicTrack => Boolean(track),
  );
}

function narrativeFor(model: StaticSiteModel, slug: string): TrackNarrative | undefined {
  return model.narratives.tracks.find((item) => item.slug === slug);
}

function eventsForTrack(events: EnrichedEvent[], slug: string): EnrichedEvent[] {
  return events.filter((event) => event.tracks.some((track) => track.slug === slug));
}

function eventJsonLd(event: EnrichedEvent, locale: Locale): Record<string, unknown>[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: event.title,
      description: event.factSummary,
      datePublished: event.happenedAt,
      author: { "@type": "Organization", name: "Agent Pulse" },
      publisher: { "@type": "Organization", name: "Agent Pulse" },
      inLanguage: locale,
    },
  ];
}

function hasPrimaryEvidence(event: EnrichedEvent): boolean {
  return event.evidence.some((evidence) => evidence.role === "primary");
}

function evidenceSourceCount(event: EnrichedEvent): number {
  return evidenceSourceCountFor(event.evidence);
}

function evidenceLabel(event: EnrichedEvent, locale: Locale): string {
  return evidenceLabelFor(event.evidence, locale);
}

function evidenceSourceCountFor(evidence: EnrichedEvent["evidence"]): number {
  return new Set(evidence.map((item) => item.source.trim().toLowerCase())).size;
}

function evidenceLabelFor(evidence: EnrichedEvent["evidence"], locale: Locale): string {
  const sources = evidenceSourceCountFor(evidence);
  const hasPrimary = evidence.some((item) => item.role === "primary");
  if (sources >= 2 && hasPrimary) return t("evidence.primaryMulti", locale);
  if (sources >= 2) return t("evidence.multiSecondary", locale);
  if (hasPrimary) return t("evidence.singlePrimary", locale);
  return evidence.length ? t("evidence.secondary", locale) : t("evidence.pending", locale);
}

function evidenceRole(role: string, locale: Locale): string {
  const map: Record<string, string> = {
    primary: t("role.primary", locale),
    secondary: t("role.secondary", locale),
    amplification: t("role.amplification", locale),
  };
  return map[role] || role;
}

function scoreBand(value: number, locale: Locale): string {
  if (value >= 85) return t("score.high", locale);
  if (value >= 70) return t("score.midHigh", locale);
  if (value >= 55) return t("score.medium", locale);
  return t("score.low", locale);
}

function scoutKind(kind: string, locale: Locale): string {
  const map: Record<string, string> = {
    venture: t("scoutKind.venture", locale),
    media: t("scoutKind.media", locale),
    work: t("scoutKind.work", locale),
    learning: t("scoutKind.learning", locale),
    artifact: t("scoutKind.artifact", locale),
    influence: t("scoutKind.influence", locale),
  };
  return map[kind] || t("scoutKind.cognitive", locale);
}

function categoryName(category: string, locale: Locale): string {
  const map: Record<string, string> = {
    model: t("category.model", locale),
    research: t("category.research", locale),
    product: t("category.product", locale),
    commercialization: t("category.commercialization", locale),
    investment: t("category.investment", locale),
    policy: t("category.policy", locale),
    infrastructure: t("category.infrastructure", locale),
    talent: t("category.talent", locale),
  };
  return map[category] || category || t("category.general", locale);
}

function formatPrice(value: number | null, currency: string, locale: Locale): string {
  if (value === null || !Number.isFinite(value)) return t("resources.inquire", locale);
  return `${currency === "USD" ? "$" : `${currency} `}${value}`;
}

function clip(value: string, limit: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
}
