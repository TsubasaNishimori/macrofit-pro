# UI/UX設計書

## ユーザーフロー設計

### メインユーザージャーニー
```
新規ユーザー登録 → オンボーディング → 目標設定 → 初回プラン生成 → 
買い物 → 調理 → 食事記録 → 進捗確認 → 週次更新 → 継続使用
```

### 画面構成とナビゲーション
```
Header
├── Logo (MacroFit Pro)
├── Navigation
│   ├── ダッシュボード
│   ├── 週間プラン
│   ├── 買い物リスト  
│   ├── 食事記録
│   ├── 分析・進捗
│   └── 設定
└── User Menu
    ├── プロフィール
    ├── 設定
    └── ログアウト

Main Content Area
├── Page Content
└── Action Buttons

Footer
├── ヘルプ・サポート
├── プライバシーポリシー
└── 利用規約
```

## 詳細画面設計

### 1. オンボーディング画面
```typescript
// /src/components/onboarding/OnboardingFlow.tsx
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'MacroFit Proへようこそ',
    description: '筋トレ特化型栄養管理で理想のボディを手に入れましょう',
    component: WelcomeStep,
  },
  {
    id: 'physical-data',
    title: '基本情報の入力',
    description: '正確な栄養計算のために身体データを入力してください',
    component: PhysicalDataStep,
    fields: ['weight', 'height', 'age', 'gender', 'bodyFatPercentage', 'activityLevel'],
  },
  {
    id: 'goals',
    title: '目標の設定',
    description: 'あなたの目標に合わせてプランをカスタマイズします',
    component: GoalsStep,
    fields: ['targetWeight', 'timeframe', 'goal'],
  },
  {
    id: 'preferences',
    title: 'PFC比率とプレファレンス',
    description: 'マクロ栄養素の比率と食事の好みを設定',
    component: PreferencesStep,
    fields: ['proteinRatio', 'fatRatio', 'carbRatio', 'mealsPerDay'],
  },
  {
    id: 'constraints',
    title: '制約条件の設定',
    description: 'アレルギーや予算、調理環境を教えてください',
    component: ConstraintsStep,
    fields: ['allergies', 'budget', 'equipment', 'cookingTime'],
  },
  {
    id: 'complete',
    title: '設定完了',
    description: 'プロフィール作成が完了しました！',
    component: CompleteStep,
  },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* プログレスバー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              ステップ {currentStep + 1} / {ONBOARDING_STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / ONBOARDING_STEPS.length) * 100)}% 完了
            </span>
          </div>
          <Progress value={((currentStep + 1) / ONBOARDING_STEPS.length) * 100} />
        </div>

        {/* ステップコンテンツ */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{ONBOARDING_STEPS[currentStep].title}</CardTitle>
            <CardDescription>
              {ONBOARDING_STEPS[currentStep].description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <StepComponent 
              step={ONBOARDING_STEPS[currentStep]}
              data={formData}
              onUpdate={setFormData}
            />
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button 
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              戻る
            </Button>
            <Button 
              onClick={() => setCurrentStep(Math.min(ONBOARDING_STEPS.length - 1, currentStep + 1))}
              disabled={currentStep === ONBOARDING_STEPS.length - 1}
            >
              次へ
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
```

