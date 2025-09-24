# API設計書

## tRPC プロシージャ設計

### 認証ルーター
```typescript
// /src/server/api/routers/auth.ts
export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      timezone: z.string().optional(),
      locale: z.enum(['ja-JP', 'en-US']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),
});
```

### プロフィール管理ルーター
```typescript
// /src/server/api/routers/profile.ts
export const profileRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });
  }),

  upsert: protectedProcedure
    .input(UserProfileUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // BMR・TDEE・目標カロリー計算
      const bmr = calculateBMR({
        weight: input.currentWeight,
        height: input.height,
        age: input.age || 30,
        gender: input.gender,
        bodyFatPercentage: input.bodyFatPercentage,
      });

      const tdee = calculateTDEE(bmr, input.activityLevel);
      const targetCalories = calculateTargetCalories(
        tdee,
        input.currentWeight,
        input.targetWeight
      );

      return ctx.db.userProfile.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          userId: ctx.session.user.id,
          dailyCalories: targetCalories,
          ...input,
        },
        update: {
          dailyCalories: targetCalories,
          ...input,
        },
      });
    }),

  calculateMacros: protectedProcedure
    .input(z.object({
      calories: z.number(),
      proteinRatio: z.number(),
      fatRatio: z.number(),
      carbRatio: z.number(),
      weight: z.number(),
      activityLevel: z.string(),
    }))
    .query(async ({ input }) => {
      return calculateMacroTargets(
        input.calories,
        {
          protein: input.proteinRatio,
          fat: input.fatRatio,
          carbs: input.carbRatio,
        },
        input.weight,
        input.activityLevel
      );
    }),
});

const UserProfileUpdateSchema = z.object({
  currentWeight: z.number().min(30).max(300),
  targetWeight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  bodyFatPercentage: z.number().min(3).max(50).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  proteinRatio: z.number().min(10).max(50),
  fatRatio: z.number().min(15).max(45),
  carbRatio: z.number().min(20).max(70),
  mealsPerDay: z.number().min(1).max(6),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikedFoods: z.array(z.string()).optional(),
  preferredCookingTime: z.number().min(15).max(300),
  weeklyBudget: z.number().min(1000).max(100000),
  availableEquipment: z.array(z.string()),
  kitchenSkillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});
```

