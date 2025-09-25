import { NextRequest, NextResponse } from 'next/server';
import { MacroFitAzureOpenAIClient } from '@/lib/azure-openai-client';
import { UserInfo, PatternBasedMealPlan } from '@/lib/types';
import { distributeCaloriesByMeals, getMealCalorieDetails } from '@/lib/nutrition-calculator';

interface MealPlanRequest {
  userInfo: UserInfo;
  nutritionTargets: {
    dailyCalories: number;
    dailyProtein: number;
    dailyFat: number;
    dailyCarbs: number;
  };
}

// 食事パターン構造を生成するヘルパー関数
function getMealPatternsStructure(patternSpec: any, proteinIntakeFrequency: number = 0) {
  const structure: any = {};
  
  // プロテイン摂取がある場合は固定メニューとして追加
  if (proteinIntakeFrequency > 0) {
    structure.proteinIntake = {
      name: `プロテイン摂取 (1日${proteinIntakeFrequency}回)`,
      type: "protein",
      frequency: `${proteinIntakeFrequency}回/日`,
      amount: "30g/回",
      calories: `${proteinIntakeFrequency * 120}kcal/日`,
      protein: `${proteinIntakeFrequency * 24}g/日`,
      timing: proteinIntakeFrequency === 1 ? "朝食時または間食" : 
               proteinIntakeFrequency === 2 ? "朝食時・間食時" : 
               "朝食・昼食・夕食のいずれか + 間食",
      preparation: "プロテインパウダー30g + 牛乳200ml",
      note: "常備食材のため買い物リストには含まれません"
    };
  }
  
  if (patternSpec.patterns.includes('breakfast')) {
    structure.breakfast = {
      name: "固定朝食メニュー",
      type: "breakfast",
      calories: "カロリー",
      protein: "タンパク質(g)",
      fat: "脂質(g)",
      carbs: "炭水化物(g)",
      cookingTime: "調理時間(分)",
      batchCookable: "true/false",
      prepQuantity: "7食分",
      ingredients: "[...]",
      instructions: "[...]"
    };
  }
  
  if (patternSpec.patterns.includes('lunch')) {
    structure.lunch = {
      patternA: {
        name: "昼食パターンA",
        type: "lunch",
        calories: "カロリー",
        protein: "タンパク質(g)",
        fat: "脂質(g)",
        carbs: "炭水化物(g)",
        cookingTime: "調理時間(分)",
        batchCookable: true,
        prepQuantity: "4食分（月水金日）",
        ingredients: "[...]",
        instructions: "[...]"
      },
      patternB: {
        name: "昼食パターンB",
        type: "lunch",
        calories: "カロリー",
        protein: "タンパク質(g)",
        fat: "脂質(g)",
        carbs: "炭水化物(g)",
        cookingTime: "調理時間(分)",
        batchCookable: true,
        prepQuantity: "3食分（火木土）",
        ingredients: "[...]",
        instructions: "[...]"
      }
    };
  }
  
  if (patternSpec.patterns.includes('dinner')) {
    structure.dinner = {
      patternA: {
        name: "夕食パターンA",
        type: "dinner",
        calories: "カロリー",
        protein: "タンパク質(g)",
        fat: "脂質(g)",
        carbs: "炭水化物(g)",
        cookingTime: "調理時間(分)",
        batchCookable: true,
        prepQuantity: "4食分（月水金日）",
        ingredients: "[...]",
        instructions: "[...]"
      },
      patternB: {
        name: "夕食パターンB",
        type: "dinner",
        calories: "カロリー",
        protein: "タンパク質(g)",
        fat: "脂質(g)",
        carbs: "炭水化物(g)",
        cookingTime: "調理時間(分)",
        batchCookable: true,
        prepQuantity: "3食分（火木土）",
        ingredients: "[...]",
        instructions: "[...]"
      }
    };
  }
  
  return structure;
}

