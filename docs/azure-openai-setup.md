# Azure OpenAI 設定ガイド

## 🔐 セキュアな設定方法

### 1. 環境変数設定

#### 開発環境 (.env.local)
```bash
# Azure OpenAI 設定
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# デプロイメント名の設定（複数モデル対応）
AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4-turbo
AZURE_OPENAI_GPT35_DEPLOYMENT=gpt-35-turbo
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# セキュリティ設定
ENCRYPTION_KEY=your-32-character-encryption-key-here
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/

# レート制限設定
AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=60
AZURE_OPENAI_MAX_TOKENS_PER_MINUTE=40000
```

#### 本番環境 (Azure Key Vault)
```bash
# 本番環境では環境変数でKey Vault参照
AZURE_KEY_VAULT_URL=https://macrofit-keyvault.vault.azure.net/
AZURE_OPENAI_KEY_SECRET_NAME=azure-openai-api-key
AZURE_OPENAI_ENDPOINT_SECRET_NAME=azure-openai-endpoint
```

### 2. TypeScript設定クラス

```typescript
// /src/lib/azure-openai-config.ts
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployments: {
    gpt4: string;
    gpt35: string;
    embedding: string;
  };
  rateLimits: {
    maxRequestsPerMinute: number;
    maxTokensPerMinute: number;
  };
}

class AzureOpenAIConfigManager {
  private static instance: AzureOpenAIConfigManager;
  private config: AzureOpenAIConfig | null = null;
  private secretClient: SecretClient | null = null;

  private constructor() {
    if (process.env.AZURE_KEY_VAULT_URL) {
      const credential = new DefaultAzureCredential();
      this.secretClient = new SecretClient(
        process.env.AZURE_KEY_VAULT_URL,
        credential
      );
    }
  }

  public static getInstance(): AzureOpenAIConfigManager {
    if (!AzureOpenAIConfigManager.instance) {
      AzureOpenAIConfigManager.instance = new AzureOpenAIConfigManager();
    }
    return AzureOpenAIConfigManager.instance;
  }

  public async getConfig(): Promise<AzureOpenAIConfig> {
    if (this.config) {
      return this.config;
    }

    // 本番環境: Azure Key Vaultから取得
    if (this.secretClient && process.env.NODE_ENV === 'production') {
      const [endpointSecret, apiKeySecret] = await Promise.all([
        this.secretClient.getSecret(
          process.env.AZURE_OPENAI_ENDPOINT_SECRET_NAME || 'azure-openai-endpoint'
        ),
        this.secretClient.getSecret(
          process.env.AZURE_OPENAI_KEY_SECRET_NAME || 'azure-openai-api-key'
        ),
      ]);

      this.config = {
        endpoint: endpointSecret.value!,
        apiKey: apiKeySecret.value!,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
        deployments: {
          gpt4: process.env.AZURE_OPENAI_GPT4_DEPLOYMENT || 'gpt-4-turbo',
          gpt35: process.env.AZURE_OPENAI_GPT35_DEPLOYMENT || 'gpt-35-turbo',
          embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
        },
        rateLimits: {
          maxRequestsPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE || '60'),
          maxTokensPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS_PER_MINUTE || '40000'),
        },
      };
    } 
    // 開発環境: 環境変数から直接取得
    else {
      this.config = {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
        apiKey: process.env.AZURE_OPENAI_API_KEY!,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
        deployments: {
          gpt4: process.env.AZURE_OPENAI_GPT4_DEPLOYMENT || 'gpt-4-turbo',
          gpt35: process.env.AZURE_OPENAI_GPT35_DEPLOYMENT || 'gpt-35-turbo',
          embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
        },
        rateLimits: {
          maxRequestsPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE || '60'),
          maxTokensPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS_PER_MINUTE || '40000'),
        },
      };
    }

    return this.config;
  }

  // 設定の検証
  public async validateConfig(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      
      // 必須項目のチェック
      if (!config.endpoint || !config.apiKey) {
        console.error('Azure OpenAI endpoint or API key is missing');
        return false;
      }

      // エンドポイントの形式チェック
      if (!config.endpoint.includes('.openai.azure.com')) {
        console.error('Invalid Azure OpenAI endpoint format');
        return false;
      }

      // 接続テスト（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        return await this.testConnection(config);
      }

      return true;
    } catch (error) {
      console.error('Failed to validate Azure OpenAI config:', error);
      return false;
    }
  }

  private async testConnection(config: AzureOpenAIConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `${config.endpoint}/openai/deployments/${config.deployments.gpt35}/chat/completions?api-version=${config.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 5,
          }),
        }
      );

      return response.status === 200 || response.status === 400; // 400はリクエスト形式の問題で接続は成功
    } catch (error) {
      console.error('Azure OpenAI connection test failed:', error);
      return false;
    }
  }
}

