import AddRoundedIcon from "@mui/icons-material/AddRounded";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
        <Stack spacing={1} sx={{ position: "relative", zIndex: 1 }}>
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
            Create Question
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
            Create a question with 2 to 5 options and exactly one correct answer.
          </Typography>
          <Chip
            size="small"
            icon={<AddRoundedIcon style={{ fontSize: 14 }} />}
            label="New Question Form"
            sx={{
              alignSelf: "flex-start",
              fontWeight: 700,
              fontSize: "0.68rem",
              bgcolor: "rgba(99,102,241,0.18)",
              color: "#c7d2fe",
              border: "1px solid rgba(129,140,248,0.26)",
              "& .MuiChip-icon": { color: "#a5b4fc" },
            }}
          />
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
        <QuestionForm initialCriteriaOptions={data ?? []} />
      </Paper>
    </Stack>
  );
}
