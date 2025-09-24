// ユーザー基本情報
export interface UserInfo {
  // 必須項目
  height: number;           // 身長 (cm)
  weight: number;           // 現在の体重 (kg)
  age: number;              // 年齢
  gender: 'male' | 'female';
  bodyFatPercentage: number; // 体脂肪率 (%)
  exerciseFrequency: number; // 運動頻度 (回/週)
  targetWeight: number;     // 目標体重 (kg)
  
  // カロリー設定方法（どちらか一方のみ設定可能）
  goalSettingMethod?: 'duration' | 'calories'; // 設定方法の選択
  targetDurationWeeks?: number;  // 目標達成期間 (週)
  targetDailyCalories?: number;  // 目標1日摂取カロリー
  
  // 任意項目
  pfcBalance?: {
    protein: number;        // タンパク質比率 (%)
    fat: number;           // 脂質比率 (%)
    carbs: number;         // 炭水化物比率 (%)
  };
  mealsPerDay?: number;     // 食事回数/日
  proteinSources?: string[]; // タンパク質源
  allergies?: string[];     // アレルギー
}

// 活動レベル計算用
export interface ActivityLevel {
  level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  multiplier: number;
}

// 栄養計算結果
export interface NutritionTargets {
  dailyCalories: number;
  dailyProtein: number;     // g
  dailyFat: number;         // g
  dailyCarbs: number;       // g
  weeklyCalories: number;
  weeklyProtein: number;
  weeklyFat: number;
  weeklyCarbs: number;
}

// 食事情報
export interface Meal {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: MealIngredient[];
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  cookingTime: number;      // 分
  batchCookable: boolean;   // バッチ調理可能か
  instructions: string[];
}

export interface MealIngredient {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

// 週間計画
export interface WeeklyMealPlan {
  days: DailyMealPlan[];
  totalCost: number;
  prepTime: number;         // 総準備時間（分）
  nutritionSummary: NutritionTargets;
}

// 新しいパターンベース週間計画
export interface PatternBasedMealPlan {
  totalCost: number;
  prepTime: number;
  nutritionSummary: NutritionTargets;
  mealPatterns: MealPatterns;
  weeklySchedule: WeeklySchedule;
}

export interface MealPatterns {
  proteinIntake?: ProteinIntakePattern;
  breakfast?: MealPattern;
  snack?: MealPattern;
  morningSnack?: MealPattern;  // 5食の場合の午前間食
  afternoonSnack?: MealPattern; // 5食の場合の午後間食
  lunch: {
    patternA: MealPattern;
    patternB: MealPattern;
  };
  dinner: {
    patternA: MealPattern;
    patternB: MealPattern;
  };
}

export interface ProteinIntakePattern {
  name: string;
  type: 'protein';
  frequency: string;
  amount: string;
  calories: string;
  protein: string;
  timing: string;
  preparation: string;
  note: string;
}

export interface MealPattern {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  cookingTime: number;
  batchCookable: boolean;
  prepQuantity: string;
  ingredients: MealIngredient[];
  instructions: string[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  lunch: 'patternA' | 'patternB';
  dinner: 'patternA' | 'patternB';
}

export interface DailyMealPlan {
  date: string;
  meals: Meal[];
  dailyCalories: number;
  dailyProtein: number;
  dailyFat: number;
  dailyCarbs: number;
}

// 買い物リスト
export interface ShoppingList {
  totalCost: number;
  categories: ShoppingCategory[];
}

export interface ShoppingCategory {
  name: string;             // '肉類', '野菜', '調味料' など
  items: ShoppingItem[];
}

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  estimatedPrice: number;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

// 体重予測
export interface WeightProjection {
  targetAchievementDate: string;
  weeklyWeightChange: number; // kg/週
  projections: WeightPoint[];
}

export interface WeightPoint {
  date: string;
  projectedWeight: number;
  weekNumber: number;
}

// フォームバリデーション用
export interface FormErrors {
  [key: string]: string | undefined;
}