<div align="center">

# MacroFit Pro 🏋️‍♂️
<strong>筋トレ特化型・AI栄養 & 献立自動生成 Web アプリ</strong>

"バルクもカットも、完璧なマクロで理想のボディへ"

<br/>
<img src="https://img.shields.io/badge/Next.js-14-black" />
<img src="https://img.shields.io/badge/TypeScript-5-blue" />
<img src="https://img.shields.io/badge/Azure%20OpenAI-GPT--4o--mini-0089D6" />
<img src="https://img.shields.io/badge/Status-Active-success" />

</div>

## 🔥 概要
**MacroFit Pro** は週次の筋トレ栄養管理を最適化するためのアプリです。ユーザー入力（体組成 / 目標 / 活動量）から：
- PFCとカロリー目標の自動算出
- 体重達成までの体重推移予測
- Azure OpenAI を用いた 7 日分の献立案生成
- 買い物リスト自動生成（食材と分量の集計）

## ✨ 主な特徴
| 機能 | 説明 |
|------|------|
| 栄養ターゲット計算 | 目標設定方法（期間 / カロリー / 自動）に応じて計算 |
| 体重推移予測 | 週次シミュレーションと達成予定日算出 |
| AI献立生成 | Azure OpenAI による高精度 7 日献立 + バッチ調理考慮 |
| 買い物リスト | 食材を統合しカテゴリごとに整理（実装予定拡張可） |
| PFCバランス変更 | デフォルト or カスタム比率対応 |
| クリア | UIからセッション/ローカルストレージをワンクリック初期化 |

## 🧩 技術スタック
- **Framework**: Next.js 14 (App Router) / React / TypeScript / Tailwind CSS
- **AI**: Azure OpenAI GPT-4o-mini
- **State**: React Hooks / SessionStorage
- **Auth**: （未実装 / 拡張余地）
- **DB**: Prisma & DB（導入予定）

## 📂 ディレクトリ構成（抜粋）
```
src/
	app/                # ルーティング & ページ
	components/         # UIコンポーネント
		results/          # 結果表示系（Nutrition, WeightProjection, etc.）
	lib/                # 計算ロジック & Azure OpenAI クライアント
	types/              # 型定義
docs/                 # 設計ドキュメント
.env.local            # 環境変数（Git追跡外）
```

## 🚀 セットアップ手順
### 1. リポジトリ取得
```bash
git clone https://github.com/TsubasaNishimori/macrofit-pro.git
cd macrofit-pro
```

### 2. 依存関係インストール
```bash
npm install
```

### 3. 環境変数設定（`.env.local`）
以下をプロジェクト直下に作成：
```bash
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_GPT35_DEPLOYMENT=gpt-35-turbo
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=60
AZURE_OPENAI_MAX_TOKENS_PER_MINUTE=200000
```

### 4. 開発サーバー起動
```bash
# 高速モード（Turbopack使用）- 推奨
npm run dev

# レガシーモード（通常のWebpack）
npm run dev:legacy
```
ブラウザで: http://localhost:3000

**起動が遅い場合の対処法:**
- **OneDriveの影響**: プロジェクトを `C:\dev\macrofit-pro` など非同期フォルダに移動
- **キャッシュ削除**: `.next` フォルダを削除後に再起動
- **Node.js メモリ**: `set NODE_OPTIONS=--max-old-space-size=4096` で起動

### 5. 利用フロー
1. トップページで身体情報と目標を入力
2. 結果ページで: 栄養ターゲット / 体重予測を確認
3. 「献立 & 買い物リスト生成」ボタンでAI献立生成
4. 必要に応じて「🧹 クリア」で再計算

## 🧪 動作確認チェックリスト
| 項目 | 期待動作 |
|------|----------|
| 入力フォーム送信 | `/results` に遷移する |
| 栄養計算 | PFCとカロリーが表示される |
| 体重予測 | 週数と達成予定日が整合している |
| 献立生成 | AI応答後に週間献立と買い物リスト表示 |
| クリア | 入力値が初期化されリロード |

