'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  mealPlan?: string;
  timestamp: string;
}

export default function TestPage() {
  const [connectionResult, setConnectionResult] = useState<TestResult | null>(null);
  const [mealPlanResult, setMealPlanResult] = useState<TestResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingMealPlan, setIsTestingMealPlan] = useState(false);

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const response = await fetch('/api/test-azure');
      const result = await response.json();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testMealPlanGeneration = async () => {
    setIsTestingMealPlan(true);
    setMealPlanResult(null);

    try {
      const response = await fetch('/api/test-azure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userProfile: {
            weight: 70,
            targetWeight: 65,
            activityLevel: 'moderate',
            proteinRatio: 30,
            fatRatio: 25,
            carbRatio: 45,
          },
        }),
      });
      const result = await response.json();
      setMealPlanResult(result);
    } catch (error) {
      setMealPlanResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTestingMealPlan(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MacroFit Pro - Azure OpenAI テスト
          </h1>
          <p className="text-gray-600">
            Azure OpenAI統合の動作確認を行います
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* 接続テスト */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              🔗 Azure OpenAI 接続テスト
            </h2>
            
            <div className="mb-4">
              <button
                onClick={testConnection}
                disabled={isTestingConnection}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isTestingConnection ? '接続中...' : '接続テスト実行'}
              </button>
            </div>

            {connectionResult && (
              <div className={`p-4 rounded-lg ${
                connectionResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  <span className={`text-lg mr-2 ${
                    connectionResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {connectionResult.success ? '✅' : '❌'}
                  </span>
                  <span className="font-semibold">
                    {connectionResult.success ? '接続成功' : '接続失敗'}
                  </span>
                </div>
                {connectionResult.message && (
                  <p className="text-gray-700 mb-2">{connectionResult.message}</p>
                )}
                {connectionResult.error && (
                  <p className="text-red-600 mb-2">{connectionResult.error}</p>
                )}
                <p className="text-xs text-gray-500">
                  {new Date(connectionResult.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            )}
          </div>

          {/* 食事プラン生成テスト */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              🍽️ 食事プラン生成テスト
            </h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                テスト用プロフィール: 体重70kg → 65kg, 中程度の活動レベル, PFC比率 30:25:45
              </p>
              <button
                onClick={testMealPlanGeneration}
                disabled={isTestingMealPlan}
                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isTestingMealPlan ? '生成中...' : '食事プラン生成テスト実行'}
              </button>
            </div>

            {mealPlanResult && (
              <div className={`p-4 rounded-lg ${
                mealPlanResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center mb-2">
                  <span className={`text-lg mr-2 ${
                    mealPlanResult.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {mealPlanResult.success ? '✅' : '❌'}
                  </span>
                  <span className="font-semibold">
                    {mealPlanResult.success ? '生成成功' : '生成失敗'}
                  </span>
                </div>
                
                {mealPlanResult.mealPlan && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">生成された食事プラン:</h3>
                    <div className="bg-white p-4 rounded border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {mealPlanResult.mealPlan}
                      </pre>
                    </div>
                  </div>
                )}
                
                {mealPlanResult.error && (
                  <p className="text-red-600 mb-2">{mealPlanResult.error}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(mealPlanResult.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            )}
          </div>

          {/* 環境設定確認 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              ⚙️ 環境設定確認
            </h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Azure OpenAI エンドポイント:</span>
                <span className="text-gray-600">
                  {process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT_SET ? '✅ 設定済み' : '❌ 未設定'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Azure OpenAI APIキー:</span>
                <span className="text-gray-600">
                  {process.env.NEXT_PUBLIC_AZURE_OPENAI_KEY_SET ? '✅ 設定済み' : '❌ 未設定'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>デプロイメント名:</span>
                <span className="text-gray-600">gpt-4o-mini</span>
              </div>
            </div>
          </div>

          {/* ホームに戻る */}
          <div className="text-center">
            <a
              href="/"
              className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              ← ホームに戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}