// 献立から1週間分の買い物リストを自動生成する関数
function generateShoppingListFromMealPlan(mealPlan: PatternBasedMealPlan, proteinIntakeFrequency: number = 0) {
  const ingredientMap = new Map<string, {
    amount: number;
    unit: string;
    estimatedPrice: number;
    category: string;
  }>();

  // プロテイン摂取に必要な材料を追加（プロテインパウダー以外）
  if (proteinIntakeFrequency > 0) {
    // 牛乳（プロテインシェイク用）: 1回200ml × 週7回 × 摂取回数
    const milkAmount = 200 * 7 * proteinIntakeFrequency;
    ingredientMap.set('牛乳', {
      amount: milkAmount,
      unit: 'ml',
      estimatedPrice: Math.ceil((milkAmount / 1000) * 200), // 1L約200円
      category: '乳製品'
    });
  }

  // 全パターンから材料を収集（週間使用回数を考慮）
  const patterns = [];
  if (mealPlan.mealPatterns.breakfast) patterns.push(mealPlan.mealPatterns.breakfast);
  patterns.push(mealPlan.mealPatterns.lunch.patternA);
  patterns.push(mealPlan.mealPatterns.lunch.patternB);
  patterns.push(mealPlan.mealPatterns.dinner.patternA);
  patterns.push(mealPlan.mealPatterns.dinner.patternB);

  patterns.forEach((pattern, index) => {
    if (pattern.ingredients && Array.isArray(pattern.ingredients)) {
      // 週間使用回数を計算
      let weeklyUsage = 1;
      if (index === 0) {
        // 朝食（固定メニュー）: 7回
        weeklyUsage = 7;
      } else if (index === 1) {
        // 昼食パターンA: 4回（月水金日）
        weeklyUsage = 4;
      } else if (index === 2) {
        // 昼食パターンB: 3回（火木土）
        weeklyUsage = 3;
      } else if (index === 3) {
        // 夕食パターンA: 3回（火木土）
        weeklyUsage = 3;
      } else if (index === 4) {
        // 夕食パターンB: 4回（月水金日）
        weeklyUsage = 4;
      }
      
      pattern.ingredients.forEach((ingredient: any) => {
        const name = ingredient.name;
        
        // 常備食材をスキップ
        if (isStockItem(name)) {
          return;
        }
        
        const key = name;
        const category = categorizeIngredient(name);
        // 量と単位の調整（米とパン）
        let adjustedAmount = ingredient.amount;
        let adjustedUnit = ingredient.unit;
        
        // 米類: 炊飯後重量(g) → 生米重量(g) (2.2倍差)
        if (name.includes('米') || name.includes('白米') || name.includes('玄米')) {
          adjustedAmount = Math.ceil(ingredient.amount / 2.2); // 炊飯後→生米
          // shopping表示単位は後で g(生米) に統一するが、価格計算は元々 g 単位想定なので unit は 'g' のままで良い
        }
        
        // 食パン / パン: 6枚切り 1斤=6枚=約340g → 1枚≈57g
        if (name.includes('食パン') || (name === 'パン')) {
          // AI 応答が g・斤・枚 いずれかの可能性を考慮
          if (adjustedUnit === 'g' || adjustedUnit === 'グラム') {
            const slices = adjustedAmount / 57; // 1枚≈57g
            adjustedAmount = Math.ceil(slices * 100) / 100; // 端数保持（最小0.01枚）
            adjustedUnit = '枚';
          } else if (adjustedUnit === '斤') {
            adjustedAmount = adjustedAmount * 6; // 斤→枚
            adjustedUnit = '枚';
          } else if (adjustedUnit === '枚') {
            // そのまま
          } else {
            // 不明な単位は枚換算不能のためそのまま扱う
          }
        }
        
        const weeklyAmount = adjustedAmount * weeklyUsage;
        const estimatedPrice = estimatePrice(name, weeklyAmount, adjustedUnit);
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.amount += weeklyAmount;
          existing.estimatedPrice += estimatedPrice;
          
          // 米類の単位表記を統一
          if ((name.includes('米') || name.includes('白米') || name.includes('玄米')) && existing.unit !== 'g(生米)') {
            existing.unit = 'g(生米)';
          }
          // 食パンの単位表記を統一（枚）
          if ((name.includes('食パン') || name === 'パン') && existing.unit !== '枚') {
            existing.unit = '枚';
          }
        } else {
          // 表示単位調整
          let displayUnit = adjustedUnit;
          if (name.includes('米') || name.includes('白米') || name.includes('玄米')) displayUnit = 'g(生米)';
          if (name.includes('食パン') || name === 'パン') displayUnit = '枚';
          
          ingredientMap.set(key, {
            amount: weeklyAmount,
            unit: displayUnit,
            estimatedPrice: estimatedPrice,
            category: category
          });
        }
      });
    }
  });

  // カテゴリ別にグループ化
  const categories = new Map<string, any[]>();
  
  ingredientMap.forEach((data, name) => {
    if (!categories.has(data.category)) {
      categories.set(data.category, []);
    }
    
    categories.get(data.category)!.push({
      name: name,
      amount: Math.ceil(data.amount),
      unit: data.unit,
      estimatedPrice: Math.ceil(data.estimatedPrice),
      priority: getPriority(name, data.category)
    });
  });

  // 結果を整形（1週間分の買い物リスト）
  const result = {
    totalCost: Math.ceil(Array.from(ingredientMap.values()).reduce((sum, item) => sum + item.estimatedPrice, 0)),
    categories: Array.from(categories.entries()).map(([categoryName, items]) => ({
      name: categoryName,
      items: items.sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      })
    }))
  };

  return result;
}