export const azureOpenAIConfig = AzureOpenAIConfigManager.getInstance();
```

### 3. 改良版クライアント実装

```typescript
// /src/lib/azure-openai-client.ts
import { OpenAI } from 'openai';
import { azureOpenAIConfig, AzureOpenAIConfig } from './azure-openai-config';
import { RateLimiter } from './rate-limiter';

export class MacroFitAzureOpenAIClient {
  private client: OpenAI | null = null;
  private config: AzureOpenAIConfig | null = null;
  private rateLimiter: RateLimiter | null = null;

  private async initialize(): Promise<void> {
    if (this.client) return;

    this.config = await azureOpenAIConfig.getConfig();
    
    // OpenAI クライアント初期化
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deployments.gpt4}`,
      defaultQuery: { 'api-version': this.config.apiVersion },
      defaultHeaders: {
        'api-key': this.config.apiKey,
      },
    });

    // レート制限初期化
    this.rateLimiter = new RateLimiter({
      maxRequests: this.config.rateLimits.maxRequestsPerMinute,
      maxTokens: this.config.rateLimits.maxTokensPerMinute,
      windowMs: 60 * 1000, // 1分
    });
  }

  public async generateMealPlan(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model?: 'gpt4' | 'gpt35';
      temperature?: number;
      maxTokens?: number;
      functions?: any[];
      functionCall?: any;
    } = {}
  ): Promise<any> {
    await this.initialize();

    if (!this.client || !this.config || !this.rateLimiter) {
      throw new Error('Azure OpenAI client not initialized');
    }

    // レート制限チェック
    const estimatedTokens = this.estimateTokens(systemPrompt + userPrompt);
    await this.rateLimiter.checkLimit(estimatedTokens);

    const deploymentName = options.model === 'gpt35' 
      ? this.config.deployments.gpt35 
      : this.config.deployments.gpt4;

    try {
      const startTime = Date.now();
      
      const response = await this.client.chat.completions.create({
        model: deploymentName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
        functions: options.functions,
        function_call: options.functionCall,
      });

      const duration = Date.now() - startTime;

      // 使用量を記録
      await this.logUsage({
        model: deploymentName,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        duration,
      });

      return response;
    } catch (error) {
      console.error('Azure OpenAI API call failed:', error);
      
      // エラーの種類に応じた処理
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new Error('レート制限に達しました。しばらく待ってから再試行してください。');
        } else if (error.message.includes('quota')) {
          throw new Error('月間クォータを超過しました。プランのアップグレードを検討してください。');
        } else if (error.message.includes('content filter')) {
          throw new Error('コンテンツフィルターに引っかかりました。入力内容を確認してください。');
        }
      }
      
      throw error;
    }
  }

  private estimateTokens(text: string): number {
    // 簡易的なトークン数推定（実際のトークナイザーを使用することを推奨）
    return Math.ceil(text.length / 4);
  }

  private async logUsage(usage: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    duration: number;
  }): Promise<void> {
    // 使用量をデータベースまたはログに記録
    console.log('Azure OpenAI Usage:', usage);
    
    // 必要に応じてコスト計算
    const cost = this.calculateCost(usage.model, usage.promptTokens, usage.completionTokens);
    console.log('Estimated cost:', cost, 'USD');
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    // 2024年の価格（実際の価格は変動する可能性があります）
    const pricing = {
      'gpt-4-turbo': { input: 0.01, output: 0.03 }, // per 1K tokens
      'gpt-35-turbo': { input: 0.0015, output: 0.002 },
    };

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-35-turbo'];
    
    return (promptTokens / 1000 * modelPricing.input) + 
           (completionTokens / 1000 * modelPricing.output);
  }
}

export const azureOpenAIClient = new MacroFitAzureOpenAIClient();
```

### 4. レート制限実装

```typescript
// /src/lib/rate-limiter.ts
interface RateLimitConfig {
  maxRequests: number;
  maxTokens: number;
  windowMs: number;
}

interface Usage {
  timestamp: number;
  tokens: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private tokenUsage: Usage[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  public async checkLimit(estimatedTokens: number): Promise<void> {
    const now = Date.now();
    
    // 古いエントリを削除
    this.cleanOldEntries(now);
    
    // リクエスト数チェック
    if (this.requests.length >= this.config.maxRequests) {
      const waitTime = this.requests[0] + this.config.windowMs - now;
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
      }
    }
    
    // トークン数チェック
    const currentTokens = this.tokenUsage.reduce((sum, usage) => sum + usage.tokens, 0);
    if (currentTokens + estimatedTokens > this.config.maxTokens) {
      const oldestTokenUsage = this.tokenUsage[0];
      if (oldestTokenUsage) {
        const waitTime = oldestTokenUsage.timestamp + this.config.windowMs - now;
        if (waitTime > 0) {
          throw new Error(`Token limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
        }
      }
    }
    
    // 使用量を記録
    this.requests.push(now);
    this.tokenUsage.push({ timestamp: now, tokens: estimatedTokens });
  }

  private cleanOldEntries(now: number): void {
    const cutoff = now - this.config.windowMs;
    
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    this.tokenUsage = this.tokenUsage.filter(usage => usage.timestamp > cutoff);
  }
}
```

### 5. Azure Key Vault セットアップスクリプト

```bash
#!/bin/bash
# /scripts/setup-keyvault.sh

