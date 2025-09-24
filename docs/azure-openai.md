# Azure OpenAI 統合設計書

## プロンプト設計とテンプレート

### システムプロンプト（メニュー生成用）
```typescript
const SYSTEM_PROMPT_MENU_GENERATION = `
あなたは経験豊富な管理栄養士兼筋力トレーニング指導者です。
与えられた制約条件とマクロ栄養素目標に基づいて、バッチクッキングに最適化された週次食事プランを作成してください。

## 重要な原則：
1. **精密なマクロ管理**: PFC比率を±5%以内で達成
2. **バッチクッキング最適化**: 作り置き可能なレシピを優先、準備工程の重複を最小化
3. **食材効率**: 同じ食材を複数レシピで活用、廃棄を最小限に
4. **現実的な調理**: 指定された器具と調理時間内で完了可能
5. **コスト効率**: 予算内で栄養価の高い食材を選択

## 出力形式：
必ずJSON形式で応答し、以下の構造に従ってください：
{
  "weeklyPlan": {
    "totalCalories": number,
    "avgMacros": { "protein": number, "fat": number, "carbs": number },
    "estimatedCost": number,
    "totalPrepTime": number,
    "days": [...] // 日別詳細
  },
  "shoppingList": [...],
  "batchCookingInstructions": [...]
}

## 栄養計算：
- カロリー計算は小数点以下四捨五入
- マクロ栄養素は整数で表示
- 食材の栄養価は日本食品標準成分表2020年版（八訂）準拠
`;

const USER_PROMPT_TEMPLATE = `
## ユーザープロフィール
- 体重: {weight}kg
- 目標体重: {targetWeight}kg  
- 体脂肪率: {bodyFatPercentage}%
- 活動レベル: {activityLevel}

## 栄養目標（1日あたり）
- 総カロリー: {dailyCalories}kcal
- タンパク質: {protein}g ({proteinRatio}%)
- 脂質: {fat}g ({fatRatio}%)
- 炭水化物: {carbs}g ({carbRatio}%)
- 食事回数: {mealsPerDay}回

## 制約条件
- 週間予算: ¥{budget}
- アレルギー: {allergies}
- 嫌いな食材: {dislikedFoods}
- 最大調理時間: {maxCookingTime}分
- 利用可能器具: {equipment}
- 調理スキル: {skillLevel}

## 常備品（利用可能）
{pantryItems}

## 特別要求
{specialRequests}

上記条件で7日間の食事プランを作成してください。
`;
```

