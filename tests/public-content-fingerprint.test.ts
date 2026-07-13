import { describe, expect, it } from "vitest";
import { fingerprintPublicContent } from "../src/cli/public-content-fingerprint.js";

describe("public content fingerprint", () => {
  it("ignores export and source-check timestamps", () => {
    const first = fingerprintPublicContent([
      {
        generatedAt: "2026-07-13T00:00:00Z",
        events: [{ slug: "shift", title: "Material shift" }],
        source: { lastCheckedAt: "2026-07-13T00:00:00Z", latestItemAt: "2026-07-12" },
      },
      { evaluation: { finishedAt: "2026-07-13T00:00:00Z", overallScore: 80 } },
    ]);
    const second = fingerprintPublicContent([
      {
        source: { latestItemAt: "2026-07-13", lastCheckedAt: "2026-07-13T04:00:00Z" },
        events: [{ title: "Material shift", slug: "shift" }],
        generatedAt: "2026-07-13T04:00:00Z",
      },
      { evaluation: { overallScore: 80, finishedAt: "2026-07-13T04:00:00Z" } },
    ]);

    expect(second).toBe(first);
  });

  it("changes when public meaning changes", () => {
    const first = fingerprintPublicContent([{ events: [{ title: "Original view" }] }]);
    const second = fingerprintPublicContent([{ events: [{ title: "Updated view" }] }]);

    expect(second).not.toBe(first);
  });
});
