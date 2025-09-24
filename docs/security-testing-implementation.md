# セキュリティ・テスト・実装計画書

## セキュリティ設計

### 認証・認可アーキテクチャ
```typescript
// /src/lib/auth.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    AzureADProvider({
      clientId: env.AZURE_AD_CLIENT_ID,
      clientSecret: env.AZURE_AD_CLIENT_SECRET,
      tenantId: env.AZURE_AD_TENANT_ID,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'user';
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session?.user && token?.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

// Row Level Security (RLS) 実装
export const createSecureContext = async (session: Session | null) => {
  if (!session?.user?.id) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  // データベース接続にuser contextを設定
  await db.$executeRaw`SET app.current_user_id = ${session.user.id}`;
  
  return {
    userId: session.user.id,
    userRole: session.user.role,
    db,
  };
};
```

### データ保護・暗号化
```typescript
// /src/lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32文字のキー
const ALGORITHM = 'aes-256-gcm';

export class DataEncryption {
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('MacroFitPro', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('MacroFitPro', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // 個人識別情報の匿名化
  static anonymizeEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    const anonymized = localPart.substring(0, 2) + '*'.repeat(localPart.length - 2);
    return `${anonymized}@${domain}`;
  }

  // パスワードハッシュ化（パスワード認証を追加する場合）
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
}

// Azure Key Vault統合
export class AzureKeyVaultService {
  private client: KeyVaultClient;

  constructor() {
    const credential = new DefaultAzureCredential();
    this.client = new KeyVaultClient(
      process.env.AZURE_KEY_VAULT_URL!,
      credential
    );
  }

  async getSecret(secretName: string): Promise<string> {
    const secret = await this.client.getSecret(secretName);
    return secret.value!;
  }

  async setSecret(secretName: string, value: string): Promise<void> {
    await this.client.setSecret(secretName, value);
  }
}
```

### セキュリティミドルウェア
```typescript
// /src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from './lib/rate-limit';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // セキュリティヘッダー設定
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.openai.com https://*.azure.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // API レート制限
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const identifier = request.ip || 'anonymous';
    const { success } = await rateLimit.limit(identifier);

    if (!success) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 監査ログ
```typescript
// /src/lib/audit.ts
interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class AuditLogger {
  static async log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    await db.auditLog.create({
      data: {
        ...entry,
        timestamp: new Date(),
      },
    });

    // 重要操作は即座にAzure Log Analyticsに送信
    if (this.isCriticalAction(entry.action)) {
      await this.sendToAzureMonitor(entry);
    }
  }

  private static isCriticalAction(action: string): boolean {
    const criticalActions = [
      'user.delete',
      'data.export',
      'admin.access',
      'auth.failed',
    ];
    return criticalActions.includes(action);
  }

  private static async sendToAzureMonitor(entry: AuditLogEntry) {
    // Azure Monitor REST API呼び出し（実装省略）
  }
}

// 使用例
export const auditMiddleware = createTRPCMiddleware(async (opts) => {
  const { ctx, type, path, input } = opts;
  
  const result = await opts.next();

  if (type === 'mutation') {
    await AuditLogger.log({
      userId: ctx.session?.user?.id || 'anonymous',
      action: `${path}.${type}`,
      resource: path.split('.')[0],
      metadata: { input, success: result.ok },
      ipAddress: ctx.req?.ip,
      userAgent: ctx.req?.headers['user-agent'],
    });
  }

  return result;
});
```

## テスト戦略

### 1. ユニットテスト（Vitest）
```typescript
// /tests/unit/algorithms.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBMR, calculateMacroTargets } from '@/lib/nutrition';

