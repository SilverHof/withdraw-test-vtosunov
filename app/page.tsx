import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="flex flex-col items-center justify-center gap-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Withdrawal Test App
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Тестовое задание на вывод средств
          </p>
        </div>
        
        <Link
          href="/withdraw"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors focus:ring-4 focus:ring-blue-500/50"
        >
          Перейти к выводу средств →
        </Link>
      </main>
    </div>
  );
}