# 変数設定
RESOURCE_GROUP="macrofit-rg"
KEY_VAULT_NAME="macrofit-keyvault"
LOCATION="japaneast"

# Key Vault作成
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku standard

# シークレット設定
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "azure-openai-endpoint" \
  --value "https://your-resource.openai.azure.com/"

az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name "azure-openai-api-key" \
  --value "your-api-key-here"

# App Serviceにアクセス権限付与
APP_SERVICE_PRINCIPAL=$(az webapp identity show \
  --name macrofit-app \
  --resource-group $RESOURCE_GROUP \
  --query principalId \
  --output tsv)

az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $APP_SERVICE_PRINCIPAL \
  --secret-permissions get list
```

### 6. 環境別設定テンプレート

#### development.env
```bash
# 開発環境用設定
NODE_ENV=development
AZURE_OPENAI_ENDPOINT=https://your-dev-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-dev-api-key
AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4-turbo-dev
AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=30
AZURE_OPENAI_MAX_TOKENS_PER_MINUTE=20000
```

#### production.env
```bash
# 本番環境用設定（Azure App Serviceで設定）
NODE_ENV=production
AZURE_KEY_VAULT_URL=https://macrofit-keyvault.vault.azure.net/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4-turbo-prod
AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=120
AZURE_OPENAI_MAX_TOKENS_PER_MINUTE=100000
```

### 7. 使用例

```typescript
// /src/pages/api/trpc/meal/generate.ts
import { azureOpenAIClient } from '@/lib/azure-openai-client';
import { SYSTEM_PROMPT_MENU_GENERATION } from '@/lib/prompts';

