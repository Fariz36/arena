import LockRoundedIcon from "@mui/icons-material/LockRounded";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LoginForm from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

function sanitizeNextPath(rawPath?: string): string {
  if (!rawPath || !rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return "/dashboard";
  }

  return rawPath;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(15, 17, 26, 0.72)",
          backdropFilter: "blur(18px) saturate(170%)",
          WebkitBackdropFilter: "blur(18px) saturate(170%)",
          boxShadow: "0 18px 42px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.06) inset",
          p: { xs: 2, sm: 2.25 },
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 10% 20%, rgba(99,102,241,0.22), transparent 40%), radial-gradient(circle at 85% 0%, rgba(56,189,248,0.14), transparent 35%)",
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
            Sign in
          </Typography>
          <Chip
            size="small"
            icon={<LockRoundedIcon style={{ fontSize: 14 }} />}
            label="Access your QuizArena account"
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
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          bgcolor: "rgba(17, 20, 31, 0.62)",
          backdropFilter: "blur(16px) saturate(150%)",
          WebkitBackdropFilter: "blur(16px) saturate(150%)",
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          p: { xs: 1.75, sm: 2 },
        }}
      >
        <LoginForm nextPath={nextPath} />
      </Paper>
    </Stack>
  );
}
