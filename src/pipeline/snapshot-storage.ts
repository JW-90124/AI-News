import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { sha256 } from "../domain/url.js";

export const SNAPSHOT_PART_BYTES = 8 * 1024 * 1024;
const FORMAT = "agent-pulse-snapshot-shards-v1";
const PART_NAME = /^[a-f0-9]{64}\.json$/;

interface Part {
  file: string;
  sha256: string;
  count: number;
}

interface Manifest {
  format: typeof FORMAT;
  schemaVersion: number;
  tables: Record<string, Part[]>;
}

// Only a missing entry file means "no snapshot". Missing shards must fail closed.
export async function readSnapshotFile(path: string): Promise<string> {
  const serialized = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (!serialized) return "";
  const value = JSON.parse(serialized);
  if (!Object.hasOwn(value, "format")) return serialized;
  if (
    value.format !== FORMAT ||
    !Number.isInteger(value.schemaVersion) ||
    !value.tables ||
    typeof value.tables !== "object" ||
    Array.isArray(value.tables)
  ) {
    throw new Error("Invalid snapshot manifest");
  }
  const manifest = value as Manifest;
  const snapshot: Record<string, unknown> = { schemaVersion: manifest.schemaVersion };
  for (const [table, parts] of Object.entries(manifest.tables)) {
    assertTableName(table);
    if (!Array.isArray(parts)) throw new Error("Invalid snapshot parts");
    const rows: unknown[] = [];
    for (const part of parts) {
      if (
        !part ||
        typeof part.file !== "string" ||
        !PART_NAME.test(part.file) ||
        part.file !== `${part.sha256}.json` ||
        !Number.isSafeInteger(part.count) ||
        part.count < 0
      ) {
        throw new Error("Invalid snapshot part reference");
      }
      const content = await readFile(join(`${path}.parts`, part.file), "utf8");
      if (Buffer.byteLength(content) > SNAPSHOT_PART_BYTES || sha256(content) !== part.sha256) {
        throw new Error(`Snapshot part integrity check failed: ${part.file}`);
      }
      const records: unknown = JSON.parse(content);
      if (!Array.isArray(records) || records.length !== part.count) {
        throw new Error(`Snapshot part count mismatch: ${part.file}`);
      }
      for (const row of records) rows.push(row);
    }
    snapshot[table] = rows;
  }
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export async function writeSnapshotFile(
  path: string,
  serialized: string,
  maxPartBytes = SNAPSHOT_PART_BYTES,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(maxPartBytes) ||
    maxPartBytes < 8 ||
    maxPartBytes > SNAPSHOT_PART_BYTES
  ) {
    throw new Error("Invalid snapshot part byte limit");
  }
  const files = new Map<string, string>();
  let entry = serialized;
  if (Buffer.byteLength(serialized) > maxPartBytes) {
    const snapshot = JSON.parse(serialized) as Record<string, unknown>;
    if (!Number.isInteger(snapshot.schemaVersion))
      throw new Error("Invalid snapshot schema version");
    const manifest: Manifest = {
      format: FORMAT,
      schemaVersion: snapshot.schemaVersion as number,
      tables: {},
    };
    for (const [table, records] of Object.entries(snapshot)) {
      if (table === "schemaVersion") continue;
      assertTableName(table);
      if (!Array.isArray(records)) throw new Error(`Invalid snapshot table: ${table}`);
      const parts: Part[] = [];
      let rows: string[] = [];
      let bytes = 5; // Opening and closing brackets, newlines.
      const flush = () => {
        if (!rows.length) return;
        const content = `[\n${rows.join(",\n")}\n]\n`;
        const hash = sha256(content);
        const file = `${hash}.json`;
        files.set(file, content);
        parts.push({ file, sha256: hash, count: rows.length });
        rows = [];
        bytes = 5;
      };
      for (const record of records) {
        const row = JSON.stringify(record, null, 2);
        const size = Buffer.byteLength(row);
        if (size + 5 > maxPartBytes)
          throw new Error(`Snapshot record exceeds byte limit: ${table}`);
        if (bytes + size + (rows.length ? 2 : 0) > maxPartBytes) flush();
        bytes += size + (rows.length ? 2 : 0);
        rows.push(row);
      }
      flush();
      manifest.tables[table] = parts;
    }
    entry = `${JSON.stringify(manifest, null, 2)}\n`;
  }
  if (Buffer.byteLength(entry) > SNAPSHOT_PART_BYTES)
    throw new Error("Snapshot manifest exceeds byte limit");
  // Content-addressed parts keep the previous manifest valid until the final rename.
  for (const [file, content] of files) await atomicWrite(join(`${path}.parts`, file), content);
  const changed = await atomicWrite(path, entry);
  const oldFiles = await readdir(`${path}.parts`).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const file of oldFiles) {
    if (PART_NAME.test(file) && !files.has(file)) await rm(join(`${path}.parts`, file));
  }
  return changed;
}

function assertTableName(table: string) {
  if (
    !/^[a-z][a-zA-Z]*$/.test(table) ||
    ["schemaVersion", "format", "constructor", "prototype"].includes(table)
  ) {
    throw new Error("Invalid snapshot table name");
  }
}

async function atomicWrite(path: string, content: string): Promise<boolean> {
  const previous = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  if (previous === content) return false;
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.tmp`);
  await writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
  await rename(temporary, path);
  return true;
}
