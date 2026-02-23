import type { ReactNode } from "react";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type AppPageContainerProps = {
  children: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
};

type AppPageCardProps = {
  children: ReactNode;
};

type AppPageHeadingProps = {
  title: string;
  description?: string;
};

export function AppPageContainer({ children, maxWidth = "md" }: AppPageContainerProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 4 }}>
      {children}
    </Container>
  );
}

export function AppPageCard({ children }: AppPageCardProps) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2, sm: 3 } }}>
      {children}
    </Paper>
  );
}

export function AppPageHeading({ title, description }: AppPageHeadingProps) {
  return (
    <Stack spacing={1}>
      <Typography variant="h4" component="h1">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
    </Stack>
  );
}
