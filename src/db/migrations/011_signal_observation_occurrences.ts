import type { Kysely } from "kysely";

interface ObservationMigrationSchema {
  signal_observations: {
    signal_id: string;
    source_id: string;
    last_seen_at: string;
    observation_count: number;
  };
  signal_observation_occurrences: {
    id: string;
    signal_id: string;
    source_id: string;
    observed_at: string;
    count_delta: number;
  };
}

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("signal_observation_occurrences")
    .ifNotExists()
    .addColumn("id", "varchar(100)", (column) => column.primaryKey())
    .addColumn("signal_id", "varchar(36)", (column) =>
      column.notNull().references("signals.id").onDelete("cascade"),
    )
    .addColumn("source_id", "varchar(36)", (column) =>
      column.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("observed_at", "varchar(40)", (column) => column.notNull())
    .addColumn("count_delta", "integer", (column) => column.notNull().defaultTo(1))
    .execute();
  await db.schema
    .createIndex("signal_observation_occurrences_signal_source_idx")
    .ifNotExists()
    .on("signal_observation_occurrences")
    .columns(["signal_id", "source_id"])
    .execute();

  const typed = db as unknown as Kysely<ObservationMigrationSchema>;
  const observations = await typed.selectFrom("signal_observations").selectAll().execute();
  for (let offset = 0; offset < observations.length; offset += 200) {
    const batch = observations.slice(offset, offset + 200);
    await typed
      .insertInto("signal_observation_occurrences")
      .values(
        batch.map((observation) => ({
          id: `baseline:${observation.signal_id}:${observation.source_id}`,
          signal_id: observation.signal_id,
          source_id: observation.source_id,
          observed_at: observation.last_seen_at,
          count_delta: observation.observation_count,
        })),
      )
      .execute();
  }
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .dropIndex("signal_observation_occurrences_signal_source_idx")
    .ifExists()
    .execute();
  await db.schema.dropTable("signal_observation_occurrences").ifExists().execute();
}
