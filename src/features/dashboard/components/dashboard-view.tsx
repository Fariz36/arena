"use client";

import { useSyncExternalStore } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
    <Stack spacing={3}>
      <Paper elevation={1} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Player Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Signed in as: {email}
          </Typography>
        </Stack>

        <div style={{ marginTop: 16 }}>
          <PvpQueueButton userId={userId} username={username} />
        </div>
      </Paper>

      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h5" component="p" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
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
