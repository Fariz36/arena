import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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

type AdminQuestionsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
};

type SortBy = "title" | "difficulty" | "category" | "is_active" | "created_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SORTABLE_COLUMNS: ReadonlyArray<SortBy> = ["title", "difficulty", "category", "is_active", "created_at"];

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(isoDate));
}

function normalizePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

function normalizeSortBy(value: string | undefined): SortBy {
  if (!value) {
    return "created_at";
  }
  return SORTABLE_COLUMNS.includes(value as SortBy) ? (value as SortBy) : "created_at";
}

function normalizeSortDir(value: string | undefined): SortDir {
  return value === "asc" ? "asc" : "desc";
}

export default async function AdminQuestionsPage({ searchParams }: AdminQuestionsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const queryText = String(params.q ?? "").trim();
  const requestedPageSize = normalizePositiveInt(params.pageSize, 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? requestedPageSize
    : 10;
  const page = normalizePositiveInt(params.page, 1);
  const sortBy = normalizeSortBy(params.sortBy);
  const sortDir = normalizeSortDir(params.sortDir);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase
    .from("questions")
    .select("id, title, difficulty, category, is_active, created_at, question_options(id)", { count: "exact" })
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (queryText) {
    const safeSearch = queryText.replaceAll(",", " ");
    dataQuery = dataQuery.or(`title.ilike.%${safeSearch}%,category.ilike.%${safeSearch}%`);
  }

  const { data, error, count } = await dataQuery.returns<QuestionRow[]>();

  const questions = data ?? [];
  const total = Number(count ?? 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function createHref(overrides: Partial<{ page: number; pageSize: number; q: string; sortBy: SortBy; sortDir: SortDir }>) {
    const nextPage = overrides.page ?? page;
    const nextPageSize = overrides.pageSize ?? pageSize;
    const nextQuery = overrides.q ?? queryText;
    const nextSortBy = overrides.sortBy ?? sortBy;
    const nextSortDir = overrides.sortDir ?? sortDir;

    const nextParams = new URLSearchParams();
    if (nextQuery) {
      nextParams.set("q", nextQuery);
    }
    nextParams.set("page", String(nextPage));
    nextParams.set("pageSize", String(nextPageSize));
    nextParams.set("sortBy", nextSortBy);
    nextParams.set("sortDir", nextSortDir);

    return `/admin/questions?${nextParams.toString()}`;
  }

  function getSortHref(column: SortBy) {
    const nextSortDir: SortDir = sortBy === column && sortDir === "asc" ? "desc" : "asc";
    return createHref({ page: 1, sortBy: column, sortDir: nextSortDir });
  }

  function getSortLabel(column: SortBy, label: string) {
    if (sortBy !== column) {
      return label;
    }
    return `${label} ${sortDir === "asc" ? "↑" : "↓"}`;
  }

  const visibleStart = total === 0 ? 0 : from + 1;
  const visibleEnd = Math.min(page * pageSize, total);

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
            content: '\"\"',
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
                label={`${total} Questions`}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  bgcolor: "rgba(99,102,241,0.18)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(129,140,248,0.26)",
                  "& .MuiChip-icon": { color: "#a5b4fc" },
                }}
              />
              <Chip
                size="small"
                label={`${visibleStart}-${visibleEnd} visible`}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  bgcolor: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.84)",
                  border: "1px solid rgba(255,255,255,0.14)",
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
        <Stack
          component="form"
          action="/admin/questions"
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", md: "auto" } }}>
            <TextField
              name="q"
              defaultValue={queryText}
              size="small"
              placeholder="Search title or category"
              InputProps={{
                startAdornment: <SearchRoundedIcon sx={{ mr: 0.75, fontSize: 18, color: "rgba(255,255,255,0.55)" }} />,
              }}
              sx={{
                minWidth: { xs: "100%", sm: 280 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "10px",
                  color: "rgba(255,255,255,0.9)",
                  bgcolor: "rgba(255,255,255,0.04)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.22)" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                  "&.Mui-focused fieldset": { borderColor: "rgba(129,140,248,0.7)" },
                },
              }}
            />
            <Button
              type="submit"
              variant="outlined"
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
              Search
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
              Rows:
            </Typography>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Link key={size} href={createHref({ page: 1, pageSize: size })}>
                <Button
                  size="small"
                  variant={pageSize === size ? "contained" : "outlined"}
                  sx={{
                    minWidth: 0,
                    px: 1.1,
                    textTransform: "none",
                    borderRadius: "9px",
                    ...(pageSize === size
                      ? {
                          bgcolor: "rgba(99,102,241,0.24)",
                          color: "#e0e7ff",
                          border: "1px solid rgba(129,140,248,0.45)",
                        }
                      : {
                          color: "rgba(255,255,255,0.8)",
                          borderColor: "rgba(255,255,255,0.24)",
                        }),
                  }}
                >
                  {size}
                </Button>
              </Link>
            ))}
          </Stack>

          <input type="hidden" name="page" value="1" />
          <input type="hidden" name="pageSize" value={String(pageSize)} />
          <input type="hidden" name="sortBy" value={sortBy} />
          <input type="hidden" name="sortDir" value={sortDir} />
        </Stack>

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
                <TableCell>
                  <Link href={getSortHref("title")}>{getSortLabel("title", "Title")}</Link>
                </TableCell>
                <TableCell>
                  <Link href={getSortHref("difficulty")}>{getSortLabel("difficulty", "Difficulty")}</Link>
                </TableCell>
                <TableCell>
                  <Link href={getSortHref("category")}>{getSortLabel("category", "Category")}</Link>
                </TableCell>
                <TableCell>Options</TableCell>
                <TableCell>
                  <Link href={getSortHref("is_active")}>{getSortLabel("is_active", "Status")}</Link>
                </TableCell>
                <TableCell>
                  <Link href={getSortHref("created_at")}>{getSortLabel("created_at", "Created")}</Link>
                </TableCell>
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
              {questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      No questions found for the current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.66)" }}>
            Page {page} of {totalPages}
          </Typography>
          <Stack direction="row" spacing={1}>
            {page <= 1 ? (
              <Button
                size="small"
                variant="outlined"
                disabled
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.24)", color: "rgba(255,255,255,0.82)" }}
              >
                Previous
              </Button>
            ) : (
              <Link href={createHref({ page: Math.max(1, page - 1) })}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.24)", color: "rgba(255,255,255,0.82)" }}
                >
                  Previous
                </Button>
              </Link>
            )}
            {page >= totalPages ? (
              <Button
                size="small"
                variant="outlined"
                disabled
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.24)", color: "rgba(255,255,255,0.82)" }}
              >
                Next
              </Button>
            ) : (
              <Link href={createHref({ page: Math.min(totalPages, page + 1) })}>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.24)", color: "rgba(255,255,255,0.82)" }}
                >
                  Next
                </Button>
              </Link>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
}