## ⚙️ 環境変数解説
| 変数 | 必須 | 説明 |
|------|------|------|
| AZURE_OPENAI_ENDPOINT | ✅ | Azure OpenAI リソースURL |
| AZURE_OPENAI_API_KEY | ✅ | APIキー |
| AZURE_OPENAI_API_VERSION | ✅ | 使用APIバージョン |
| AZURE_OPENAI_GPT4_DEPLOYMENT | ✅ | モデルデプロイ名（高精度） |
| AZURE_OPENAI_GPT35_DEPLOYMENT | 任意 | コスト低めモデル |
| AZURE_OPENAI_EMBEDDING_DEPLOYMENT | 任意 | 埋め込み用途（将来拡張） |
| AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE | 任意 | レート制限（デフォルト60） |
| AZURE_OPENAI_MAX_TOKENS_PER_MINUTE | 任意 | トークン上限（デフォルト200000） |

## 🧠 アーキテクチャ概要
主なロジックは `src/lib/nutrition-calculator.ts` に集約：
| 区分 | 関数 | 役割 |
|------|------|------|
| 代謝計算 | `calculateBMR` / `calculateTDEE` | 基礎代謝 & 総消費計算 |
| 目標処理 | `calculateTargetCalories` | 目標タイプ別のカロリー算出 |
| 栄養指標 | `calculatePFCTargets` | PFC / カロリーの集計 |
| 体重予測 | `calculateWeightProjection` | 達成週 / 日付 / 推移生成 |

## 🧩 今後の拡張予定
- ユーザー認証（NextAuth / Azure AD）
- 永続化（PostgreSQL + Prisma）
- 食材DB & 栄養分析
- 機械学習によるプラン最適化
- 多言語対応（en/ja）

## 🛠 開発・デプロイスクリプト
| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run start` | 本番起動（ビルド後） |
| `npm run lint` | コードリント実行 |

## 🐞 トラブルシュート
| 症状 | 対処 |
|------|------|
| AIが遅い | プロンプト短縮 / レート制限確認 / ネットワーク確認 |
| 体重週数が日付とズレる | 再現時: クリア → 入力再送信（ロジックは修正済） |
| 生成失敗（APIエラー） | `.env.local` のキー確認 / 利用制限ログをAzureポータルで確認 |
| 画面が古いまま | ブラウザキャッシュ削除 or `🧹 クリア` |

## 🤝 コントリビュート
PR歓迎です。Issueテンプレは今後追加予定。命名規約: `feat:`, `fix:`, `docs:`, `refactor:` など Conventional Commits 推奨。

## 📜 ライセンス
MIT License

---
作者: MacroFit Pro チーム / シニアフルスタックアーキテクト  
初版: 2025-09-16  
更新: 2025-09-24

## 🚀 本番デプロイメント

本番運用のための 3 パターン（Vercel / Docker / Azure App Service）を示します。まず Vercel を推奨し、必要に応じて他を利用してください。

### 1. Vercel (推奨)
#### 手順（GUI）
1. https://vercel.com にログイン / サインアップ
2. "Add New..." → "Project" → GitHub リポジトリ `macrofit-pro` を選択
3. Framework Preset = Next.js（自動検出）
4. Environment Variables に以下を追加:
	 - `AZURE_OPENAI_ENDPOINT`
	 - `AZURE_OPENAI_API_KEY`
	 - `AZURE_OPENAI_API_VERSION`
	 - `AZURE_OPENAI_GPT4_DEPLOYMENT`
5. Deploy ボタンを押す

#### CLI からのデプロイ
```bash
npm install -g vercel
vercel link   # 初回のみ
vercel env add AZURE_OPENAI_ENDPOINT
vercel env add AZURE_OPENAI_API_KEY
vercel env add AZURE_OPENAI_API_VERSION
vercel env add AZURE_OPENAI_GPT4_DEPLOYMENT
vercel --prod
```

#### Vercel 特記事項
- Turbopack は開発のみ利用。本番ビルドは `next build`（自動）
- Edge Functions は未使用（将来: API を Edge 化する余地あり）
- 環境変数変更後は再デプロイ必要

### 2. Docker コンテナデプロイ
`Dockerfile` は未同梱のため簡易例を提示します。必要なら `Dockerfile` を追加してください。

Dockerfile 例:
```Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
		NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
