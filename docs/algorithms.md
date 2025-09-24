# アルゴリズム設計書

## 1. マクロ栄養素計算アルゴリズム

### 基本代謝率 (BMR) 計算
```typescript
interface UserPhysicalData {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  bodyFatPercentage?: number;
}

interface ActivityLevel {
  factor: number;
  description: string;
}

const ACTIVITY_LEVELS: Record<string, ActivityLevel> = {
  sedentary: { factor: 1.2, description: '座りがち' },
  light: { factor: 1.375, description: '軽い運動' },
  moderate: { factor: 1.55, description: '中程度の運動' },
  active: { factor: 1.725, description: '激しい運動' },
  very_active: { factor: 1.9, description: '非常に激しい運動' }
};

/**
 * Harris-Benedict方程式（改良版）+ 体脂肪率補正
 */
function calculateBMR(data: UserPhysicalData): number {
  const { weight, height, age, gender, bodyFatPercentage } = data;
  
  let bmr: number;
  
  if (gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
  
  // 体脂肪率が利用可能な場合、除脂肪体重ベースで補正
  if (bodyFatPercentage && bodyFatPercentage > 0) {
    const leanBodyMass = weight * (1 - bodyFatPercentage / 100);
    const bmrKatch = 370 + (21.6 * leanBodyMass);
    
    // Harris-BenedictとKatch-McArdleの加重平均
    bmr = (bmr * 0.7) + (bmrKatch * 0.3);
  }
  
  return Math.round(bmr);
}

/**
 * 総消費カロリー (TDEE) 計算
 */
function calculateTDEE(bmr: number, activityLevel: string): number {
  const factor = ACTIVITY_LEVELS[activityLevel]?.factor || 1.55;
  return Math.round(bmr * factor);
}

/**
 * 目標カロリー計算（減量/増量考慮）
 */
function calculateTargetCalories(
  tdee: number, 
  currentWeight: number, 
  targetWeight: number, 
  timeframeDays: number = 90
): number {
  const weightDifference = targetWeight - currentWeight;
  const caloriesPerKg = 7700; // 1kg脂肪 ≈ 7700kcal
  
  const totalCalorieDeficit = weightDifference * caloriesPerKg;
  const dailyCalorieAdjustment = totalCalorieDeficit / timeframeDays;
  
  const targetCalories = tdee + dailyCalorieAdjustment;
  
  // 安全な範囲に制限（BMRの1.2倍以上、TDEE-1000以下）
  const minCalories = Math.round(calculateBMR({} as UserPhysicalData) * 1.2);
  const maxCalories = tdee + 500;
  
  return Math.max(minCalories, Math.min(maxCalories, Math.round(targetCalories)));
}
```

### PFC比率計算
```typescript
interface MacroRatios {
  protein: number; // %
  fat: number;     // %
  carbs: number;   // %
}

interface MacroTargets {
  calories: number;
  protein: number;    // g
  fat: number;        // g
  carbs: number;      // g
  proteinCalories: number;
  fatCalories: number;
  carbCalories: number;
}

/**
 * PFC比率からマクロ栄養素グラム数を計算
 */
function calculateMacroTargets(
  targetCalories: number, 
  ratios: MacroRatios,
  weight: number,
  activityLevel: string
): MacroTargets {
  // 最低タンパク質要求量チェック（体重×1.6-2.2g）
  const minProteinPerKg = activityLevel === 'very_active' ? 2.2 : 1.8;
  const minProteinGrams = weight * minProteinPerKg;
  const minProteinCalories = minProteinGrams * 4;
  const minProteinRatio = (minProteinCalories / targetCalories) * 100;
  
  // 調整された比率
  const adjustedProteinRatio = Math.max(ratios.protein, minProteinRatio);
  const remainingRatio = 100 - adjustedProteinRatio;
  const fatRatio = (ratios.fat / (ratios.fat + ratios.carbs)) * remainingRatio;
  const carbRatio = remainingRatio - fatRatio;
  
  // カロリー計算
  const proteinCalories = Math.round((adjustedProteinRatio / 100) * targetCalories);
  const fatCalories = Math.round((fatRatio / 100) * targetCalories);
  const carbCalories = targetCalories - proteinCalories - fatCalories;
  
  // グラム数計算
  const protein = Math.round(proteinCalories / 4);
  const fat = Math.round(fatCalories / 9);
  const carbs = Math.round(carbCalories / 4);
  
  return {
    calories: targetCalories,
    protein,
    fat,
    carbs,
    proteinCalories,
    fatCalories,
    carbCalories
  };
}

/**
 * 食事回数による分配計算
 */
function distributeMacrosPerMeal(
  dailyTargets: MacroTargets, 
  mealsPerDay: number,
  mealDistribution?: number[] // カスタム分配比率
): MacroTargets[] {
  // デフォルト分配（朝食25%, 昼食35%, 夕食35%, スナック5%）
  const defaultDistribution = mealsPerDay === 3 
    ? [0.25, 0.35, 0.4]
    : mealsPerDay === 4
    ? [0.25, 0.3, 0.35, 0.1]
    : [0.2, 0.25, 0.15, 0.25, 0.15]; // 5食
  
  const distribution = mealDistribution || defaultDistribution;
  
  return distribution.map(ratio => ({
    calories: Math.round(dailyTargets.calories * ratio),
    protein: Math.round(dailyTargets.protein * ratio),
    fat: Math.round(dailyTargets.fat * ratio),
    carbs: Math.round(dailyTargets.carbs * ratio),
    proteinCalories: Math.round(dailyTargets.proteinCalories * ratio),
    fatCalories: Math.round(dailyTargets.fatCalories * ratio),
    carbCalories: Math.round(dailyTargets.carbCalories * ratio)
  }));
}
```

