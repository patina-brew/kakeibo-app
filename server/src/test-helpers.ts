import request from "supertest";
import { createApp } from "./app.js";
import { openDb } from "./db.js";

export function setup() {
  const db = openDb(":memory:");
  const app = createApp(db);
  return { db, app, api: request(app) };
}

export async function categoryId(
  api: ReturnType<typeof request>,
  type: "expense" | "income",
  name: string,
): Promise<number> {
  const res = await api.get("/api/categories").query({ type });
  return res.body.find((c: { name: string }) => c.name === name).id;
}
