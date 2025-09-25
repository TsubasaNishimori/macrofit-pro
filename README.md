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

### Vercel デプロイ
```bash
# Vercel CLI を使用
npm install -g vercel
vercel --prod
```

### 環境変数設定
本番環境では以下の環境変数を設定してください：
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_GPT4_DEPLOYMENT`

### パフォーマンス最適化
- 本番ビルドでは TypeScript と ESLint チェックが有効
- 画像最適化とコード分割を自動実行
- Azure OpenAI API のレート制限に対応済み
