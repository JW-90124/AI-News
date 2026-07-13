import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/db/database.js";
import { migrateToLatest } from "../src/db/migrate.js";
import { Repository } from "../src/db/repository.js";
import { seedDatabase } from "../src/db/seed.js";
import { planSourceCollection } from "../src/pipeline/collect.js";

const databases: ReturnType<typeof createDatabase>[] = [];

afterEach(async () => {
  while (databases.length) await databases.pop()?.destroy();
});

describe("collection scope", () => {
  it("plans every catalog source as selected or explicitly skipped without bypassing policy", async () => {
    const config = loadConfig({ NODE_ENV: "test", DATABASE_URL: "sqlite::memory:" });
    const db = createDatabase(config);
    databases.push(db);
    await migrateToLatest(db, config);
    await seedDatabase(db);
    const sources = await new Repository(db).listSources();

    const plan = planSourceCollection(sources, "all", false);
    const skipped = Object.values(plan.summary.skippedByReason).reduce(
      (total, count) => total + count,
      0,
    );
    expect(plan.summary.total).toBe(sources.length);
    expect(plan.summary.selected + skipped).toBe(sources.length);
    expect(plan.sources.every((source) => source.adapter !== "manual")).toBe(true);
    expect(
      plan.sources.every(
        (source) => !["manual", "restricted", "proposal"].includes(source.maintenance_status),
      ),
    ).toBe(true);
    expect(plan.summary.skippedByReason["maintenance:manual"]).toBeGreaterThan(0);
    expect(plan.summary.skippedByReason["maintenance:restricted"]).toBeGreaterThan(0);
  });
});
