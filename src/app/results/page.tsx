'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserInfo, NutritionTargets, WeightProjection, ShoppingList, WeeklyMealPlan, PatternBasedMealPlan } from '@/lib/types';
import { calculatePFCTargets, calculateWeightProjection } from '@/lib/nutrition-calculator';
import NutritionSummary from '@/components/results/NutritionSummary';
import WeightProjectionDisplay from '@/components/results/WeightProjection';
import ShoppingListDisplay from '@/components/results/ShoppingList';
import WeeklyMealPlanDisplay from '@/components/results/WeeklyMealPlan';
import ChatComponent from '@/components/results/ChatComponent';

export default function Results() {
  const router = useRouter();
  const chatSectionRef = useRef<HTMLDivElement>(null);
  const [userInfo, setUserInfo] = useState<Partial<UserInfo>>({});
  const [isUserInfoLoaded, setIsUserInfoLoaded] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionTargets | null>(null);
  const [weightProjection, setWeightProjection] = useState<WeightProjection | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [mealPlan, setMealPlan] = useState<WeeklyMealPlan | PatternBasedMealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false);

  // SessionStorageからの読み込み
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.sessionStorage.getItem('userInfo');
        if (item) {
          const parsedValue = JSON.parse(item);
          console.log('Results - SessionStorage読み込み完了:', parsedValue);
          setUserInfo(parsedValue);
        } else {
          console.log('Results - SessionStorage: データなし');
        }
        setIsUserInfoLoaded(true);
      }
    } catch (error) {
      console.error('Results - Error reading sessionStorage:', error);
      setIsUserInfoLoaded(true);
    }
  }, []);

  useEffect(() => {
    console.log('Results useEffect実行', {
      userInfo, 
      isUserInfoLoaded,
      userInfoKeys: Object.keys(userInfo || {})
    });

    // セッションストレージの読み込み完了を待つ
    if (!isUserInfoLoaded) {
      console.log('セッションストレージ読み込み中...');
      return;
    }

    console.log('セッションストレージ読み込み完了、データ検証開始');

    // セッションストレージの読み込み完了を確認
    const hasMinimumData = userInfo.height && userInfo.weight && userInfo.age && userInfo.gender && 
                           userInfo.bodyFatPercentage && userInfo.exerciseFrequency !== undefined && 
                           userInfo.targetWeight;

    console.log('hasMinimumData:', hasMinimumData);

    // データがない場合のみリダイレクト
    if (!hasMinimumData) {
      console.log('必要なユーザー情報が不足しているため入力ページにリダイレクト');
      router.push('/');
      return;
    }

    console.log('ユーザー情報が完全、計算を開始...');

    // 栄養計算と体重予測を実行
    try {
      const nutritionTargets = calculatePFCTargets(userInfo as UserInfo);
      const projection = calculateWeightProjection(userInfo as UserInfo);
      
      setNutrition(nutritionTargets);
      setWeightProjection(projection);
      setIsLoading(false);
      console.log('計算完了');
    } catch (error) {
      console.error('計算エラー:', error);
      setIsLoading(false);
    }
  }, [userInfo, router, isUserInfoLoaded]);

  const generateMealPlan = async () => {
    if (!nutrition || !userInfo) {
      console.error('必要なデータが不足しています');
      return;
    }

    console.log('🍽️ AI週間献立生成開始...');
    setIsGeneratingMealPlan(true);
    
    try {
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInfo,
          nutritionTargets: nutrition
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API応答（献立）:', result);

      if (result.success) {
        setMealPlan(result.data.mealPlan);
        setShoppingList(result.data.shoppingList);
        console.log('✅ 週間献立と買い物リスト生成完了');
      } else {
        console.error('API error:', result.error);
        throw new Error(result.message || '週間献立生成に失敗しました');
      }
    } catch (error) {
      console.error('❌ 週間献立生成エラー:', error);
      // エラー時はフォールバックデータを表示
      const today = new Date();
      setMealPlan({
        totalCost: 4500,
        prepTime: 180,
        nutritionSummary: nutrition,
        days: [
          {
            date: today.toISOString().split('T')[0],
            dailyCalories: nutrition.dailyCalories,
            dailyProtein: nutrition.dailyProtein,
            dailyFat: nutrition.dailyFat,
            dailyCarbs: nutrition.dailyCarbs,
            meals: [
              {
                name: 'プロテインオートミール',
                type: 'breakfast',
                calories: 450,
                protein: 35,
                fat: 12,
                carbs: 55,
                cookingTime: 10,
                batchCookable: true,
                ingredients: [
                  { name: 'オートミール', amount: 80, unit: 'g', calories: 320, protein: 12, fat: 6, carbs: 56 },
                  { name: 'プロテインパウダー', amount: 30, unit: 'g', calories: 120, protein: 24, fat: 1, carbs: 2 }
                ],
                instructions: ['オートミールを水で煮る', 'プロテインパウダーを混ぜる']
              }
            ]
          }
        ]
      });
    } finally {
      setIsGeneratingMealPlan(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">計算中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            あなた専用の栄養プラン 🎯
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {userInfo.weight}kg → {userInfo.targetWeight}kg への道のり
          </p>
          
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => router.push('/')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← 設定を変更
            </button>
            <button
              onClick={() => {
                // セッションストレージとローカルストレージをクリア
                if (typeof window !== 'undefined') {
                  window.sessionStorage.clear();
                  window.localStorage.clear();
                  console.log('🧹 クリア完了');
                }
                // ページをリロード
                window.location.reload();
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🧹 クリア
            </button>
            <button
              onClick={generateMealPlan}
              disabled={isGeneratingMealPlan}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isGeneratingMealPlan ? '🔄 生成中...' : '🍽️ 献立 & 買い物リスト生成'}
            </button>
            <button
              onClick={() => {
                chatSectionRef.current?.scrollIntoView({ 
                  behavior: 'smooth',
                  block: 'start'
                });
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              💬 相談
            </button>
          </div>
        </div>

        {/* 結果セクション */}
        <div className="space-y-8">
          {/* 栄養素目標 */}
          {nutrition && (
            <NutritionSummary nutrition={nutrition} userInfo={userInfo} />
          )}

          {/* 体重変遷予測 */}
          {weightProjection && userInfo.weight && userInfo.targetWeight && (
            <WeightProjectionDisplay 
              projection={weightProjection}
              currentWeight={userInfo.weight}
              targetWeight={userInfo.targetWeight}
              userInfo={userInfo}
            />
          )}

          {/* 買い物リスト */}
          <ShoppingListDisplay 
            shoppingList={shoppingList}
            loading={isGeneratingMealPlan}
            onGenerateShoppingList={generateMealPlan}
          />

          {/* 週間献立 */}
          <WeeklyMealPlanDisplay 
            mealPlan={mealPlan}
            loading={isGeneratingMealPlan}
          />
        </div>

        {/* ユーザー情報サマリー */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">📋 設定情報</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">身長:</span>
              <span className="ml-2 font-medium">{userInfo.height}cm</span>
            </div>
            <div>
              <span className="text-gray-600">現在体重:</span>
              <span className="ml-2 font-medium">{userInfo.weight}kg</span>
            </div>
            <div>
              <span className="text-gray-600">目標体重:</span>
              <span className="ml-2 font-medium">{userInfo.targetWeight}kg</span>
            </div>
            <div>
              <span className="text-gray-600">運動頻度:</span>
              <span className="ml-2 font-medium">{userInfo.exerciseFrequency}回/週</span>
            </div>
            {userInfo.proteinSources && userInfo.proteinSources.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-600">好みのタンパク質:</span>
                <span className="ml-2 font-medium">{userInfo.proteinSources.join(', ')}</span>
              </div>
            )}
            {userInfo.allergies && userInfo.allergies.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-600">アレルギー:</span>
                <span className="ml-2 font-medium text-red-600">{userInfo.allergies.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* チャット機能 */}
        <div ref={chatSectionRef} className="mt-8">
          <ChatComponent userInfo={userInfo as UserInfo} />
        </div>
      </div>
    </div>
  );
}