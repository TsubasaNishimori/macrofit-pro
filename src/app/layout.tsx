import './globals.css';

export const metadata = {
  title: 'MacroFit Pro - 筋トレ特化型栄養管理',
  description: 'AI駆動で完璧なマクロ管理を実現する筋力トレーニング特化型栄養管理アプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}