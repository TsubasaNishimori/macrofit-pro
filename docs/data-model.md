# データモデル設計書

## PostgreSQL スキーマ設計

### ER図 (簡略版)
```
Users ──┬─── UserProfiles
        ├─── WeeklyPlans ──┬─── DailyPlans ──┬─── Meals ──┬─── MealIngredients
        │                 │                 │            └─── Ingredients
        │                 └─── ShoppingLists ─────────────┘
        ├─── NutritionLogs
        ├─── WeightLogs
        ├─── PantryItems ────────────────────────────────── Ingredients
        └─── AIPromptHistory
```

## テーブル定義

### 1. Users (ユーザー基本情報)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100),
    provider VARCHAR(50) NOT NULL, -- 'azure-ad', 'google', etc.
    provider_id VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    locale VARCHAR(10) DEFAULT 'ja-JP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT unique_provider_user UNIQUE (provider, provider_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
```

### 2. UserProfiles (プロフィール・目標設定)
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Physical attributes
    current_weight DECIMAL(5,2), -- kg
    target_weight DECIMAL(5,2),
    height DECIMAL(5,2), -- cm
    body_fat_percentage DECIMAL(4,2), -- %
    activity_level VARCHAR(20) DEFAULT 'moderate', -- sedentary, light, moderate, active, very_active
    
    -- Nutrition goals
    daily_calories INTEGER,
    protein_ratio DECIMAL(4,2) DEFAULT 25.0, -- %
    fat_ratio DECIMAL(4,2) DEFAULT 25.0,
    carb_ratio DECIMAL(4,2) DEFAULT 50.0,
    meals_per_day INTEGER DEFAULT 3,
    
    -- Preferences
    dietary_restrictions TEXT[], -- ['vegetarian', 'gluten_free', 'dairy_free']
    allergies TEXT[],
    disliked_foods TEXT[],
    preferred_cooking_time INTEGER DEFAULT 60, -- minutes
    weekly_budget DECIMAL(8,2),
    
    -- Equipment & Constraints
    available_equipment TEXT[], -- ['rice_cooker', 'slow_cooker', 'air_fryer']
    kitchen_skill_level VARCHAR(20) DEFAULT 'intermediate',
    
    -- Settings
    auto_generate_plans BOOLEAN DEFAULT true,
    generation_day INTEGER DEFAULT 0, -- 0=Sunday, 1=Monday, etc.
    generation_time TIME DEFAULT '08:00',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_ratios CHECK (protein_ratio + fat_ratio + carb_ratio = 100),
    CONSTRAINT valid_weight CHECK (current_weight > 0 AND target_weight > 0),
    CONSTRAINT valid_height CHECK (height > 0),
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### 3. Ingredients (食材マスター)
```sql
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),
    category VARCHAR(50), -- 'protein', 'vegetable', 'grain', 'dairy', etc.
    
    -- Nutrition per 100g
    calories_per_100g DECIMAL(7,2),
    protein_per_100g DECIMAL(6,2),
    fat_per_100g DECIMAL(6,2),
    carbs_per_100g DECIMAL(6,2),
    fiber_per_100g DECIMAL(6,2),
    
    -- Common units
    common_unit VARCHAR(20) DEFAULT 'g', -- 'g', 'ml', 'piece', 'cup'
    unit_weight DECIMAL(6,2), -- grams per common unit
    
    -- Purchase info
    average_price_per_unit DECIMAL(8,2),
    typical_package_size DECIMAL(8,2),
    shelf_life_days INTEGER,
    
    -- Metadata
    barcode VARCHAR(20),
    brand VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('japanese', name || ' ' || COALESCE(name_en, ''))) STORED
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_search ON ingredients USING GIN(search_vector);
CREATE INDEX idx_ingredients_barcode ON ingredients(barcode) WHERE barcode IS NOT NULL;
```

### 4. WeeklyPlans (週間計画)
```sql
CREATE TABLE weekly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Plan metadata
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'draft', 'active', 'completed', 'archived'
    
    -- Target nutrition
    target_daily_calories INTEGER NOT NULL,
    target_daily_protein DECIMAL(6,2) NOT NULL,
    target_daily_fat DECIMAL(6,2) NOT NULL,
    target_daily_carbs DECIMAL(6,2) NOT NULL,
    
    -- Generation info
    generation_method VARCHAR(20) DEFAULT 'ai', -- 'ai', 'manual', 'template'
    ai_model_version VARCHAR(50),
    generation_prompt_id UUID,
    generation_duration_ms INTEGER,
    
    -- Cost tracking
    estimated_total_cost DECIMAL(8,2),
    actual_total_cost DECIMAL(8,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_plan_dates CHECK (start_date <= end_date),
    CONSTRAINT unique_user_week UNIQUE (user_id, start_date)
);