// 常備食材かどうかをチェックする関数
function isStockItem(ingredientName: string): boolean {
  const name = ingredientName.toLowerCase();
  
  // 主食類は買い物リストに含めるため除外
  // const staples = ['米', '白米', '玄米', 'パン', '食パン', 'オートミール', 'パスタ', 'うどん', 'そば'];
  const seasonings = ['塩', '胡椒', '砂糖', '醤油', '味噌', 'みりん', '酒', 'ごま油', 'オリーブオイル', 'サラダ油', 'バター'];
  const proteinPowders = ['プロテイン', 'プロテインパウダー', 'ホエイプロテイン'];
  
  return seasonings.some(item => name.includes(item)) || 
         proteinPowders.some(item => name.includes(item));
}

// 食材をカテゴリ分けする関数
function categorizeIngredient(ingredientName: string): string {
  const name = ingredientName.toLowerCase();
  
  if (name.includes('白米') || name.includes('玄米') || name.includes('パン') || name.includes('食パン') || name.includes('オートミール') || name.includes('パスタ') || name.includes('うどん') || name.includes('そば')) {
    return '主食・穀物';
  }
  if (name.includes('鶏') || name.includes('豚') || name.includes('牛') || name.includes('肉')) {
    return '肉類';
  }
  if (name.includes('魚') || name.includes('サーモン') || name.includes('まぐろ')) {
    return '魚介類';
  }
  if (name.includes('卵')) {
    return '卵・乳製品';
  }
  if (name.includes('牛乳') || name.includes('チーズ') || name.includes('ヨーグルト')) {
    return '乳製品';
  }
  if (name.includes('豆腐') || name.includes('納豆')) {
    return 'タンパク質・大豆製品';
  }
  if (name.includes('野菜') || name.includes('ブロッコリー') || name.includes('ほうれん草')) {
    return '野菜';
  }
  if (name.includes('果物') || name.includes('バナナ') || name.includes('りんご')) {
    return '果物';
  }
  
  return 'その他';
}

// 1週間分の価格を推定する関数
function estimatePrice(name: string, amount: number, unit: string): number {
  const pricePerUnit: { [key: string]: number } = {
    // 主食類（kg単位で管理）
    '白米': 800,        // 1kg当たり800円
    '玄米': 500,        // 1kg当たり500円
    'オートミール': 600, // 1kg当たり600円
    'パスタ': 400,      // 1kg当たり400円（500g袋×2で算出）
    // パンは個別単位
    '食パン': 150,      // 1斤（約340g）当たり150円
    'パン': 150,        // 1斤当たり150円
    'うどん': 100,      // 1玉当たり100円
    'そば': 150,        // 1束当たり150円
    // 肉類
    '鶏むね肉': 100,    // 100g当たり100円
    '鶏もも肉': 120,    // 100g当たり120円
    '鶏ささみ': 150,    // 100g当たり150円
    '豚肉': 150,        // 100g当たり150円
    '牛肉': 250,        // 100g当たり250円
    'サーモン': 300,    // 100g当たり300円
    'まぐろ': 400,      // 100g当たり400円
    '白身魚': 200,      // 100g当たり200円
    'エビ': 400,        // 100g当たり400円
    '卵': 25,           // 1個当たり25円
    '牛乳': 200,        // 1L当たり200円
    '豆腐': 80,         // 1丁当たり80円
    '納豆': 30,         // 1パック当たり30円
    'ブロッコリー': 150, // 100g当たり150円
    'ほうれん草': 100,   // 100g当たり100円
    'バナナ': 30,       // 1本当たり30円
    'りんご': 100       // 1個当たり100円
  };
  
  const defaultPrice = 100; // デフォルト価格（100g当たり）
  
  // g(生米) のような派生表記は g として扱う
  if (unit.startsWith('g')) {
    const unitPrice = pricePerUnit[name] || defaultPrice;
    
    // kg単位で価格設定されている主食類
    if (name.includes('白米') || name.includes('玄米') || 
        name.includes('オートミール') || name.includes('パスタ')) {
      return Math.ceil((amount / 1000) * unitPrice);
    }
    
    // パンは斤単位（約340g）
    if (name.includes('パン') || name.includes('食パン')) {
      return Math.ceil((amount / 340) * unitPrice);
    }
    
    // その他の食材は100g単位
    return Math.ceil((amount / 100) * unitPrice);
  } else if (unit === '枚') {
    // 食パン 6枚 = 1斤
    if (name.includes('食パン') || name === 'パン') {
      const loafPrice = pricePerUnit['食パン'] || pricePerUnit['パン'] || 150;
      return Math.ceil((amount / 6) * loafPrice);
    }
    // 想定外の枚は一旦1枚50円換算
    return Math.ceil(amount * 50);
  } else if (unit === 'ml') {
    const unitPrice = pricePerUnit[name] || 200; // デフォルト1L=200円
    return Math.ceil((amount / 1000) * unitPrice);
  } else if (unit === '個' || unit === '本' || unit === 'パック' || unit === '丁') {
    const unitPrice = pricePerUnit[name] || 50;
    return Math.ceil(amount * unitPrice);
  } else {
    return Math.ceil(amount * 50);
  }
}

