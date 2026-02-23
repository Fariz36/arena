"use client";

import Link from "next/link";
import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { loginAction } from "@/features/auth/actions";

type LoginFormProps = {
  nextPath: string;
};

const INITIAL_STATE = { error: null as string | null };

export default function LoginForm({ nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <Stack component="form" action={formAction} spacing={2}>
      <input type="hidden" name="next" value={nextPath} />

      <TextField id="email" name="email" type="email" label="Email" required size="small" fullWidth />

      <TextField id="password" name="password" type="password" label="Password" required size="small" fullWidth />

      {state.error ? <Alert severity="error">{state.error}</Alert> : null}

      <Button type="submit" disabled={pending} variant="contained" fullWidth>
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <Typography variant="body2" color="text.secondary">
        Don&apos;t have an account?{" "}
        <Button component={Link} href="/register" variant="text" size="small" sx={{ minWidth: 0, px: 0.5 }}>
          Register
        </Button>
      </Typography>
    </Stack>
  );
}
