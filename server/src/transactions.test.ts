import { describe, expect, it } from "vitest";
import { categoryId, setup } from "./test-helpers.js";

describe("transactions API", () => {
  it("creates an expense and an income", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    const salary = await categoryId(api, "income", "給与");
    const a = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 1200, categoryId: food });
    expect(a.status).toBe(201);
    expect(a.body).toMatchObject({ type: "expense", date: "2026-10-26", amount: 1200, categoryName: "食費" });
    const b = await api.post("/api/transactions").send({ type: "income", date: "2026-10-25", amount: 250000, categoryId: salary });
    expect(b.status).toBe(201);
    expect(b.body.type).toBe("income");
  });

  it("rejects invalid amounts", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    for (const amount of [0, -1, 1.5, "100", null]) {
      const res = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount, categoryId: food });
      expect(res.status).toBe(400);
    }
  });

  it("rejects missing or invalid fields", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    const base = { type: "expense", date: "2026-10-26", amount: 100, categoryId: food };
    for (const patch of [
      { type: undefined },
      { type: "x" },
      { date: undefined },
      { date: "2026-02-30" },
      { date: "2026/10/26" },
      { categoryId: undefined },
      { categoryId: 9999 },
    ]) {
      const res = await api.post("/api/transactions").send({ ...base, ...patch });
      expect(res.status).toBe(400);
    }
  });

  it("rejects a category whose type differs from the transaction type", async () => {
    const { api } = setup();
    const salary = await categoryId(api, "income", "給与");
    const res = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 100, categoryId: salary });
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const { api } = setup();
    const res = await api.post("/api/transactions").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
  });

  it("updates amount and date", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    const created = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 1200, categoryId: food });
    const res = await api
      .put(`/api/transactions/${created.body.id}`)
      .send({ type: "expense", date: "2026-10-27", amount: 1500, categoryId: food });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ date: "2026-10-27", amount: 1500 });
    const old = await api.get("/api/transactions").query({ from: "2026-10-26", to: "2026-10-26" });
    expect(old.body).toHaveLength(0);
  });

  it("returns 404 when updating or deleting a missing transaction", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    const body = { type: "expense", date: "2026-10-26", amount: 100, categoryId: food };
    expect((await api.put("/api/transactions/999").send(body)).status).toBe(404);
    expect((await api.delete("/api/transactions/999")).status).toBe(404);
  });

  it("deletes a transaction", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    const created = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 100, categoryId: food });
    expect((await api.delete(`/api/transactions/${created.body.id}`)).status).toBe(204);
    expect((await api.get("/api/transactions")).body).toHaveLength(0);
  });

  it("filters by date range (inclusive) and sorts by date then id", async () => {
    const { api } = setup();
    const food = await categoryId(api, "expense", "食費");
    for (const date of ["2026-10-31", "2026-10-01", "2026-11-01", "2026-10-01"]) {
      await api.post("/api/transactions").send({ type: "expense", date, amount: 100, categoryId: food });
    }
    const res = await api.get("/api/transactions").query({ from: "2026-10-01", to: "2026-10-31" });
    expect(res.body.map((t: { date: string }) => t.date)).toEqual(["2026-10-01", "2026-10-01", "2026-10-31"]);
    expect(res.body[0].id).toBeLessThan(res.body[1].id);
    const all = await api.get("/api/transactions");
    expect(all.body).toHaveLength(4);
  });

  it("rejects an invalid date range", async () => {
    const { api } = setup();
    expect((await api.get("/api/transactions").query({ from: "bad" })).status).toBe(400);
  });
});
