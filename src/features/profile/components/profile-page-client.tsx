"use client";

import { useEffect, useState } from "react";
import { LineChart, PieChart } from "@mui/x-charts";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import PercentRoundedIcon from "@mui/icons-material/PercentRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type SummaryProfile = {
  id: string;
  username: string;
  rating: number;
  total_matches: number;
  win_count: number;
  avg_score: number;
  created_at: string;
};

type RatingProgressionPoint = {
  arena_id: string;
  end_time: string;
  rating_before: number;
  rating_after: number;
  rating_delta: number;
};

type AnalyticsPayload = {
  total_answers: number;
  correct_answers: number;
  wrong_answers: number;
  accuracy_pct: number;
  avg_response_seconds: number;
  category_breakdown: Array<{
    category: string;
    total: number;
    correct: number;
    wrong: number;
    accuracy_pct: number;
  }>;
  difficulty_breakdown: Array<{
    difficulty: string;
    total: number;
    correct: number;
    wrong: number;
    accuracy_pct: number;
    avg_response_seconds: number;
  }>;
};

type ProfilePageClientProps = {
  email: string | undefined;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function RatingLineChart({ points }: { points: RatingProgressionPoint[] }) {
  if (points.length < 2) {
    return (
      <Typography sx={{ color: "rgba(255,255,255,0.6)" }}>
        Play at least 2 finished matches to see progression.
      </Typography>
    );
  }

  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime(),
  );
  const xValues = sortedPoints.map((_point, index) => index + 1);
  const yValues = sortedPoints.map((point) => point.rating_after);

  return (
    <Stack spacing={1}>
      <LineChart
        height={260}
        xAxis={[
          {
            data: xValues,
            scaleType: "point",
            disableLine: true,
            disableTicks: true,
            label: "Match #",
            valueFormatter: (value) => `#${value}`,
          },
        ]}
        series={[{ data: yValues, label: "Rating", color: "#FFD166", showMark: true, curve: "linear" }]}
        margin={{ top: 16, right: 16, bottom: 8, left: 40 }}
        grid={{ horizontal: true }}
        sx={{
          "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": { stroke: "rgba(255,255,255,0.22)" },
          "& .MuiChartsAxis-tickLabel, & .MuiChartsAxis-label": { fill: "rgba(255,255,255,0.62)" },
          "& .MuiChartsGrid-line": { stroke: "rgba(255,255,255,0.08)" },
          "& .MuiMarkElement-root": { stroke: "rgba(10,14,24,0.9)", strokeWidth: 2 },
        }}
      />
      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
        Latest match: {formatDateTime(sortedPoints[sortedPoints.length - 1]?.end_time)}
      </Typography>
    </Stack>
  );
}

function AccuracyPie({ correct, wrong, label }: { correct: number; wrong: number; label: string }) {
  return (
    <Stack spacing={1.2}>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.62)" }}>
        {label}
      </Typography>
      <PieChart
        width={260}
        height={180}
        series={[
          {
            data: [
              { id: "correct", value: correct, label: "Correct", color: "#10b981" },
              { id: "wrong", value: wrong, label: "Wrong", color: "#ef4444" },
            ],
            innerRadius: 35,
            outerRadius: 70,
            paddingAngle: 2,
            cornerRadius: 4,
            highlightScope: { fade: "global", highlight: "item" },
            faded: { innerRadius: 30, additionalRadius: -2, color: "gray" },
          },
        ]}
        sx={{
          "& .MuiChartsLegend-series text": { fill: "rgba(255,255,255,0.78)" },
        }}
      />
      <Stack direction="row" spacing={1}>
        <Chip
          size="small"
          label={`Correct: ${correct}`}
          sx={{
            bgcolor: "rgba(16,185,129,0.15)",
            color: "#86efac",
            border: "1px solid rgba(16,185,129,0.26)",
            fontWeight: 700,
          }}
        />
        <Chip
          size="small"
          label={`Wrong: ${wrong}`}
          sx={{
            bgcolor: "rgba(239,68,68,0.13)",
            color: "#fca5a5",
            border: "1px solid rgba(239,68,68,0.24)",
            fontWeight: 700,
          }}
        />
      </Stack>
    </Stack>
  );
}