### Function Calling スキーマ定義
```typescript
const WEEKLY_PLAN_FUNCTION_SCHEMA = {
  name: "generate_weekly_meal_plan",
  description: "筋トレ特化型の週次食事プランを生成",
  parameters: {
    type: "object",
    properties: {
      weeklyPlan: {
        type: "object",
        properties: {
          planId: { type: "string", description: "プランの一意識別子" },
          week: { type: "string", format: "date", description: "週の開始日 (YYYY-MM-DD)" },
          totalCalories: { type: "integer", description: "週間総カロリー" },
          avgDailyMacros: {
            type: "object",
            properties: {
              protein: { type: "integer", description: "平均日次タンパク質(g)" },
              fat: { type: "integer", description: "平均日次脂質(g)" },
              carbs: { type: "integer", description: "平均日次炭水化物(g)" }
            },
            required: ["protein", "fat", "carbs"]
          },
          estimatedTotalCost: { type: "number", description: "推定総コスト（円）" },
          totalPrepTime: { type: "integer", description: "総準備時間（分）" },
          days: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", format: "date" },
                dayOfWeek: { type: "string", enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
                totalCalories: { type: "integer" },
                macros: {
                  type: "object",
                  properties: {
                    protein: { type: "integer" },
                    fat: { type: "integer" },
                    carbs: { type: "integer" }
                  },
                  required: ["protein", "fat", "carbs"]
                },
                meals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      mealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack1", "snack2"] },
                      name: { type: "string", maxLength: 100 },
                      description: { type: "string", maxLength: 300 },
                      calories: { type: "integer", minimum: 50, maximum: 1500 },
                      macros: {
                        type: "object",
                        properties: {
                          protein: { type: "integer", minimum: 0 },
                          fat: { type: "integer", minimum: 0 },
                          carbs: { type: "integer", minimum: 0 }
                        },
                        required: ["protein", "fat", "carbs"]
                      },
                      ingredients: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            amount: { type: "number", minimum: 0 },
                            unit: { type: "string", enum: ["g", "ml", "個", "枚", "本", "切れ", "カップ", "大さじ", "小さじ"] },
                            calories: { type: "integer" },
                            protein: { type: "number" },
                            fat: { type: "number" },
                            carbs: { type: "number" }
                          },
                          required: ["name", "amount", "unit", "calories", "protein", "fat", "carbs"]
                        }
                      },
                      instructions: {
                        type: "array",
                        items: { type: "string", maxLength: 200 }
                      },
                      cookingTime: { type: "integer", minimum: 0, maximum: 180 },
                      difficulty: { type: "integer", minimum: 1, maximum: 5 },
                      batchCookable: { type: "boolean" },
                      servings: { type: "integer", minimum: 1, maximum: 10 },
                      storageLife: { type: "integer", description: "保存可能日数" }
                    },
                    required: ["mealType", "name", "calories", "macros", "ingredients", "instructions"]
                  }
                }
              },
              required: ["date", "dayOfWeek", "totalCalories", "macros", "meals"]
            }
          }
        },
        required: ["planId", "week", "totalCalories", "avgDailyMacros", "days"]
      },
      shoppingList: {
        type: "object",
        properties: {
          totalEstimatedCost: { type: "number" },
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoryName: { type: "string", enum: ["野菜・果物", "肉類", "魚介類", "乳製品・卵", "穀物・パン", "調味料・油", "冷凍食品", "その他"] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      amount: { type: "number" },
                      unit: { type: "string" },
                      estimatedPrice: { type: "number" },
                      priority: { type: "string", enum: ["必須", "推奨", "任意"] },
                      alternatives: {
                        type: "array",
                        items: { type: "string" }
                      },
                      notes: { type: "string", maxLength: 100 }
                    },
                    required: ["name", "amount", "unit", "estimatedPrice", "priority"]
                  }
                }
              },
              required: ["categoryName", "items"]
            }
          }
        },
        required: ["totalEstimatedCost", "categories"]
      },
      batchCookingInstructions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phase: { type: "string", enum: ["事前準備", "メイン調理", "仕上げ・保存"] },
            order: { type: "integer", minimum: 1 },
            title: { type: "string", maxLength: 50 },
            description: { type: "string", maxLength: 300 },
            estimatedTime: { type: "integer", description: "推定時間（分）" },
            equipment: {
              type: "array",
              items: { type: "string" }
            },
            tips: { type: "string", maxLength: 200 }
          },
          required: ["phase", "order", "title", "description", "estimatedTime"]
        }
      }
    },
    required: ["weeklyPlan", "shoppingList", "batchCookingInstructions"]
  }
};
```

## TypeScript統合コード

