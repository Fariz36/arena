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

export type UpdateQuestionActionState = {
  error: string | null;
  success: string | null;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function extensionFromContentType(contentType: string | null | undefined) {
  switch ((contentType ?? "").toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

async function uploadImageFromSource({
  supabase,
  userId,
  imageFile,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  imageFile: File | null;
}): Promise<{ imageUrl: string | null; error: string | null }> {
  if (imageFile) {
    if (!imageFile.type.startsWith("image/")) {
      return { imageUrl: null, error: "Uploaded file must be an image." };
    }
    if (imageFile.size > MAX_IMAGE_BYTES) {
      return { imageUrl: null, error: "Image file must be 5 MB or smaller." };
    }

    const fileExtension = extensionFromContentType(imageFile.type);
    const objectPath = `questions/${userId}/${crypto.randomUUID()}.${fileExtension}`;
    const { error: uploadError } = await supabase.storage.from("problems").upload(objectPath, imageFile, {
      contentType: imageFile.type,
      upsert: false,
    });

    if (uploadError) {
      return { imageUrl: null, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage.from("problems").getPublicUrl(objectPath);
    return { imageUrl: publicUrlData.publicUrl, error: null };
  }

  return { imageUrl: null, error: null };
}

export async function createQuestionAction(
  _prevState: CreateQuestionActionState,
  formData: FormData,
): Promise<CreateQuestionActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const questionText = String(formData.get("questionText") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "") as Difficulty;
  const criteriaId = String(formData.get("criteriaId") ?? "").trim();
  const imageFileInput = formData.get("imageFile");
  const imageFile = imageFileInput instanceof File && imageFileInput.size > 0 ? imageFileInput : null;
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

  const { data: existingOptions, error: existingOptionsError } = await supabase
    .from("question_options")
    .select("option_text, is_correct, position")
    .eq("question_id", questionId)
    .order("position", { ascending: true })
    .returns<Array<{ option_text: string; is_correct: boolean; position: number }>>();
  if (existingOptionsError) {
    return { error: existingOptionsError.message, success: null };
  }

  const { count: answerCount, error: answerCountError } = await supabase
    .from("answers")
    .select("id", { head: true, count: "exact" })
    .eq("question_id", questionId);
  if (answerCountError) {
    return { error: answerCountError.message, success: null };
  }

  const hasAnswers = (answerCount ?? 0) > 0;
  const existingNormalized = (existingOptions ?? []).map((option) => ({
    text: option.option_text,
    isCorrect: option.is_correct,
  }));
  const optionsChanged =
    existingNormalized.length !== normalizedOptions.length ||
    existingNormalized.some(
      (option, index) =>
        option.text !== normalizedOptions[index]?.text || option.isCorrect !== normalizedOptions[index]?.isCorrect,
    );

  if (hasAnswers && optionsChanged) {
    return {
      error: "This question already has submitted answers. Editing answer options is disabled to preserve match history.",
      success: null,
    };
  }

  const uploadResult = await uploadImageFromSource({
    supabase,
    userId: user.id,
    imageFile,
  });
  if (uploadResult.error) {
    return { error: uploadResult.error, success: null };
  }
  const storedImageUrl = uploadResult.imageUrl;

  const { data: insertedQuestion, error: questionError } = await supabase
    .from("questions")
    .insert({
      title,
      question_text: questionText,
      difficulty,
      category: criteriaRow.name,
      criteria_id: criteriaRow.id,
      time_limit_seconds: timeLimitSeconds,
      image_url: storedImageUrl,
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

export async function updateQuestionAction(
  _prevState: UpdateQuestionActionState,
  formData: FormData,
): Promise<UpdateQuestionActionState> {
  const questionId = String(formData.get("questionId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const questionText = String(formData.get("questionText") ?? "").trim();
  const difficulty = String(formData.get("difficulty") ?? "") as Difficulty;
  const criteriaId = String(formData.get("criteriaId") ?? "").trim();
  const imageFileInput = formData.get("imageFile");
  const imageFile = imageFileInput instanceof File && imageFileInput.size > 0 ? imageFileInput : null;
  const removeImage = formData.get("removeImage") === "on";
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

  if (!questionId || !title || !questionText || !criteriaId) {
    return { error: "Question, title, question text, and criteria are required.", success: null };
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

  if (removeImage && imageFile) {
    return { error: "Choose remove image or upload a new image, not both.", success: null };
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

  const { data: existingOptions, error: existingOptionsError } = await supabase
    .from("question_options")
    .select("option_text, is_correct, position")
    .eq("question_id", questionId)
    .order("position", { ascending: true })
    .returns<Array<{ option_text: string; is_correct: boolean; position: number }>>();
  if (existingOptionsError) {
    return { error: existingOptionsError.message, success: null };
  }

  const { count: answerCount, error: answerCountError } = await supabase
    .from("answers")
    .select("id", { head: true, count: "exact" })
    .eq("question_id", questionId);
  if (answerCountError) {
    return { error: answerCountError.message, success: null };
  }

  const hasAnswers = (answerCount ?? 0) > 0;
  const existingNormalized = (existingOptions ?? []).map((option) => ({
    text: option.option_text,
    isCorrect: option.is_correct,
  }));
  const optionsChanged =
    existingNormalized.length !== normalizedOptions.length ||
    existingNormalized.some(
      (option, index) =>
        option.text !== normalizedOptions[index]?.text || option.isCorrect !== normalizedOptions[index]?.isCorrect,
    );

  if (hasAnswers && optionsChanged) {
    return {
      error: "This question already has submitted answers. Editing answer options is disabled to preserve match history.",
      success: null,
    };
  }

  let nextImageUrl: string | null | undefined = undefined;
  if (removeImage) {
    nextImageUrl = null;
  } else if (imageFile) {
    const uploadResult = await uploadImageFromSource({
      supabase,
      userId: user.id,
      imageFile,
    });
    if (uploadResult.error) {
      return { error: uploadResult.error, success: null };
    }
    nextImageUrl = uploadResult.imageUrl;
  }

  const updatePayload: {
    title: string;
    question_text: string;
    difficulty: Difficulty;
    category: string;
    criteria_id: string;
    time_limit_seconds: number;
    is_active: boolean;
    image_url?: string | null;
  } = {
    title,
    question_text: questionText,
    difficulty,
    category: criteriaRow.name,
    criteria_id: criteriaRow.id,
    time_limit_seconds: timeLimitSeconds,
    is_active: false,
  };

  if (nextImageUrl !== undefined) {
    updatePayload.image_url = nextImageUrl;
  }

  const { error: questionError } = await supabase.from("questions").update(updatePayload).eq("id", questionId);
  if (questionError) {
    return { error: questionError.message, success: null };
  }

  if (!hasAnswers) {
    const { error: deleteOptionsError } = await supabase.from("question_options").delete().eq("question_id", questionId);
    if (deleteOptionsError) {
      return { error: deleteOptionsError.message, success: null };
    }

    const { error: optionsError } = await supabase.from("question_options").insert(
      normalizedOptions.map((option, index) => ({
        question_id: questionId,
        option_text: option.text,
        is_correct: option.isCorrect,
        position: index + 1,
      })),
    );
    if (optionsError) {
      return { error: optionsError.message, success: null };
    }
  }

  if (isActive) {
    const { error: activationError } = await supabase.from("questions").update({ is_active: true }).eq("id", questionId);
    if (activationError) {
      return { error: activationError.message, success: null };
    }
  }

  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}/edit`);

  return { error: null, success: "Question updated successfully." };
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
