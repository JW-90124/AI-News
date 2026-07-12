import { describe, expect, it } from "vitest";
import { activationQualification } from "../src/pipeline/source-operations.js";

describe("source operation readiness", () => {
  it("requires a healthy latest check, 20 healthy checks and seven observation days", () => {
    const now = Date.now();
    const checks = Array.from({ length: 20 }, (_, index) => ({
      status: "healthy",
      finished_at: new Date(now - index * 12 * 60 * 60 * 1_000).toISOString(),
    }));

    expect(activationQualification(checks)).toMatchObject({
      allowed: true,
      healthyChecks: 20,
      observationDays: 9,
      reason: null,
    });
    expect(activationQualification(checks.slice(0, 19))).toMatchObject({
      allowed: false,
      reason: "healthy_checks_below_20",
    });
    const first = checks[0];
    expect(first).toBeDefined();
    if (!first) throw new Error("missing generated source check");
    expect(activationQualification([{ ...first, status: "failed" }, ...checks])).toMatchObject({
      allowed: false,
      reason: "latest_check_not_healthy",
    });
  });
});
