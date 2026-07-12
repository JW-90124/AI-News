/**
 * Auto-activate shadow sources that are ready for production.
 *
 * Batch-activates shadow sources that satisfy the reviewed qualification
 * policy: healthy latest check, 20 healthy checks and a 7-day window.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { reconcileAutoActivations } from "../pipeline/activation-audit.js";

export async function runAutoActivate(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);
    console.log(JSON.stringify(await reconcileAutoActivations(db), null, 2));
  } finally {
    await db.destroy();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runAutoActivate();
