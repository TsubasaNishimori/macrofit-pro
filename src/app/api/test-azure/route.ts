import { NextRequest, NextResponse } from 'next/server';
import { azureOpenAIClient } from '@/lib/azure-openai-client';

export async function GET() {
  try {
    console.log('🔍 Azure OpenAI接続テストを開始...');
    
    const result = await azureOpenAIClient.testConnection();
    
    if (result.success) {
      console.log('✅ 接続テスト成功');
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('❌ 接続テスト失敗:', result.message);
      return NextResponse.json({
        success: false,
        error: result.message,
        timestamp: new Date().toISOString(),
      }, { status: 500 });
    }
  } catch (error) {
    console.error('💥 接続テスト中にエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userProfile } = body;

    if (!userProfile) {
      return NextResponse.json({
        success: false,
        error: 'User profile is required',
      }, { status: 400 });
    }

    console.log('🍽️ 食事プラン生成テストを開始...');
    
    const mealPlan = await azureOpenAIClient.generateMealPlan(userProfile);
    
    console.log('✅ 食事プラン生成成功');
    return NextResponse.json({
      success: true,
      mealPlan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('💥 食事プラン生成中にエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}