// 優先度を設定する関数
function getPriority(name: string, category: string): 'high' | 'medium' | 'low' {
  if (category === '主食・穀物' || category === '肉類' || category === '魚介類' || category === '卵・乳製品' || category === 'タンパク質・大豆製品') {
    return 'high';
  }
  if (category === '野菜') {
    return 'medium';
  }
  return 'low';
}

export async function POST(request: NextRequest) {
  try {
    const body: MealPlanRequest = await request.json();
    const { userInfo, nutritionTargets } = body;

    // プロテイン摂取回数と朝食主食の情報を取得
    const proteinIntakeFrequency = (userInfo as any).proteinIntakeFrequency || 0;
    const breakfastStaple = (userInfo as any).breakfastStaple || '食パン';

    // プロテイン摂取分の栄養を計算（1回30g = 約120kcal、タンパク質24g）
    const proteinCalories = proteinIntakeFrequency * 120;
    const proteinAmount = proteinIntakeFrequency * 24;
    
    // プロテイン摂取分を考慮した調整済み栄養目標
    const adjustedNutritionTargets = {
      dailyCalories: nutritionTargets.dailyCalories - proteinCalories,
      dailyProtein: nutritionTargets.dailyProtein - proteinAmount,
      dailyFat: nutritionTargets.dailyFat,
      dailyCarbs: nutritionTargets.dailyCarbs
    };
    


    // 食事回数は3回固定
    const mealsPerDay = 3;
    // プロテイン摂取分を除いた食事のカロリー目標で計算
    const mealCalorieTargets = distributeCaloriesByMeals(adjustedNutritionTargets.dailyCalories, mealsPerDay);
    const mealDetails = getMealCalorieDetails(adjustedNutritionTargets.dailyCalories, mealsPerDay);
    
    // 食事別の詳細な目標を作成
    const mealTargetsText = mealDetails.map(detail => 
      `${detail.name}: ${detail.calories}kcal (${detail.percentage}%)`
    ).join('\n');

    // Azure OpenAI クライアント初期化
    const client = new MacroFitAzureOpenAIClient();
    
    // 食事回数に応じたパターン仕様を作成（3食固定）
    const patternSpec = {
      description: "食事パターン仕様 (3食): 朝食 (固定), 昼食 (パターンA/B), 夕食 (パターンA/B)",
      patterns: ['breakfast', 'lunch', 'dinner'],
      snackIncluded: false
    };

    // 週間献立生成プロンプト作成
  const systemPrompt = `栄養専門家として、効率的かつ飽きにくい週間食事パターンを作成してください。

食事パターン仕様:
- 朝食: 固定メニュー (毎日同じ)
- 昼食・夕食: 各2パターン (A/B交互使用)
- 週間スケジュール: 昼食と夕食で毎日 A/B を入れ替えて飽きにくくする
- 例: 月(L:A D:B) / 火(L:B D:A) / 水(L:A D:B) / 木(L:B D:A) / 金(L:A D:B) / 土(L:B D:A) / 日(L:A D:B)

必要条件:
1. 各食事の指定カロリーを厳守 (±2%以内)
2. 作り置き最大化 (昼食・夕食2パターン)
3. ユーザー選択タンパク質源を優先、アレルギー除外
4. 米類は炊飯後重量で記載し生米量を併記: "白米150g(0.5合分)"
5. 食パンは6枚切り想定 (1斤=6枚=約340g, 1枚≈57g)。使用する場合は単位を必ず枚で記載し、例: "食パン2枚"。グラム表記は禁止。

${proteinIntakeFrequency > 0 ? `プロテイン摂取 (1日${proteinIntakeFrequency}回):
- タイミング: ${proteinIntakeFrequency === 1 ? '朝食時or間食' : proteinIntakeFrequency === 2 ? '朝食時・間食時' : '食事時+間食時'}
- 1回: 30g+牛乳200ml=120kcal、24g蛋白質
- 注意: 食事栄養計算に含めない
` : ''}
出力形式: 純粋JSON、説明不要、{で開始}で終了

材料形式:
[{"name":"食材名","amount":数値,"unit":"単位","calories":数値,"protein":数値,"fat":数値,"carbs":数値}]

調理手順形式:
["手順1","手順2","手順3"]

出力JSON構造:
{
  "totalCost": 数値,
  "prepTime": 数値,
  "nutritionSummary": {"dailyCalories":数値,"dailyProtein":数値,"dailyFat":数値,"dailyCarbs":数値},
  "mealPatterns": ${JSON.stringify(getMealPatternsStructure(patternSpec, proteinIntakeFrequency), null, 2)},
  "weeklySchedule": {"monday":{"lunch":"patternA","dinner":"patternB"},"tuesday":{"lunch":"patternB","dinner":"patternA"},"wednesday":{"lunch":"patternA","dinner":"patternB"},"thursday":{"lunch":"patternB","dinner":"patternA"},"friday":{"lunch":"patternA","dinner":"patternB"},"saturday":{"lunch":"patternB","dinner":"patternA"},"sunday":{"lunch":"patternA","dinner":"patternB"}}
}`;

    const userPrompt = `プロフィール:
身長${userInfo.height}cm、体重${userInfo.weight}→${userInfo.targetWeight}kg、${userInfo.gender === 'male' ? '男性' : '女性'}、運動週${userInfo.exerciseFrequency}回
朝食主食: ${breakfastStaple}、プロテイン1日${proteinIntakeFrequency}回

栄養目標 (食事分、プロテイン${proteinCalories}kcal・${proteinAmount}g別途):
カロリー${adjustedNutritionTargets.dailyCalories}kcal、蛋白質${adjustedNutritionTargets.dailyProtein}g、脂質${adjustedNutritionTargets.dailyFat}g、炭水化物${adjustedNutritionTargets.dailyCarbs}g

食事別目標 (厳守):
${mealTargetsText}

タンパク質源: ${userInfo.proteinSources?.length ? userInfo.proteinSources.join(', ') : '指定なし'}
アレルギー除外: ${userInfo.allergies?.length ? userInfo.allergies.join(', ') : 'なし'}

純粋JSONで回答、{開始}終了`;

    const response = await client.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.1,
      maxTokens: 3000
    });

    const aiResponse = response.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('AI応答が空です');
    }

    // JSONレスポンスをパース
    let mealPlan: PatternBasedMealPlan;
    try {
      // AI応答から純粋なJSONを抽出
      let cleanResponse = aiResponse;
      
      // JSONブロックのみを抽出
      const jsonBlockMatch = cleanResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleanResponse = jsonBlockMatch[1];
      } else {
        const firstBrace = cleanResponse.indexOf('{');
        const lastBrace = cleanResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanResponse = cleanResponse.substring(firstBrace, lastBrace + 1);
        }
      }
      
      cleanResponse = cleanResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      mealPlan = JSON.parse(cleanResponse);
      
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      throw new Error(`AI応答の解析に失敗しました。応答が不完全または形式が正しくありません。`);
    }

    // 献立から1週間分の買い物リストを自動生成
    const shoppingList = generateShoppingListFromMealPlan(mealPlan, proteinIntakeFrequency);

    return NextResponse.json({
      success: true,
      data: {
        mealPlan: mealPlan,
        shoppingList: shoppingList
      },
      message: '週間献立と1週間分の買い物リストを生成しました'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '献立生成に失敗しました。しばらく待ってから再度お試しください。',
      message: '週間献立生成に失敗しました'
    }, { status: 500 });
  }
}