import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { seedDatabase } from "../src/db/seed.js";
import type { EventRow } from "../src/db/types.js";
import { buildScoutCard, runScout } from "../src/pipeline/scout.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

const event = {
  title: "A new agent capability ships",
  confidence_score: 82,
  heat_score: 76,
  impact_score: 91,
  value_score: 88,
} as EventRow;

describe("Scout deterministic cards", () => {
  it.each([
    "venture",
    "media",
    "work",
  ] as const)("creates evidence-shaped %s opportunities", (kind) => {
    const card = buildScoutCard(event, kind);
    expect(card.hypothesis.length).toBeGreaterThan(30);
    expect(card.suggested_action).toMatch(/48 小时|工作流/);
    expect(card.artifact_idea.length).toBeGreaterThan(10);
    expect(card.counter_signals).toContain("证据");
    expect(card.total_score).toBeGreaterThan(70);
  });

  it("continues past cooled-down top events until it creates fresh inbox cards", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);

    const first = await runScout(db, 3);
    const second = await runScout(db, 3);

    expect(first.created).toBe(3);
    expect(second.created).toBe(3);
    expect(second.skipped).toBeGreaterThan(0);
    expect(second.scanned).toBeGreaterThan(3);
    expect(
      await db.selectFrom("scout_insights").select("id").where("status", "=", "inbox").execute(),
    ).toHaveLength(6);
  });
});
