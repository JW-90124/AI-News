import type { EvaluationDimension } from "./evaluate.js";

export const SYSTEM_EVALUATION_SCHEMA_VERSION = 1;
export const SYSTEM_EVALUATION_TARGET = 80;

export interface EvaluationResult {
  id: string;
  releaseVersion: string;
  status: string;
  overallScore: number;
  rawWeightedScore: number;
  evidenceCoverage: number;
  dimensions: EvaluationDimension[];
  capabilities: readonly unknown[];
  notes: string;
  startedAt: string;
  finishedAt: string;
}

export interface EvaluationImprovement {
  slug: string;
  name: string;
  score: number;
  status: EvaluationDimension["status"];
  weightedGap: number;
  penalties: string[];
  nextAction: string;
}

export interface SystemEvaluationReport extends EvaluationResult {
  schemaVersion: number;
  target: number;
  targetReached: boolean;
  policy: "measured-evidence-only";
  improvementPlan: EvaluationImprovement[];
}

export interface EvaluationComparison {
  passed: boolean;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  baselineEvidenceCoverage: number;
  currentEvidenceCoverage: number;
  evidenceCoverageDelta: number;
  regressions: string[];
}

export function buildSystemEvaluationReport(evaluation: EvaluationResult): SystemEvaluationReport {
  const totalWeight = evaluation.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const improvementPlan = evaluation.dimensions
    .map((dimension) => ({
      slug: dimension.slug,
      name: dimension.name,
      score: dimension.score,
      status: dimension.status,
      weightedGap: Math.round(
        (Math.max(0, SYSTEM_EVALUATION_TARGET - dimension.score) * dimension.weight) /
          Math.max(1, totalWeight),
      ),
      penalties: [...dimension.penalties],
      nextAction: dimension.nextAction,
    }))
    .filter((item) => item.weightedGap > 0 || item.status === "insufficient_data")
    .sort(
      (left, right) =>
        right.weightedGap - left.weightedGap ||
        left.score - right.score ||
        left.slug.localeCompare(right.slug),
    );
  return {
    schemaVersion: SYSTEM_EVALUATION_SCHEMA_VERSION,
    ...evaluation,
    target: SYSTEM_EVALUATION_TARGET,
    targetReached: evaluation.overallScore >= SYSTEM_EVALUATION_TARGET,
    policy: "measured-evidence-only",
    improvementPlan,
  };
}

export function compareSystemEvaluations(
  current: SystemEvaluationReport,
  baseline: SystemEvaluationReport,
): EvaluationComparison {
  const regressions: string[] = [];
  if (current.overallScore < baseline.overallScore) {
    regressions.push(
      `overall score regressed from ${baseline.overallScore} to ${current.overallScore}`,
    );
  }
  if (current.rawWeightedScore < baseline.rawWeightedScore) {
    regressions.push(
      `raw weighted score regressed from ${baseline.rawWeightedScore} to ${current.rawWeightedScore}`,
    );
  }
  if (current.evidenceCoverage < baseline.evidenceCoverage) {
    regressions.push(
      `evidence coverage regressed from ${baseline.evidenceCoverage}% to ${current.evidenceCoverage}%`,
    );
  }
  const currentBySlug = new Map(current.dimensions.map((dimension) => [dimension.slug, dimension]));
  for (const previous of baseline.dimensions) {
    const next = currentBySlug.get(previous.slug);
    if (!next) {
      regressions.push(`evaluation dimension removed: ${previous.slug}`);
      continue;
    }
    if (next.score < previous.score) {
      regressions.push(
        `dimension ${previous.slug} regressed from ${previous.score} to ${next.score}`,
      );
    }
  }
  return {
    passed: regressions.length === 0,
    baselineScore: baseline.overallScore,
    currentScore: current.overallScore,
    scoreDelta: current.overallScore - baseline.overallScore,
    baselineEvidenceCoverage: baseline.evidenceCoverage,
    currentEvidenceCoverage: current.evidenceCoverage,
    evidenceCoverageDelta: current.evidenceCoverage - baseline.evidenceCoverage,
    regressions,
  };
}

export function renderEvaluationSummary(
  report: SystemEvaluationReport,
  comparison: EvaluationComparison | null,
): string {
  const delta = comparison
    ? `${comparison.scoreDelta >= 0 ? "+" : ""}${comparison.scoreDelta}`
    : "n/a";
  const lines = [
    "## System Capability Evaluation",
    "",
    `- Score: ${report.overallScore} / 100 (target ${report.target}, delta ${delta})`,
    `- Raw weighted score: ${report.rawWeightedScore} / 100`,
    `- Evidence coverage: ${report.evidenceCoverage}%`,
    `- Regression gate: ${comparison ? (comparison.passed ? "passed" : "failed") : "baseline unavailable"}`,
    "",
    "### Highest-priority evidence gaps",
    "",
    "| Dimension | Score | Weighted gap | Next action |",
    "| --- | ---: | ---: | --- |",
    ...report.improvementPlan
      .slice(0, 5)
      .map(
        (item) =>
          `| ${summaryCell(item.name)} | ${item.score} | ${item.weightedGap} | ${summaryCell(item.nextAction)} |`,
      ),
  ];
  if (comparison && !comparison.passed) {
    lines.push("", "### Regressions", "", ...comparison.regressions.map((item) => `- ${item}`));
  }
  return `${lines.join("\n")}\n`;
}

function summaryCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
