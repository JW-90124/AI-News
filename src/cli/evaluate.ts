import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { evaluateSystem } from "../pipeline/evaluate.js";

export async function runEvaluateCli(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);
    const evaluation = await evaluateSystem(db);
    console.log(
      JSON.stringify(
        {
          ...evaluation,
          target: 80,
          targetReached: evaluation.overallScore >= 80,
          policy: "measured-evidence-only",
        },
        null,
        2,
      ),
    );
  } finally {
    await db.destroy();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runEvaluateCli();
