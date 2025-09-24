# システムアーキテクチャ設計書

## 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (React + TypeScript)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Pages     │ │ Components  │ │   Hooks     │           │
│  │             │ │             │ │             │           │
│  │ - Dashboard │ │ - Charts    │ │ - useQuery  │           │
│  │ - Planning  │ │ - Forms     │ │ - useAuth   │           │
│  │ - Analytics │ │ - Layout    │ │ - useMacro  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ↕ tRPC / HTTP
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer                          │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes + tRPC                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Router    │ │ Middleware  │ │ Procedures  │           │
│  │             │ │             │ │             │           │
│  │ - auth      │ │ - authGuard │ │ - planGen   │           │
│  │ - meal      │ │ - rateLimit │ │ - macroCalc │           │
│  │ - analytics │ │ - logging   │ │ - shopping  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ↕ Prisma ORM
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + Redis                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Transactional│ │   Cache     │ │  Sessions   │           │
│  │    Data      │ │             │ │             │           │
│  │ - Users      │ │ - Menu Plans│ │ - Auth      │           │
│  │ - Meals      │ │ - AI Results│ │ - Rate Limit│           │
│  │ - Analytics  │ │ - Recipes   │ │ - Temp Data │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              ↕ Azure SDK
┌─────────────────────────────────────────────────────────────┐
│                 External Services                           │
├─────────────────────────────────────────────────────────────┤
│  Azure Services                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │Azure OpenAI │ │ Functions   │ │ Key Vault   │           │
│  │             │ │             │ │             │           │
│  │ - Menu Gen  │ │ - Scheduler │ │ - Secrets   │           │
│  │ - Shopping  │ │ - Batch Jobs│ │ - API Keys  │           │
│  │ - Analysis  │ │ - Cleanup   │ │ - DB Conn   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## サービス概要図

### Core Services
1. **Authentication Service**: Auth.js + Microsoft Entra ID
2. **Meal Planning Service**: tRPC procedures + Azure OpenAI
3. **Nutrition Tracking Service**: PostgreSQL + Chart.js
4. **Shopping List Service**: AI-generated + manual editing
5. **Analytics Service**: Data aggregation + visualization

### Infrastructure Services
1. **Caching Layer**: Redis for API responses & sessions
2. **File Storage**: Azure Blob for recipe images
3. **Scheduler**: Azure Functions for weekly plan generation
4. **Monitoring**: Application Insights + Log Analytics

## リクエスト/レスポンスフロー

### 1. 週間プラン生成フロー

```
Client Request:
POST /api/trpc/meal.generateWeeklyPlan

Request Body:
{
  "userGoals": {
    "weight": 80,
    "targetWeight": 75,
    "bodyFatPercentage": 15,
    "pfcRatio": { "protein": 30, "fat": 25, "carbs": 45 },
    "mealsPerDay": 5
  },
  "constraints": {
    "budget": 15000,
    "allergies": ["nuts", "seafood"],
    "cookingTime": 120,
    "equipment": ["rice_cooker", "slow_cooker"]
  },
  "pantryItems": ["rice", "chicken_breast", "eggs"]
}

Processing Flow:
1. Validate user input & authentication
2. Calculate daily/meal macro targets
3. Check Redis cache for similar plans
4. If cache miss: Call Azure OpenAI API
5. Validate AI response against nutrition rules
6. Store plan in PostgreSQL
7. Cache result in Redis (TTL: 24h)
8. Return structured response

Response:
{
  "weeklyPlan": {
    "id": "plan_123",
    "week": "2025-09-16",
    "totalCalories": 2100,
    "macros": { "protein": 157, "fat": 58, "carbs": 236 },
    "days": [
      {
        "date": "2025-09-16",
        "meals": [
          {
            "type": "breakfast",
            "name": "プロテインオートミール",
            "calories": 420,
            "macros": { "protein": 35, "fat": 12, "carbs": 45 },
            "ingredients": [...],
            "instructions": [...]
          }
        ]
      }
    ],
    "shoppingList": [...],
    "batchCookingInstructions": [...]
  }
}
```

### 2. 食事記録フロー

```
Client Request:
POST /api/trpc/nutrition.logMeal

Request Body:
{
  "date": "2025-09-16",
  "mealType": "breakfast",
  "plannedMealId": "meal_456",
  "actualPortions": {
    "main": 1.2,
    "side": 0.8
  },
  "notes": "追加でバナナ1本"
}

Processing Flow:
1. Authenticate user
2. Validate meal exists & belongs to user
3. Calculate actual macros from portions
4. Store in nutrition_logs table
5. Update daily totals in cache
6. Trigger weekly progress recalculation

Response:
{
  "logEntry": {
    "id": "log_789",
    "actualCalories": 504,
    "actualMacros": { "protein": 42, "fat": 14, "carbs": 54 },
    "variance": { "calories": +84, "protein": +7, "fat": +2, "carbs": +9 }
  },
  "dailyTotals": {
    "calories": 504,
    "macros": { "protein": 42, "fat": 14, "carbs": 54 },
    "progress": { "calories": 0.24, "protein": 0.27, "fat": 0.24, "carbs": 0.23 }
  }
}
```

## データフロー パターン

### 1. Real-time Updates
```
User Action → tRPC Mutation → Database Update → 
TanStack Query Invalidation → UI Refresh
```

### 2. Background Processing
```
Scheduled Trigger → Azure Function → 
Batch Plan Generation → Database Update → 
Push Notification
```

### 3. Caching Strategy
```
Request → Check Redis → 
If Hit: Return Cached → 
If Miss: Process → Cache → Return
```

## セキュリティ アーキテクチャ

### 認証フロー
1. **Login**: Microsoft Entra ID OAuth2
2. **Session**: JWT in httpOnly cookies
3. **API**: Bearer token validation
4. **Database**: Row-level security (RLS)

### データ保護
1. **Encryption**: TLS 1.3 + AES-256
2. **Secrets**: Azure Key Vault
3. **PII**: Minimal collection + anonymization
4. **Audit**: All mutations logged

## Performance 最適化

### Frontend
- **Code Splitting**: Dynamic imports
- **Image Optimization**: Next.js Image component
- **Caching**: SWR + service worker

### Backend
- **Connection Pooling**: Prisma connection pooling
- **Query Optimization**: Prisma generate + indexes
- **API Caching**: Redis TTL strategy

### Infrastructure
- **CDN**: Azure Front Door
- **Auto-scaling**: Azure App Service
- **Monitoring**: Application Insights