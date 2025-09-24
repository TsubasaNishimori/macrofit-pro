'use client';

import { useState } from 'react';
import { WeeklyMealPlan, PatternBasedMealPlan, Meal, MealPattern } from '@/lib/types';

interface WeeklyMealPlanProps {
  mealPlan: WeeklyMealPlan | PatternBasedMealPlan | null;
  loading?: boolean;
}

export default function WeeklyMealPlanDisplay({ mealPlan, loading = false }: WeeklyMealPlanProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | MealPattern | null>(null);

  const openMealDetail = (meal: Meal | MealPattern) => {
    setSelectedMeal(meal);
    setShowDetailModal(true);
  };

  const closeMealDetail = () => {
    setShowDetailModal(false);
    setSelectedMeal(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">🍽️ 週間献立</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!mealPlan) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">🍽️ 週間献立</h2>
        <p className="text-gray-500">献立を生成してください</p>
      </div>
    );
  }

  // パターンベース献立の場合
  if ('mealPatterns' in mealPlan) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">🍽️ 週間献立パターン</h2>
          <div className="text-sm text-gray-600">
            総準備時間: {mealPlan.prepTime}分 | 総額: ¥{mealPlan.totalCost.toLocaleString()}
          </div>
        </div>

        {/* 固定メニュー */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">📌 固定メニュー（毎日同じ）</h3>
          <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
            
            {/* プロテイン摂取 */}
            {mealPlan.mealPatterns.proteinIntake && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{mealPlan.mealPatterns.proteinIntake.name}</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">プロテイン</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  摂取量: {mealPlan.mealPatterns.proteinIntake.amount} | 
                  {mealPlan.mealPatterns.proteinIntake.calories} | 
                  {mealPlan.mealPatterns.proteinIntake.protein}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  タイミング: {mealPlan.mealPatterns.proteinIntake.timing}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  調製: {mealPlan.mealPatterns.proteinIntake.preparation}
                </div>
                <div className="text-xs text-yellow-600">
                  {mealPlan.mealPatterns.proteinIntake.note}
                </div>
              </div>
            )}
            
            {/* 朝食 */}
            {mealPlan.mealPatterns.breakfast && (
              <div 
                className="bg-yellow-50 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors border border-yellow-200"
                onClick={() => mealPlan.mealPatterns.breakfast && openMealDetail(mealPlan.mealPatterns.breakfast)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{mealPlan.mealPatterns.breakfast.name}</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">朝食</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {mealPlan.mealPatterns.breakfast.calories}kcal | 
                  P:{mealPlan.mealPatterns.breakfast.protein}g 
                  F:{mealPlan.mealPatterns.breakfast.fat}g 
                  C:{mealPlan.mealPatterns.breakfast.carbs}g
                </div>
                <div className="text-xs text-gray-500">
                  調理時間: {mealPlan.mealPatterns.breakfast.cookingTime}分 | 
                  {mealPlan.mealPatterns.breakfast.prepQuantity}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 交互メニュー */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">🔄 交互メニュー（2パターン）</h3>
          
          {/* 昼食パターン */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">昼食</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                onClick={() => openMealDetail(mealPlan.mealPatterns.lunch.patternA)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{mealPlan.mealPatterns.lunch.patternA.name}</h5>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">パターンA</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {mealPlan.mealPatterns.lunch.patternA.calories}kcal | 
                  P:{mealPlan.mealPatterns.lunch.patternA.protein}g 
                  F:{mealPlan.mealPatterns.lunch.patternA.fat}g 
                  C:{mealPlan.mealPatterns.lunch.patternA.carbs}g
                </div>
                <div className="text-xs text-gray-500">
                  {mealPlan.mealPatterns.lunch.patternA.prepQuantity} | 月水金日
                </div>
              </div>

              <div 
                className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors border border-blue-200"
                onClick={() => openMealDetail(mealPlan.mealPatterns.lunch.patternB)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{mealPlan.mealPatterns.lunch.patternB.name}</h5>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">パターンB</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {mealPlan.mealPatterns.lunch.patternB.calories}kcal | 
                  P:{mealPlan.mealPatterns.lunch.patternB.protein}g 
                  F:{mealPlan.mealPatterns.lunch.patternB.fat}g 
                  C:{mealPlan.mealPatterns.lunch.patternB.carbs}g
                </div>
                <div className="text-xs text-gray-500">
                  {mealPlan.mealPatterns.lunch.patternB.prepQuantity} | 火木土
                </div>
              </div>
            </div>
          </div>

          {/* 夕食パターン */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">夕食</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className="bg-purple-50 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors border border-purple-200"
                onClick={() => openMealDetail(mealPlan.mealPatterns.dinner.patternA)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{mealPlan.mealPatterns.dinner.patternA.name}</h5>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">パターンA</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {mealPlan.mealPatterns.dinner.patternA.calories}kcal | 
                  P:{mealPlan.mealPatterns.dinner.patternA.protein}g 
                  F:{mealPlan.mealPatterns.dinner.patternA.fat}g 
                  C:{mealPlan.mealPatterns.dinner.patternA.carbs}g
                </div>
                <div className="text-xs text-gray-500">
                  {mealPlan.mealPatterns.dinner.patternA.prepQuantity} | 月水金日
                </div>
              </div>

              <div 
                className="bg-purple-50 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors border border-purple-200"
                onClick={() => openMealDetail(mealPlan.mealPatterns.dinner.patternB)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h5 className="font-medium text-gray-900">{mealPlan.mealPatterns.dinner.patternB.name}</h5>
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800">パターンB</span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {mealPlan.mealPatterns.dinner.patternB.calories}kcal | 
                  P:{mealPlan.mealPatterns.dinner.patternB.protein}g 
                  F:{mealPlan.mealPatterns.dinner.patternB.fat}g 
                  C:{mealPlan.mealPatterns.dinner.patternB.carbs}g
                </div>
                <div className="text-xs text-gray-500">
                  {mealPlan.mealPatterns.dinner.patternB.prepQuantity} | 火木土
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 週間スケジュール */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-4">📅 週間スケジュール</h3>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {Object.entries(mealPlan.weeklySchedule).map(([day, schedule]) => (
              <div key={day} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="font-medium text-sm mb-2">
                  {day === 'monday' ? '月' :
                   day === 'tuesday' ? '火' :
                   day === 'wednesday' ? '水' :
                   day === 'thursday' ? '木' :
                   day === 'friday' ? '金' :
                   day === 'saturday' ? '土' : '日'}
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>昼: {schedule.lunch === 'patternA' ? 'A' : 'B'}</div>
                  <div>夕: {schedule.dinner === 'patternA' ? 'A' : 'B'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* モーダル表示 */}
        {showDetailModal && selectedMeal && (
          <MealDetailModal meal={selectedMeal} onClose={closeMealDetail} />
        )}
      </div>
    );
  }

  // 従来の形式の場合は未対応のメッセージを表示
  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-4">🍽️ 週間献立</h2>
      <p className="text-gray-500">新しいパターンベース献立を生成してください</p>
    </div>
  );
}

// 食事詳細モーダルコンポーネント
function MealDetailModal({ meal, onClose }: { meal: Meal | MealPattern; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{meal.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{meal.calories}</div>
              <div className="text-xs text-gray-600">kcal</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{meal.protein}g</div>
              <div className="text-xs text-gray-600">タンパク質</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-yellow-600">{meal.fat}g</div>
              <div className="text-xs text-gray-600">脂質</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{meal.carbs}g</div>
              <div className="text-xs text-gray-600">炭水化物</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            調理時間: {meal.cookingTime}分
            {'prepQuantity' in meal && (
              <span className="ml-4">準備量: {meal.prepQuantity}</span>
            )}
            {meal.batchCookable && (
              <span className="ml-4 bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                作り置き可
              </span>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold mb-2">🥘 材料</h4>
          {meal.ingredients && Array.isArray(meal.ingredients) && meal.ingredients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {meal.ingredients.map((ingredient, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                  <span className="text-sm">{ingredient.name}</span>
                  <span className="text-sm text-gray-600">{ingredient.amount}{ingredient.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              材料情報が読み込まれていません。再生成してください。
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">👨‍🍳 調理手順</h4>
          {meal.instructions && Array.isArray(meal.instructions) && meal.instructions.length > 0 ? (
            <ol className="list-decimal list-inside space-y-2">
              {meal.instructions.map((instruction, idx) => (
                <li key={idx} className="text-sm text-gray-700">{instruction}</li>
              ))}
            </ol>
          ) : (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
              調理手順が読み込まれていません。再生成してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}