describe('栄養計算アルゴリズム', () => {
  describe('BMR計算', () => {
    it('男性のBMRを正しく計算する', () => {
      const bmr = calculateBMR({
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male',
      });

      expect(bmr).toBeCloseTo(1847, 0); // Harris-Benedict式による期待値
    });

    it('女性のBMRを正しく計算する', () => {
      const bmr = calculateBMR({
        weight: 60,
        height: 165,
        age: 25,
        gender: 'female',
      });

      expect(bmr).toBeCloseTo(1442, 0);
    });

    it('体脂肪率補正が正しく動作する', () => {
      const bmrWithoutBf = calculateBMR({
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male',
      });

      const bmrWithBf = calculateBMR({
        weight: 80,
        height: 180,
        age: 30,
        gender: 'male',
        bodyFatPercentage: 15,
      });

      expect(bmrWithBf).not.toBe(bmrWithoutBf);
      expect(bmrWithBf).toBeGreaterThan(1700);
    });
  });

  describe('マクロ栄養素計算', () => {
    it('PFC比率から正しくマクロを計算する', () => {
      const macros = calculateMacroTargets(
        2000, // カロリー
        { protein: 30, fat: 25, carbs: 45 }, // PFC比率
        80, // 体重
        'moderate' // 活動レベル
      );

      expect(macros.calories).toBe(2000);
      expect(macros.protein).toBeCloseTo(150, 0); // 2000 * 0.3 / 4
      expect(macros.fat).toBeCloseTo(56, 0); // 2000 * 0.25 / 9
      expect(macros.carbs).toBeCloseTo(225, 0); // 2000 * 0.45 / 4
    });

    it('最低タンパク質要求量を満たす', () => {
      const macros = calculateMacroTargets(
        1500, // 低カロリー
        { protein: 15, fat: 30, carbs: 55 }, // 低タンパク質比率
        80, // 体重
        'very_active' // 高活動レベル
      );

      const minProteinRequired = 80 * 2.2; // 体重 × 2.2g (高活動レベル)
      expect(macros.protein).toBeGreaterThanOrEqual(minProteinRequired);
    });
  });
});

// /tests/unit/batch-cooking.test.ts
describe('バッチクッキング最適化', () => {
  it('食材利用効率を最大化する', () => {
    const recipes = createTestRecipes();
    const targets = createTestTargets();
    const constraints = createTestConstraints();

    const plan = optimizeBatchCooking(recipes, targets, constraints);

    expect(plan.ingredientUtilization.size).toBeGreaterThan(0);
    
    // 平均利用効率が70%以上
    const avgUtilization = Array.from(plan.ingredientUtilization.values())
      .reduce((sum, util) => sum + util, 0) / plan.ingredientUtilization.size;
    expect(avgUtilization).toBeGreaterThanOrEqual(70);
  });

  it('制約条件を遵守する', () => {
    const plan = optimizeBatchCooking(recipes, targets, {
      maxPrepTime: 120,
      maxRecipes: 5,
      budget: 10000,
    });

    expect(plan.totalPrepTime).toBeLessThanOrEqual(120);
    expect(plan.recipes.length).toBeLessThanOrEqual(5);
  });
});
```

### 2. 統合テスト（Playwright）
```typescript
// /tests/integration/meal-planning.test.ts
import { test, expect } from '@playwright/test';

