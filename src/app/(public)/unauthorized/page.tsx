import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">403 - Unauthorized</h1>
      <p className="text-sm text-slate-600">You do not have permission to access this page.</p>
      <Link href="/dashboard" className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
