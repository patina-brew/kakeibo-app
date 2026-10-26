import { Router } from "express";
import type { Db } from "./db.js";
import { isTxType, parseIntParam } from "./validation.js";

const MAX_NAME_LENGTH = 30;

interface CategoryRow {
  id: number;
  type: string;
  name: string;
}

function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

export function categoriesRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const { type } = req.query;
    if (type !== undefined && !isTxType(type)) {
      res.status(400).json({ error: "種別が不正です" });
      return;
    }
    const rows = type
      ? db.prepare("SELECT id, type, name FROM categories WHERE type = ? ORDER BY id").all(type)
      : db.prepare("SELECT id, type, name FROM categories ORDER BY type, id").all();
    res.json(rows);
  });

  router.post("/", (req, res) => {
    const { type } = req.body ?? {};
    const name = parseName(req.body?.name);
    if (!isTxType(type)) {
      res.status(400).json({ error: "種別が不正です" });
      return;
    }
    if (name === null) {
      res.status(400).json({ error: `カテゴリ名は1〜${MAX_NAME_LENGTH}文字で入力してください` });
      return;
    }
    const exists = db.prepare("SELECT 1 FROM categories WHERE type = ? AND name = ?").get(type, name);
    if (exists) {
      res.status(409).json({ error: "同じ名前のカテゴリがすでにあります" });
      return;
    }
    const info = db.prepare("INSERT INTO categories (type, name) VALUES (?, ?)").run(type, name);
    res.status(201).json({ id: Number(info.lastInsertRowid), type, name });
  });

  router.put("/:id", (req, res) => {
    const id = parseIntParam(req.params.id);
    const category = id === null ? undefined : (db.prepare("SELECT id, type, name FROM categories WHERE id = ?").get(id) as CategoryRow | undefined);
    if (!category) {
      res.status(404).json({ error: "カテゴリが見つかりません" });
      return;
    }
    const name = parseName(req.body?.name);
    if (name === null) {
      res.status(400).json({ error: `カテゴリ名は1〜${MAX_NAME_LENGTH}文字で入力してください` });
      return;
    }
    const duplicate = db
      .prepare("SELECT 1 FROM categories WHERE type = ? AND name = ? AND id <> ?")
      .get(category.type, name, category.id);
    if (duplicate) {
      res.status(409).json({ error: "同じ名前のカテゴリがすでにあります" });
      return;
    }
    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name, category.id);
    res.json({ id: category.id, type: category.type, name });
  });

  router.delete("/:id", (req, res) => {
    const id = parseIntParam(req.params.id);
    const category = id === null ? undefined : db.prepare("SELECT id FROM categories WHERE id = ?").get(id);
    if (!category || id === null) {
      res.status(404).json({ error: "カテゴリが見つかりません" });
      return;
    }
    const used = db.prepare("SELECT 1 FROM transactions WHERE category_id = ? LIMIT 1").get(id);
    if (used) {
      res.status(409).json({ error: "収支で使用中のカテゴリは削除できません" });
      return;
    }
    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    res.status(204).end();
  });

  return router;
}
