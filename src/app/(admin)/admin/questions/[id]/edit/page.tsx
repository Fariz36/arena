import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ color: "#f8fafc", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Edit Question
          </Typography>
          <Alert
            severity="error"
            sx={{
              borderRadius: "12px",
              border: "1px solid rgba(239,68,68,0.32)",
              bgcolor: "rgba(239,68,68,0.11)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#f87171" },
            }}
          >
            {questionError.message}
          </Alert>
          <Link href="/admin/questions">
            <Button
              variant="text"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ width: "fit-content", textTransform: "none", color: "rgba(199,210,254,0.95)" }}
            >
              Back to Questions
            </Button>
          </Link>
        </Stack>
      </Paper>
    );
  }

  if (!questionData) {
    notFound();
  }

  if (criteriaError) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          p: { xs: 2, sm: 2.5 },
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ color: "#f8fafc", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Edit Question
          </Typography>
          <Alert
            severity="error"
            sx={{
              borderRadius: "12px",
              border: "1px solid rgba(239,68,68,0.32)",
              bgcolor: "rgba(239,68,68,0.11)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#f87171" },
            }}
          >
            {criteriaError.message}
          </Alert>
          <Link href="/admin/questions">
            <Button
              variant="text"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ width: "fit-content", textTransform: "none", color: "rgba(199,210,254,0.95)" }}
            >
              Back to Questions
            </Button>
          </Link>
        </Stack>
      </Paper>
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
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(15, 17, 26, 0.72)",
          backdropFilter: "blur(18px) saturate(170%)",
          WebkitBackdropFilter: "blur(18px) saturate(170%)",
          boxShadow: "0 18px 42px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.06) inset",
          p: { xs: 2.25, sm: 2.75 },
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 12% 18%, rgba(99,102,241,0.22), transparent 40%), radial-gradient(circle at 85% 0%, rgba(56,189,248,0.14), transparent 35%)",
          },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={2}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Stack spacing={1}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.03em",
                background: "linear-gradient(120deg, #ffffff 30%, rgba(255,255,255,0.6))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
            Edit Question
            </Typography>
            <Chip
              size="small"
              icon={<EditRoundedIcon style={{ fontSize: 14 }} />}
              label={questionData.title}
              sx={{
                alignSelf: "flex-start",
                maxWidth: { xs: "100%", sm: 360 },
                "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(99,102,241,0.18)",
                color: "#c7d2fe",
                border: "1px solid rgba(129,140,248,0.26)",
                "& .MuiChip-icon": { color: "#a5b4fc" },
              }}
            />
          </Stack>
          <Link href="/admin/questions">
            <Button
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{
                textTransform: "none",
                color: "rgba(255,255,255,0.82)",
                borderColor: "rgba(255,255,255,0.26)",
                "&:hover": {
                  borderColor: "rgba(129,140,248,0.6)",
                  color: "#c7d2fe",
                  bgcolor: "rgba(99,102,241,0.12)",
                },
              }}
            >
              Back to Questions
            </Button>
          </Link>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          p: { xs: 1.4, sm: 1.8 },
        }}
      >
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
      </Paper>
    </Stack>
  );
}
