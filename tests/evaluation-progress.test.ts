import { describe, expect, it } from "vitest";
import type { EvaluationDimension } from "../src/pipeline/evaluate.js";
import {
  buildSystemEvaluationReport,
  compareSystemEvaluations,
} from "../src/pipeline/evaluation-progress.js";

function dimension(overrides: Partial<EvaluationDimension> = {}): EvaluationDimension {
  return {
    slug: "coverage",
    name: "Coverage",
    score: 60,
    rawScore: 60,
    scoreCap: 100,
    weight: 20,
    status: "measured",
    sampleSize: 100,
    sampleTarget: 100,
    summary: "Measured coverage.",
    evidence: {},
    penalties: [],
    nextAction: "Collect more qualified evidence.",
    ...overrides,
  };
}

function evaluation(dimensions: EvaluationDimension[]) {
  return {
    id: "evaluation",
    releaseVersion: "test",
    status: "partial",
    overallScore: 60,
    rawWeightedScore: 65,
    evidenceCoverage: 50,
    dimensions,
    capabilities: [],
    notes: "Measured evidence only.",
    startedAt: "2026-07-14T00:00:00.000Z",
    finishedAt: "2026-07-14T00:00:01.000Z",
  };
}

describe("system evaluation progress", () => {
  it("ranks the largest weighted evidence gap first", () => {
    const report = buildSystemEvaluationReport(
      evaluation([
        dimension({ slug: "small", name: "Small", score: 70, weight: 10 }),
        dimension({ slug: "large", name: "Large", score: 40, weight: 30 }),
      ]),
    );

    expect(report).toMatchObject({
      schemaVersion: 1,
      target: 80,
      targetReached: false,
      policy: "measured-evidence-only",
    });
    expect(report.improvementPlan.map((item) => item.slug)).toEqual(["large", "small"]);
  });

  it("fails when aggregate evidence or any existing dimension regresses", () => {
    const baseline = buildSystemEvaluationReport(
      evaluation([dimension({ slug: "coverage", score: 60 })]),
    );
    const current = buildSystemEvaluationReport({
      ...evaluation([dimension({ slug: "coverage", score: 59 })]),
      overallScore: 59,
      rawWeightedScore: 64,
      evidenceCoverage: 49,
    });

    expect(compareSystemEvaluations(current, baseline)).toMatchObject({
      passed: false,
      scoreDelta: -1,
      evidenceCoverageDelta: -1,
      regressions: [
        "overall score regressed from 60 to 59",
        "raw weighted score regressed from 65 to 64",
        "evidence coverage regressed from 50% to 49%",
        "dimension coverage regressed from 60 to 59",
      ],
    });
  });

  it("passes stable scores and allows a newly measured dimension", () => {
    const baseline = buildSystemEvaluationReport(
      evaluation([dimension({ slug: "coverage", score: 60 })]),
    );
    const current = buildSystemEvaluationReport(
      evaluation([
        dimension({ slug: "coverage", score: 60 }),
        dimension({ slug: "new-evidence", score: 30, status: "insufficient_data" }),
      ]),
    );

    expect(compareSystemEvaluations(current, baseline)).toMatchObject({
      passed: true,
      scoreDelta: 0,
      regressions: [],
    });
  });
});
