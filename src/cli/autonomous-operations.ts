import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/env.js";
import { createDatabase } from "../db/database.js";
import { migrateToLatest } from "../db/migrate.js";
import { reconcileSourcePortfolio, triageSourceRadar } from "../pipeline/autonomous-operations.js";

export async function runAutonomousOperations(): Promise<void> {
  const config = loadConfig();
  const db = createDatabase(config);
  try {
    await migrateToLatest(db, config);
    const sourcePortfolio = await reconcileSourcePortfolio(db);
    const sourceRadar = await triageSourceRadar(db);
    console.log(JSON.stringify({ sourcePortfolio, sourceRadar }, null, 2));
  } finally {
    await db.destroy();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) await runAutonomousOperations();