CREATE INDEX idx_weekly_plans_user_date ON weekly_plans(user_id, start_date);
CREATE INDEX idx_weekly_plans_status ON weekly_plans(status);
```

### 5. DailyPlans (日別計画)
```sql
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    
    -- Daily targets
    target_calories INTEGER NOT NULL,
    target_protein DECIMAL(6,2) NOT NULL,
    target_fat DECIMAL(6,2) NOT NULL,
    target_carbs DECIMAL(6,2) NOT NULL,
    
    -- Prep instructions
    prep_instructions TEXT[],
    estimated_prep_time INTEGER, -- minutes
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT unique_plan_date UNIQUE (weekly_plan_id, date)
);

CREATE INDEX idx_daily_plans_weekly_plan ON daily_plans(weekly_plan_id);
CREATE INDEX idx_daily_plans_date ON daily_plans(date);
```

### 6. Meals (食事情報)
```sql
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    
    -- Meal metadata
    meal_type VARCHAR(20) NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
    meal_order INTEGER NOT NULL, -- 1, 2, 3... for multiple snacks
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Nutrition
    calories INTEGER NOT NULL,
    protein DECIMAL(6,2) NOT NULL,
    fat DECIMAL(6,2) NOT NULL,
    carbs DECIMAL(6,2) NOT NULL,
    fiber DECIMAL(6,2),
    
    -- Cooking info
    cooking_method VARCHAR(50), -- 'batch_cook', 'fresh', 'assembly'
    prep_time INTEGER, -- minutes
    cook_time INTEGER,
    difficulty_level INTEGER DEFAULT 2, -- 1-5
    
    -- Instructions
    instructions TEXT[],
    cooking_tips TEXT,
    storage_instructions TEXT,
    
    -- Serving info
    servings INTEGER DEFAULT 1,
    can_meal_prep BOOLEAN DEFAULT true,
    storage_days INTEGER,
    
    -- Cost
    estimated_cost DECIMAL(6,2),
    
    -- Media
    image_url TEXT,
    video_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_meal_order CHECK (meal_order > 0),
    CONSTRAINT unique_daily_meal UNIQUE (daily_plan_id, meal_type, meal_order)
);

CREATE INDEX idx_meals_daily_plan ON meals(daily_plan_id);
CREATE INDEX idx_meals_type ON meals(meal_type);
CREATE INDEX idx_meals_batch_cook ON meals(can_meal_prep) WHERE can_meal_prep = true;
```

### 7. MealIngredients (食事-食材関係)
```sql
CREATE TABLE meal_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    
    -- Quantity
    amount DECIMAL(8,3) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'g', 'ml', 'piece', 'cup'
    
    -- Calculated nutrition (for performance)
    calories DECIMAL(7,2),
    protein DECIMAL(6,2),
    fat DECIMAL(6,2),
    carbs DECIMAL(6,2),
    
    -- Preparation notes
    preparation VARCHAR(100), -- 'diced', 'sliced', 'ground', etc.
    is_optional BOOLEAN DEFAULT false,
    substitute_ingredients UUID[], -- array of ingredient IDs
    
    -- Cost
    estimated_cost DECIMAL(6,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_meal_ingredient UNIQUE (meal_id, ingredient_id)
);