### 2. ダッシュボード画面
```typescript
// /src/components/dashboard/Dashboard.tsx
export function Dashboard() {
  const { data: profile } = api.profile.get.useQuery();
  const { data: todayLogs } = api.nutrition.getDailyLogs.useQuery({
    date: new Date(),
  });
  const { data: weeklyPlan } = api.mealPlan.getWeekly.useQuery({
    startDate: startOfWeek(new Date()),
  });

  return (
    <div className="space-y-6">
      {/* ヘッダー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="今日のカロリー"
          value={todayLogs?.totalCalories || 0}
          target={profile?.dailyCalories || 0}
          unit="kcal"
          color="blue"
        />
        <StatsCard
          title="タンパク質"
          value={todayLogs?.totalProtein || 0}
          target={profile?.dailyProtein || 0}
          unit="g"
          color="green"
        />
        <StatsCard
          title="脂質"
          value={todayLogs?.totalFat || 0}
          target={profile?.dailyFat || 0}
          unit="g"
          color="yellow"
        />
        <StatsCard
          title="炭水化物"
          value={todayLogs?.totalCarbs || 0}
          target={profile?.dailyCarbs || 0}
          unit="g"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日の食事プラン */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>今日の食事プラン</CardTitle>
            <CardDescription>
              {format(new Date(), 'yyyy年M月d日(E)', { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TodayMealPlan plan={weeklyPlan?.today} logs={todayLogs} />
          </CardContent>
        </Card>

        {/* クイック記録 */}
        <Card>
          <CardHeader>
            <CardTitle>クイック記録</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickLogForm />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 週間進捗 */}
        <Card>
          <CardHeader>
            <CardTitle>週間進捗</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyProgressChart />
          </CardContent>
        </Card>

        {/* 体重推移 */}
        <Card>
          <CardHeader>
            <CardTitle>体重推移</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightTrendChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

### 3. 週間プラン画面（バッチクッキングビュー）
```typescript
// /src/components/meal-plan/WeeklyPlanView.tsx
export function WeeklyPlanView() {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<'calendar' | 'batch'>('calendar');
  
  const { data: weeklyPlan, isLoading } = api.mealPlan.getWeekly.useQuery({
    startDate: selectedWeek,
  });

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">週間食事プラン</h1>
          <p className="text-gray-600">
            {format(selectedWeek, 'yyyy年M月d日', { locale: ja })} 〜 
            {format(endOfWeek(selectedWeek), 'M月d日', { locale: ja })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* 表示モード切替 */}
          <ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
            <ToggleGroupItem value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              カレンダー
            </ToggleGroupItem>
            <ToggleGroupItem value="batch">
              <ChefHat className="h-4 w-4 mr-2" />
              バッチクッキング
            </ToggleGroupItem>
          </ToggleGroup>

          {/* 週選択 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeek(subWeeks(selectedWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeek(addWeeks(selectedWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => generateNewPlan()}>
            <Sparkles className="h-4 w-4 mr-2" />
            新しいプランを生成
          </Button>
        </div>
      </div>

      {/* プラン表示 */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : weeklyPlan ? (
        <>
          {viewMode === 'calendar' ? (
            <CalendarView plan={weeklyPlan} />
          ) : (
            <BatchCookingView plan={weeklyPlan} />
          )}
          
          {/* 週間統計 */}
          <Card>
            <CardHeader>
              <CardTitle>週間統計</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyStats plan={weeklyPlan} />
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyPlanState onGenerate={generateNewPlan} />
      )}
    </div>
  );
}

