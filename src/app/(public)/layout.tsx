import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
    </main>
  );
}
