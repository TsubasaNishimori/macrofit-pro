// 簡易版 Azure OpenAI クライアント（OpenAI SDKなしバージョン）

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 設定管理クラス
class AzureOpenAIConfigManager {
  private static instance: AzureOpenAIConfigManager;
  private config: AzureOpenAIConfig | null = null;

  private constructor() {}

  public static getInstance(): AzureOpenAIConfigManager {
    if (!AzureOpenAIConfigManager.instance) {
      AzureOpenAIConfigManager.instance = new AzureOpenAIConfigManager();
    }
    return AzureOpenAIConfigManager.instance;
  }

  public getConfig(): AzureOpenAIConfig {
    if (this.config) {
      return this.config;
    }

    // 開発環境: 環境変数から読み取り
    this.config = {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
      apiKey: process.env.AZURE_OPENAI_API_KEY || '',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
      deployment: process.env.AZURE_OPENAI_GPT4_DEPLOYMENT || 'gpt-4o-mini',
    };

    return this.config;
  }

  public validateConfig(): { isValid: boolean; error?: string } {
    const config = this.getConfig();
    
    if (!config.endpoint) {
      return { isValid: false, error: 'Azure OpenAI endpoint is missing' };
    }
    
    if (!config.apiKey) {
      return { isValid: false, error: 'Azure OpenAI API key is missing' };
    }
    
    if (!config.endpoint.includes('.openai.azure.com')) {
      return { isValid: false, error: 'Invalid Azure OpenAI endpoint format' };
    }

    return { isValid: true };
  }
}

// Azure OpenAI クライアント（fetch APIベース）
export class MacroFitAzureOpenAIClient {
  private configManager: AzureOpenAIConfigManager;

  constructor() {
    this.configManager = AzureOpenAIConfigManager.getInstance();
  }

  public async generateChatCompletion(
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ChatCompletionResponse> {
    const validation = this.configManager.validateConfig();
    if (!validation.isValid) {
      throw new Error(`Configuration error: ${validation.error}`);
    }

    const config = this.configManager.getConfig();
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    const requestBody = {
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1000,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': config.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error('AI応答の生成に失敗しました。しばらく待ってから再度お試しください。');
    }
  }

  public async generateMealPlan(
    userProfile: {
      weight: number;
      targetWeight: number;
      activityLevel: string;
      proteinRatio: number;
      fatRatio: number;
      carbRatio: number;
    }
  ): Promise<string> {
    const systemPrompt = `あなたは経験豊富な管理栄養士兼筋力トレーニング指導者です。
与えられたユーザーのプロフィールに基づいて、筋トレに最適化された1日の食事プランを作成してください。

重要な原則：
1. PFC比率を正確に守る
2. 筋肉増強/減量目標に合わせる
3. 現実的で実行可能なメニュー
4. 作り置きを考慮した効率的な調理

出力形式：
- 朝食、昼食、夕食、間食の詳細
- 各食事のカロリーとマクロ栄養素
- 簡単な調理指示`;

    const userPrompt = `ユーザープロフィール：
- 現在の体重: ${userProfile.weight}kg
- 目標体重: ${userProfile.targetWeight}kg
- 活動レベル: ${userProfile.activityLevel}
- PFC比率: タンパク質${userProfile.proteinRatio}% / 脂質${userProfile.fatRatio}% / 炭水化物${userProfile.carbRatio}%

上記の条件で最適な1日の食事プランを作成してください。`;

    const response = await this.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.3,
      maxTokens: 2000
    });

    return response.choices[0]?.message?.content || '';
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const validation = this.configManager.validateConfig();
      if (!validation.isValid) {
        return { success: false, message: validation.error || 'Configuration error' };
      }

      const response = await this.generateChatCompletion([
        { role: 'user', content: 'こんにちは！接続テストです。簡単に挨拶してください。' }
      ], {
        maxTokens: 50
      });

      if (response.choices[0]?.message?.content) {
        return { 
          success: true, 
          message: `接続成功！応答: ${response.choices[0].message.content}` 
        };
      }

      return { success: false, message: 'Empty response from Azure OpenAI' };
    } catch (error) {
      return { 
        success: false, 
        message: `接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export const azureOpenAIClient = new MacroFitAzureOpenAIClient();