import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type QuestionRow = {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  is_active: boolean;
  created_at: string;
  question_options: Array<{ id: string }>;
};

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(isoDate));
}

export default async function AdminQuestionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select("id, title, difficulty, category, is_active, created_at, question_options(id)")
    .order("created_at", { ascending: false })
    .returns<QuestionRow[]>();

  const questions = data ?? [];

  return (
    <main className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
        <Link href="/admin/questions/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          New Question
        </Link>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>
      ) : null}

      {questions.length === 0 ? (
        <p className="text-sm text-slate-600">No questions yet. Create your first question.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Difficulty</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Options</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700">Created</th>
                <th className="border-b border-slate-200 px-4 py-3 text-right font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} className="odd:bg-white even:bg-slate-50/40">
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-800">{question.title}</td>
                  <td className="border-b border-slate-100 px-4 py-3 capitalize text-slate-700">{question.difficulty}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{question.category}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{question.question_options.length}</td>
                  <td className="border-b border-slate-100 px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        question.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {question.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{formatDate(question.created_at)}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-right">
                    <Link
                      href={`/admin/questions/${question.id}/edit`}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
