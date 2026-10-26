import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createApp } from "./app.js";
import { openDb } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const dbPath = resolve(process.env.DB_PATH ?? "data/kakeibo.db");
mkdirSync(dirname(dbPath), { recursive: true });

const app = createApp(openDb(dbPath));

app.listen(port, "127.0.0.1", () => {
  console.log(`server listening on http://localhost:${port}`);
});
