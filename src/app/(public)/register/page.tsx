import RegisterForm from "@/features/auth/components/register-form";
import Stack from "@mui/material/Stack";
import { AppPageHeading } from "@/components/ui/page-shell";

export default function RegisterPage() {
  return (
    <Stack spacing={3}>
      <AppPageHeading title="Create account" description="Join QuizArena as a player." />
      <RegisterForm />
    </Stack>
  );
}
