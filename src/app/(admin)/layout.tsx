import type { ReactNode } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import AppNavigation from "@/components/navigation/app-navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack spacing={3}>
      <div className="flex justify-center">
        <AppNavigation />
      </div>
      {children}
      </Stack>
    </Container>
  );
}
