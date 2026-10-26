import { describe, expect, it } from "vitest";
import { migrate, openDb } from "./db.js";

describe("db migration", () => {
  it("creates tables, indexes and foreign keys", () => {
    const db = openDb(":memory:");
    const names = (
      db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','index')").all() as {
        name: string;
      }[]
    ).map((r) => r.name);
    expect(names).toContain("categories");
    expect(names).toContain("transactions");
    expect(names).toContain("idx_transactions_date");
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
  });

  it("rejects non-positive amounts", () => {
    const db = openDb(":memory:");
    const insert = db.prepare(
      "INSERT INTO transactions (type, date, amount, category_id) VALUES ('expense', '2026-10-26', ?, 1)",
    );
    expect(() => insert.run(0)).toThrow();
    expect(() => insert.run(-5)).toThrow();
  });

  it("seeds default categories once", () => {
    const db = openDb(":memory:");
    const count = () =>
      (db.prepare("SELECT COUNT(*) AS c FROM categories").get() as { c: number }).c;
    expect(count()).toBe(10);
    db.prepare("DELETE FROM categories").run();
    // 再度マイグレーションしても初期カテゴリは復活しない
    migrate(db);
    expect(count()).toBe(0);
  });
});
