"use client";

import Link from "next/link";
import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { registerAction } from "@/features/auth/actions";

const INITIAL_STATE = { error: null as string | null };

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, INITIAL_STATE);

  return (
    <Stack component="form" action={formAction} spacing={2}>
      <TextField
        id="username"
        name="username"
        type="text"
        label="Username"
        required
        inputProps={{ minLength: 3 }}
        size="small"
        fullWidth
        sx={{
          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.62)" },
          "& .MuiOutlinedInput-root": {
            color: "rgba(255,255,255,0.9)",
            borderRadius: "10px",
            backgroundColor: "rgba(255,255,255,0.04)",
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.38)" },
            "&.Mui-focused fieldset": { borderColor: "rgba(129,140,248,0.7)" },
          },
        }}
      />

      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        size="small"
        fullWidth
        sx={{
          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.62)" },
          "& .MuiOutlinedInput-root": {
            color: "rgba(255,255,255,0.9)",
            borderRadius: "10px",
            backgroundColor: "rgba(255,255,255,0.04)",
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.38)" },
            "&.Mui-focused fieldset": { borderColor: "rgba(129,140,248,0.7)" },
          },
        }}
      />

      <TextField
        id="password"
        name="password"
        type="password"
        label="Password"
        required
        inputProps={{ minLength: 6 }}
        size="small"
        fullWidth
        sx={{
          "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.62)" },
          "& .MuiOutlinedInput-root": {
            color: "rgba(255,255,255,0.9)",
            borderRadius: "10px",
            backgroundColor: "rgba(255,255,255,0.04)",
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "rgba(255,255,255,0.38)" },
            "&.Mui-focused fieldset": { borderColor: "rgba(129,140,248,0.7)" },
          },
        }}
      />

      {state.error ? (
        <Alert
          severity="error"
          sx={{
            borderRadius: "10px",
            border: "1px solid rgba(239,68,68,0.32)",
            bgcolor: "rgba(239,68,68,0.11)",
            color: "#fca5a5",
            "& .MuiAlert-icon": { color: "#f87171" },
          }}
        >
          {state.error}
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        variant="contained"
        fullWidth
        sx={{
          textTransform: "none",
          borderRadius: "10px",
          fontWeight: 700,
          py: 0.95,
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          boxShadow: "0 10px 24px rgba(79,70,229,0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
          },
          "&.Mui-disabled": {
            color: "rgba(255,255,255,0.55)",
            background: "rgba(255,255,255,0.16)",
          },
        }}
      >
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.68)" }}>
        Already have an account?{" "}
        <Button
          component={Link}
          href="/login"
          variant="text"
          size="small"
          sx={{
            minWidth: 0,
            px: 0.5,
            textTransform: "none",
            color: "#c7d2fe",
            "&:hover": { bgcolor: "rgba(99,102,241,0.12)" },
          }}
        >
          Sign in
        </Button>
      </Typography>
    </Stack>
  );
}
