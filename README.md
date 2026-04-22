# family-budget-app

Cloudflare Pages Functions + D1 + R2 で動く家計簿アプリです。Supabase 依存は削除してあります。

## 構成

- フロントエンド: React + Vite
- API: Cloudflare Pages Functions (`functions/api/*`)
- DB: Cloudflare D1
- レシート保存: Cloudflare R2
- 認証: HttpOnly cookie session

## Cloudflare 側で必要なもの

1. D1 データベースを 1 つ作成する
2. `migrations/0001_cloudflare_bootstrap.sql` を適用する
3. R2 バケットを 1 つ作成する
4. Pages プロジェクトに以下の binding を追加する

- `DB`: D1 database
- `RECEIPTS`: R2 bucket

## デプロイ前提

- Build command: `npm run build`
- Build output directory: `dist`

GitHub 連携の Cloudflare Pages を使う場合でも、Functions の binding は Cloudflare ダッシュボード側で設定が必要です。

## ローカル確認

最低限のフロント build は以下です。

```bash
npm run build
```

Pages Functions を含めたローカル動作確認は `wrangler pages dev` を使ってください。