### 食事プラン管理ルーター
```typescript
// /src/server/api/routers/mealPlan.ts
export const mealPlanRouter = createTRPCRouter({
  generateWeekly: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      forceRegenerate: z.boolean().default(false),
      customConstraints: z.object({
        specialRequests: z.string().optional(),
        excludeIngredients: z.array(z.string()).optional(),
        includeFavorites: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      // 既存プランチェック
      if (!input.forceRegenerate) {
        const existingPlan = await ctx.db.weeklyPlan.findFirst({
          where: {
            userId: ctx.session.user.id,
            startDate: input.startDate,
            status: 'active',
          },
          include: {
            dailyPlans: {
              include: {
                meals: {
                  include: {
                    mealIngredients: {
                      include: { ingredient: true }
                    }
                  }
                }
              }
            }
          }
        });

        if (existingPlan) {
          return transformToWeeklyMealPlan(existingPlan);
        }
      }

      // マクロ計算
      const macroTargets = calculateMacroTargets(
        profile.dailyCalories,
        {
          protein: profile.proteinRatio,
          fat: profile.fatRatio,
          carbs: profile.carbRatio,
        },
        profile.currentWeight,
        profile.activityLevel
      );

      // 常備品取得
      const pantryItems = await ctx.db.pantryItem.findMany({
        where: { 
          userId: ctx.session.user.id,
          currentAmount: { gt: 0 }
        },
        include: { ingredient: true }
      });

      // 制約条件構築
      const constraints: MealPlanConstraints = {
        weeklyBudget: profile.weeklyBudget,
        allergies: profile.allergies,
        dislikedFoods: profile.dislikedFoods,
        maxCookingTime: profile.preferredCookingTime,
        availableEquipment: profile.availableEquipment,
        skillLevel: profile.kitchenSkillLevel,
        pantryItems: pantryItems.map(item => ({
          name: item.ingredient.name,
          amount: item.currentAmount,
          unit: item.unit,
        })),
        specialRequests: input.customConstraints?.specialRequests,
      };

      // AI生成
      const aiService = new MacroFitAIService(ctx.azureOpenAIConfig);
      const generatedPlan = await aiService.generateWeeklyMealPlan(
        profile,
        macroTargets,
        constraints
      );

      // データベース保存
      const savedPlan = await ctx.db.$transaction(async (tx) => {
        const weeklyPlan = await tx.weeklyPlan.create({
          data: {
            userId: ctx.session.user.id,
            startDate: input.startDate,
            endDate: new Date(input.startDate.getTime() + 6 * 24 * 60 * 60 * 1000),
            targetDailyCalories: macroTargets.calories,
            targetDailyProtein: macroTargets.protein,
            targetDailyFat: macroTargets.fat,
            targetDailyCarbs: macroTargets.carbs,
            generationMethod: 'ai',
            aiModelVersion: 'gpt-4-turbo',
            estimatedTotalCost: generatedPlan.shoppingList.totalEstimatedCost,
          },
        });

        // 日別プラン保存
        for (const dayPlan of generatedPlan.weeklyPlan.days) {
          const dailyPlan = await tx.dailyPlan.create({
            data: {
              weeklyPlanId: weeklyPlan.id,
              date: new Date(dayPlan.date),
              dayOfWeek: dayPlan.dayOfWeek,
              targetCalories: dayPlan.totalCalories,
              targetProtein: dayPlan.macros.protein,
              targetFat: dayPlan.macros.fat,
              targetCarbs: dayPlan.macros.carbs,
            },
          });

          // 食事保存
          for (const meal of dayPlan.meals) {
            const savedMeal = await tx.meal.create({
              data: {
                dailyPlanId: dailyPlan.id,
                mealType: meal.mealType,
                mealOrder: 1,
                name: meal.name,
                description: meal.description,
                calories: meal.calories,
                protein: meal.macros.protein,
                fat: meal.macros.fat,
                carbs: meal.macros.carbs,
                cookingMethod: meal.batchCookable ? 'batch_cook' : 'fresh',
                prepTime: meal.cookingTime,
                difficulty: meal.difficulty,
                instructions: meal.instructions,
                servings: meal.servings,
                canMealPrep: meal.batchCookable,
                storageDays: meal.storageLife,
              },
            });

            // 食材保存
            for (const ingredient of meal.ingredients) {
              await tx.mealIngredient.create({
                data: {
                  mealId: savedMeal.id,
                  ingredientId: await getOrCreateIngredient(tx, ingredient),
                  amount: ingredient.amount,
                  unit: ingredient.unit,
                  calories: ingredient.calories,
                  protein: ingredient.protein,
                  fat: ingredient.fat,
                  carbs: ingredient.carbs,
                },
              });
            }
          }
        }

        return weeklyPlan;
      });

      return transformToWeeklyMealPlan(savedPlan);
    }),

  getWeekly: protectedProcedure
    .input(z.object({
      startDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.weeklyPlan.findFirst({
        where: {
          userId: ctx.session.user.id,
          startDate: input.startDate,
        },
        include: {
          dailyPlans: {
            include: {
              meals: {
                include: {
                  mealIngredients: {
                    include: { ingredient: true }
                  }
                }
              }
            }
          }
        }
      });
    }),

  listPlans: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().min(1).max(50).default(10),
      status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      
      const [plans, total] = await Promise.all([
        ctx.db.weeklyPlan.findMany({
          where: {
            userId: ctx.session.user.id,
            ...(input.status && { status: input.status }),
          },
          include: {
            _count: {
              select: { dailyPlans: true }
            }
          },
          orderBy: { startDate: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.db.weeklyPlan.count({
          where: {
            userId: ctx.session.user.id,
            ...(input.status && { status: input.status }),
          },
        }),
      ]);

      return {
        plans,
        total,
        pages: Math.ceil(total / input.limit),
        currentPage: input.page,
      };
    }),
});
```

