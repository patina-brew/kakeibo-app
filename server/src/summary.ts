import { Router } from "express";
import type { Db } from "./db.js";
import { pad2, parseIntParam } from "./validation.js";

interface Totals {
  expense: number;
  income: number;
  balance: number;
}

function totalsBetween(db: Db, from: string, to: string): Totals {
  const rows = db
    .prepare("SELECT type, SUM(amount) AS total FROM transactions WHERE date >= ? AND date <= ? GROUP BY type")
    .all(from, to) as { type: string; total: number }[];
  const expense = rows.find((r) => r.type === "expense")?.total ?? 0;
  const income = rows.find((r) => r.type === "income")?.total ?? 0;
  return { expense, income, balance: income - expense };
}

export function summaryRouter(db: Db): Router {
  const router = Router();

  router.get("/monthly", (req, res) => {
    const year = parseIntParam(req.query.year);
    const month = parseIntParam(req.query.month);
    if (year === null || year < 1000 || year > 9999 || month === null || month < 1 || month > 12) {
      res.status(400).json({ error: "year と month(1〜12)を指定してください" });
      return;
    }
    const prefix = `${year}-${pad2(month)}`;
    res.json({ year, month, ...totalsBetween(db, `${prefix}-01`, `${prefix}-31`) });
  });

  // 年度は year-04-01 〜 (year+1)-03-31
  router.get("/fiscal-year", (req, res) => {
    const year = parseIntParam(req.query.year);
    if (year === null || year < 1000 || year > 9998) {
      res.status(400).json({ error: "year を指定してください" });
      return;
    }
    const months = [];
    for (let i = 0; i < 12; i++) {
      const m = ((3 + i) % 12) + 1;
      const y = m >= 4 ? year : year + 1;
      const prefix = `${y}-${pad2(m)}`;
      months.push({ year: y, month: m, ...totalsBetween(db, `${prefix}-01`, `${prefix}-31`) });
    }
    const total = totalsBetween(db, `${year}-04-01`, `${year + 1}-03-31`);
    res.json({ year, ...total, months });
  });

  return router;
}
