import Link from "next/link";
import { notFound } from "next/navigation";
import QuestionEditForm from "@/features/questions/components/question-edit-form";
import { createClient } from "@/lib/supabase/server";

type EditQuestionPageProps = {
  params: Promise<{ id: string }>;
};

type CriteriaOption = {
  id: string;
  name: string;
};

type QuestionOptionRow = {
  option_text: string;
  is_correct: boolean;
  position: number;
};

type QuestionRow = {
  id: string;
  title: string;
  question_text: string;
  difficulty: "easy" | "medium" | "hard";
  criteria_id: string | null;
  time_limit_seconds: number;
  image_url: string | null;
  is_active: boolean;
  question_options: QuestionOptionRow[];
};

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: questionData, error: questionError }, { data: criteriaData, error: criteriaError }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, title, question_text, difficulty, criteria_id, time_limit_seconds, image_url, is_active, question_options(option_text, is_correct, position)")
      .eq("id", id)
      .maybeSingle<QuestionRow>(),
    supabase
      .from("criteria")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .returns<CriteriaOption[]>(),
  ]);

  if (questionError) {
    return (
      <main className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Question</h1>
        <p className="text-sm text-red-600">{questionError.message}</p>
        <Link href="/admin/questions" className="text-sm text-slate-600 underline">
          Back to Questions
        </Link>
      </main>
    );
  }

  if (!questionData) {
    notFound();
  }

  if (criteriaError) {
    return (
      <main className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Question</h1>
        <p className="text-sm text-red-600">{criteriaError.message}</p>
        <Link href="/admin/questions" className="text-sm text-slate-600 underline">
          Back to Questions
        </Link>
      </main>
    );
  }

  const criteriaOptions = criteriaData ?? [];
  if (questionData.criteria_id && !criteriaOptions.some((criteria) => criteria.id === questionData.criteria_id)) {
    const { data: inactiveCriteria } = await supabase
      .from("criteria")
      .select("id, name")
      .eq("id", questionData.criteria_id)
      .maybeSingle<CriteriaOption>();

    if (inactiveCriteria) {
      criteriaOptions.push(inactiveCriteria);
      criteriaOptions.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  const sortedOptions = [...(questionData.question_options ?? [])].sort((a, b) => a.position - b.position);

  return (
    <main className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Question</h1>
        <Link href="/admin/questions" className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700">
          Back to Questions
        </Link>
      </div>
      <QuestionEditForm
        initialCriteriaOptions={criteriaOptions}
        initialData={{
          id: questionData.id,
          title: questionData.title,
          questionText: questionData.question_text,
          difficulty: questionData.difficulty,
          criteriaId: questionData.criteria_id ?? "",
          timeLimitSeconds: questionData.time_limit_seconds,
          imageUrl: questionData.image_url,
          isActive: questionData.is_active,
          options: sortedOptions.map((option, index) => ({
            id: index + 1,
            text: option.option_text,
            isCorrect: option.is_correct,
          })),
        }}
      />
    </main>
  );
}
