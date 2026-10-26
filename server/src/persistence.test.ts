import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { openDb } from "./db.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("persistence", () => {
  it("keeps transactions after the database is reopened", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kakeibo-"));
    dirs.push(dir);
    const path = join(dir, "test.db");

    const db1 = openDb(path);
    const api1 = request(createApp(db1));
    const categories = await api1.get("/api/categories").query({ type: "expense" });
    await api1
      .post("/api/transactions")
      .send({ type: "expense", date: "2026-10-26", amount: 1200, categoryId: categories.body[0].id });
    db1.close();

    const db2 = openDb(path);
    const res = await request(createApp(db2)).get("/api/transactions");
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ date: "2026-10-26", amount: 1200 });
    const cats = await request(createApp(db2)).get("/api/categories");
    expect(cats.body).toHaveLength(10);
    db2.close();
  });
});