test.describe('食事プラン生成フロー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=signin-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('新規ユーザーのオンボーディング', async ({ page }) => {
    // 新規ユーザーは自動的にオンボーディングにリダイレクト
    await expect(page).toHaveURL('/onboarding');

    // ステップ1: 基本情報
    await page.fill('[data-testid=weight]', '80');
    await page.fill('[data-testid=height]', '180');
    await page.fill('[data-testid=age]', '30');
    await page.selectOption('[data-testid=gender]', 'male');
    await page.click('[data-testid=next-button]');

    // ステップ2: 目標設定
    await page.fill('[data-testid=target-weight]', '75');
    await page.selectOption('[data-testid=activity-level]', 'moderate');
    await page.click('[data-testid=next-button]');

    // ステップ3: PFC設定
    await page.fill('[data-testid=protein-ratio]', '30');
    await page.fill('[data-testid=fat-ratio]', '25');
    await page.fill('[data-testid=carb-ratio]', '45');
    await page.click('[data-testid=next-button]');

    // ステップ4: 制約条件
    await page.fill('[data-testid=budget]', '15000');
    await page.check('[data-testid=equipment-rice-cooker]');
    await page.check('[data-testid=equipment-slow-cooker]');
    await page.click('[data-testid=complete-button]');

    // プロフィール作成完了後、ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/dashboard');
  });

  test('週間プラン生成', async ({ page }) => {
    await page.goto('/meal-plan');
    
    // プラン生成ボタンをクリック
    await page.click('[data-testid=generate-plan-button]');
    
    // ローディング状態を確認
    await expect(page.locator('[data-testid=loading-spinner]')).toBeVisible();
    
    // プラン生成完了を待つ（最大60秒）
    await expect(page.locator('[data-testid=weekly-plan]')).toBeVisible({ timeout: 60000 });
    
    // 7日分の計画が生成されていることを確認
    const dayPlans = page.locator('[data-testid=day-plan]');
    await expect(dayPlans).toHaveCount(7);
    
    // 各日のカロリー合計が表示されていることを確認
    for (let i = 0; i < 7; i++) {
      const dayPlan = dayPlans.nth(i);
      await expect(dayPlan.locator('[data-testid=daily-calories]')).toBeVisible();
    }
  });

  test('食事記録の入力', async ({ page }) => {
    await page.goto('/nutrition-log');
    
    // 今日の日付が選択されていることを確認
    const today = new Date().toISOString().split('T')[0];
    await expect(page.locator('[data-testid=date-picker]')).toHaveValue(today);
    
    // 食事記録を追加
    await page.click('[data-testid=add-meal-button]');
    
    // モーダルが開くことを確認
    await expect(page.locator('[data-testid=quick-log-modal]')).toBeVisible();
    
    // 食事情報を入力
    await page.selectOption('[data-testid=meal-type]', 'breakfast');
    await page.fill('[data-testid=calories]', '500');
    await page.fill('[data-testid=protein]', '40');
    await page.fill('[data-testid=fat]', '15');
    await page.fill('[data-testid=carbs]', '50');
    
    // 保存
    await page.click('[data-testid=save-meal-button]');
    
    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid=quick-log-modal]')).not.toBeVisible();
    
    // 記録が追加されていることを確認
    await expect(page.locator('[data-testid=meal-log-entry]')).toHaveCount(1);
  });

  test('買い物リストの操作', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // 買い物リストが表示されていることを確認
    await expect(page.locator('[data-testid=shopping-list]')).toBeVisible();
    
    // 最初のアイテムをチェック
    const firstItem = page.locator('[data-testid=shopping-item]').first();
    await firstItem.locator('[data-testid=item-checkbox]').check();
    
    // チェック状態が保存されることを確認
    await page.reload();
    await expect(firstItem.locator('[data-testid=item-checkbox]')).toBeChecked();
    
    // 印刷用表示への切り替え
    await page.click('[data-testid=print-mode-button]');
    await expect(page.locator('[data-testid=printable-list]')).toBeVisible();
  });
});
```

### 3. エンドツーエンドテスト
```typescript
// /tests/e2e/user-journey.test.ts
test.describe('ユーザージャーニー全体', () => {
  test('新規ユーザーから継続利用まで', async ({ page }) => {
    // 1. ランディングページアクセス
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('MacroFit Pro');
    
    // 2. サインアップ
    await page.click('[data-testid=signup-button]');
    // (Microsoft Entra ID のモック認証処理)
    
    // 3. オンボーディング完了
    // (上記のオンボーディングテストと同様)
    
    // 4. 初回プラン生成
    // (上記のプラン生成テストと同様)
    
    // 5. 買い物リスト確認
    await page.goto('/shopping-list');
    await expect(page.locator('[data-testid=shopping-items]')).toHaveCount.greaterThan(0);
    
    // 6. 数日間の食事記録
    for (let day = 0; day < 3; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      
      await page.goto('/nutrition-log');
      await page.fill('[data-testid=date-picker]', date.toISOString().split('T')[0]);
      
      // 朝食・昼食・夕食を記録
      for (const mealType of ['breakfast', 'lunch', 'dinner']) {
        await page.click('[data-testid=add-meal-button]');
        await page.selectOption('[data-testid=meal-type]', mealType);
        await page.fill('[data-testid=calories]', String(Math.floor(Math.random() * 300 + 300)));
        await page.click('[data-testid=save-meal-button]');
      }
    }
    
    // 7. 進捗確認
    await page.goto('/analytics');
    await expect(page.locator('[data-testid=weekly-chart]')).toBeVisible();
    await expect(page.locator('[data-testid=compliance-score]')).toBeVisible();
    
    // 8. 体重記録
    await page.goto('/weight-log');
    await page.click('[data-testid=add-weight-button]');
    await page.fill('[data-testid=weight]', '79.5');
    await page.click('[data-testid=save-weight-button]');
    
    // 9. 次週のプラン生成
    await page.goto('/meal-plan');
    await page.click('[data-testid=next-week-button]');
    await page.click('[data-testid=generate-plan-button]');
    await expect(page.locator('[data-testid=weekly-plan]')).toBeVisible({ timeout: 60000 });
  });
});
```

## CI/CD パイプライン

### GitHub Actions設定
```yaml
# /.github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: macrofit_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/macrofit_test
      
      - run: npm run test:integration

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Start application
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:3000
      
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-screenshots
          path: test-results/

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    name: Deploy to Azure
    needs: [lint-and-type-check, unit-tests, integration-tests, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      
      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          output_location: ".next"
```

## 14日間実装計画

### Week 1: 基盤構築
**Day 1-2: プロジェクト初期化**
- Next.js プロジェクト作成
- TypeScript、Tailwind CSS、Prisma設定
- Azure Static Web Apps、Database for PostgreSQL作成
- GitHub Actions CI/CD パイプライン構築

**Day 3-4: 認証システム**
- Auth.js + Microsoft Entra ID統合
- ユーザー管理画面実装
- Row Level Security (RLS) 設定

**Day 5-7: データモデル・API基盤**
- Prismaスキーマ実装・マイグレーション
- tRPC セットアップ
- 基本的なCRUD操作実装

### Week 2: コア機能実装
**Day 8-9: 栄養計算エンジン**
- BMR/TDEE計算アルゴリズム実装
- PFC比率計算機能
- マクロ栄養素分配ロジック

**Day 10-11: Azure OpenAI統合**
- Azure OpenAI Service接続
- プロンプトテンプレート作成
- 食事プラン生成API実装

**Day 12-13: UI実装**
- オンボーディングフロー
- ダッシュボード画面
- 食事プラン表示画面

**Day 14: テスト・デプロイ**
- ユニットテスト実装
- E2Eテスト実行
- 本番デプロイ・動作確認

## Azureコスト見積もり

### ホビープラン (~¥7,500/月)
```
Azure Static Web Apps (Free Tier)          ¥0
Azure Database for PostgreSQL (Basic 1vCore) ¥3,500
Azure OpenAI (従量課金 ~20万tokens/月)      ¥3,000
Azure Functions (Consumption Plan)         ¥500
Azure Key Vault                           ¥500
------------------------------------
合計                                    ¥7,500/月
```

### スタートアッププラン (~¥25,000/月)
```
Azure App Service (Basic B1)               ¥4,500
Azure Database for PostgreSQL (GP 2vCore)  ¥12,000
Azure Cache for Redis (Basic C0)          ¥2,000
Azure OpenAI (高スループット ~100万tokens)  ¥15,000
Azure Functions (Premium Plan)            ¥3,000
Azure Application Insights               ¥1,500
Azure Blob Storage                        ¥500
Azure Key Vault                          ¥1,000
Azure Front Door                          ¥2,000
------------------------------------
合計                                   ¥41,500/月

ユーザー数: ~1,000人想定
コストパフォーマンス: ¥41.5/ユーザー/月
```

### エンタープライズプラン (~¥80,000/月)
```
Azure App Service (Premium P1v3)          ¥15,000
Azure Database for PostgreSQL (GP 4vCore)  ¥24,000
Azure Cache for Redis (Standard C2)       ¥8,000
Azure OpenAI (専用インスタンス)           ¥30,000
Azure Functions (Premium Plan)            ¥5,000
Azure Application Insights               ¥3,000
Azure Blob Storage (Hot tier)             ¥2,000
Azure Key Vault                          ¥2,000
Azure Front Door + WAF                   ¥8,000
Azure Monitor + Log Analytics             ¥3,000
------------------------------------
合計                                  ¥100,000/月

ユーザー数: ~10,000人想定
コストパフォーマンス: ¥10/ユーザー/月
```

## MVP → v1 ロードマップ

### MVP機能 (初回リリース)
- [x] ユーザー認証・プロフィール管理
- [x] 栄養計算エンジン
- [x] AI食事プラン生成
- [x] 基本的な食事記録
- [x] 週間進捗表示

### v1.1 (MVP+1ヶ月)
- [ ] バーコードスキャン機能
- [ ] レシピ写真アップロード
- [ ] モバイルPWA対応
- [ ] プッシュ通知

### v1.2 (MVP+2ヶ月)
- [ ] パントリーOCR機能
- [ ] オフラインキャッシュ
- [ ] 詳細な栄養分析
- [ ] ソーシャル機能（プラン共有）

### v1.3 (MVP+3ヶ月)
- [ ] React Native モバイルアプリ
- [ ] 音声入力対応
- [ ] ウェアラブルデバイス連携
- [ ] 管理栄養士相談機能

### リスクと対策
| リスク | 確率 | 影響度 | 対策 |
|--------|------|--------|------|
| Azure OpenAI API制限 | 中 | 高 | フォールバック用テンプレート準備 |
| 栄養計算精度問題 | 低 | 高 | 管理栄養士監修・検証強化 |
| モバイル対応遅延 | 中 | 中 | PWAによる段階的対応 |
| ユーザー獲得困難 | 高 | 高 | インフルエンサーマーケティング |
| 競合他社参入 | 中 | 中 | 筋トレ特化の差別化強化 |

**MacroFit Pro**は筋トレ特化型栄養管理の革新的なソリューションとして、技術的な堅牢性とユーザビリティを両立させたプラットフォームです。