export const generateWeeklyPlan = async (userProfile: UserProfile) => {
  try {
    const userPrompt = buildUserPrompt(userProfile);
    
    const response = await azureOpenAIClient.generateMealPlan(
      SYSTEM_PROMPT_MENU_GENERATION,
      userPrompt,
      {
        model: 'gpt4', // 高品質なプラン生成にはGPT-4を使用
        temperature: 0.3,
        maxTokens: 4096,
        functions: [WEEKLY_PLAN_FUNCTION_SCHEMA],
        functionCall: { name: 'generate_weekly_meal_plan' },
      }
    );

    return response;
  } catch (error) {
    console.error('Meal plan generation failed:', error);
    throw error;
  }
};
```

## 🔧 ステップバイステップ設定手順

### 📋 事前準備

#### 必要な情報を確認
1. **Azure OpenAIリソース情報**
   - エンドポイント: `https://your-resource.openai.azure.com/`
   - APIキー: Azureポータルの「キーとエンドポイント」から取得
   - デプロイメント名: 作成したモデルのデプロイメント名

2. **Azure環境情報**
   - サブスクリプションID
   - リソースグループ名
   - アプリケーション名

---

### 🚀 Step 1: 開発環境の設定（最初にこれを試す）

#### 1.1 環境変数ファイル作成
プロジェクトルートに `.env.local` を作成：

```bash
# MacroFit Pro - Azure OpenAI 開発環境設定
# GPT-4o-mini使用版

# ===== 必須設定 =====
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key-here
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# ===== デプロイメント名設定 =====
# GPT-4o-mini デプロイメント名（メイン使用モデル）
AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4o-mini

# フォールバック用 GPT-3.5 Turbo（オプション）
AZURE_OPENAI_GPT35_DEPLOYMENT=gpt-35-turbo

# 埋め込みモデル（将来の機能拡張用）
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# ===== レート制限設定（GPT-4o-mini用に最適化） =====
AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=60
AZURE_OPENAI_MAX_TOKENS_PER_MINUTE=200000

# ===== セキュリティ設定 =====
ENCRYPTION_KEY=change-this-to-32-char-random-string

# ===== MacroFit Pro 専用設定 =====
AI_MEAL_PLAN_TEMPERATURE=0.3
AI_MEAL_PLAN_MAX_TOKENS=4096
AI_MAX_RETRIES=3

# ===== 開発環境設定 =====
NODE_ENV=development
DEBUG_AZURE_OPENAI=true
```

> **📁 ファイルは既に作成済みです**: `pfc_menu/.env.local`

#### 1.2 設定値の入力方法

