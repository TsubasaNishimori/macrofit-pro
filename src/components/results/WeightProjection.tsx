'use client';

import { WeightProjection, UserInfo } from '@/lib/types';

interface WeightProjectionProps {
  projection: WeightProjection;
  currentWeight: number;
  targetWeight: number;
  userInfo?: Partial<UserInfo>;
  loading?: boolean;
}

export default function WeightProjectionDisplay({ 
  projection, 
  currentWeight, 
  targetWeight, 
  userInfo,
  loading = false 
}: WeightProjectionProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">📈 体重変遷予測</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isWeightGain = targetWeight > currentWeight;
  const weightDifference = Math.abs(targetWeight - currentWeight);
  
  // 実際の予測データから目標達成週を特定
  const targetReachedPoint = projection.projections.find(point => {
    if (isWeightGain) {
      return point.projectedWeight >= targetWeight;
    } else {
      return point.projectedWeight <= targetWeight;
    }
  });
  
  const estimatedWeeks = targetReachedPoint ? targetReachedPoint.weekNumber : projection.projections.length;

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h2 className="text-xl font-semibold mb-6 text-gray-900">📈 体重変遷予測</h2>
      
      {/* サマリー情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-600">
            {isWeightGain ? '+' : ''}{weightDifference.toFixed(1)}kg
          </div>
          <div className="text-sm text-gray-600">目標変化量</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-lg font-bold text-green-600">
            {isWeightGain ? '+' : ''}{projection.weeklyWeightChange.toFixed(2)}kg/週
          </div>
          <div className="text-sm text-gray-600">週間変化率</div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-600">
            約{estimatedWeeks}週間
          </div>
          <div className="text-sm text-gray-600">
            達成予定期間
            {targetReachedPoint && (
              <div className="text-xs text-purple-500 mt-1">
                {targetReachedPoint.weekNumber}週目に到達予定
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 目標設定方法の表示 */}
      {userInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">設定方法</h3>
          {userInfo.goalSettingMethod === 'duration' && userInfo.targetDurationWeeks && (
            <div className="text-sm text-gray-600">
              📅 期間指定: {userInfo.targetDurationWeeks}週間で目標達成
            </div>
          )}
          {userInfo.goalSettingMethod === 'calories' && userInfo.targetDailyCalories && (
            <div className="text-sm text-gray-600">
              🍽️ カロリー指定: 1日{userInfo.targetDailyCalories.toLocaleString()}kcal摂取
            </div>
          )}
          {!userInfo.goalSettingMethod && (
            <div className="text-sm text-gray-600">
              🤖 自動計算: 健康的なペースで計算
            </div>
          )}
        </div>
      )}

      {/* 目標達成日 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-1">目標達成予定日</div>
          <div className="text-xl font-bold text-gray-800">
            {new Date(projection.targetAchievementDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* 体重変遷表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">週</th>
              <th className="px-3 py-2 text-left">日付</th>
              <th className="px-3 py-2 text-right">予測体重</th>
              <th className="px-3 py-2 text-right">変化量</th>
            </tr>
          </thead>
          <tbody>
            {projection.projections.slice(0, 8).map((point, index) => {
              const isTargetReached = isWeightGain 
                ? point.projectedWeight >= targetWeight
                : point.projectedWeight <= targetWeight;
              
              return (
                <tr 
                  key={index} 
                  className={`border-b ${isTargetReached ? 'bg-green-50' : ''}`}
                >
                  <td className="px-3 py-2 font-medium">
                    {point.weekNumber}週目
                  </td>
                  <td className="px-3 py-2">
                    {new Date(point.date).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {point.projectedWeight.toFixed(1)}kg
                  </td>
                  <td className="px-3 py-2 text-right">
                    {index === 0 ? '-' : 
                     `${isWeightGain ? '+' : ''}${(point.projectedWeight - currentWeight).toFixed(1)}kg`
                    }
                    {isTargetReached && (
                      <span className="ml-2 text-green-600 font-medium">🎯</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* アドバイス */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h4 className="text-md font-medium mb-2 text-yellow-800">📝 アドバイス</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• 週に{Math.abs(projection.weeklyWeightChange).toFixed(2)}kgの{isWeightGain ? '増量' : '減量'}を目標にしています</li>
          <li>• {isWeightGain ? '筋肉量を維持しながら健康的に体重を増やしましょう' : '筋肉量を維持しながら健康的に体重を減らしましょう'}</li>
          <li>• 定期的な体重測定で進捗を確認することをお勧めします</li>
          <li>• 体調に異常を感じたら計画を見直してください</li>
        </ul>
      </div>
    </div>
  );
}