import Database from "better-sqlite3";

export type Db = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  name TEXT NOT NULL,
  UNIQUE (type, name)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
`;

const DEFAULT_CATEGORIES: Record<"expense" | "income", string[]> = {
  expense: ["食費", "日用品", "交通費", "住居", "光熱費", "娯楽", "その他"],
  income: ["給与", "賞与", "その他"],
};

export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(SCHEMA);

  // 初期カテゴリは初回のみ投入し、ユーザーが削除した後に復活させない
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version >= 1) return;

  const insert = db.prepare("INSERT INTO categories (type, name) VALUES (?, ?)");
  const seed = db.transaction(() => {
    for (const [type, names] of Object.entries(DEFAULT_CATEGORIES)) {
      for (const name of names) insert.run(type, name);
    }
    db.pragma("user_version = 1");
  });
  seed();
}
