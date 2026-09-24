# Everyday Japan

海外の訪問者向けに、「日常の日本」を歩くインバウンド体験ツアーのニーズ検証用ランディングページです。
寺院やアニメの観光地だけでなく、代々木公園周辺の暮らし、時代の空気が残る日常、商店やカフェを題材にした英語の LP と、メールアドレスのウェイティングリストを置きます。

squat の `public-lp` テンプレートから生成しています。

## スタック

- **Worker**: Hono on Cloudflare Workers（API のみ。静的ファイルは Workers Static Assets が配信）
- **フロントエンド**: 静的な HTML / CSS / JS（`public/`。ビルド不要。本文は英語）
- **ウェイティングリスト**: Cloudflare D1（メールアドレスを保存。UNIQUE 制約で重複排除）
- **計測**: Google Analytics 4（`GA_MEASUREMENT_ID`。プレースホルダの間は gtag.js を読まない）
- **テスト**: vitest + @cloudflare/vitest-pool-workers
- **Observability**: Workers Logs / Metrics が既定で ON（`wrangler.jsonc` の `observability`）

## セットアップ（ローカル開発）

```bash
pnpm install
cp .dev.vars.example .dev.vars   # 任意。GA ID をローカルだけ変えたいとき
pnpm db:migrate:local            # ローカル D1 にマイグレーション適用
pnpm dev
```

http://localhost:8787 で開く。フォームから登録を試すとローカル D1 に保存される。

## Google Analytics の計測 ID

本番の `vars.GA_MEASUREMENT_ID` は `G-V2L8K6GDT7` です。値が `G-XXXXXXXXXX`（または空）のあいだ、ページは gtag.js を読み込みません。

計測 ID はページの HTML に出る公開値です。secret にはしません。

1. [GA4](https://analytics.google.com/) でデータストリームを作り、測定 ID（`G-` で始まる）をコピーする
2. **本番**: `wrangler.jsonc` の `vars.GA_MEASUREMENT_ID` をその ID に書き換えてデプロイする
   - `wrangler deploy` は `vars` をそのまま配信する。ダッシュボード側だけ変えても、次回デプロイで `wrangler.jsonc` の値に戻る
3. **ローカルで別 ID を試すときだけ**: `.dev.vars` に同じキーを書く（`.dev.vars.example` をコピー）。`wrangler dev` は `.dev.vars` で `vars` を上書きする

ページは `GET /api/public-config` の `gaMeasurementId` を見て、`G-` + 英数字かつプレースホルダでないときだけ gtag.js を挿入します。

## Canonical URL

`public/index.html` の canonical / `og:url` は仮の URL です。

```text
https://everyday-japan-tour.workers.dev/
```

初回デプロイ後、wrangler が印字する実際の URL（`https://everyday-japan-tour.<account-subdomain>.workers.dev`）か、後から付ける独自ドメインに書き換えてください。アカウントのサブドメインはデプロイするまで確定しません。

## カスタマイズ

| ファイル                             | 内容                                               |
| ------------------------------------ | -------------------------------------------------- |
| `public/index.html`                  | 英語コピー、見出し、SEO（title / OGP / canonical） |
| `public/styles.css`                  | デザイン（`:root` の変数で配色を一括変更）         |
| `public/main.js`                     | ウェイティングリスト送信と GA の読み込み           |
| `server/api/routes/waitlist.ts`      | 登録 API（バリデーション・保存ロジック）           |
| `server/api/routes/public-config.ts` | ブラウザへ渡す GA 計測 ID                          |
| `wrangler.jsonc`                     | `vars.GA_MEASUREMENT_ID` と D1                     |

## 主なコマンド

| コマンド                                      | 内容                                                                       |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                                    | ローカル開発サーバー（wrangler dev）                                       |
| `pnpm typecheck`                              | wrangler types + tsc                                                       |
| `pnpm test`                                   | vitest（Workers ランタイム内で実行）                                       |
| `pnpm lint` / `pnpm format`                   | Prettier                                                                   |
| `pnpm db:migrate:local` / `db:migrate:remote` | ローカル / リモート D1 にマイグレーション適用                              |
| `pnpm deploy`                                 | build（typecheck）→ リモートマイグレーション（predeploy）→ wrangler deploy |
| `pnpm security:ash`                           | ASH セキュリティスキャンをローカルで実行（docker が必要）                  |

## デプロイ

この環境には Cloudflare の API トークンを置いていません。トークンを用意してから、アプリディレクトリで実行します。

```bash
# build + リモートマイグレーション（predeploy）+ wrangler deploy
pnpm deploy
```

`wrangler.jsonc` の `database_id` は本番 D1 `everyday-japan-tour-db`（`51a43ff9-266e-47ee-8b77-a06f21642473`）です。スキーマをリモートへ載せるときは `pnpm db:migrate:remote` のあと `pnpm deploy` します。

### GitHub Actions で自動デプロイする

`main` への push は `.github/workflows/deploy.yml` が `wrangler deploy` します。新しい空のリポジトリには Cloudflare の secret が無いので、先に登録しないとデプロイジョブは失敗します。

1. Cloudflare ダッシュボードで API トークンを作成（権限: **Workers Scripts: Edit**、対象アカウントを絞る）
   - https://dash.cloudflare.com/profile/api-tokens
2. アカウント ID はダッシュボードの Workers 概要、または `wrangler whoami` で確認する
3. GitHub リポジトリに secrets を登録する（値はこの README に書かない）:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```

4. `main` に push すると `deploy.yml` がデプロイする。PR では `preview.yml` がプレビュー URL をコメントする

D1 の `database_id` は本番 UUID です。GitHub に Cloudflare の secret を登録したあと、`main` への push でリモートマイグレーションとデプロイが走ります。

## 登録されたメールアドレスの確認

```bash
# ローカル
pnpm wrangler d1 execute DB --local --command "SELECT email, created_at FROM waitlist ORDER BY id DESC LIMIT 100"

# デプロイ後
pnpm wrangler d1 execute DB --remote --command "SELECT email, created_at FROM waitlist ORDER BY id DESC LIMIT 100"
```

## エージェント向け

- ルール・MCP・hooks は `.rulesync/` が正本。変更したら `pnpm dlx rulesync generate --targets "*"` で各エージェント設定を再生成する
- MCP: cloudflare-docs（認証不要）/ cloudflare-observability（初回 OAuth）が既定で入っている
