type EditQuestionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditQuestionPage({ params }: EditQuestionPageProps) {
  const { id } = await params;

  return (
    <main className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Edit Question {id}</h1>
      <p className="mt-2 text-sm text-slate-600">Question edit form placeholder.</p>
    </main>
  );
}
