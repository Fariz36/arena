import Link from "next/link";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function UnauthorizedPage() {
  return (
    <Stack spacing={3} textAlign="center">
      <Typography variant="h4" component="h1">
        403 - Unauthorized
      </Typography>
      <Typography variant="body2" color="text.secondary">
        You do not have permission to access this page.
      </Typography>
      <Link href="/dashboard">
        <Button variant="contained">Back to dashboard</Button>
      </Link>
    </Stack>
  );
}
