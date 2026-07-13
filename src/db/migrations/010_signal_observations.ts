import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("signal_observations")
    .ifNotExists()
    .addColumn("signal_id", "varchar(36)", (column) =>
      column.notNull().references("signals.id").onDelete("cascade"),
    )
    .addColumn("source_id", "varchar(36)", (column) =>
      column.notNull().references("sources.id").onDelete("cascade"),
    )
    .addColumn("external_id", "varchar(255)")
    .addColumn("observed_url", "varchar(2000)", (column) => column.notNull())
    .addColumn("first_seen_at", "varchar(40)", (column) => column.notNull())
    .addColumn("last_seen_at", "varchar(40)", (column) => column.notNull())
    .addColumn("observation_count", "integer", (column) => column.notNull().defaultTo(1))
    .addPrimaryKeyConstraint("signal_observations_pk", ["signal_id", "source_id"])
    .execute();
  await db.schema
    .createIndex("signal_observations_source_idx")
    .ifNotExists()
    .on("signal_observations")
    .columns(["source_id", "last_seen_at"])
    .execute();

  await sql`
    insert into signal_observations (
      signal_id, source_id, external_id, observed_url,
      first_seen_at, last_seen_at, observation_count
    )
    select id, source_id, external_id, canonical_url, created_at, updated_at, 1
    from signals
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("signal_observations_source_idx").ifExists().execute();
  await db.schema.dropTable("signal_observations").ifExists().execute();
}
