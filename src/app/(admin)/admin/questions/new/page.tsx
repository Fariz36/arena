import QuestionForm from "@/features/questions/components/question-form";
import { createClient } from "@/lib/supabase/server";

type CriteriaOption = {
  id: string;
  name: string;
};

export default async function NewQuestionPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("criteria")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<CriteriaOption[]>();

  return (
    <main className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create Question</h1>
      <p className="text-sm text-slate-600">Create a question with 2 to 5 options and exactly one correct answer.</p>
      <QuestionForm initialCriteriaOptions={data ?? []} />
    </main>
  );
}
