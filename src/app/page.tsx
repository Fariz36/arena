import Link from "next/link";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { AppPageCard, AppPageContainer, AppPageHeading } from "@/components/ui/page-shell";

export default function HomePage() {
  return (
    <AppPageContainer maxWidth="sm">
      <AppPageCard>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Link href="/login">
              <Button variant="contained">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="outlined">Register</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outlined">Dashboard</Button>
            </Link>
          </Stack>
        </Stack>
      </AppPageCard>
    </AppPageContainer>
  );
}
