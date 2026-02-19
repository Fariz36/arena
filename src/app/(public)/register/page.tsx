import RegisterForm from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
      <p className="text-sm text-slate-600">Join QuizArena as a player.</p>
      <RegisterForm />
    </div>
  );
}