### Azure OpenAI クライアント設定
```typescript
import { OpenAIApi, Configuration } from 'openai';
import { z } from 'zod';

interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  apiVersion: string;
}

class MacroFitAIService {
  private openai: OpenAIApi;
  private config: AzureOpenAIConfig;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    
    const configuration = new Configuration({
      basePath: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
      apiKey: config.apiKey,
      defaultHeaders: {
        'api-key': config.apiKey,
      },
      defaultQuery: {
        'api-version': config.apiVersion,
      },
    });

    this.openai = new OpenAIApi(configuration);
  }

  /**
   * 週次食事プラン生成
   */
  async generateWeeklyMealPlan(
    userProfile: UserProfile,
    nutritionTargets: MacroTargets,
    constraints: MealPlanConstraints,
    retryCount: number = 0
  ): Promise<WeeklyMealPlan> {
    const maxRetries = 3;
    
    try {
      // プロンプト構築
      const systemPrompt = SYSTEM_PROMPT_MENU_GENERATION;
      const userPrompt = this.buildUserPrompt(userProfile, nutritionTargets, constraints);

      // API呼び出し
      const startTime = Date.now();
      
      const response = await this.openai.createChatCompletion({
        model: 'gpt-4-turbo', // デプロイメント名
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        functions: [WEEKLY_PLAN_FUNCTION_SCHEMA],
        function_call: { name: 'generate_weekly_meal_plan' },
        temperature: 0.3, // 決定論的な結果を重視
        max_tokens: 4096,
      });

      const duration = Date.now() - startTime;

      // レスポンス検証
      const functionCall = response.data.choices[0]?.message?.function_call;
      if (!functionCall || functionCall.name !== 'generate_weekly_meal_plan') {
        throw new Error('Invalid function call response');
      }

      const planData = JSON.parse(functionCall.arguments);
      
      // 栄養バランス検証
      const validationResult = this.validateGeneratedPlan(planData, nutritionTargets);
      if (!validationResult.isValid && retryCount < maxRetries) {
        console.warn(`Plan validation failed (attempt ${retryCount + 1}):`, validationResult.errors);
        return this.generateWeeklyMealPlan(userProfile, nutritionTargets, constraints, retryCount + 1);
      }

      // 使用量とコストをログ
      await this.logAPIUsage({
        model: 'gpt-4-turbo',
        tokensUsed: response.data.usage?.total_tokens || 0,
        duration,
        cost: this.calculateCost(response.data.usage?.total_tokens || 0),
        userPromptTokens: response.data.usage?.prompt_tokens || 0,
        responseTokens: response.data.usage?.completion_tokens || 0,
      });

      return this.transformToWeeklyMealPlan(planData);

    } catch (error) {
      if (retryCount < maxRetries) {
        console.error(`API call failed (attempt ${retryCount + 1}):`, error);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.generateWeeklyMealPlan(userProfile, nutritionTargets, constraints, retryCount + 1);
      }
      
      throw new Error(`Failed to generate meal plan after ${maxRetries} retries: ${error.message}`);
    }
  }

  /**
   * プロンプト構築
   */
  private buildUserPrompt(
    profile: UserProfile,
    targets: MacroTargets,
    constraints: MealPlanConstraints
  ): string {
    return USER_PROMPT_TEMPLATE
      .replace('{weight}', profile.currentWeight.toString())
      .replace('{targetWeight}', profile.targetWeight.toString())
      .replace('{bodyFatPercentage}', profile.bodyFatPercentage?.toString() || 'N/A')
      .replace('{activityLevel}', profile.activityLevel)
      .replace('{dailyCalories}', targets.calories.toString())
      .replace('{protein}', targets.protein.toString())
      .replace('{proteinRatio}', ((targets.proteinCalories / targets.calories) * 100).toFixed(1))
      .replace('{fat}', targets.fat.toString())
      .replace('{fatRatio}', ((targets.fatCalories / targets.calories) * 100).toFixed(1))
      .replace('{carbs}', targets.carbs.toString())
      .replace('{carbRatio}', ((targets.carbCalories / targets.calories) * 100).toFixed(1))
      .replace('{mealsPerDay}', profile.mealsPerDay.toString())
      .replace('{budget}', constraints.weeklyBudget.toString())
      .replace('{allergies}', constraints.allergies.join(', ') || 'なし')
      .replace('{dislikedFoods}', constraints.dislikedFoods.join(', ') || 'なし')
      .replace('{maxCookingTime}', constraints.maxCookingTime.toString())
      .replace('{equipment}', constraints.availableEquipment.join(', '))
      .replace('{skillLevel}', constraints.skillLevel)
      .replace('{pantryItems}', constraints.pantryItems.map(item => `- ${item.name} (${item.amount}${item.unit})`).join('\n'))
      .replace('{specialRequests}', constraints.specialRequests || 'なし');
  }

  /**
   * 生成プラン検証
   */
  private validateGeneratedPlan(
    planData: any,
    expectedTargets: MacroTargets
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールド検証
    const requiredFields = ['weeklyPlan', 'shoppingList', 'batchCookingInstructions'];
    requiredFields.forEach(field => {
      if (!planData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    if (planData.weeklyPlan?.days) {
      // 各日の栄養バランス検証
      planData.weeklyPlan.days.forEach((day: any, index: number) => {
        const dayCalories = day.totalCalories;
        const expectedCalories = expectedTargets.calories;
        const calorieVariance = Math.abs(dayCalories - expectedCalories) / expectedCalories;

        if (calorieVariance > 0.1) { // ±10%以内
          warnings.push(`Day ${index + 1}: Calorie variance ${(calorieVariance * 100).toFixed(1)}%`);
        }

        // マクロバランス検証
        const { protein, fat, carbs } = day.macros;
        const proteinVariance = Math.abs(protein - expectedTargets.protein) / expectedTargets.protein;
        const fatVariance = Math.abs(fat - expectedTargets.fat) / expectedTargets.fat;
        const carbVariance = Math.abs(carbs - expectedTargets.carbs) / expectedTargets.carbs;

        if (proteinVariance > 0.15) {
          warnings.push(`Day ${index + 1}: Protein variance ${(proteinVariance * 100).toFixed(1)}%`);
        }
        if (fatVariance > 0.2) {
          warnings.push(`Day ${index + 1}: Fat variance ${(fatVariance * 100).toFixed(1)}%`);
        }
        if (carbVariance > 0.2) {
          warnings.push(`Day ${index + 1}: Carb variance ${(carbVariance * 100).toFixed(1)}%`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * コスト計算（GPT-4 Turbo料金）
   */
  private calculateCost(totalTokens: number): number {
    // Azure OpenAI GPT-4 Turbo料金（2025年想定）
    const inputCostPer1kTokens = 0.01; // $0.01 per 1K tokens
    const outputCostPer1kTokens = 0.03; // $0.03 per 1K tokens
    
    // 簡略化：total tokensの70%をinput、30%をoutputと仮定
    const inputTokens = totalTokens * 0.7;
    const outputTokens = totalTokens * 0.3;
    
    const cost = (inputTokens / 1000 * inputCostPer1kTokens) + 
                 (outputTokens / 1000 * outputCostPer1kTokens);
    
    return cost;
  }

  /**
   * API使用量ログ
   */
  private async logAPIUsage(usage: {
    model: string;
    tokensUsed: number;
    duration: number;
    cost: number;
    userPromptTokens: number;
    responseTokens: number;
  }): Promise<void> {
    // データベースへのログ記録（実装は省略）
    console.log('API Usage:', usage);
  }

  /**
   * エラー時の遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * レスポンス変換
   */
  private transformToWeeklyMealPlan(planData: any): WeeklyMealPlan {
    // 型安全な変換処理（実装は省略）
    return planData as WeeklyMealPlan;
  }
}
```

