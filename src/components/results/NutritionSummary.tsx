'use client';

import { NutritionTargets, UserInfo } from '@/lib/types';

interface NutritionSummaryProps {
  nutrition: NutritionTargets;
  userInfo?: Partial<UserInfo>;
  loading?: boolean;
}

export default function NutritionSummary({ nutrition, userInfo, loading = false }: NutritionSummaryProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">📊 栄養素目標</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">📊 栄養素目標</h2>
      
      {/* 日別目標 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4 text-gray-700">1日あたりの目標</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{nutrition.dailyCalories}</div>
            <div className="text-sm text-gray-600">kcal</div>
            <div className="text-xs text-gray-500">カロリー</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{nutrition.dailyProtein}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">タンパク質</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-600">{nutrition.dailyFat}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">脂質</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{nutrition.dailyCarbs}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">炭水化物</div>
          </div>
        </div>
      </div>

      {/* 週間目標 */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-gray-700">1週間あたりの目標</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-700">{nutrition.weeklyCalories.toLocaleString()}</div>
            <div className="text-sm text-gray-600">kcal</div>
            <div className="text-xs text-gray-500">週間カロリー</div>
          </div>
          
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-red-700">{nutrition.weeklyProtein}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">週間タンパク質</div>
          </div>
          
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-yellow-700">{nutrition.weeklyFat}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">週間脂質</div>
          </div>
          
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-green-700">{nutrition.weeklyCarbs}</div>
            <div className="text-sm text-gray-600">g</div>
            <div className="text-xs text-gray-500">週間炭水化物</div>
          </div>
        </div>
      </div>

      {/* PFC比率表示 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-md font-medium mb-4 text-gray-700">PFCバランス</h4>
        
        {/* プログレスバー形式の表示 */}
        <div className="space-y-3">
          {/* タンパク質 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-600 font-medium">タンパク質</span>
              <span className="text-red-600">
                {Math.round((nutrition.dailyProtein * 4 / nutrition.dailyCalories) * 100)}%
                ({nutrition.dailyProtein}g)
              </span>
            </div>
            <div className="w-full bg-red-100 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((nutrition.dailyProtein * 4 / nutrition.dailyCalories) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 脂質 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-yellow-600 font-medium">脂質</span>
              <span className="text-yellow-600">
                {Math.round((nutrition.dailyFat * 9 / nutrition.dailyCalories) * 100)}%
                ({nutrition.dailyFat}g)
              </span>
            </div>
            <div className="w-full bg-yellow-100 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((nutrition.dailyFat * 9 / nutrition.dailyCalories) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* 炭水化物 */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-600 font-medium">炭水化物</span>
              <span className="text-green-600">
                {Math.round((nutrition.dailyCarbs * 4 / nutrition.dailyCalories) * 100)}%
                ({nutrition.dailyCarbs}g)
              </span>
            </div>
            <div className="w-full bg-green-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((nutrition.dailyCarbs * 4 / nutrition.dailyCalories) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 追加の栄養情報 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-white p-3 rounded-lg">
            <div className="text-lg font-bold text-blue-600">
              {(nutrition.dailyProtein / (userInfo?.weight || 70)).toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">g/kg体重</div>
            <div className="text-xs text-gray-600">タンパク質</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <div className="text-lg font-bold text-purple-600">
              {Math.round(nutrition.dailyCalories / (userInfo?.mealsPerDay || 3))}
            </div>
            <div className="text-xs text-gray-500">kcal/食</div>
            <div className="text-xs text-gray-600">食事あたり</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <div className="text-lg font-bold text-orange-600">
              {Math.round(nutrition.dailyProtein / (userInfo?.mealsPerDay || 3))}
            </div>
            <div className="text-xs text-gray-500">g/食</div>
            <div className="text-xs text-gray-600">タンパク質</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg">
            <div className="text-lg font-bold text-indigo-600">
              {Math.round(nutrition.weeklyCalories / 7700 * 1000) / 1000}
            </div>
            <div className="text-xs text-gray-500">kg/週</div>
            <div className="text-xs text-gray-600">理論変化量</div>
          </div>
        </div>
      </div>
    </div>
  );
}