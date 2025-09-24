/**
 * Next.js Configuration
 * Dev Performance Tweaks:
 * - To speed up first startup, you can temporarily relax TypeScript & ESLint blocking checks.
 *   Set FAST_DEV=1 in your environment to enable relaxed mode.
 */
const fastDev = process.env.FAST_DEV === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  env: {
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
  },
  typescript: {
    ignoreBuildErrors: fastDev, // FAST_DEV=1 で型エラーを起動ブロックしない
  },
  eslint: {
    ignoreDuringBuilds: fastDev, // FAST_DEV=1 でESLintを非ブロッキング化
  },
  experimental: {
    turbo: true, // Turbopack を有効化（`npm run dev:turbo` で活用）
  },
};

module.exports = nextConfig;