export default function ProfilePageClient({ email }: ProfilePageClientProps) {
  const [summary, setSummary] = useState<SummaryProfile | null>(null);
  const [ratingProgression, setRatingProgression] = useState<RatingProgressionPoint[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      const response = await fetch("/api/profile/summary", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok || disposed) {
        return;
      }
      const payload = (await response.json()) as {
        profile: SummaryProfile;
        rating_progression: RatingProgressionPoint[];
      };
      if (disposed) {
        return;
      }
      setSummary(payload.profile);
      setRatingProgression(payload.rating_progression ?? []);
    };

    void run();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      const response = await fetch(`/api/profile/analytics?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok || disposed) {
        return;
      }

      const payload = (await response.json()) as {
        analytics: AnalyticsPayload | null;
        categories: string[];
      };
      if (disposed) {
        return;
      }

      setAnalytics(payload.analytics);
      setCategories(payload.categories ?? []);
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [selectedCategory]);

  const winRate = summary && summary.total_matches > 0 ? (summary.win_count / summary.total_matches) * 100 : 0;
  const avgResponse = Number(analytics?.avg_response_seconds ?? 0).toFixed(2);

  const statCards = [
    { label: "Username", value: summary?.username ?? "-", icon: <PersonRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: "Rating", value: summary?.rating ?? 0, icon: <MilitaryTechRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: "Total Matches", value: summary?.total_matches ?? 0, icon: <TimelineRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: "Win Rate", value: `${winRate.toFixed(1)}%`, icon: <PercentRoundedIcon sx={{ fontSize: 16 }} /> },
    { label: "Avg Score", value: summary?.avg_score ?? 0, icon: <QueryStatsRoundedIcon sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Stack spacing={3}>
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
              "radial-gradient(circle at 10% 20%, rgba(99,102,241,0.24), transparent 40%), radial-gradient(circle at 85% 0%, rgba(56,189,248,0.14), transparent 35%)",
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
            Player Profile
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
            Signed in as {email ?? "-"}.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              icon={<InsightsRoundedIcon style={{ fontSize: 14 }} />}
              label="Performance Analytics"
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(99,102,241,0.18)",
                color: "#c7d2fe",
                border: "1px solid rgba(129,140,248,0.26)",
                "& .MuiChip-icon": { color: "#a5b4fc", ml: 0.4 },
              }}
            />
            <Chip
              size="small"
              icon={<LocalFireDepartmentRoundedIcon style={{ fontSize: 14 }} />}
              label={`${summary?.total_matches ?? 0} Matches`}
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(251,191,36,0.13)",
                color: "#fcd34d",
                border: "1px solid rgba(251,191,36,0.28)",
                "& .MuiChip-icon": { color: "#fbbf24", ml: 0.4 },
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={1.5}>
        {statCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.08)",
                bgcolor: "rgba(17, 20, 31, 0.62)",
                backdropFilter: "blur(16px) saturate(150%)",
                WebkitBackdropFilter: "blur(16px) saturate(150%)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
                transition: "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  borderColor: "rgba(165,180,252,0.38)",
                  bgcolor: "rgba(21, 25, 38, 0.8)",
                },
              }}
            >
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.35 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "rgba(255,255,255,0.55)",
                      letterSpacing: "0.07em",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Box sx={{ color: "rgba(165,180,252,0.9)", display: "inline-flex" }}>{item.icon}</Box>
                </Stack>
                <Typography
                  variant="h5"
                  component="p"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.2,
                    letterSpacing: "-0.03em",
                    color: "#f8fafc",
                  }}
                >
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card
        elevation={0}
        sx={{
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
              Rating Progression
            </Typography>
            <Chip
              size="small"
              icon={<TimelineRoundedIcon style={{ fontSize: 13 }} />}
              label={`${ratingProgression.length} data points`}
              sx={{
                fontWeight: 700,
                fontSize: "0.68rem",
                bgcolor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(255,255,255,0.12)",
                "& .MuiChip-icon": { color: "rgba(255,255,255,0.6)" },
              }}
            />
          </Stack>
          <RatingLineChart points={ratingProgression} />
        </CardContent>
      </Card>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(17, 20, 31, 0.62)",
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
            }}
          >
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  Accuracy
                </Typography>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="category-filter-label" sx={{ color: "rgba(255,255,255,0.64)" }}>
                    Category
                  </InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={selectedCategory}
                    label="Category"
                    onChange={(event) => setSelectedCategory(String(event.target.value))}
                    sx={{
                      color: "rgba(255,255,255,0.88)",
                      borderRadius: "10px",
                      ".MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.22)" },
                      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.4)" },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(129,140,248,0.7)" },
                      "& .MuiSelect-icon": { color: "rgba(255,255,255,0.62)" },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: "rgba(18,22,34,0.98)",
                          color: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          backdropFilter: "blur(12px)",
                        },
                      },
                    }}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.09)" }} />
              <AccuracyPie
                correct={analytics?.correct_answers ?? 0}
                wrong={analytics?.wrong_answers ?? 0}
                label={`Avg response: ${avgResponse}s`}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "rgba(17, 20, 31, 0.62)",
              backdropFilter: "blur(16px) saturate(150%)",
              WebkitBackdropFilter: "blur(16px) saturate(150%)",
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: "#f8fafc" }}>
                Difficulty Insights
              </Typography>
              <Stack spacing={1.5}>
                {(analytics?.difficulty_breakdown ?? []).length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>
                      No difficulty data yet.
                    </Typography>
                  </Paper>
                ) : null}
                {(analytics?.difficulty_breakdown ?? []).map((item) => (
                  <Paper
                    key={item.difficulty}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      bgcolor: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ textTransform: "capitalize", fontWeight: 700, color: "#f8fafc" }}>
                        {item.difficulty}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.62)" }}>{item.total} answers</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.72)" }}>
                      Accuracy: {item.accuracy_pct}% | Avg response: {Number(item.avg_response_seconds ?? 0).toFixed(2)}s
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
