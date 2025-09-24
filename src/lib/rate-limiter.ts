interface RateLimitConfig {
  maxRequests: number;
  maxTokens: number;
  windowMs: number;
}

interface Usage {
  timestamp: number;
  tokens: number;
}

export class RateLimiter {
  private requests: number[] = [];
  private tokenUsage: Usage[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  public async checkLimit(estimatedTokens: number): Promise<void> {
    const now = Date.now();
    
    // 古いエントリを削除
    this.cleanOldEntries(now);
    
    // リクエスト数チェック
    if (this.requests.length >= this.config.maxRequests) {
      const waitTime = this.requests[0] + this.config.windowMs - now;
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
      }
    }
    
    // トークン数チェック
    const currentTokens = this.tokenUsage.reduce((sum, usage) => sum + usage.tokens, 0);
    if (currentTokens + estimatedTokens > this.config.maxTokens) {
      const oldestTokenUsage = this.tokenUsage[0];
      if (oldestTokenUsage) {
        const waitTime = oldestTokenUsage.timestamp + this.config.windowMs - now;
        if (waitTime > 0) {
          throw new Error(`Token limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
        }
      }
    }
    
    // 使用量を記録
    this.requests.push(now);
    this.tokenUsage.push({ timestamp: now, tokens: estimatedTokens });
  }

  private cleanOldEntries(now: number): void {
    const cutoff = now - this.config.windowMs;
    
    this.requests = this.requests.filter(timestamp => timestamp > cutoff);
    this.tokenUsage = this.tokenUsage.filter(usage => usage.timestamp > cutoff);
  }
}