### 栄養記録ルーター
```typescript
// /src/server/api/routers/nutrition.ts
export const nutritionRouter = createTRPCRouter({
  logMeal: protectedProcedure
    .input(z.object({
      date: z.date(),
      mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack1', 'snack2']),
      plannedMealId: z.string().uuid().optional(),
      actualCalories: z.number(),
      actualProtein: z.number(),
      actualFat: z.number(),
      actualCarbs: z.number(),
      plannedPortion: z.number().default(1.0),
      additionalItems: z.array(z.object({
        ingredientId: z.string().uuid(),
        amount: z.number(),
        unit: z.string(),
      })).optional(),
      notes: z.string().optional(),
      moodBeforeEating: z.number().min(1).max(5).optional(),
      moodAfterEating: z.number().min(1).max(5).optional(),
      hungerLevel: z.number().min(1).max(5).optional(),
      satisfactionLevel: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const logEntry = await ctx.db.nutritionLog.create({
        data: {
          userId: ctx.session.user.id,
          loggedDate: input.date,
          mealType: input.mealType,
          plannedMealId: input.plannedMealId,
          actualCalories: input.actualCalories,
          actualProtein: input.actualProtein,
          actualFat: input.actualFat,
          actualCarbs: input.actualCarbs,
          plannedPortion: input.plannedPortion,
          additionalItems: input.additionalItems || [],
          notes: input.notes,
          moodBeforeEating: input.moodBeforeEating,
          moodAfterEating: input.moodAfterEating,
          hungerLevel: input.hungerLevel,
          satisfactionLevel: input.satisfactionLevel,
        },
      });

      // 日次合計をキャッシュ更新
      await updateDailyTotalsCache(ctx.redis, ctx.session.user.id, input.date);

      return logEntry;
    }),

  getDailyLogs: protectedProcedure
    .input(z.object({
      date: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.nutritionLog.findMany({
        where: {
          userId: ctx.session.user.id,
          loggedDate: input.date,
        },
        include: {
          plannedMeal: {
            include: {
              mealIngredients: {
                include: { ingredient: true }
              }
            }
          }
        },
        orderBy: [
          { mealType: 'asc' },
          { loggedAt: 'asc' }
        ],
      });

      return logs;
    }),

  getWeeklyAnalytics: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const analytics = await ctx.db.nutritionLog.groupBy({
        by: ['loggedDate'],
        where: {
          userId: ctx.session.user.id,
          loggedDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        _sum: {
          actualCalories: true,
          actualProtein: true,
          actualFat: true,
          actualCarbs: true,
        },
        _avg: {
          satisfactionLevel: true,
          moodAfterEating: true,
        },
        _count: {
          id: true,
        },
      });

      return analytics.map(day => ({
        date: day.loggedDate,
        totalCalories: day._sum.actualCalories || 0,
        totalProtein: day._sum.actualProtein || 0,
        totalFat: day._sum.actualFat || 0,
        totalCarbs: day._sum.actualCarbs || 0,
        avgSatisfaction: day._avg.satisfactionLevel || 0,
        avgMood: day._avg.moodAfterEating || 0,
        mealsLogged: day._count.id,
      }));
    }),

  getComplianceScore: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      // プロフィール取得
      const profile = await ctx.db.userProfile.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!profile) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found',
        });
      }

      const analytics = await ctx.db.nutritionLog.groupBy({
        by: ['loggedDate'],
        where: {
          userId: ctx.session.user.id,
          loggedDate: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        _sum: {
          actualCalories: true,
          actualProtein: true,
          actualFat: true,
          actualCarbs: true,
        },
      });

      const complianceScores = analytics.map(day => {
        const calorieCompliance = Math.max(0, 100 - Math.abs(
          (day._sum.actualCalories || 0) - profile.dailyCalories
        ) / profile.dailyCalories * 100);

        const proteinCompliance = Math.max(0, 100 - Math.abs(
          (day._sum.actualProtein || 0) - (profile.dailyCalories * profile.proteinRatio / 100 / 4)
        ) / (profile.dailyCalories * profile.proteinRatio / 100 / 4) * 100);

        const fatCompliance = Math.max(0, 100 - Math.abs(
          (day._sum.actualFat || 0) - (profile.dailyCalories * profile.fatRatio / 100 / 9)
        ) / (profile.dailyCalories * profile.fatRatio / 100 / 9) * 100);

        const carbCompliance = Math.max(0, 100 - Math.abs(
          (day._sum.actualCarbs || 0) - (profile.dailyCalories * profile.carbRatio / 100 / 4)
        ) / (profile.dailyCalories * profile.carbRatio / 100 / 4) * 100);

        const overallCompliance = (calorieCompliance + proteinCompliance + fatCompliance + carbCompliance) / 4;

        return {
          date: day.loggedDate,
          calorieCompliance,
          proteinCompliance,
          fatCompliance,
          carbCompliance,
          overallCompliance,
        };
      });

      const avgCompliance = complianceScores.reduce((sum, day) => sum + day.overallCompliance, 0) / complianceScores.length;

      return {
        averageCompliance: avgCompliance,
        dailyScores: complianceScores,
      };
    }),
});
```