**エンドポイントの取得方法:**
1. [Azureポータル](https://portal.azure.com) にログイン
2. Azure OpenAIリソースを選択
3. 「キーとエンドポイント」をクリック
4. エンドポイントをコピー（例: `https://macrofit-openai.openai.azure.com/`）

**APIキーの取得方法:**
1. 同じ「キーとエンドポイント」画面で
2. 「キー1」または「キー2」をコピー
3. `KEY` + 英数字32文字の形式

**デプロイメント名の確認方法:**
1. Azure OpenAIリソースで「モデルデプロイ」をクリック
2. 作成済みデプロイメントの名前を確認
3. **GPT-4o-mini** の場合は通常 `gpt-4o-mini` という名前
4. GPT-3.5の場合は `gpt-35-turbo` など

> **💡 GPT-4o-miniの利点:**
> - コストパフォーマンスが excellent
> - 高速なレスポンス
> - 十分な精度で食事プラン生成が可能

#### 1.3 接続テスト

設定が正しいか確認するテストコード：

```typescript
// test-azure-openai.ts - 設定テスト用スクリプト
import { azureOpenAIConfig } from './src/lib/azure-openai-config';

async function testConnection() {
  try {
    console.log('🔍 Azure OpenAI設定をテスト中...');
    
    const isValid = await azureOpenAIConfig.validateConfig();
    
    if (isValid) {
      console.log('✅ 設定が正常です！');
    } else {
      console.log('❌ 設定に問題があります。.env.localを確認してください。');
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

testConnection();
```

---

### 🔐 Step 2: 本番環境の設定（Azure Key Vault）

#### 2.1 Azure CLI インストール・ログイン

```bash
# Azure CLI インストール（Windows）
winget install Microsoft.AzureCLI

# ログイン
az login

# サブスクリプション設定
az account set --subscription "your-subscription-id"
```

#### 2.2 リソースグループ作成

```bash
# リソースグループ作成
az group create \
  --name macrofit-rg \
  --location japaneast
```

#### 2.3 Key Vault 作成・設定

```bash
# Key Vault作成
az keyvault create \
  --name macrofit-keyvault \
  --resource-group macrofit-rg \
  --location japaneast \
  --sku standard

# シークレット登録
az keyvault secret set \
  --vault-name macrofit-keyvault \
  --name "azure-openai-endpoint" \
  --value "https://your-resource.openai.azure.com/"

az keyvault secret set \
  --vault-name macrofit-keyvault \
  --name "azure-openai-api-key" \
  --value "your-actual-api-key"
```

#### 2.4 App Service 作成・設定

```bash
# App Service プラン作成
az appservice plan create \
  --name macrofit-plan \
  --resource-group macrofit-rg \
  --sku B1 \
  --is-linux

# App Service 作成
az webapp create \
  --name macrofit-app \
  --resource-group macrofit-rg \
  --plan macrofit-plan \
  --runtime "NODE:18-lts"

# Managed Identity 有効化
az webapp identity assign \
  --name macrofit-app \
  --resource-group macrofit-rg
```

#### 2.5 アクセス権限設定

```bash
# App ServiceのPrincipal ID取得
PRINCIPAL_ID=$(az webapp identity show \
  --name macrofit-app \
  --resource-group macrofit-rg \
  --query principalId \
  --output tsv)

# Key Vaultアクセス権限付与
az keyvault set-policy \
  --name macrofit-keyvault \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

#### 2.6 App Service環境変数設定

```bash
# 本番環境用環境変数設定
az webapp config appsettings set \
  --name macrofit-app \
  --resource-group macrofit-rg \
  --settings \
    NODE_ENV=production \
    AZURE_KEY_VAULT_URL=https://macrofit-keyvault.vault.azure.net/ \
    AZURE_OPENAI_API_VERSION=2024-02-15-preview \
    AZURE_OPENAI_GPT4_DEPLOYMENT=gpt-4 \
    AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE=120
```

---

### 🛠 Step 3: アプリケーションコード統合

#### 3.1 必要なパッケージインストール

```bash
npm install @azure/keyvault-secrets @azure/identity openai
npm install -D @types/node
```

#### 3.2 設定ファイル配置

提供されたTypeScriptファイルをプロジェクトに配置：

```
src/
├── lib/
│   ├── azure-openai-config.ts     # 設定管理
│   ├── azure-openai-client.ts     # APIクライアント
│   └── rate-limiter.ts           # レート制限
```

#### 3.3 使用例の実装

```typescript
// pages/api/test-ai.ts - テスト用API
import { azureOpenAIClient } from '@/lib/azure-openai-client';

export default async function handler(req: any, res: any) {
  try {
    const response = await azureOpenAIClient.generateMealPlan(
      "あなたは栄養士です。",
      "簡単な朝食メニューを1つ提案してください。",
      { model: 'gpt35', maxTokens: 100 }
    );

    res.status(200).json({ 
      success: true, 
      message: response.choices[0]?.message?.content 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

---

### ⚠️ トラブルシューティング

#### よくあるエラーと解決方法

**1. "Unauthorized" エラー**
```
原因: APIキーが間違っている
解決: Azure ポータルで正しいキーをコピーし直す
```

**2. "Resource not found" エラー**
```
原因: エンドポイントURLが間違っている
解決: エンドポイントがhttps://で始まり、.openai.azure.com/で終わることを確認
```

**3. "Deployment not found" エラー**
```
原因: デプロイメント名が存在しない
解決: Azure OpenAIリソースの「モデルデプロイ」で正しい名前を確認
```

**4. "Rate limit exceeded" エラー**
```
原因: API呼び出し制限に達した
解決: レート制限設定を調整するか、時間をおいてリトライ
```

#### 設定確認チェックリスト

- [ ] Azure OpenAIリソースが作成済み
- [ ] モデル（gpt-4, gpt-35-turbo）がデプロイ済み
- [ ] エンドポイントとAPIキーが正確
- [ ] .env.localファイルが正しい場所にある
- [ ] 環境変数の値にスペースや改行が含まれていない
- [ ] Key Vaultのアクセス権限が設定済み（本番環境）

---

### 📊 動作確認方法

#### 1. 開発環境での確認
```bash
# テストスクリプト実行
npx ts-node test-azure-openai.ts

# Next.jsアプリ起動
npm run dev

# テストAPI呼び出し
curl http://localhost:3000/api/test-ai
```

#### 2. 本番環境での確認
```bash
# App Serviceログ確認
az webapp log tail --name macrofit-app --resource-group macrofit-rg

# Key Vaultアクセステスト
az keyvault secret show --vault-name macrofit-keyvault --name azure-openai-api-key
```

---

## 🎯 完了チェックリスト

### ✅ 開発環境セットアップ完了
- [ ] `.env.local` ファイル作成
- [ ] Azure OpenAI エンドポイント設定
- [ ] APIキー設定
- [ ] デプロイメント名確認
- [ ] 接続テスト実行
- [ ] テストAPI呼び出し成功

### ✅ 本番環境セットアップ完了
- [ ] Azure CLI インストール・ログイン
- [ ] リソースグループ作成
- [ ] Key Vault 作成
- [ ] シークレット登録
- [ ] App Service 作成
- [ ] Managed Identity 設定
- [ ] アクセス権限付与
- [ ] 環境変数設定

### ✅ アプリケーション統合完了
- [ ] 必要パッケージインストール
- [ ] 設定ファイル配置
- [ ] テストAPI実装
- [ ] 動作確認

---

## 💡 開発のヒント

### 段階的アプローチ
1. **まず開発環境で動作確認** → 基本的な接続と設定を確認
2. **本番環境は後で構築** → 開発が安定してから本格運用

### コスト管理
- **開発中は gpt-35-turbo を使用** → コストを抑制
- **本格運用時に gpt-4 に切り替え** → 高品質な結果

### 監視とログ
- **Azure Application Insights** → パフォーマンス監視
- **使用量ダッシュボード** → コスト追跡

---

## 🚨 セキュリティ注意事項

### ❌ やってはいけないこと
- APIキーをGitにコミット
- 環境変数を平文でシェア
- 本番キーを開発環境で使用

### ✅ 推奨事項
- `.env.local` を `.gitignore` に追加
- Key Vault でシークレット管理
- 定期的なキーローテーション

---

## 📞 サポート情報

### エラー時の確認先
1. **Azure ポータル** → リソース状態確認
2. **Azure Monitor** → ログとメトリクス
3. **OpenAI ドキュメント** → API仕様確認

### 参考リンク
- [Azure OpenAI Service ドキュメント](https://learn.microsoft.com/azure/cognitive-services/openai/)
- [Azure Key Vault ドキュメント](https://learn.microsoft.com/azure/key-vault/)
- [Next.js 環境変数ガイド](https://nextjs.org/docs/basic-features/environment-variables)