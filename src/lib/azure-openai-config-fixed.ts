// Azure Key Vault functionality temporarily disabled to avoid dependency issues
// import { DefaultAzureCredential } from '@azure/identity';
// import { SecretClient } from '@azure/keyvault-secrets';

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

  private constructor() {
    // Azure Key Vault functionality temporarily disabled
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

    // 環境変数から直接設定を取得
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      deployments: {
        gpt4: process.env.AZURE_OPENAI_GPT4_DEPLOYMENT || 'gpt-4o-mini',
        gpt35: process.env.AZURE_OPENAI_GPT35_DEPLOYMENT || 'gpt-35-turbo',
        embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
      },
      rateLimits: {
        maxRequestsPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_REQUESTS_PER_MINUTE || '60'),
        maxTokensPerMinute: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS_PER_MINUTE || '200000'),
      },
    };

    return this.config;
  }

  // 設定の検証
  public async validateConfig(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      
      // 必須項目のチェック
      if (!config.endpoint || !config.apiKey) {
        return {
          isValid: false,
          error: 'Azure OpenAI endpoint or API key is missing'
        };
      }

      // エンドポイントの形式チェック
      if (!config.endpoint.includes('.openai.azure.com')) {
        return {
          isValid: false,
          error: 'Invalid Azure OpenAI endpoint format'
        };
      }

      // 接続テスト（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        const connectionTest = await this.testConnection(config);
        if (!connectionTest) {
          return {
            isValid: false,
            error: 'Failed to connect to Azure OpenAI service'
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Failed to validate Azure OpenAI config:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testConnection(config: AzureOpenAIConfig): Promise<boolean> {
    try {
      const response = await fetch(
        `${config.endpoint}/openai/deployments/${config.deployments.gpt4}/chat/completions?api-version=${config.apiVersion}`,
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