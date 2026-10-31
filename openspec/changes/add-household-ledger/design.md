# Design

## Context

リポジトリは新規でコードがない。技術構成は Vue + TypeScript + Vite(フロントエンド)、サーバー経由で SQLite にアクセスする構成とする。動機は proposal.md、要件は specs/ を参照。個人用・単一ユーザー・ローカル実行を前提とする。

## Goals / Non-Goals

**Goals:**
- フロントエンドとサーバーを分離し、収支・カテゴリを REST API で操作する
- 集計はサーバー(SQL)側で行い、画面は結果を表示する
- 日付の扱いを1か所に集約し、境界(月末・年末)で誤らない

**Non-Goals:**
- 認証・認可、複数ユーザー、外部公開を想定した設計
- オフライン対応、データ同期

## Decisions

### 1. 構成: モノレポ(`client/` と `server/`)
1つのリポジトリに、`client/`(Vue + Vite)と `server/`(Node.js + TypeScript)を置く。
- 代替案: フロントのみ + LocalStorage。サーバー経由の SQLite という要望に合わないため不採用。

### 2. サーバー: Node.js + Express、SQLite は `better-sqlite3`
同期APIで単純に書け、個人用の規模に十分。
- 代替案: Prisma 等の ORM。小規模では過剰なため、素の SQL とマイグレーション用SQLで管理する。

### 3. データモデル
- `categories(id, type, name, UNIQUE(type, name))`、`type` は `expense` または `income`
- `transactions(id, type, date, amount, category_id)`、`date` は `YYYY-MM-DD` 文字列、`amount` は円の整数(CHECK amount > 0)
- 曜日は保存せず、表示時に日付から算出する(二重管理と不整合を避けるため)
- `category_id` は外部キーで `ON DELETE RESTRICT` とし、使用中カテゴリの削除を防ぐ
- `date` に索引を付ける
- 初期カテゴリは、マイグレーションで投入する(支出: 食費・日用品・交通費・住居・光熱費・娯楽・その他、収入: 給与・賞与・その他)

### 4. API(JSON)
- `GET/POST /api/transactions`、`PUT/DELETE /api/transactions/:id`
- `GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD`(選択日・月表示用)
- `GET/POST /api/categories`、`PUT/DELETE /api/categories/:id`
- `GET /api/summary/monthly?year=&month=`、`GET /api/summary/yearly?year=`
- 入力検証はサーバーで必ず行い、不正値は 400、使用中カテゴリの削除や重複は 409 を返す

### 5. 年別集計
年 N は N-01-01 〜 N-12-31。`date` の範囲条件で集計し、月別内訳は1月〜12月の12行を返す。

### 6. 画面(Vue Router、2ページ)
- `/`(カレンダー): 月カレンダー、選択日の収支一覧、登録・編集フォーム(ダイアログ)
- `/summary`(集計): 月別 / 年別の切り替え、前後移動、カテゴリ別内訳と収支割合の円グラフ(SVG で自作)
- カレンダーは、月表示(収支の印・選択状態を出す)を軽量なコンポーネントとして自作する。外部のカレンダー部品は、印の表示などの要件に合わせにくいため使わない。登録・編集ダイアログにはカレンダーを出さず、日付はカレンダー画面の選択日を使う。カレンダーの印は種別で色分けする(支出: オレンジ、収入: 青、両方は2つ表示)。
- 状態管理ライブラリ(Pinia 等)は使わず、composable で API 呼び出しを集約する。
- 代替案: Pinia 導入。画面が2つで状態の共有が少ないため不採用。

### 7. 日付の扱い
日付は文字列 `YYYY-MM-DD` として送受信・保存し、タイムゾーン変換を挟まない(`new Date("YYYY-MM-DD")` の UTC 解釈による日付ずれを避ける)。曜日算出も、ローカル日付として組み立てて行う。

### 8. テスト
サーバー: Vitest で API と集計(年末境界を含む)をテストする。クライアント: 日付・曜日・金額整形のユーティリティを Vitest でテストする。

## Risks / Trade-offs

- [日付がタイムゾーンでずれる] → 日付は文字列で扱い、`Date` へはローカル日付として変換する。境界のテストを用意する
- [カテゴリ名変更が既存収支に影響する] → 収支はカテゴリ名でなく `category_id` で参照し、名前変更は1か所の更新で全体に反映する
- [認証なし] → サーバーは `localhost` のみで待ち受ける
- [`better-sqlite3` はネイティブビルドが必要] → Node.js の LTS を使い、ビルドツールが不要な配布版バイナリで導入する。失敗時は `node:sqlite` を代替とする

## Migration Plan

新規構築のため移行はない。SQLite のファイルは `server/data/` に置き、`.gitignore` で除外する。ロールバックは、変更のコミットを戻すことで行う。
