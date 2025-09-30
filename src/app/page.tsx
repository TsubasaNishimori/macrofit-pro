import UserInfoForm from '@/components/forms/UserInfoForm';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
              MacroFit Pro
            </h1>
            <Image
              src="/images/app-icon.png"
              alt="MacroFit Pro アイコン"
              width={80}
              height={80}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
          <p className="text-xl text-gray-600 mb-4">
            筋トレ特化型栄養管理アプリ
          </p>
          <p className="text-lg text-gray-500 mb-8">
            バルクもカットも、完璧なマクロで理想のボディへ
          </p>
        </div>

        {/* ユーザー情報入力フォーム */}
        <UserInfoForm />

        {/* 開発者向け情報 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold mb-4">🔧 開発者向け情報</h3>
          <div className="space-y-2 text-sm mb-4">
            <p><strong>フレームワーク:</strong> Next.js 14 + TypeScript</p>
            <p><strong>AI統合:</strong> Azure OpenAI (GPT-4o-mini)</p>
            <p><strong>スタイリング:</strong> Tailwind CSS</p>
            <p><strong>開発段階:</strong> MVP構築中（データベース不要版）</p>
          </div>
          
          <div className="flex gap-4">
            <a
              href="/test"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🧪 Azure OpenAI テスト
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}