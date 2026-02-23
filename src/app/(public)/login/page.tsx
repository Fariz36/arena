import LoginForm from "@/features/auth/components/login-form";
import Stack from "@mui/material/Stack";
import { AppPageHeading } from "@/components/ui/page-shell";

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
    <Stack spacing={3}>
      <AppPageHeading title="Sign in" description="Access your QuizArena account." />
      <LoginForm nextPath={nextPath} />
    </Stack>
  );
}
