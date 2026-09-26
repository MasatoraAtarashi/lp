# Real Shibuya

渋谷に住む人が、訪問者の日程・ペース・好みに合わせて「歩き＋食事」のプランを書き、メールで渡す — そのニーズを検証するためのランディングページです。ガイドは同行せず、長さも固定しません。

キャッチ（変更禁止）:

- EN: **The real Shibuya, made for you.**
- JA: **本物の渋谷を、あなた用に。**

英語がデフォルトで、日本語版に切り替えられます（`/` と `/ja/`）。写真主体の静的 LP（`public/`）と、メールアドレス＋回答メモのウェイトリスト（D1）です。

店名は LP に載せません（プラン本文にだけ書く）。予約・手配の支援は Offer B として、興味のウェイティングリストだけ置いています。

squat の `public-lp` テンプレートから生成しています。

## スタック

- **Worker**: Hono on Cloudflare Workers（API のみ。静的ファイルは Workers Static Assets が配信）
- **フロントエンド**: 静的な HTML / CSS / JS（`public/`。ビルド不要）
- **言語**: EN（`public/index.html`）と JA（`public/ja/index.html`）の 2 ファイル。CSS と JS は共有
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

## 公開 URL と canonical

公開ドメインは `https://realshibuya.polarissea.com/`（日本語は `/ja/`）です。両ページの canonical / `og:url` / `hreflang` はこの URL を指しています。

- EN が主（`hreflang="x-default"` も EN）
- ドメインを変えるときは `public/index.html` と `public/ja/index.html` の canonical・`og:url`・`hreflang`・`og:image`、および `test/i18n-pages.test.ts` の `ORIGIN` を同時に直す（テストが不一致を検出します）
- Worker 名 `everyday-japan-tour` は既存の本番リソース識別子なので変えていません。`*.workers.dev` の URL も従来どおり生きます
- カスタムドメインは `wrangler.jsonc` の `routes`（`custom_domain: true`）で持っています。polarissea.com は Cloudflare 管理なので、`wrangler deploy` 時に DNS レコードごと払い出されます

## 言語の切り替え

EN / JA は**同じセクション構成・同じ写真スロットで、コピーだけが違う 2 枚の HTML** です。ビルド工程を増やさずに、`lang` / `title` / `description` / OGP を言語ごとに正しく出すための構成です。

| 対象                   | 場所                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| 英語コピー             | `public/index.html`                                                    |
| 日本語コピー           | `public/ja/index.html`                                                 |
| 言語切替リンク         | 各ページの `.lang-switch`（現在の言語は `aria-current="page"`）        |
| フォームの文言         | 各ページの `<form data-msg-*>`（送信中・成功・重複・不正・通信エラー） |
| 日本語のタイポグラフィ | `public/styles.css` の `:lang(ja)` ブロック（見出しを明朝系に落とす）  |

`public/main.js` は両言語で共有していて、**文言を一切持ちません**。表示する文字列はすべて `<form>` の `data-msg-*` から読みます。文言を足すときは HTML 側に両言語ぶん足してください（`test/i18n-pages.test.ts` が両ページに揃っているか検証します）。

GA のイベント名は言語共通です。`gtag("config", ...)` に `language`（`<html lang>` の値）を渡しているので、レポート側で EN / JA を分けられます。

## 写真の差し替え

写真は**番号付きのファイル名がそのままスロット**です。同じ名前で置き換えれば、HTML を触らずに差し替わります（EN / JA は同じスロットを共有）。

| ファイル                     | スロット           | 求める雰囲気                                        |
| ---------------------------- | ------------------ | --------------------------------------------------- |
| `public/images/01-hero.jpg`  | ヒーロー（最重要） | 神泉〜奥渋〜富ヶ谷の静かな街路。雰囲気 > 有名店正面 |
| `public/images/07-alley.jpg` | イントロ           | 夜の路地。店名の看板が写っていないこと              |

**写真は 2 枚だけです。** 元テンプレートに入っていた 6 枚は、別都市（大阪・新世界、長野・妻籠宿）、店名を大書きした正面（月島のもんじゃ屋）、夜桜のライトアップ、ネオンの飲み屋横丁で、いずれも指示書の「避けるもの」に該当したため削除しました。経緯は `public/images/CREDITS.txt` に残しています。

残り 2 枚も差し替え前提の仮画像です。写真が少ないぶん、セクションは写真なしで成立する構成（実例・手順・末尾バンド）にしてあります。スロットを増やしたいときは `<figure>` を足してください。

避けるもの: 有名カフェの正面を「これが渋い」と押し出す構図、海・リゾート、地図のスクリーンショット、別都市のストック写真、旅行代理店的な豪華ツアー感。

差し替えたら `public/images/CREDITS.txt` の出典も更新し、`<img>` の `width` / `height` が実寸と合っているか確認してください（レイアウトシフト対策）。

## カスタマイズ

| ファイル                             | 内容                                                |
| ------------------------------------ | --------------------------------------------------- |
| `public/index.html`                  | 英語コピー、見出し、SEO（title / OGP / canonical）  |
| `public/ja/index.html`               | 日本語コピー（EN と同じセクション構成）             |
| `public/styles.css`                  | デザイン（`:root` の変数で配色を一括変更）          |
| `public/main.js`                     | フォーム送信と GA の読み込み（文言は持たない）      |
| `#samples` セクション                | プランの実例 3 本。店名は出さず、評点と条件だけ出す |
| `test/i18n-pages.test.ts`            | EN / JA の構成・SEO・文言の揃いを検証               |
| `server/api/routes/waitlist.ts`      | 登録 API（バリデーション・保存ロジック）            |
| `server/api/routes/public-config.ts` | ブラウザへ渡す GA 計測 ID                           |
| `wrangler.jsonc`                     | `vars.GA_MEASUREMENT_ID` と D1                      |

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
pnpm wrangler d1 execute DB --local --command "SELECT email, note, created_at FROM waitlist ORDER BY id DESC LIMIT 100"

# デプロイ後
pnpm wrangler d1 execute DB --remote --command "SELECT email, note, created_at FROM waitlist ORDER BY id DESC LIMIT 100"
```

## エージェント向け

- ルール・MCP・hooks は `.rulesync/` が正本。変更したら `pnpm dlx rulesync generate --targets "*"` で各エージェント設定を再生成する
- MCP: cloudflare-docs（認証不要）/ cloudflare-observability（初回 OAuth）が既定で入っている
