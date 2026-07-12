import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sourceCatalog } from "../src/catalog/sources.js";
import { githubReleasesAdapter } from "../src/collectors/github-releases.js";
import { rssAdapter } from "../src/collectors/rss.js";
import type { CollectContext } from "../src/collectors/types.js";
import type { SourceDescriptor } from "../src/domain/types.js";
import type { EnrichedEvent, PublicSource } from "../src/pipeline/static-site/dto.js";
import {
  analyzeTechnologyCoverage,
  eventDevelopments,
  groupEventsByYearMonth,
  groupTimelineMonthItems,
  sortEventsByLatestDevelopment,
} from "../src/pipeline/static-site/intelligence.js";

describe("static-site intelligence consumption model", () => {
  it("sorts one event per card by its latest evidence update", () => {
    const olderEventWithNewUpdate = event("older", "2026-01-01T00:00:00Z", [
      evidence("Official update", "primary", "2026-07-10T00:00:00Z"),
    ]);
    const newerEvent = event("newer", "2026-07-01T00:00:00Z", [
      evidence("Initial report", "secondary", "2026-07-01T00:00:00Z"),
    ]);

    expect(
      sortEventsByLatestDevelopment([newerEvent, olderEventWithNewUpdate]).map((item) => item.slug),
    ).toEqual(["older", "newer"]);
  });

  it("turns evidence into a chronological event development path", () => {
    const item = event("journey", "2026-07-01T00:00:00Z", [
      evidence("Community response", "amplification", "2026-07-03T00:00:00Z"),
      evidence("Initial report", "secondary", "2026-07-01T00:00:00Z"),
      evidence("Official release", "primary", "2026-07-02T00:00:00Z"),
    ]);

    const developments = eventDevelopments(item);
    expect(developments.map((development) => development.kind)).toEqual([
      "origin",
      "official",
      "discussion",
    ]);
    expect(developments.map((development) => development.evidence.title)).toEqual([
      "Initial report",
      "Official release",
      "Community response",
    ]);
  });

  it("groups event stories into descending year and month sections", () => {
    const events = [
      event("july", "2026-07-01T00:00:00Z", []),
      event("june", "2026-06-30T00:00:00Z", []),
      event("older", "2025-12-01T00:00:00Z", []),
    ];

    const chronology = groupEventsByYearMonth(events);

    expect(chronology.map((group) => group.year)).toEqual([2026, 2025]);
    expect(chronology[0]?.months.map((month) => month.key)).toEqual(["2026-07", "2026-06"]);
    expect(chronology[0]?.months[0]?.events.map((item) => item.slug)).toEqual(["july"]);
  });

  it("aggregates four or more research events from the same day without losing events", () => {
    const research = ["paper-1", "paper-2", "paper-3", "paper-4"].map((slug) => ({
      ...event(slug, "2026-07-09T08:00:00Z", []),
      category: "research",
    }));
    const product = event("product", "2026-07-09T07:00:00Z", []);
    const firstResearch = research[0];
    if (!firstResearch) throw new Error("research fixture missing");

    const items = groupTimelineMonthItems([firstResearch, product, ...research.slice(1)]);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "research-day",
      key: "2026-07-09",
      events: expect.arrayContaining(research),
    });
    expect(items[1]).toEqual({ kind: "event", event: product });
  });

  it("keeps smaller research days as individual event cards", () => {
    const research = ["paper-1", "paper-2", "paper-3"].map((slug) => ({
      ...event(slug, "2026-07-09T08:00:00Z", []),
      category: "paper",
    }));

    expect(groupTimelineMonthItems(research).map((item) => item.kind)).toEqual([
      "event",
      "event",
      "event",
    ]);
  });

  it("keeps catalog presence separate from effective technical coverage", () => {
    const sources = [
      source("claude-code-releases", "Claude Code Releases", "healthy", "github", [
        "coding-agent",
        "developer",
      ]),
      source("anthropic", "Anthropic", "failed", "html", ["agent", "enterprise"]),
      source("lovable-changelog", "Lovable Changelog", "unchecked", "rss", ["lovable", "product"]),
    ];

    const coverage = analyzeTechnologyCoverage(sources);
    expect(coverage.find((item) => item.slug === "claude-code")).toMatchObject({
      status: "watch",
      healthySources: 1,
    });
    expect(coverage.find((item) => item.slug === "lovable")).toMatchObject({
      status: "unchecked",
      healthySources: 0,
    });
    expect(coverage.find((item) => item.slug === "a2a")).toMatchObject({ status: "gap" });
  });
});

