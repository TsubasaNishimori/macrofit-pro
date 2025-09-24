# 技術スタック設計書

## フロントエンド

### React フレームワーク
**選択**: Next.js 14 (App Router)
**理由**:
- SSR/SSGによるSEO最適化とパフォーマンス向上
- App Routerによる最新のルーティング機能
- TypeScript完全サポート
- Vercel/Azure Static Web Appsでの簡単デプロイ

### 型システム
**選択**: TypeScript 5.2+
**理由**:
- 型安全性によるランタイムエラー削減
- Azure OpenAI APIレスポンスの型定義
- tRPCとの完全統合

### CSS フレームワーク
**選択**: Tailwind CSS 3.4
**理由**:
- ユーティリティファーストによる高速開発
- レスポンシブデザインの簡単実装
- ダークモード・アニメーション対応

### UI コンポーネント
**選択**: Shadcn/ui + Radix UI
**理由**:
- アクセシビリティ準拠 (WCAG 2.1 AA)
- コピー＆ペーストで拡張可能
- カスタマイズ性とパフォーマンス

## バックエンド

### Node.js フレームワーク
**選択**: Next.js API Routes + tRPC
**理由**:
- フルスタック一元管理
- Type-safeなAPI通信
- リアルタイム更新 (Server-Sent Events)

### データベース
**選択**: PostgreSQL 15 (Azure Database for PostgreSQL)
**理由**:
- JSON型による柔軟なスキーマ対応
- 高性能な全文検索機能
- Azure統合とマネージドサービス

### ORM
**選択**: Prisma 5.6
**理由**:
- TypeScript-nativeな型安全ORM
- マイグレーション管理
- Next.js完全統合

## 認証・認可

### 認証プロバイダ
**選択**: Auth.js (NextAuth.js v5) + Microsoft Entra ID
**理由**:
- Microsoft ecosystemとの統合
- エンタープライズレベルセキュリティ
- SSO対応

## AI・機械学習

### LLM プラットフォーム
**選択**: Azure OpenAI (GPT-4 Turbo)
**理由**:
- 日本語対応の高精度
- 構造化出力 (Function Calling)
- Azure統合とコンプライアンス

## 可視化・チャート

### チャートライブラリ
**選択**: Chart.js 4.4 + react-chartjs-2
**理由**:
- 豊富なチャート種類
- レスポンシブ対応
- アニメーション・インタラクション

## キャッシュ・状態管理

### クライアント状態管理
**選択**: TanStack Query (React Query) v5
**理由**:
- サーバー状態の効率管理
- バックグラウンド更新
- オフライン対応

### サーバーサイドキャッシュ
**選択**: Redis (Azure Cache for Redis)
**理由**:
- Azure OpenAI APIレスポンスキャッシュ
- セッション管理
- レート制限実装

## ホスティング・インフラ

### アプリケーションホスティング
**選択**: Azure Static Web Apps + Azure Functions
**理由**:
- フロントエンド: CDNによる高速配信
- バックエンド: サーバーレス実行環境
- 自動SSL・カスタムドメイン対応

### ストレージ
**選択**: 
- **データベース**: Azure Database for PostgreSQL
- **ファイル**: Azure Blob Storage
- **シークレット**: Azure Key Vault

## CI/CD・開発ツール

### CI/CD
**選択**: GitHub Actions
**理由**:
- Azure統合
- 自動テスト・デプロイ
- セキュリティスキャン

### コード品質
- **Linter**: ESLint + Prettier
- **Type checking**: TypeScript strict mode
- **Testing**: Vitest + Testing Library

## アーキテクチャ利点・トレードオフ

### 利点
✅ **型安全性**: フルスタックTypeScript  
✅ **開発効率**: 統一されたJavaScript ecosystem  
✅ **スケーラビリティ**: サーバーレス + マネージドサービス  
✅ **保守性**: 一元管理されたモノレポ構成  

### トレードオフ
⚠️ **初期学習コストあり**: tRPC + Prismaの習得  
⚠️ **JavaScript依存**: 他言語エコシステム活用不可  
⚠️ **Azure lock-in**: 他クラウドへの移行コスト  

## コスト階層

### ホビープラン (~$50/月)
- Azure Static Web Apps: Free tier
- Azure Database for PostgreSQL: Basic tier
- Azure OpenAI: Pay-per-use (~$30/月)

### スタートアッププラン (~$200/月)
- Azure App Service: Basic tier
- Azure Database for PostgreSQL: General Purpose
- Azure Cache for Redis: Basic tier
- Azure OpenAI: 高スループット (~$100/月)