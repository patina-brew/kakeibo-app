import express, { type ErrorRequestHandler } from "express";
import { categoriesRouter } from "./categories.js";
import type { Db } from "./db.js";
import { summaryRouter } from "./summary.js";
import { transactionsRouter } from "./transactions.js";

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/categories", categoriesRouter(db));
  app.use("/api/transactions", transactionsRouter(db));
  app.use("/api/summary", summaryRouter(db));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: "リクエストの形式が不正です" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "サーバーエラーが発生しました" });
  };
  app.use(onError);

  return app;
}