describe("new first-party technology source fixtures", () => {
  it("parses the A2A release fixture through the configured GitHub adapter", async () => {
    const catalog = sourceCatalog.find((source) => source.slug === "a2a-protocol-releases");
    expect(catalog).toMatchObject({
      adapter: "github-releases",
      lifecycleStatus: "shadow",
      enabled: false,
    });
    const result = await githubReleasesAdapter.collect(
      descriptor(catalog),
      context(await fixture("a2a-releases.atom"), catalog?.endpoint ?? ""),
    );
    expect(result[0]).toMatchObject({
      title: "v1.0.1",
      url: "https://github.com/a2aproject/A2A/releases/tag/v1.0.1",
    });
  });

  it("parses the Lovable changelog fixture through the configured RSS adapter", async () => {
    const catalog = sourceCatalog.find((source) => source.slug === "lovable-changelog");
    expect(catalog).toMatchObject({ adapter: "rss", lifecycleStatus: "shadow", enabled: false });
    const result = await rssAdapter.collect(
      descriptor(catalog),
      context(await fixture("lovable-changelog.xml"), catalog?.endpoint ?? ""),
    );
    expect(result[0]).toMatchObject({
      title: "Add payments to your app",
      publishedAt: "2026-04-24T00:00:00.000Z",
    });
  });

  it("keeps source schema drift out of normalized signals", async () => {
    const drift = await fixture("source-schema-drift.xml");
    const lovable = sourceCatalog.find((source) => source.slug === "lovable-changelog");
    const a2a = sourceCatalog.find((source) => source.slug === "a2a-protocol-releases");

    expect(
      await rssAdapter.collect(descriptor(lovable), context(drift, lovable?.endpoint ?? "")),
    ).toEqual([]);
    await expect(
      githubReleasesAdapter.collect(descriptor(a2a), context(drift, a2a?.endpoint ?? "")),
    ).rejects.toThrow("no entries found");
  });
});

function event(
  slug: string,
  happenedAt: string,
  evidenceItems: EnrichedEvent["evidence"],
): EnrichedEvent {
  return {
    id: slug,
    slug,
    title: slug,
    factSummary: "Verified fact",
    summary: "Context",
    technicalInsight: "Technical change",
    industryInsight: "Industry impact",
    futureOutlook: "Next signal",
    businessValue: "Decision value",
    category: "product",
    company: "Example",
    keywords: [],
    confidenceScore: 80,
    heatScore: 60,
    impactScore: 70,
    valueScore: 75,
    scoreFactors: {
      authority: 80,
      corroboration: 70,
      primaryEvidence: 1,
      uniqueAuthors: 1,
      independentSources: 1,
      platformBreadth: 1,
      regionBreadth: 1,
      velocity: 1,
      freshness: 1,
      crossRegion: false,
    },
    featured: false,
    happenedAt,
    publishedAt: happenedAt,
    evidence: evidenceItems,
    tracks: [],
    actors: [],
  };
}

function evidence(
  title: string,
  role: string,
  publishedAt: string,
): EnrichedEvent["evidence"][number] {
  return {
    title,
    role,
    publishedAt,
    source: `${title} source`,
    url: `https://example.com/${title.toLowerCase().replaceAll(" ", "-")}`,
  };
}

function source(
  slug: string,
  name: string,
  healthStatus: PublicSource["healthStatus"],
  acquisition: string,
  topics: string[],
): PublicSource {
  return {
    slug,
    name,
    homepageUrl: `https://example.com/${slug}`,
    category: "agent-devtool",
    region: "GLOBAL",
    tier: 1,
    role: "primary",
    acquisition,
    topics,
    maintenanceStatus: "candidate",
    lifecycle: "shadow",
    observationEnabled: false,
    qualityScore: 80,
    cadence: "daily",
    healthStatus,
    lastCheckedAt: healthStatus === "unchecked" ? null : "2026-07-12T00:00:00Z",
    latestItemAt: healthStatus === "healthy" ? "2026-07-11T00:00:00Z" : null,
    healthErrorCode: healthStatus === "failed" ? "INVALID_ITEMS" : null,
  };
}

function descriptor(source: (typeof sourceCatalog)[number] | undefined): SourceDescriptor {
  if (!source) throw new Error("Expected source fixture entry");
  return {
    id: source.slug,
    slug: source.slug,
    name: source.name,
    homepageUrl: source.homepageUrl,
    adapter: source.adapter,
    tier: source.tier,
    role: source.role,
    region: source.region,
    language: source.language,
    authorityScore: source.authorityScore,
    config: { url: source.endpoint, category: source.category, take: 10 },
    state: {},
  };
}

function context(body: string, finalUrl: string): CollectContext {
  return {
    config: {
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 8899,
      DATABASE_URL: "sqlite::memory:",
      COLLECTOR_USER_AGENT: "agent-pulse/test",
      COLLECTOR_TIMEOUT_MS: 30_000,
      COLLECTOR_CONCURRENCY: 4,
      COLLECTOR_PROXY_MODE: "off",
      PUBLIC_SITE_URL: "https://example.com",
      rootDir: "/tmp",
      databaseUrl: "sqlite::memory:",
      distDir: "/tmp/dist",
    },
    fetchText: async () => ({
      body,
      status: 200,
      headers: new Headers(),
      attemptCount: 1,
      responseBytes: body.length,
      finalUrl,
    }),
  };
}

async function fixture(name: string): Promise<string> {
  return readFile(join(process.cwd(), "tests/fixtures/sources", name), "utf8");
}