## 2. バッチクッキング最適化アルゴリズム

### 食材使用量最適化
```typescript
interface Recipe {
  id: string;
  name: string;
  servings: number;
  ingredients: RecipeIngredient[];
  macros: MacroTargets;
  prepTime: number;
  cookTime: number;
  difficulty: number;
}

interface RecipeIngredient {
  ingredientId: string;
  amount: number;
  unit: string;
}

interface BatchCookingPlan {
  recipes: Recipe[];
  totalPrepTime: number;
  ingredientUtilization: Map<string, number>; // ingredientId -> utilization %
  wasteScore: number; // 0-100, lower is better
}

/**
 * バッチクッキング用レシピ組み合わせ最適化
 */
function optimizeBatchCooking(
  availableRecipes: Recipe[],
  weeklyMacroTargets: MacroTargets[],
  constraints: {
    maxPrepTime: number;
    maxRecipes: number;
    pantryItems: string[];
    budget: number;
  }
): BatchCookingPlan {
  const solutions: BatchCookingPlan[] = [];
  
  // 遺伝的アルゴリズムによる最適化
  for (let generation = 0; generation < 100; generation++) {
    const population = generateRecipeCombinations(
      availableRecipes, 
      weeklyMacroTargets.length,
      constraints
    );
    
    population.forEach(combination => {
      const score = evaluateBatchCookingScore(combination, weeklyMacroTargets, constraints);
      solutions.push({ ...combination, wasteScore: score });
    });
    
    // 上位20%を次世代に
    solutions.sort((a, b) => a.wasteScore - b.wasteScore);
    solutions.splice(Math.floor(solutions.length * 0.2));
  }
  
  return solutions[0];
}

/**
 * バッチクッキングスコア計算
 */
function evaluateBatchCookingScore(
  plan: BatchCookingPlan,
  targets: MacroTargets[],
  constraints: any
): number {
  let score = 0;
  
  // マクロ栄養素達成度 (0-40点)
  const macroAccuracy = calculateMacroAccuracy(plan.recipes, targets);
  score += macroAccuracy * 40;
  
  // 食材利用効率 (0-30点)
  const avgUtilization = Array.from(plan.ingredientUtilization.values())
    .reduce((sum, util) => sum + util, 0) / plan.ingredientUtilization.size;
  score += (avgUtilization / 100) * 30;
  
  // 準備時間効率 (0-20点)
  const timeEfficiency = Math.max(0, 1 - (plan.totalPrepTime / constraints.maxPrepTime));
  score += timeEfficiency * 20;
  
  // レシピ多様性 (0-10点)
  const diversity = calculateRecipeDiversity(plan.recipes);
  score += diversity * 10;
  
  return 100 - score; // 低いほど良い
}

/**
 * 食材包装サイズ最適化
 */
function optimizePackageSizes(
  requiredIngredients: Map<string, number>,
  availablePackages: Map<string, number[]>
): Map<string, number> {
  const optimizedSizes = new Map<string, number>();
  
  requiredIngredients.forEach((required, ingredientId) => {
    const packages = availablePackages.get(ingredientId) || [];
    
    // 最小廃棄量のパッケージサイズを選択
    let bestSize = packages[0];
    let minWaste = Infinity;
    
    packages.forEach(packageSize => {
      const packagesNeeded = Math.ceil(required / packageSize);
      const waste = (packagesNeeded * packageSize) - required;
      const wasteRatio = waste / required;
      
      if (wasteRatio < minWaste) {
        minWaste = wasteRatio;
        bestSize = packageSize;
      }
    });
    
    optimizedSizes.set(ingredientId, bestSize);
  });
  
  return optimizedSizes;
}
```

## 3. 体重推移平滑化アルゴリズム

