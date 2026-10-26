import { describe, expect, it } from "vitest";
import { categoryId, setup } from "./test-helpers.js";

describe("categories API", () => {
  it("lists default categories by type", async () => {
    const { api } = setup();
    const expense = await api.get("/api/categories").query({ type: "expense" });
    const income = await api.get("/api/categories").query({ type: "income" });
    expect(expense.body.map((c: { name: string }) => c.name)).toContain("食費");
    expect(income.body.map((c: { name: string }) => c.name)).toContain("給与");
    expect(income.body.map((c: { name: string }) => c.name)).not.toContain("食費");
  });

  it("rejects an invalid type filter", async () => {
    const { api } = setup();
    expect((await api.get("/api/categories").query({ type: "x" })).status).toBe(400);
  });

  it("adds a category", async () => {
    const { api } = setup();
    const res = await api.post("/api/categories").send({ type: "expense", name: " 趣味 " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("趣味");
    const list = await api.get("/api/categories").query({ type: "expense" });
    expect(list.body.map((c: { name: string }) => c.name)).toContain("趣味");
  });

  it("rejects duplicate names within the same type with 409", async () => {
    const { api } = setup();
    const res = await api.post("/api/categories").send({ type: "expense", name: "食費" });
    expect(res.status).toBe(409);
  });

  it("allows the same name in a different type", async () => {
    const { api } = setup();
    // 「その他」は支出・収入の両方に初期カテゴリとして存在する
    const res = await api.post("/api/categories").send({ type: "income", name: "副業" });
    expect(res.status).toBe(201);
  });

  it("rejects empty names and invalid types with 400", async () => {
    const { api } = setup();
    expect((await api.post("/api/categories").send({ type: "expense", name: "  " })).status).toBe(400);
    expect((await api.post("/api/categories").send({ type: "x", name: "a" })).status).toBe(400);
  });

  it("renames a category and reflects it in existing transactions", async () => {
    const { api } = setup();
    const id = await categoryId(api, "expense", "食費");
    await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 500, categoryId: id });
    const res = await api.put(`/api/categories/${id}`).send({ name: "食事" });
    expect(res.status).toBe(200);
    const list = await api.get("/api/transactions");
    expect(list.body[0].categoryName).toBe("食事");
  });

  it("rejects renaming to an existing name with 409 and unknown id with 404", async () => {
    const { api } = setup();
    const id = await categoryId(api, "expense", "食費");
    expect((await api.put(`/api/categories/${id}`).send({ name: "日用品" })).status).toBe(409);
    expect((await api.put("/api/categories/9999").send({ name: "x" })).status).toBe(404);
  });

  it("refuses to delete a category in use with 409", async () => {
    const { api } = setup();
    const id = await categoryId(api, "expense", "食費");
    await api.post("/api/transactions").send({ type: "expense", date: "2026-10-26", amount: 500, categoryId: id });
    expect((await api.delete(`/api/categories/${id}`)).status).toBe(409);
  });

  it("deletes an unused category", async () => {
    const { api } = setup();
    const id = await categoryId(api, "expense", "娯楽");
    expect((await api.delete(`/api/categories/${id}`)).status).toBe(204);
    const list = await api.get("/api/categories").query({ type: "expense" });
    expect(list.body.map((c: { name: string }) => c.name)).not.toContain("娯楽");
    expect((await api.delete(`/api/categories/${id}`)).status).toBe(404);
  });
});
