import { NextRequest, NextResponse } from 'next/server';
import { MacroFitAzureOpenAIClient } from '@/lib/azure-openai-client';
import { UserInfo, ShoppingList } from '@/lib/types';

interface ShoppingListRequest {
  userInfo: UserInfo;
  nutritionTargets: {
    dailyCalories: number;
    dailyProtein: number;
    dailyFat: number;
    dailyCarbs: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 買い物リスト生成API開始');

    const body: ShoppingListRequest = await request.json();
    const { userInfo, nutritionTargets } = body;

    console.log('ユーザー情報:', userInfo);
    console.log('栄養目標:', nutritionTargets);

    // Azure OpenAI クライアント初期化
    const client = new MacroFitAzureOpenAIClient();
    
    // 買い物リスト生成プロンプト作成
    const systemPrompt = `あなたは筋トレ・栄養管理の専門家です。
ユーザーの情報と栄養目標に基づいて、1週間分の買い物リストを作成してください。

【重要な制約事項】：
1. ユーザーの好みのタンパク質源を【必ず優先的に選択】すること
2. アレルギー食材は【絶対に含めない】こと
3. 栄養目標を満たす食材を選定
4. バッチ調理（作り置き）に適した食材
5. コストパフォーマンスの良い食材
6. 日本で一般的に入手可能な食材

【タンパク質源の選択ルール】：
- ユーザーが指定したタンパク質源を最優先で使用
- 指定されていないタンパク質源は使用を控える
- 栄養バランスを考慮し、指定されたタンパク質源の組み合わせで目標を達成

出力形式：
必ずJSON形式で以下の構造で返してください：
{
  "totalCost": 推定総額,
  "categories": [
    {
      "name": "カテゴリ名",
      "items": [
        {
          "name": "商品名",
          "amount": 数量,
          "unit": "単位",
          "estimatedPrice": 推定価格,
          "priority": "high|medium|low",
          "notes": "備考（任意）"
        }
      ]
    }
  ]
}`;

    const userPrompt = `ユーザープロフィール：
- 身長: ${userInfo.height}cm
- 現在の体重: ${userInfo.weight}kg
- 目標体重: ${userInfo.targetWeight}kg
- 性別: ${userInfo.gender === 'male' ? '男性' : '女性'}
- 運動頻度: 週${userInfo.exerciseFrequency}回
- 食事回数: 1日${userInfo.mealsPerDay || 3}回

栄養目標（1日あたり）：
- カロリー: ${nutritionTargets.dailyCalories}kcal
- タンパク質: ${nutritionTargets.dailyProtein}g
- 脂質: ${nutritionTargets.dailyFat}g
- 炭水化物: ${nutritionTargets.dailyCarbs}g

【最重要】好みのタンパク質源: ${userInfo.proteinSources?.length ? userInfo.proteinSources.join(', ') : '指定なし'}
${userInfo.proteinSources?.length ? 
`→ この食材を必ず買い物リストに含めてください: ${userInfo.proteinSources.join(', ')}` : 
'→ 一般的なタンパク質源を選択してください'}

【絶対除外】アレルギー食材: ${userInfo.allergies?.length ? userInfo.allergies.join(', ') : 'なし'}
${userInfo.allergies?.length ? 
`→ これらの食材は絶対に買い物リストに含めないでください: ${userInfo.allergies.join(', ')}` : ''}

上記の条件で、1週間分の効率的な買い物リストを作成してください。
特に、ユーザーが選択したタンパク質源を中心とした食材選択を行ってください。
カテゴリは「肉類・タンパク質」「野菜・果物」「炭水化物」「調味料・その他」で分類してください。`;

    console.log('Azure OpenAI API呼び出し開始...');

    const response = await client.generateChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.3,
      maxTokens: 4000
    });

    const aiResponse = response.choices[0]?.message?.content;
    console.log('AI応答:', aiResponse);

    if (!aiResponse) {
      throw new Error('AI応答が空です');
    }

    // JSONレスポンスをパース
    let shoppingList: ShoppingList;
    try {
      // コードブロックやマークダウンを除去
      const cleanResponse = aiResponse
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      shoppingList = JSON.parse(cleanResponse);
      console.log('パース済み買い物リスト:', Object.keys(shoppingList));
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('AI応答内容（最初の1000文字）:', aiResponse.substring(0, 1000));
      
      // AIからの応答が解析できない場合はエラーを返す
      throw new Error('AI応答の解析に失敗しました。再度お試しください。');
    }

    console.log('✅ 買い物リスト生成完了');

    return NextResponse.json({
      success: true,
      data: shoppingList,
      message: '買い物リストを生成しました'
    });

  } catch (error) {
    console.error('❌ 買い物リスト生成エラー:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知のエラー',
      message: '買い物リスト生成に失敗しました'
    }, { status: 500 });
  }
}