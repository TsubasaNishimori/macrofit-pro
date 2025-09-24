import { UserInfo, NutritionTargets } from './types';

/**
 * 基礎代謝率計算（Mifflin-St Jeor式）
 */
export function calculateBMR(userInfo: UserInfo): number {
  const { height, weight, age, gender } = userInfo;
  
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * 活動レベル係数を取得
 */
export function getActivityMultiplier(exerciseFrequency: number): number {
  // 運動頻度に基づく活動レベル係数
  if (exerciseFrequency === 0) return 1.2;        // 座位中心
  if (exerciseFrequency <= 2) return 1.375;       // 軽い運動
  if (exerciseFrequency <= 4) return 1.55;        // 中程度の運動
  if (exerciseFrequency <= 6) return 1.725;       // 激しい運動
  return 1.9;                                      // 非常に激しい運動
}

/**
 * 総消費エネルギー（TDEE）計算
 */
export function calculateTDEE(userInfo: UserInfo): number {
  const bmr = calculateBMR(userInfo);
  const activityMultiplier = getActivityMultiplier(userInfo.exerciseFrequency);
  return Math.round(bmr * activityMultiplier);
}

/**
 * 期間から1日あたりのカロリーを逆算
 */
export function calculateCaloriesFromDuration(userInfo: UserInfo, targetWeeks: number): number {
  const tdee = calculateTDEE(userInfo);
  const weightDifference = userInfo.targetWeight - userInfo.weight;
  
  // 1kg = 7700kcal として計算
  const totalCalorieDeficit = weightDifference * 7700;
  const weeklyCalorieAdjustment = totalCalorieDeficit / targetWeeks;
  const dailyCalorieAdjustment = weeklyCalorieAdjustment / 7;
  
  return Math.round(tdee + dailyCalorieAdjustment);
}

/**
 * カロリーから到達期間を逆算
 */
export function calculateDurationFromCalories(userInfo: UserInfo, targetCalories: number): number {
  const tdee = calculateTDEE(userInfo);
  const weightDifference = userInfo.targetWeight - userInfo.weight;
  
  const dailyCalorieAdjustment = targetCalories - tdee;
  const weeklyCalorieAdjustment = dailyCalorieAdjustment * 7;
  
  // 1kg = 7700kcal として計算
  const totalCalorieDeficit = weightDifference * 7700;
  
  if (weeklyCalorieAdjustment === 0) {
    throw new Error('カロリー調整がないため期間を計算できません');
  }
  
  const weeks = totalCalorieDeficit / weeklyCalorieAdjustment;
  return Math.round(weeks * 10) / 10; // 小数第1位まで
}

/**
 * 目標設定の妥当性を検証
 */
export function validateGoalSettings(userInfo: UserInfo): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const tdee = calculateTDEE(userInfo);
  const bmr = calculateBMR(userInfo);
  
  // 基本的な妥当性チェック
  if (Math.abs(userInfo.targetWeight - userInfo.weight) < 0.1) {
    errors.push('目標体重と現在の体重が同じです');
  }

  if (!userInfo.age || userInfo.age < 10 || userInfo.age > 100) {
    errors.push('年齢は10-100歳の範囲で入力してください');
  }
  
  if (userInfo.goalSettingMethod === 'duration' && userInfo.targetDurationWeeks) {
    // 期間設定の場合
    const calculatedCalories = calculateCaloriesFromDuration(userInfo, userInfo.targetDurationWeeks);
    const isWeightGain = userInfo.targetWeight > userInfo.weight;
    
    if (calculatedCalories < bmr * 0.8) {
      errors.push(`目標期間が短すぎます。基礎代謝の80%（${Math.round(bmr * 0.8)}kcal）を下回る極端なカロリー制限が必要です`);
    }
    
    // 増量目的かどうかで上限を変更
    const maxAllowedCalories = isWeightGain ? 8000 : tdee * 1.5;
    
    if (calculatedCalories > maxAllowedCalories) {
      if (isWeightGain) {
        errors.push(`目標期間が短すぎます。8000kcalを上回る非現実的なカロリー摂取が必要です`);
      } else {
        errors.push(`目標期間が短すぎます。維持カロリーの150%（${Math.round(tdee * 1.5)}kcal）を上回る極端なカロリー摂取が必要です`);
      }
    }
    
    if (userInfo.targetDurationWeeks < 1) {
      errors.push('目標期間は最低1週間以上に設定してください');
    }
    
    if (userInfo.targetDurationWeeks > 104) { // 2年
      errors.push('目標期間は2年以内に設定してください');
    }
  }
  
  if (userInfo.goalSettingMethod === 'calories' && userInfo.targetDailyCalories) {
    // カロリー設定の場合
    if (userInfo.targetDailyCalories < bmr * 0.8) {
      errors.push(`摂取カロリーが基礎代謝の80%（${Math.round(bmr * 0.8)}kcal）を下回っています。健康に害を及ぼす可能性があります`);
    }
    
    // 墜量目的か減量目的かを判定
    const isWeightGain = userInfo.targetWeight > userInfo.weight;
    const maxAllowedCalories = isWeightGain ? 8000 : tdee * 1.5; // 墜量目的は8000kcalまで許容
    
    if (userInfo.targetDailyCalories > maxAllowedCalories) {
      if (isWeightGain) {
        errors.push(`摂取カロリーが8000kcalを上回っています。非現実的なカロリー設定です`);
      } else {
        errors.push(`摂取カロリーが維持カロリーの150%（${Math.round(tdee * 1.5)}kcal）を上回っています。過度な体重増加の原因となります`);
      }
    }
    
    try {
      const calculatedWeeks = calculateDurationFromCalories(userInfo, userInfo.targetDailyCalories);
      
      if (calculatedWeeks < 0) {
        errors.push('設定されたカロリーでは目標体重に到達できません（逆方向の変化になります）');
      }
      
      if (calculatedWeeks > 104) { // 2年
        errors.push('設定されたカロリーでは目標達成まで2年以上かかります');
      }
    } catch {
      errors.push('カロリー設定から期間を計算できません');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 目標に基づく体重変化率を計算（既存ロジック）
 */
export function calculateWeightChangeRate(currentWeight: number, targetWeight: number): number {
  const weightDifference = targetWeight - currentWeight;
  const weeklyChangeRate = Math.abs(weightDifference) > 10 ? 0.5 : 0.3; // kg/週
  
  return weightDifference > 0 ? weeklyChangeRate : -weeklyChangeRate;
}

/**
 * 目標カロリー計算（新しいロジック：設定方法に応じて分岐）
 */
export function calculateTargetCalories(userInfo: UserInfo): number {
  // 新しい設定方法が指定されている場合
  if (userInfo.goalSettingMethod === 'duration' && userInfo.targetDurationWeeks) {
    return calculateCaloriesFromDuration(userInfo, userInfo.targetDurationWeeks);
  }
  
  if (userInfo.goalSettingMethod === 'calories' && userInfo.targetDailyCalories) {
    return userInfo.targetDailyCalories;
  }
  
  // 既存のロジック（後方互換性のため）
  const tdee = calculateTDEE(userInfo);
  const weightChangeRate = calculateWeightChangeRate(userInfo.weight, userInfo.targetWeight);
  
  // 1kg = 7700kcal として計算
  const calorieAdjustment = (weightChangeRate * 7700) / 7; // 1週間あたりの調整
  
  return Math.round(tdee + calorieAdjustment);
}

/**
 * PFCバランス計算
 */
export function calculatePFCTargets(userInfo: UserInfo): NutritionTargets {
  const targetCalories = calculateTargetCalories(userInfo);
  
  // デフォルトPFCバランス（筋トレ向け）
  const defaultPFC = {
    protein: 30,  // 30%
    fat: 25,      // 25%
    carbs: 45     // 45%
  };
  
  const pfcBalance = userInfo.pfcBalance || defaultPFC;
  
  // 各栄養素のグラム数計算
  const dailyProtein = Math.round((targetCalories * pfcBalance.protein / 100) / 4); // 1g = 4kcal
  const dailyFat = Math.round((targetCalories * pfcBalance.fat / 100) / 9);          // 1g = 9kcal
  const dailyCarbs = Math.round((targetCalories * pfcBalance.carbs / 100) / 4);      // 1g = 4kcal
  
  return {
    dailyCalories: targetCalories,
    dailyProtein,
    dailyFat,
    dailyCarbs,
    weeklyCalories: targetCalories * 7,
    weeklyProtein: dailyProtein * 7,
    weeklyFat: dailyFat * 7,
    weeklyCarbs: dailyCarbs * 7
  };
}

/**
 * 体重変化予測（新しい目標設定方法に対応）
 */
export function calculateWeightProjection(userInfo: UserInfo, weeks: number = 12) {
  const targetCalories = calculateTargetCalories(userInfo);
  const tdee = calculateTDEE(userInfo);
  
  // カロリー収支から週あたりの体重変化を計算
  const dailyCalorieDeficit = targetCalories - tdee;
  const weeklyCalorieDeficit = dailyCalorieDeficit * 7;
  
  // 1kg = 7700kcal として週あたりの体重変化を計算
  const weeklyChange = weeklyCalorieDeficit / 7700;
  
  const projections = [];
  let targetAchievementWeek = weeks;
  let targetAchievementDate = '';
  
  // 目標体重到達に必要な週数を正確に計算
  const weightDifference = userInfo.targetWeight - userInfo.weight;
  const theoreticalWeeks = Math.abs(weeklyChange) > 0 ? Math.abs(weightDifference / weeklyChange) : weeks;
  
  // 期間指定の場合は、指定期間を使用
  let maxWeeks = weeks;
  if (userInfo.goalSettingMethod === 'duration' && userInfo.targetDurationWeeks) {
    maxWeeks = userInfo.targetDurationWeeks;
    targetAchievementWeek = userInfo.targetDurationWeeks;
  } else if (userInfo.goalSettingMethod === 'calories' && userInfo.targetDailyCalories) {
    try {
      const calculatedWeeks = Math.ceil(calculateDurationFromCalories(userInfo, userInfo.targetDailyCalories));
      maxWeeks = Math.min(calculatedWeeks, 104); // 最大2年
      targetAchievementWeek = Math.min(calculatedWeeks, targetAchievementWeek);
    } catch (error) {
      console.warn('カロリー指定での期間計算に失敗:', error);
      maxWeeks = Math.ceil(theoreticalWeeks);
      targetAchievementWeek = maxWeeks;
    }
  } else {
    // 自動計算の場合
    maxWeeks = Math.ceil(theoreticalWeeks);
    targetAchievementWeek = maxWeeks;
  }
  
  for (let week = 0; week <= maxWeeks; week++) {
    const projectedWeight = userInfo.weight + (weeklyChange * week);
    const date = new Date();
    date.setDate(date.getDate() + (week * 7));
    
    projections.push({
      date: date.toISOString().split('T')[0],
      projectedWeight: Math.round(projectedWeight * 10) / 10,
      weekNumber: week
    });
    
    // 目標体重に到達したかチェック（自動計算の場合のみ）
    if (userInfo.goalSettingMethod !== 'duration' && userInfo.goalSettingMethod !== 'calories') {
      if (weeklyChange > 0 && projectedWeight >= userInfo.targetWeight) {
        targetAchievementWeek = week;
        targetAchievementDate = date.toISOString().split('T')[0];
        break;
      }
      if (weeklyChange < 0 && projectedWeight <= userInfo.targetWeight) {
        targetAchievementWeek = week;
        targetAchievementDate = date.toISOString().split('T')[0];
        break;
      }
    }
  }
  
  // 目標達成日を設定
  if (!targetAchievementDate && projections[targetAchievementWeek]) {
    targetAchievementDate = projections[targetAchievementWeek].date;
  } else if (!targetAchievementDate) {
    targetAchievementDate = projections[projections.length - 1].date;
  }
  
  return {
    targetAchievementDate,
    weeklyWeightChange: weeklyChange,
    projections
  };
}

/**
 * 食事回数に基づくカロリー配分
 */
export function distributeCaloriesByMeals(totalCalories: number, mealsPerDay: number = 3): number[] {
  const distribution = [];
  
  switch (mealsPerDay) {
    case 3:
      // 朝食:25%, 昼食:35%, 夕食:40%
      distribution.push(
        Math.round(totalCalories * 0.25),
        Math.round(totalCalories * 0.35),
        Math.round(totalCalories * 0.40)
      );
      break;
    case 4:
      // 朝食:20%, 昼食:30%, 間食:15%, 夕食:35%
      distribution.push(
        Math.round(totalCalories * 0.20),
        Math.round(totalCalories * 0.30),
        Math.round(totalCalories * 0.15),
        Math.round(totalCalories * 0.35)
      );
      break;
    case 5:
      // 朝食:20%, 間食1:10%, 昼食:25%, 間食2:15%, 夕食:30%
      distribution.push(
        Math.round(totalCalories * 0.20),
        Math.round(totalCalories * 0.10),
        Math.round(totalCalories * 0.25),
        Math.round(totalCalories * 0.15),
        Math.round(totalCalories * 0.30)
      );
      break;
    default:
      // 均等分割
      const caloriesPerMeal = Math.round(totalCalories / mealsPerDay);
      for (let i = 0; i < mealsPerDay; i++) {
        distribution.push(caloriesPerMeal);
      }
  }
  
  // 合計が目標カロリーと正確に一致するように最後の食事で調整
  const actualTotal = distribution.reduce((sum, cal) => sum + cal, 0);
  const difference = totalCalories - actualTotal;
  if (difference !== 0) {
    distribution[distribution.length - 1] += difference;
  }
  
  return distribution;
}

/**
 * 食事別カロリー目標の詳細情報を取得
 */
export function getMealCalorieDetails(totalCalories: number, mealsPerDay: number = 3) {
  const distribution = distributeCaloriesByMeals(totalCalories, mealsPerDay);
  
  const mealTypeNames = {
    3: ['朝食', '昼食', '夕食'],
    4: ['朝食', '昼食', '間食', '夕食'],
    5: ['朝食', '間食1', '昼食', '間食2', '夕食']
  };
  
  const mealNames = mealTypeNames[mealsPerDay as keyof typeof mealTypeNames] || 
                   Array(mealsPerDay).fill(0).map((_, i) => `食事${i + 1}`);
  
  return distribution.map((calories, index) => ({
    name: mealNames[index],
    calories,
    percentage: Math.round((calories / totalCalories) * 100)
  }));
}