CREATE INDEX idx_meal_ingredients_meal ON meal_ingredients(meal_id);
CREATE INDEX idx_meal_ingredients_ingredient ON meal_ingredients(ingredient_id);
```

### 8. ShoppingLists (買い物リスト)
```sql
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_plan_id UUID NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
    
    -- List metadata
    name VARCHAR(200) DEFAULT 'Weekly Shopping',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'shopping', 'completed'
    
    -- Organization
    store_layout JSONB, -- {"produce": 1, "dairy": 2, "meat": 3}
    estimated_total_cost DECIMAL(8,2),
    actual_total_cost DECIMAL(8,2),
    
    -- Timing
    planned_shopping_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shopping_lists_weekly_plan ON shopping_lists(weekly_plan_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);
```

### 9. ShoppingListItems (買い物アイテム)
```sql
CREATE TABLE shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    
    -- Quantity needed
    required_amount DECIMAL(8,3) NOT NULL,
    required_unit VARCHAR(20) NOT NULL,
    
    -- Purchase planning
    package_size DECIMAL(8,3),
    packages_needed INTEGER DEFAULT 1,
    estimated_cost DECIMAL(6,2),
    actual_cost DECIMAL(6,2),
    
    -- Shopping status
    is_completed BOOLEAN DEFAULT false,
    is_substituted BOOLEAN DEFAULT false,
    substitute_ingredient_id UUID REFERENCES ingredients(id),
    notes TEXT,
    
    -- Organization
    store_section VARCHAR(50),
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_list_ingredient UNIQUE (shopping_list_id, ingredient_id)
);

CREATE INDEX idx_shopping_items_list ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_items_ingredient ON shopping_list_items(ingredient_id);
CREATE INDEX idx_shopping_items_status ON shopping_list_items(is_completed);
```

### 10. PantryItems (常備品管理)
```sql
CREATE TABLE pantry_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id),
    
    -- Stock information
    current_amount DECIMAL(8,3) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    minimum_stock DECIMAL(8,3) DEFAULT 0,
    
    -- Purchase tracking
    last_purchased DATE,
    average_consumption_per_week DECIMAL(8,3),
    
    -- Storage info
    location VARCHAR(50), -- 'fridge', 'freezer', 'pantry', 'spice_rack'
    expiry_date DATE,
    opened_date DATE,
    
    -- Auto-management
    auto_add_to_shopping BOOLEAN DEFAULT true,
    preferred_package_size DECIMAL(8,3),
    preferred_brand VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_ingredient UNIQUE (user_id, ingredient_id)
);

CREATE INDEX idx_pantry_items_user ON pantry_items(user_id);
CREATE INDEX idx_pantry_items_ingredient ON pantry_items(ingredient_id);
CREATE INDEX idx_pantry_items_low_stock ON pantry_items(user_id) WHERE current_amount <= minimum_stock;
CREATE INDEX idx_pantry_items_expiry ON pantry_items(expiry_date) WHERE expiry_date IS NOT NULL;
```

### 11. NutritionLogs (栄養記録)
```sql
CREATE TABLE nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Log metadata
    logged_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Planned vs actual
    planned_meal_id UUID REFERENCES meals(id),
    actual_calories DECIMAL(7,2) NOT NULL,
    actual_protein DECIMAL(6,2) NOT NULL,
    actual_fat DECIMAL(6,2) NOT NULL,
    actual_carbs DECIMAL(6,2) NOT NULL,
    actual_fiber DECIMAL(6,2),
    
    -- Portion tracking
    planned_portion DECIMAL(4,2) DEFAULT 1.0, -- 1.0 = 100% of planned meal
    additional_items JSONB, -- [{"ingredient_id": "...", "amount": 50, "unit": "g"}]
    
    -- Context
    notes TEXT,
    mood_before_eating INTEGER, -- 1-5 scale
    mood_after_eating INTEGER,
    hunger_level INTEGER, -- 1-5 scale
    satisfaction_level INTEGER,
    
    -- Media
    photo_url TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_portion CHECK (planned_portion > 0)
);

