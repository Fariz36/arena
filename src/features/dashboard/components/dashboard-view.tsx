"use client";

import { useSyncExternalStore } from "react";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PvpQueueButton from "@/features/arena/components/pvp-queue-button";

type DashboardViewProps = {
  email: string | undefined;
  userId: string;
  username: string;
  stats: Array<{ label: string; value: string | number }>;
};

export default function DashboardView({ email, userId, username, stats }: DashboardViewProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isMounted) {
    return <div className="min-h-48" />;
  }

  return (
    <Stack spacing={3} sx={{ position: "relative" }}>
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
              "radial-gradient(circle at 15% 15%, rgba(99,102,241,0.24), transparent 42%), radial-gradient(circle at 80% 0%, rgba(56,189,248,0.18), transparent 38%)",
          },
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Stack spacing={1.1}>
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
              Welcome back, {username}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Signed in as {email ?? "-"}.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                icon={<FiberManualRecordRoundedIcon style={{ fontSize: 10 }} />}
                label="Online"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  bgcolor: "rgba(34,197,94,0.14)",
                  color: "#86efac",
                  border: "1px solid rgba(34,197,94,0.24)",
                  "& .MuiChip-icon": { color: "#86efac", ml: 0.4 },
                }}
              />
              <Chip
                size="small"
                icon={<BoltRoundedIcon style={{ fontSize: 14 }} />}
                label="PvP Ready"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  bgcolor: "rgba(99,102,241,0.18)",
                  color: "#c7d2fe",
                  border: "1px solid rgba(129,140,248,0.26)",
                  "& .MuiChip-icon": { color: "#a5b4fc", ml: 0.4 },
                }}
              />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              icon={<PersonRoundedIcon style={{ fontSize: 14 }} />}
              label={username}
              sx={{
                height: 26,
                fontWeight: 700,
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.85)",
                bgcolor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                "& .MuiChip-icon": { color: "rgba(255,255,255,0.6)" },
              }}
            />
            <Chip
              size="small"
              icon={<EmojiEventsRoundedIcon style={{ fontSize: 14 }} />}
              label="Ranked"
              sx={{
                height: 26,
                fontWeight: 700,
                fontSize: "0.72rem",
                bgcolor: "rgba(251,191,36,0.13)",
                color: "#fcd34d",
                border: "1px solid rgba(251,191,36,0.28)",
                "& .MuiChip-icon": { color: "#fbbf24" },
              }}
            />
          </Stack>
        </Stack>

        <Divider sx={{ my: 2.25, borderColor: "rgba(255,255,255,0.09)", position: "relative", zIndex: 1 }} />

        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.08)",
            bgcolor: "rgba(7, 10, 18, 0.38)",
            p: { xs: 1.4, sm: 1.8 },
          }}
        >
          <PvpQueueButton userId={userId} username={username} />
        </Box>
      </Paper>

      <Grid container spacing={1.5}>
        {stats.map((stat, index) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
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
                    {stat.label}
                  </Typography>
                  {index === 1 ? (
                    <MilitaryTechRoundedIcon sx={{ fontSize: 16, color: "#fbbf24" }} />
                  ) : (
                    <QueryStatsRoundedIcon sx={{ fontSize: 16, color: "rgba(165,180,252,0.9)" }} />
                  )}
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
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
