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
      <TextField id="username" name="username" type="text" label="Username" required inputProps={{ minLength: 3 }} size="small" fullWidth />

      <TextField id="email" name="email" type="email" label="Email" required size="small" fullWidth />

      <TextField id="password" name="password" type="password" label="Password" required inputProps={{ minLength: 6 }} size="small" fullWidth />

      {state.error ? <Alert severity="error">{state.error}</Alert> : null}

      <Button type="submit" disabled={pending} variant="contained" fullWidth>
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <Typography variant="body2" color="text.secondary">
        Already have an account?{" "}
        <Button component={Link} href="/login" variant="text" size="small" sx={{ minWidth: 0, px: 0.5 }}>
          Sign in
        </Button>
      </Typography>
    </Stack>
  );
}