## REST エンドポイント（外部統合用）

### Webhook エンドポイント
```typescript
// /src/pages/api/webhooks/azure-functions.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const WebhookSchema = z.object({
  type: z.enum(['weekly_plan_trigger', 'shopping_reminder', 'weight_reminder']),
  userId: z.string().uuid(),
  data: z.record(z.any()),
  scheduledTime: z.string().datetime(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Azure Functions認証
    const authHeader = req.headers.authorization;
    if (!authHeader || !validateAzureFunctionAuth(authHeader)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const webhook = WebhookSchema.parse(req.body);

    switch (webhook.type) {
      case 'weekly_plan_trigger':
        await handleWeeklyPlanGeneration(webhook.userId);
        break;
      case 'shopping_reminder':
        await handleShoppingReminder(webhook.userId);
        break;
      case 'weight_reminder':
        await handleWeightReminder(webhook.userId);
        break;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### エクスポート API
```typescript
// /src/pages/api/export/[format].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { format } = req.query;
  const { startDate, endDate } = req.query;

  if (!['pdf', 'csv', 'json'].includes(format as string)) {
    return res.status(400).json({ error: 'Unsupported format' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const data = await exportUserData(
      session.user.id,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    switch (format) {
      case 'pdf':
        const pdf = await generatePDFReport(data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="nutrition-report.pdf"');
        res.send(pdf);
        break;
      case 'csv':
        const csv = generateCSVReport(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="nutrition-data.csv"');
        res.send(csv);
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="nutrition-data.json"');
        res.json(data);
        break;
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}
```

## レスポンス型定義

```typescript
// /src/types/api.ts
export interface WeeklyMealPlanResponse {
  weeklyPlan: {
    id: string;
    week: string;
    totalCalories: number;
    avgDailyMacros: MacroTargets;
    estimatedTotalCost: number;
    totalPrepTime: number;
    days: DayPlan[];
  };
  shoppingList: ShoppingList;
  batchCookingInstructions: BatchInstruction[];
}

export interface DayPlan {
  date: string;
  dayOfWeek: string;
  totalCalories: number;
  macros: MacroTargets;
  meals: Meal[];
}

export interface Meal {
  id: string;
  mealType: MealType;
  name: string;
  description?: string;
  calories: number;
  macros: MacroTargets;
  ingredients: MealIngredient[];
  instructions: string[];
  cookingTime: number;
  difficulty: number;
  batchCookable: boolean;
  servings: number;
  storageLife: number;
}

export interface ShoppingList {
  id: string;
  totalEstimatedCost: number;
  categories: ShoppingCategory[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```