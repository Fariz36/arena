"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Difficulty = "easy" | "medium" | "hard";

type OptionInput = {
  text: string;
  isCorrect: boolean;
};

type CriteriaResult = {
  id: string;
  name: string;
};

export type CreateQuestionActionState = {
  error: string | null;
  success: string | null;
};

export type AddCriteriaActionState = {
  error: string | null;
  success: string | null;
  criteria: CriteriaResult | null;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;

export async function createQuestionAction(
  _prevState: CreateQuestionActionState,
  formData: FormData,
): Promise<CreateQuestionActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const questionText = String(formData.get("questionText") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "") as Difficulty;
  const criteriaId = String(formData.get("criteriaId") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const optionsJson = String(formData.get("optionsJson") ?? "[]");
  const timeLimitSeconds = Number(formData.get("timeLimitSeconds") ?? NaN);
  const isActive = formData.get("isActive") === "on";

  let normalizedOptions: OptionInput[] = [];

  try {
    const parsed = JSON.parse(optionsJson) as Array<{ text?: string; isCorrect?: boolean }>;
    normalizedOptions = parsed.map((option) => ({
      text: String(option.text ?? "").trim(),
      isCorrect: Boolean(option.isCorrect),
    }));
  } catch {
    return { error: "Invalid options payload.", success: null };
  }

  if (!title || !questionText || !criteriaId) {
    return { error: "Title, question text, and criteria are required.", success: null };
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return { error: "Invalid difficulty.", success: null };
  }

  if (Number.isNaN(timeLimitSeconds) || timeLimitSeconds < 5 || timeLimitSeconds > 120) {
    return { error: "Time limit must be between 5 and 120 seconds.", success: null };
  }

  if (normalizedOptions.length < MIN_OPTIONS || normalizedOptions.length > MAX_OPTIONS) {
    return { error: "Question must have 2 to 5 answer options.", success: null };
  }

  if (normalizedOptions.some((option) => !option.text)) {
    return { error: "All answer options must be filled.", success: null };
  }

  if (normalizedOptions.filter((option) => option.isCorrect).length !== 1) {
    return { error: "Please select exactly one correct option.", success: null };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: userError?.message ?? "You must be signed in.", success: null };
  }

  const { data: criteriaRow, error: criteriaError } = await supabase
    .from("criteria")
    .select("id, name")
    .eq("id", criteriaId)
    .eq("is_active", true)
    .maybeSingle<{ id: string; name: string }>();

  if (criteriaError || !criteriaRow) {
    return { error: criteriaError?.message ?? "Selected criteria is invalid.", success: null };
  }

  const { data: insertedQuestion, error: questionError } = await supabase
    .from("questions")
    .insert({
      title,
      question_text: questionText,
      difficulty,
      category: criteriaRow.name,
      criteria_id: criteriaRow.id,
      time_limit_seconds: timeLimitSeconds,
      image_url: imageUrl || null,
      is_active: false,
      created_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (questionError || !insertedQuestion) {
    return { error: questionError?.message ?? "Failed to create question.", success: null };
  }

  const { error: optionsError } = await supabase.from("question_options").insert(
    normalizedOptions.map((option, index) => ({
      question_id: insertedQuestion.id,
      option_text: option.text,
      is_correct: option.isCorrect,
      position: index + 1,
    })),
  );

  if (optionsError) {
    await supabase.from("questions").delete().eq("id", insertedQuestion.id);
    return { error: optionsError.message, success: null };
  }

  if (isActive) {
    const { error: activationError } = await supabase
      .from("questions")
      .update({ is_active: true })
      .eq("id", insertedQuestion.id);

    if (activationError) {
      await supabase.from("questions").delete().eq("id", insertedQuestion.id);
      return { error: activationError.message, success: null };
    }
  }

  revalidatePath("/admin/questions");
  revalidatePath("/admin/questions/new");

  return { error: null, success: "Question created successfully." };
}

export async function addCriteriaAction(formData: FormData): Promise<AddCriteriaActionState> {
  const name = String(formData.get("criteriaName") ?? "").trim();

  if (!name) {
    return { error: "Criteria name is required.", success: null, criteria: null };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("criteria")
    .upsert(
      {
        name,
        is_active: true,
      },
      { onConflict: "name" },
    )
    .select("id, name")
    .single<CriteriaResult>();

  if (error || !data) {
    return { error: error?.message ?? "Failed to add criteria.", success: null, criteria: null };
  }

  revalidatePath("/admin/questions/new");

  return { error: null, success: "Criteria added.", criteria: data };
}