CREATE INDEX idx_nutrition_logs_user_date ON nutrition_logs(user_id, logged_date);
CREATE INDEX idx_nutrition_logs_meal ON nutrition_logs(planned_meal_id);
CREATE INDEX idx_nutrition_logs_user_meal_date ON nutrition_logs(user_id, meal_type, logged_date);
```

### 12. WeightLogs (体重記録)
```sql
CREATE TABLE weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Measurements
    weight DECIMAL(5,2) NOT NULL, -- kg
    body_fat_percentage DECIMAL(4,2),
    muscle_mass DECIMAL(5,2),
    water_percentage DECIMAL(4,2),
    
    -- Context
    measured_date DATE NOT NULL,
    measured_time TIME,
    measurement_condition VARCHAR(50), -- 'morning_empty_stomach', 'after_workout', etc.
    
    -- Notes
    notes TEXT,
    mood INTEGER, -- 1-5 scale
    energy_level INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_measurement UNIQUE (user_id, measured_date, measured_time)
);

CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, measured_date);
```

### 13. AIPromptHistory (AI生成履歴)
```sql
CREATE TABLE ai_prompt_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request info
    prompt_type VARCHAR(50) NOT NULL, -- 'weekly_plan', 'shopping_list', 'recipe_suggestion'
    request_parameters JSONB NOT NULL,
    system_prompt TEXT,
    user_prompt TEXT,
    
    -- Response info
    ai_model VARCHAR(50) NOT NULL,
    response_text TEXT,
    response_json JSONB,
    
    -- Metrics
    tokens_used INTEGER,
    response_time_ms INTEGER,
    cost_usd DECIMAL(8,4),
    
    -- Quality tracking
    user_rating INTEGER, -- 1-5 stars
    user_feedback TEXT,
    was_used BOOLEAN DEFAULT true,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_prompts_user ON ai_prompt_history(user_id);
CREATE INDEX idx_ai_prompts_type ON ai_prompt_history(prompt_type);
CREATE INDEX idx_ai_prompts_date ON ai_prompt_history(created_at);
CREATE INDEX idx_ai_prompts_model ON ai_prompt_history(ai_model);
```

## パフォーマンス最適化

### 計算済みビュー
```sql
-- Daily nutrition summary view
CREATE MATERIALIZED VIEW daily_nutrition_summary AS
SELECT 
    user_id,
    logged_date,
    SUM(actual_calories) as total_calories,
    SUM(actual_protein) as total_protein,
    SUM(actual_fat) as total_fat,
    SUM(actual_carbs) as total_carbs,
    COUNT(*) as meals_logged,
    AVG(satisfaction_level) as avg_satisfaction
FROM nutrition_logs
GROUP BY user_id, logged_date;

CREATE UNIQUE INDEX idx_daily_nutrition_summary ON daily_nutrition_summary(user_id, logged_date);

-- Refresh trigger
CREATE OR REPLACE FUNCTION refresh_daily_nutrition_summary()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_nutrition_summary;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_nutrition_summary
    AFTER INSERT OR UPDATE OR DELETE ON nutrition_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_daily_nutrition_summary();
```

### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

-- User can only access own data
CREATE POLICY user_data_policy ON users FOR ALL TO authenticated USING (id = auth.uid());
CREATE POLICY user_profile_policy ON user_profiles FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY weekly_plans_policy ON weekly_plans FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY nutrition_logs_policy ON nutrition_logs FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY weight_logs_policy ON weight_logs FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY pantry_items_policy ON pantry_items FOR ALL TO authenticated USING (user_id = auth.uid());
```

### インデックス戦略

#### パフォーマンス重要インデックス
```sql
-- Composite indexes for common queries
CREATE INDEX idx_nutrition_logs_user_date_type ON nutrition_logs(user_id, logged_date, meal_type);
CREATE INDEX idx_meals_daily_plan_type_order ON meals(daily_plan_id, meal_type, meal_order);
CREATE INDEX idx_meal_ingredients_meal_cost ON meal_ingredients(meal_id, estimated_cost);

-- Partial indexes for filtered queries
CREATE INDEX idx_weekly_plans_active ON weekly_plans(user_id, start_date) WHERE status = 'active';
CREATE INDEX idx_pantry_items_active ON pantry_items(user_id, ingredient_id) WHERE current_amount > 0;

-- Expression indexes for search
CREATE INDEX idx_ingredients_search_gin ON ingredients USING GIN(search_vector);
```