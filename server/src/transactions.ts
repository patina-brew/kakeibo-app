import { Router } from "express";
import type { Db } from "./db.js";
import { isPositiveInt, isTxType, isValidDate, parseIntParam } from "./validation.js";

const SELECT_TX = `
  SELECT t.id, t.type, t.date, t.amount, t.category_id AS categoryId, c.name AS categoryName
  FROM transactions t JOIN categories c ON c.id = t.category_id
`;

interface TxInput {
  type: "expense" | "income";
  date: string;
  amount: number;
  categoryId: number;
}

function validateInput(db: Db, body: unknown): { value: TxInput } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!isTxType(b.type)) return { error: "種別(支出・収入)を指定してください" };
  if (!isValidDate(b.date)) return { error: "日付は YYYY-MM-DD 形式の正しい日付で指定してください" };
  if (!isPositiveInt(b.amount)) return { error: "金額は1以上の整数で指定してください" };
  if (typeof b.categoryId !== "number" || !Number.isInteger(b.categoryId)) {
    return { error: "カテゴリを指定してください" };
  }
  const category = db.prepare("SELECT type FROM categories WHERE id = ?").get(b.categoryId) as
    | { type: string }
    | undefined;
  if (!category) return { error: "指定したカテゴリが存在しません" };
  if (category.type !== b.type) return { error: "カテゴリの種別が収支の種別と一致しません" };
  return { value: { type: b.type, date: b.date, amount: b.amount, categoryId: b.categoryId } };
}

export function transactionsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const { from, to } = req.query;
    if ((from !== undefined && !isValidDate(from)) || (to !== undefined && !isValidDate(to))) {
      res.status(400).json({ error: "from / to は YYYY-MM-DD 形式で指定してください" });
      return;
    }
    const conditions: string[] = [];
    const params: string[] = [];
    if (from !== undefined) {
      conditions.push("t.date >= ?");
      params.push(from as string);
    }
    if (to !== undefined) {
      conditions.push("t.date <= ?");
      params.push(to as string);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = db.prepare(`${SELECT_TX} ${where} ORDER BY t.date, t.id`).all(...params);
    res.json(rows);
  });

  router.post("/", (req, res) => {
    const result = validateInput(db, req.body);
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const { type, date, amount, categoryId } = result.value;
    const info = db
      .prepare("INSERT INTO transactions (type, date, amount, category_id) VALUES (?, ?, ?, ?)")
      .run(type, date, amount, categoryId);
    res.status(201).json(db.prepare(`${SELECT_TX} WHERE t.id = ?`).get(info.lastInsertRowid));
  });

  router.put("/:id", (req, res) => {
    const id = parseIntParam(req.params.id);
    const exists = id === null ? undefined : db.prepare("SELECT 1 FROM transactions WHERE id = ?").get(id);
    if (!exists) {
      res.status(404).json({ error: "収支が見つかりません" });
      return;
    }
    const result = validateInput(db, req.body);
    if ("error" in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const { type, date, amount, categoryId } = result.value;
    db.prepare("UPDATE transactions SET type = ?, date = ?, amount = ?, category_id = ? WHERE id = ?").run(
      type,
      date,
      amount,
      categoryId,
      id,
    );
    res.json(db.prepare(`${SELECT_TX} WHERE t.id = ?`).get(id));
  });

  router.delete("/:id", (req, res) => {
    const id = parseIntParam(req.params.id);
    const info = id === null ? { changes: 0 } : db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
    if (info.changes === 0) {
      res.status(404).json({ error: "収支が見つかりません" });
      return;
    }
    res.status(204).end();
  });

  return router;
}
