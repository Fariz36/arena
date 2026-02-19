import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-900">QuizArena</h1>
      <p className="text-slate-600">Supabase auth and route guards are now enabled.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/login" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Login
        </Link>
        <Link href="/register" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
          Register
        </Link>
        <Link href="/dashboard" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
