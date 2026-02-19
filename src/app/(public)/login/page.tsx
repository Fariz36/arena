import LoginForm from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function sanitizeNextPath(rawPath?: string): string {
  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/dashboard";
  }

  return rawPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-600">Access your QuizArena account.</p>
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
