import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
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
              Question Control
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<QuizRoundedIcon style={{ fontSize: 14 }} />}
                label={`${questions.length} Questions`}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  bgcolor: "rgba(99,102,241,0.18)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(129,140,248,0.26)",
                  "& .MuiChip-icon": { color: "#a5b4fc" },
                }}
              />
            </Stack>
          </Stack>
          <Link href="/admin/questions/new">
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
                fontWeight: 700,
                px: 1.8,
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                boxShadow: "0 8px 18px rgba(79,70,229,0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
                },
              }}
            >
              New Question
            </Button>
          </Link>
        </Stack>
      </Paper>

      {error ? (
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
          {error.message}
        </Alert>
      ) : null}

      {questions.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.08)",
            bgcolor: "rgba(17, 20, 31, 0.62)",
            p: 2.25,
          }}
        >
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
            No questions yet. Create your first question.
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,0.08)",
            bgcolor: "rgba(17, 20, 31, 0.62)",
            backdropFilter: "blur(16px) saturate(150%)",
            WebkitBackdropFilter: "blur(16px) saturate(150%)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            overflow: "hidden",
            p: { xs: 1.3, sm: 1.8 },
          }}
        >
          <TableContainer
            sx={{
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            <Table
              size="small"
              sx={{
                "& .MuiTableCell-root": {
                  py: 1.25,
                  px: 1.5,
                  borderBottomColor: "rgba(255,255,255,0.08)",
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  color: "rgba(255,255,255,0.72)",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  bgcolor: "rgba(255,255,255,0.02)",
                },
                "& .MuiTableBody-root .MuiTableCell-root": {
                  color: "rgba(255,255,255,0.88)",
                },
                "& .MuiTableRow-hover:hover": {
                  bgcolor: "rgba(165,180,252,0.08)",
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Difficulty</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Options</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((question) => (
                  <TableRow key={question.id} hover>
                    <TableCell>{question.title}</TableCell>
                    <TableCell sx={{ textTransform: "capitalize" }}>
                      <Chip
                        size="small"
                        label={question.difficulty}
                        sx={{
                          textTransform: "capitalize",
                          bgcolor:
                            question.difficulty === "easy"
                              ? "rgba(16,185,129,0.14)"
                              : question.difficulty === "medium"
                                ? "rgba(251,191,36,0.14)"
                                : "rgba(239,68,68,0.14)",
                          color:
                            question.difficulty === "easy"
                              ? "#86efac"
                              : question.difficulty === "medium"
                                ? "#fcd34d"
                                : "#fca5a5",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                        }}
                      />
                    </TableCell>
                    <TableCell>{question.category}</TableCell>
                    <TableCell>{question.question_options.length}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={question.is_active ? "Active" : "Inactive"}
                        sx={{
                          bgcolor: question.is_active ? "rgba(16,185,129,0.14)" : "rgba(251,191,36,0.14)",
                          color: question.is_active ? "#86efac" : "#fcd34d",
                          border: "1px solid rgba(255,255,255,0.1)",
                          fontWeight: 700,
                          fontSize: "0.68rem",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.72)" }}>{formatDate(question.created_at)}</TableCell>
                    <TableCell align="right">
                      <Link href={`/admin/questions/${question.id}/edit`}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<EditRoundedIcon />}
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
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );
}
