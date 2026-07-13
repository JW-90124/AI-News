import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { renderWeeklyBrief, weeklyBriefMarker } from "../src/cli/render-weekly-brief.js";

describe("weekly GitHub Issue brief", () => {
  it("groups the Shanghai ISO week and keeps public markdown safe", () => {
    const body = renderWeeklyBrief(
      {
        timeline: {
          generatedAt: "2026-07-19T13:20:00.000Z",
          events: [
            {
              slug: "weekly-event",
              title: "A | weekly <event>",
              happenedAt: "2026-07-13T03:00:00.000Z",
              category: "product",
              factSummary: "A verified fact",
              industryInsight: "This changes the workflow control point.",
              futureOutlook: "Watch retention and failure recovery.",
              impactScore: 88,
              valueScore: 84,
              evidence: [{ source: "Official Lab", publishedAt: "2026-07-13T03:00:00.000Z" }],
              tracks: [{ slug: "agi-progress", name: "Agent 与软件重构" }],
            },
            {
              slug: "old-event",
              title: "Old",
              happenedAt: "2026-07-05T03:00:00.000Z",
              category: "product",
              factSummary: "Old fact",
              industryInsight: "Old impact",
              futureOutlook: "Old watch",
            },
          ],
        },
        scout: {
          insights: [
            {
              title: "Run a workflow benchmark",
              hypothesis: "The task can be delegated safely.",
              suggestedAction: "Measure accepted outcomes for seven days.",
              counterSignals: "Manual takeover does not decline.",
              confidenceScore: 82,
              publishedAt: "2026-07-17T08:00:00.000Z",
            },
          ],
        },
        product: {
          version: "0.8.1",
          evaluation: { overallScore: 83, evidenceCoverage: 91 },
          sourceCoverage: { total: 284, active: 18, observing: 31 },
        },
      },
      "2026-07-19",
    );

    expect(body).toContain(weeklyBriefMarker("2026-W29"));
    expect(body).toContain("A weekly event");
    expect(body).not.toContain("<event>");
    expect(body).not.toContain("Old fact");
    expect(body).toContain("Measure accepted outcomes for seven days.");
    expect(body).toContain("来源目录：284 个");
  });

  it("keeps the workflow idempotent and Sunday-gated", async () => {
    const workflow = await readFile(".github/workflows/data-refresh.yml", "utf8");
    expect(workflow).toContain('cron: "17 12 * * *"');
    expect(workflow).toContain("agent-pulse-weekly-brief");
    expect(workflow).toContain("weekly:issue");
    expect(workflow).toContain("weekly-brief");
    expect(workflow).toContain('"$PUBLISH_WEEKLY" == "true"');
    expect(workflow).toContain('"$weekday" == "7"');
    expect(workflow).toContain('"$hour" -ge 20');
    expect(workflow).toContain("gh issue edit");
    expect(workflow).not.toContain("daily:issue");
    expect(workflow).not.toContain("agent-pulse-daily-brief");
  });

  it("states that the current view remains unchanged when no evidence clears the gate", () => {
    const body = renderWeeklyBrief(
      {
        timeline: { events: [] },
        scout: { insights: [] },
        product: { sourceCoverage: { total: 284, active: 18, observing: 31 } },
      },
      "2026-07-19",
    );

    expect(body).toContain("当前判断保持不变");
    expect(body).toContain("周报不为固定频率制造趋势");
  });
});
