import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readSnapshotFile, writeSnapshotFile } from "../src/pipeline/snapshot-storage.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "snapshot-storage-"));
  roots.push(root);
  const path = join(root, "v1.json");
  const snapshot = {
    schemaVersion: 1,
    sources: [],
    signals: Array.from({ length: 30 }, (_, id) => ({ id, title: "中文证据 🌍".repeat(10) })),
    events: [{ id: "event" }],
  };
  return { path, snapshot, serialized: `${JSON.stringify(snapshot, null, 2)}\n` };
}

describe("snapshot storage", () => {
  it("reads legacy files and preserves missing-file behavior", async () => {
    const { path, serialized } = await fixture();
    expect(await readSnapshotFile(path)).toBe("");
    await writeFile(path, serialized);
    expect(await readSnapshotFile(path)).toBe(serialized);
    expect(await writeSnapshotFile(path, serialized)).toBe(false);
  });

  it("round-trips all rows with bounded UTF-8 parts and deterministic writes", async () => {
    const { path, serialized, snapshot } = await fixture();
    expect(await writeSnapshotFile(path, serialized, 1024)).toBe(true);
    const manifest = JSON.parse(await readFile(path, "utf8"));
    expect(manifest.tables.sources).toEqual([]);
    expect(manifest.tables.signals.length).toBeGreaterThan(1);
    for (const name of await readdir(`${path}.parts`)) {
      expect((await readFile(join(`${path}.parts`, name))).byteLength).toBeLessThanOrEqual(1024);
    }
    expect(JSON.parse(await readSnapshotFile(path))).toEqual(snapshot);
    expect(await readSnapshotFile(path)).toBe(serialized);
    expect(await writeSnapshotFile(path, serialized, 1024)).toBe(false);
  });

  it("rejects missing, corrupt, miscounted and unsafe part references", async () => {
    const { path, serialized } = await fixture();
    await writeSnapshotFile(path, serialized, 1024);
    const manifest = JSON.parse(await readFile(path, "utf8"));
    const part = manifest.tables.signals[0];
    const partPath = join(`${path}.parts`, part.file);
    const original = await readFile(partPath, "utf8");
    await writeFile(partPath, "[]\n");
    await expect(readSnapshotFile(path)).rejects.toThrow("integrity");
    await rm(partPath);
    await expect(readSnapshotFile(path)).rejects.toThrow("ENOENT");
    await writeFile(partPath, original);
    part.count += 1;
    await writeFile(path, JSON.stringify(manifest));
    await expect(readSnapshotFile(path)).rejects.toThrow("count mismatch");
    part.file = "../../outside.json";
    await writeFile(path, JSON.stringify(manifest));
    await expect(readSnapshotFile(path)).rejects.toThrow("Invalid snapshot part reference");
  });

  it("leaves the previous snapshot readable if a record exceeds the cap", async () => {
    const { path, serialized, snapshot } = await fixture();
    await writeSnapshotFile(path, serialized, 1024);
    snapshot.signals.push({ id: 100, title: "x".repeat(2048) });
    await expect(writeSnapshotFile(path, JSON.stringify(snapshot), 1024)).rejects.toThrow(
      "record exceeds",
    );
    expect(await readSnapshotFile(path)).toBe(serialized);
  });

  it("removes obsolete shards only after replacing the entry file", async () => {
    const { path, serialized, snapshot } = await fixture();
    await writeSnapshotFile(path, serialized, 1024);
    const original = await readdir(`${path}.parts`);
    snapshot.signals = [{ id: 99, title: "replacement" }];
    const replacement = `${JSON.stringify(snapshot, null, 2)}\n`;
    expect(await writeSnapshotFile(path, replacement, 1024)).toBe(true);
    expect(await readSnapshotFile(path)).toBe(replacement);
    expect(original.length).toBeGreaterThan(0);
    expect(await readdir(`${path}.parts`)).toEqual([]);
  });
});