### 指数移動平均とトレンド分析
```typescript
interface WeightEntry {
  date: Date;
  weight: number;
  bodyFat?: number;
}

interface WeightTrend {
  smoothedWeight: number;
  trend: 'gaining' | 'losing' | 'maintaining';
  weeklyRate: number; // kg/week
  confidence: number; // 0-1
  prediction30Days: number;
}

/**
 * 指数移動平均による体重平滑化
 */
function calculateSmoothedWeight(
  weightHistory: WeightEntry[],
  alpha: number = 0.3 // 平滑化係数
): number[] {
  if (weightHistory.length === 0) return [];
  
  const smoothed = [weightHistory[0].weight];
  
  for (let i = 1; i < weightHistory.length; i++) {
    const current = weightHistory[i].weight;
    const previous = smoothed[i - 1];
    smoothed.push(alpha * current + (1 - alpha) * previous);
  }
  
  return smoothed;
}

/**
 * トレンド分析と予測
 */
function analyzeWeightTrend(
  weightHistory: WeightEntry[],
  smoothedWeights: number[]
): WeightTrend {
  if (weightHistory.length < 7) {
    return {
      smoothedWeight: smoothedWeights[smoothedWeights.length - 1] || 0,
      trend: 'maintaining',
      weeklyRate: 0,
      confidence: 0,
      prediction30Days: smoothedWeights[smoothedWeights.length - 1] || 0
    };
  }
  
  // 最近14日間の傾向を分析
  const recentData = weightHistory.slice(-14);
  const recentSmoothed = smoothedWeights.slice(-14);
  
  // 線形回帰による傾向計算
  const { slope, rSquared } = calculateLinearRegression(
    recentData.map((_, i) => i),
    recentSmoothed
  );
  
  // 週次変化率（kg/week）
  const weeklyRate = slope * 7;
  
  // トレンド判定
  let trend: 'gaining' | 'losing' | 'maintaining';
  if (Math.abs(weeklyRate) < 0.1) {
    trend = 'maintaining';
  } else if (weeklyRate > 0) {
    trend = 'gaining';
  } else {
    trend = 'losing';
  }
  
  // 30日後予測
  const currentWeight = recentSmoothed[recentSmoothed.length - 1];
  const prediction30Days = currentWeight + (weeklyRate * 4.29); // 4.29 weeks ≈ 30 days
  
  return {
    smoothedWeight: currentWeight,
    trend,
    weeklyRate,
    confidence: Math.min(rSquared, 1),
    prediction30Days
  };
}

/**
 * 線形回帰計算
 */
function calculateLinearRegression(
  xValues: number[],
  yValues: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = xValues.length;
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 決定係数 (R²) 計算
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  
  const rSquared = 1 - (ssResidual / ssTotal);
  
  return { slope, intercept, rSquared };
}

/**
 * 異常値検出と除去
 */
function detectWeightOutliers(
  weightHistory: WeightEntry[],
  threshold: number = 2.5 // 標準偏差の倍数
): WeightEntry[] {
  if (weightHistory.length < 7) return weightHistory;
  
  const weights = weightHistory.map(entry => entry.weight);
  const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
  const stdDev = Math.sqrt(variance);
  
  return weightHistory.filter(entry => {
    const zScore = Math.abs((entry.weight - mean) / stdDev);
    return zScore <= threshold;
  });
}
```

## 4. 栄養バランス検証アルゴリズム

### マクロ・ミクロ栄養素検証
```typescript
interface NutritionValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  score: number; // 0-100
  recommendations: string[];
}

/**
 * 包括的栄養バランス検証
 */
function validateNutritionPlan(
  dailyPlan: MacroTargets,
  userProfile: UserProfile,
  micronutrients?: Map<string, number>
): NutritionValidation {
  const validation: NutritionValidation = {
    isValid: true,
    warnings: [],
    errors: [],
    score: 100,
    recommendations: []
  };
  
  // マクロ栄養素バランス検証
  validateMacroBalance(dailyPlan, userProfile, validation);
  
  // カロリー適正性検証
  validateCalorieAppropriate(dailyPlan, userProfile, validation);
  
  // ミクロ栄養素検証（利用可能な場合）
  if (micronutrients) {
    validateMicronutrients(micronutrients, userProfile, validation);
  }
  
  // 全体スコア計算
  validation.score = Math.max(0, 100 - (validation.errors.length * 20) - (validation.warnings.length * 5));
  validation.isValid = validation.errors.length === 0;
  
  return validation;
}

function validateMacroBalance(
  plan: MacroTargets,
  profile: UserProfile,
  validation: NutritionValidation
): void {
  // タンパク質最低要求量チェック
  const minProtein = profile.weight * 1.6;
  if (plan.protein < minProtein) {
    validation.errors.push(`タンパク質不足: ${plan.protein.toFixed(1)}g（最低${minProtein.toFixed(1)}g必要）`);
  }
  
  // 脂質適正範囲チェック（総カロリーの20-35%）
  const fatPercentage = (plan.fatCalories / plan.calories) * 100;
  if (fatPercentage < 20) {
    validation.warnings.push(`脂質が少なすぎます: ${fatPercentage.toFixed(1)}%（20-35%推奨）`);
  } else if (fatPercentage > 35) {
    validation.warnings.push(`脂質が多すぎます: ${fatPercentage.toFixed(1)}%（20-35%推奨）`);
  }
  
  // 炭水化物適正範囲チェック（活動レベル依存）
  const carbPercentage = (plan.carbCalories / plan.calories) * 100;
  const minCarbsForActivity = profile.activityLevel === 'very_active' ? 45 : 35;
  if (carbPercentage < minCarbsForActivity) {
    validation.warnings.push(`炭水化物が不足している可能性: ${carbPercentage.toFixed(1)}%`);
  }
}
```