import { describe, expect, it } from "vitest";
import { categoryId, setup } from "./test-helpers.js";

async function add(
  api: ReturnType<typeof setup>["api"],
  type: "expense" | "income",
  date: string,
  amount: number,
) {
  const id = await categoryId(api, type, type === "expense" ? "食費" : "給与");
  const res = await api.post("/api/transactions").send({ type, date, amount, categoryId: id });
  expect(res.status).toBe(201);
}

describe("monthly summary", () => {
  it("totals expense, income and balance", async () => {
    const { api } = setup();
    await add(api, "expense", "2026-10-01", 10000);
    await add(api, "expense", "2026-10-31", 20000);
    await add(api, "income", "2026-10-25", 250000);
    await add(api, "expense", "2026-11-01", 999);
    await add(api, "expense", "2026-09-30", 999);
    const res = await api.get("/api/summary/monthly").query({ year: 2026, month: 10 });
    expect(res.body).toEqual({ year: 2026, month: 10, expense: 30000, income: 250000, balance: 220000 });
  });

  it("reports a negative balance", async () => {
    const { api } = setup();
    await add(api, "expense", "2026-10-05", 5000);
    await add(api, "income", "2026-10-06", 1000);
    const res = await api.get("/api/summary/monthly").query({ year: 2026, month: 10 });
    expect(res.body.balance).toBe(-4000);
  });

  it("returns zeros for a month with no transactions", async () => {
    const { api } = setup();
    const res = await api.get("/api/summary/monthly").query({ year: 2026, month: 5 });
    expect(res.body).toEqual({ year: 2026, month: 5, expense: 0, income: 0, balance: 0 });
  });

  it("validates parameters", async () => {
    const { api } = setup();
    expect((await api.get("/api/summary/monthly").query({ year: 2026, month: 13 })).status).toBe(400);
    expect((await api.get("/api/summary/monthly").query({ year: "x", month: 1 })).status).toBe(400);
    expect((await api.get("/api/summary/monthly")).status).toBe(400);
  });

  it("reflects edits and deletions", async () => {
    const { api } = setup();
    const id = await categoryId(api, "expense", "食費");
    const created = await api.post("/api/transactions").send({ type: "expense", date: "2026-10-05", amount: 100, categoryId: id });
    await api.put(`/api/transactions/${created.body.id}`).send({ type: "expense", date: "2026-10-05", amount: 300, categoryId: id });
    expect((await api.get("/api/summary/monthly").query({ year: 2026, month: 10 })).body.expense).toBe(300);
    await api.delete(`/api/transactions/${created.body.id}`);
    expect((await api.get("/api/summary/monthly").query({ year: 2026, month: 10 })).body.expense).toBe(0);
  });
});

describe("yearly summary", () => {
  it("assigns 12/31 and 1/1 to different years", async () => {
    const { api } = setup();
    await add(api, "expense", "2026-12-31", 100);
    await add(api, "expense", "2027-01-01", 200);
    const y2026 = await api.get("/api/summary/yearly").query({ year: 2026 });
    const y2027 = await api.get("/api/summary/yearly").query({ year: 2027 });
    expect(y2026.body.expense).toBe(100);
    expect(y2027.body.expense).toBe(200);
  });

  it("returns 12 monthly rows from January to December", async () => {
    const { api } = setup();
    await add(api, "income", "2026-01-10", 1000);
    await add(api, "expense", "2026-12-15", 400);
    const res = await api.get("/api/summary/yearly").query({ year: 2026 });
    expect(res.body.months).toHaveLength(12);
    expect(res.body.months[0]).toMatchObject({ year: 2026, month: 1, income: 1000, balance: 1000 });
    expect(res.body.months[11]).toMatchObject({ year: 2026, month: 12, expense: 400, balance: -400 });
    expect(res.body).toMatchObject({ year: 2026, income: 1000, expense: 400, balance: 600 });
  });

  it("validates the year", async () => {
    const { api } = setup();
    expect((await api.get("/api/summary/yearly")).status).toBe(400);
  });
});