// バッチクッキング専用ビュー
function BatchCookingView({ plan }: { plan: WeeklyMealPlan }) {
  return (
    <div className="space-y-6">
      {/* バッチクッキング指示 */}
      <Card>
        <CardHeader>
          <CardTitle>バッチクッキング手順</CardTitle>
          <CardDescription>
            効率的な作り置きのための準備と調理手順
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BatchCookingInstructions instructions={plan.batchCookingInstructions} />
        </CardContent>
      </Card>

      {/* 食材使用量マトリックス */}
      <Card>
        <CardHeader>
          <CardTitle>食材使用マトリックス</CardTitle>
        </CardDescription>
          どの食材がどの料理で使われるかを一覧表示
        </CardDescription>
        </CardHeader>
        <CardContent>
          <IngredientMatrix plan={plan} />
        </CardContent>
      </Card>

      {/* レシピ一覧（バッチクッキング優先） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plan.batchCookableRecipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
```

### 4. 買い物リスト画面
```typescript
// /src/components/shopping/ShoppingListView.tsx
export function ShoppingListView() {
  const [selectedList, setSelectedList] = useState<string>();
  const [printMode, setPrintMode] = useState(false);

  const { data: shoppingLists } = api.shopping.getLists.useQuery();
  const { data: currentList } = api.shopping.getList.useQuery(
    { id: selectedList! },
    { enabled: !!selectedList }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">買い物リスト</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPrintMode(!printMode)}>
            <Printer className="h-4 w-4 mr-2" />
            印刷用表示
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新しいリスト
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* リスト選択 */}
        <Card>
          <CardHeader>
            <CardTitle>買い物リスト一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <ShoppingListSelector 
              lists={shoppingLists}
              selected={selectedList}
              onSelect={setSelectedList}
            />
          </CardContent>
        </Card>

        {/* メインリスト */}
        <div className="lg:col-span-3">
          {currentList ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{currentList.name}</CardTitle>
                    <CardDescription>
                      推定総額: ¥{currentList.estimatedTotalCost.toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={currentList.status === 'completed' ? 'default' : 'secondary'}>
                      {currentList.status === 'completed' ? '完了' : '購入中'}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {printMode ? (
                  <PrintableShoppingList list={currentList} />
                ) : (
                  <InteractiveShoppingList 
                    list={currentList}
                    onItemToggle={handleItemToggle}
                    onItemUpdate={handleItemUpdate}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyListState />
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. 食事記録画面
```typescript
// /src/components/nutrition/NutritionLogView.tsx
export function NutritionLogView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const { data: dailyLogs } = api.nutrition.getDailyLogs.useQuery({
    date: selectedDate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">食事記録</h1>
        <div className="flex items-center gap-2">
          <DatePicker 
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
          <Button onClick={() => setQuickLogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            記録を追加
          </Button>
        </div>
      </div>

      {/* 日次サマリー */}
      <Card>
        <CardHeader>
          <CardTitle>
            {format(selectedDate, 'yyyy年M月d日(E)', { locale: ja })} の記録
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyNutritionSummary logs={dailyLogs} />
        </CardContent>
      </Card>

      {/* 食事記録一覧 */}
      <div className="space-y-4">
        {MEAL_TYPES.map(mealType => (
          <MealLogSection
            key={mealType}
            mealType={mealType}
            logs={dailyLogs?.filter(log => log.mealType === mealType) || []}
            date={selectedDate}
          />
        ))}
      </div>

      {/* クイック記録モーダル */}
      <QuickLogModal
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        date={selectedDate}
      />
    </div>
  );
}
```

## レスポンシブデザイン

### ブレークポイント戦略
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // モバイル（縦）
      'md': '768px',   // タブレット（縦）
      'lg': '1024px',  // タブレット（横）・小型ノートPC
      'xl': '1280px',  // デスクトップ
      '2xl': '1536px', // 大型デスクトップ
    },
  },
};

// レスポンシブコンポーネント例
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
```

### モバイル専用UI
```typescript
// /src/components/mobile/MobileNavigation.tsx
export function MobileNavigation() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 py-2">
        {NAVIGATION_ITEMS.map(item => (
          <MobileNavItem key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}

// プルトゥリフレッシュ対応
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // タッチイベント処理（実装省略）

  return (
    <div className="relative">
      {isPulling && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4">
          <RefreshIcon className={`h-6 w-6 ${pullDistance > 80 ? 'animate-spin' : ''}`} />
        </div>
      )}
      {children}
    </div>
  );
}
```

## アクセシビリティ対応

### WCAG 2.1 AA準拠
```typescript
// /src/components/ui/AccessibleButton.tsx
export const AccessibleButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    ariaLabel?: string;
    ariaDescribedBy?: string;
  }
>(({ ariaLabel, ariaDescribedBy, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {children}
    </Button>
  );
});

// キーボードナビゲーション対応
export function KeyboardNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K でサーチ
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearchModal();
      }
      
      // Alt + 数字 でクイックナビゲーション
      if (e.altKey && /^[1-5]$/.test(e.key)) {
        e.preventDefault();
        navigateToSection(parseInt(e.key) - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
```

### スクリーンリーダー対応
```typescript
// ARIAライブリージョン
export function LiveRegion({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// 進捗状況の音声読み上げ
export function AccessibleProgress({ value, max, label }: ProgressProps) {
  return (
    <div>
      <label htmlFor="progress" className="sr-only">
        {label}
      </label>
      <progress
        id="progress"
        value={value}
        max={max}
        aria-label={`${label}: ${Math.round((value / max) * 100)}%完了`}
      />
    </div>
  );
}
```

## 国際化対応

### i18n設定
```typescript
// /src/lib/i18n.ts
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

const i18n = createInstance();

i18n
  .use(initReactI18next)
  .init({
    lng: 'ja',
    fallbackLng: 'en',
    resources: {
      ja: {
        common: require('../locales/ja/common.json'),
        nutrition: require('../locales/ja/nutrition.json'),
        meals: require('../locales/ja/meals.json'),
      },
      en: {
        common: require('../locales/en/common.json'),
        nutrition: require('../locales/en/nutrition.json'),
        meals: require('../locales/en/meals.json'),
      },
    },
  });

// 多言語対応フック
export function useLocalization() {
  const { t, i18n } = useTranslation();
  
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(i18n.language).format(value);
  };

  const formatCurrency = (amount: number) => {
    const currency = i18n.language === 'ja' ? 'JPY' : 'USD';
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return {
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    changeLanguage: i18n.changeLanguage,
    currentLanguage: i18n.language,
  };
}
```

### 言語別コンテンツ
```json
// /src/locales/ja/nutrition.json
{
  "macros": {
    "protein": "タンパク質",
    "fat": "脂質", 
    "carbs": "炭水化物",
    "calories": "カロリー"
  },
  "units": {
    "g": "g",
    "kcal": "kcal",
    "ml": "ml"
  },
  "mealTypes": {
    "breakfast": "朝食",
    "lunch": "昼食", 
    "dinner": "夕食",
    "snack1": "間食1",
    "snack2": "間食2"
  }
}

// /src/locales/en/nutrition.json
{
  "macros": {
    "protein": "Protein",
    "fat": "Fat",
    "carbs": "Carbohydrates", 
    "calories": "Calories"
  },
  "units": {
    "g": "g",
    "kcal": "kcal", 
    "ml": "ml"
  },
  "mealTypes": {
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner", 
    "snack1": "Snack 1",
    "snack2": "Snack 2"
  }
}
```

## ダークモード対応

```typescript
// /src/components/ui/ThemeProvider.tsx
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ダークモード対応カラーパレット
const colors = {
  light: {
    background: '#ffffff',
    foreground: '#000000',
    primary: '#0066cc',
    secondary: '#6b7280',
    accent: '#10b981',
    destructive: '#ef4444',
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#ffffff', 
    primary: '#3b82f6',
    secondary: '#9ca3af',
    accent: '#34d399',
    destructive: '#f87171',
  },
};
```