### ガードレールとフォールバック

```typescript
/**
 * AI応答のガードレール実装
 */
class AIResponseGuardRails {
  /**
   * 栄養価の妥当性チェック
   */
  static validateNutritionValues(meal: any): boolean {
    const { calories, macros } = meal;
    
    // カロリー整合性チェック
    const calculatedCalories = (macros.protein * 4) + (macros.fat * 9) + (macros.carbs * 4);
    const calorieVariance = Math.abs(calories - calculatedCalories) / calories;
    
    if (calorieVariance > 0.15) { // 15%以上の差異は異常
      return false;
    }

    // 栄養価の現実的範囲チェック
    if (calories < 50 || calories > 1500) return false;
    if (macros.protein < 0 || macros.protein > 150) return false;
    if (macros.fat < 0 || macros.fat > 100) return false;
    if (macros.carbs < 0 || macros.carbs > 300) return false;

    return true;
  }

  /**
   * 食材の実在性チェック
   */
  static async validateIngredients(ingredients: any[]): Promise<boolean> {
    const knownIngredients = await this.getKnownIngredients();
    
    for (const ingredient of ingredients) {
      if (!knownIngredients.has(ingredient.name.toLowerCase())) {
        console.warn(`Unknown ingredient detected: ${ingredient.name}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * フォールバック用テンプレートプラン
   */
  static generateFallbackPlan(targets: MacroTargets): WeeklyMealPlan {
    // 基本的なテンプレートプランを返す
    return {
      planId: `fallback_${Date.now()}`,
      week: new Date().toISOString().split('T')[0],
      totalCalories: targets.calories * 7,
      avgDailyMacros: {
        protein: targets.protein,
        fat: targets.fat,
        carbs: targets.carbs
      },
      // ... 基本的なテンプレート構造
    };
  }

  private static async getKnownIngredients(): Promise<Set<string>> {
    // 既知の食材リストを取得（データベースから）
    // 実装は省略
    return new Set(['鶏胸肉', '米', '卵', '野菜']);
  }
}
```

## Redis キャッシュ戦略

```typescript
/**
 * AI応答キャッシュ管理
 */
class AIResponseCache {
  private redis: Redis;
  
  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  /**
   * プラン生成リクエストのキャッシュキー生成
   */
  private generateCacheKey(
    profile: UserProfile,
    targets: MacroTargets,
    constraints: MealPlanConstraints
  ): string {
    const keyData = {
      weight: profile.currentWeight,
      calories: targets.calories,
      macros: [targets.protein, targets.fat, targets.carbs],
      budget: constraints.weeklyBudget,
      allergies: constraints.allergies.sort(),
      equipment: constraints.availableEquipment.sort()
    };
    
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `meal_plan:${hash}`;
  }

  /**
   * キャッシュから取得
   */
  async getCachedPlan(
    profile: UserProfile,
    targets: MacroTargets,
    constraints: MealPlanConstraints
  ): Promise<WeeklyMealPlan | null> {
    const key = this.generateCacheKey(profile, targets, constraints);
    const cached = await this.redis.get(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * キャッシュに保存
   */
  async cachePlan(
    plan: WeeklyMealPlan,
    profile: UserProfile,
    targets: MacroTargets,
    constraints: MealPlanConstraints
  ): Promise<void> {
    const key = this.generateCacheKey(profile, targets, constraints);
    const ttl = 24 * 60 * 60; // 24時間
    
    await this.redis.setex(key, ttl, JSON.stringify(plan));
  }
}
```