EXPOSE 3000
CMD ["npm","run","start"]
```

ビルド & 実行:
```bash
docker build -t macrofit-pro:latest .
docker run -p 3000:3000 --env-file .env.production macrofit-pro:latest
```
`.env.production` に本番用環境変数を記載（`.env.local` をコピーしてキーのみ変更）。

### 3. Azure App Service (Linux)
1. Azure Portal で App Service (Linux, Node 20 LTS) を作成
2. デプロイ方法: GitHub Actions 連携を有効化
3. App Settings に環境変数を追加（Vercel と同じ）
4. ビルドコマンド: `npm install && npm run build`
5. 起動コマンド: `npm run start`
6. デプロイ後、`/api/generate-meal-plan` をログで確認（失敗時は Application Logs をオン）

GitHub Actions ワークフロー例 (`.github/workflows/deploy.yml`) 概要:
```yaml
name: Deploy Azure App Service
on:
	push:
		branches: [ main ]
jobs:
	build-and-deploy:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: actions/setup-node@v4
				with:
					node-version: '20'
			- run: npm ci
			- run: npm run build
			- name: 'Deploy'
				uses: azure/webapps-deploy@v3
				with:
					app-name: ${{ secrets.AZURE_APP_NAME }}
					publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
					package: .
```

### 4. 環境変数 (本番再掲)
| 変数 | 用途 | 備考 |
|------|------|------|
| AZURE_OPENAI_ENDPOINT | Azure OpenAI エンドポイント | https://xxxx.openai.azure.com |
| AZURE_OPENAI_API_KEY | API キー | Key Vault 管理推奨 |
| AZURE_OPENAI_API_VERSION | API バージョン | 例: 2024-12-01-preview |
| AZURE_OPENAI_GPT4_DEPLOYMENT | GPT-4o mini デプロイ名 | 必須 |
| AZURE_OPENAI_GPT35_DEPLOYMENT | GPT-3.5系デプロイ名 | コスト調整用 |
| AZURE_OPENAI_EMBEDDING_DEPLOYMENT | 埋め込みモデル | 拡張用 |

### 5. 本番ビルド手動確認手順
```bash
rm -rf .next
npm ci
npm run build
npm run start
# -> http://localhost:3000 で /results まで動作確認
```

### 6. セキュリティ & コスト最適化ヒント
- API キーを直書きしない（CI は Secret / Vercel Env）
- OpenAI レート上限を超えそうなら温度 (temperature) を低く維持（既に0.1）
- 失敗再試行ロジック（指数バックオフ）追加は将来検討
- API 呼び出し JSON サイズ削減 → 不要フィールドをプロンプトから削除可能

### 7. 運用チェックリスト
| 項目 | 確認 |
|------|------|
| ビルド成功 | `next build` OK |
| 環境変数設定 | すべて反映済み |
| /api/generate-meal-plan 応答 | 200 & JSON parse OK |
| 体重予測表示 | 週数と日付一致 |
| 献立生成時間 | < 25s 目標 (初回) |
| キャッシュクリア動作 | 期待通り |

### 8. トラブルシュート (本番特化)
| 症状 | 原因候補 | 対処 |
|------|----------|------|
| 500 (献立API) | OpenAIキー不正 / レート超過 | Azure Portal の Metrics / Quotas 確認 |
| 生成が極端に遅い | ネットワーク遅延 / モデル過負荷 | 再試行 / モデルバージョン更新検討 |
| JSON解析エラー | モデル出力に説明文混入 | プロンプト内「純粋JSON」強調強化 |
| コスト急増 | リクエスト回数多すぎ | UI に生成回数制限 UI 追加検討 |
| メモリ不足 (Docker) | Node heap 小 | `NODE_OPTIONS=--max-old-space-size=4096` |

---
デプロイ関連の詳細を別ファイルに分離したい場合は `DEPLOYMENT.md` 作成を推奨します。

## 📄 関連ドキュメント

- アプリ紹介記事: [docs/intro-article.md](./docs/intro-article.md)

