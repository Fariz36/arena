"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { signOutAction } from "@/features/auth/actions";

type AppNavigationViewProps = {
  isAdmin: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardRoundedIcon fontSize="small" /> },
  { href: "/profile", label: "Profile", icon: <PersonRoundedIcon fontSize="small" /> },
  { href: "/history", label: "History", icon: <HistoryRoundedIcon fontSize="small" /> },
];

const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin/questions",
  label: "Admin Dashboard",
  icon: <AdminPanelSettingsRoundedIcon fontSize="small" />,
};

export default function AppNavigationView({ isAdmin }: AppNavigationViewProps) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const pathname = usePathname();
  const navItems = isAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  if (!isMounted) {
    return <div style={{ marginBottom: 24, height: 68 }} />;
  }

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        mb: 3,
        top: 12,
        mx: "auto",
        left: 0,
        right: 0,
        bgcolor: "rgba(15, 17, 26, 0.82)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.36), 0 1px 0 rgba(255,255,255,0.06) inset",
        maxWidth: 960,
        width: "calc(100% - 32px)",
      }}
    >
      <Toolbar
        sx={{
          minHeight: 60,
          px: { xs: 2, sm: 2.5 },
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            }}
          >
            <SportsEsportsRoundedIcon sx={{ fontSize: 18, color: "#fff" }} />
          </Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              fontSize: "0.95rem",
              letterSpacing: "-0.02em",
              background: "linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.55))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            QuizArena
          </Typography>
          {isAdmin ? (
            <Chip
              label="Admin"
              size="small"
              icon={<AdminPanelSettingsRoundedIcon style={{ fontSize: 13 }} />}
              sx={{
                height: 22,
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                bgcolor: "rgba(251,191,36,0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(251,191,36,0.25)",
                "& .MuiChip-icon": { color: "#fbbf24" },
              }}
            />
          ) : null}
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{
            bgcolor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "12px",
            px: 0.75,
            py: 0.75,
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                size="small"
                startIcon={item.icon}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  letterSpacing: "-0.01em",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.75,
                  minHeight: 0,
                  gap: 0.25,
                  transition: "all 0.18s ease",
                  ...(isActive
                    ? {
                        bgcolor: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.1) inset",
                        "& .MuiButton-startIcon": { color: "#a5b4fc" },
                      }
                    : {
                        color: "rgba(255,255,255,0.5)",
                        "&:hover": {
                          bgcolor: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.85)",
                          "& .MuiButton-startIcon": { color: "rgba(255,255,255,0.7)" },
                        },
                        "& .MuiButton-startIcon": { color: "rgba(255,255,255,0.35)" },
                      }),
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Stack>

        <Box component="form" action={signOutAction} sx={{ flexShrink: 0 }}>
          <Tooltip title="Sign out" placement="bottom">
            <IconButton
              type="submit"
              size="small"
              sx={{
                color: "rgba(255,255,255,0.4)",
                bgcolor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                width: 36,
                height: 36,
                transition: "all 0.18s ease",
                "&:hover": {
                  bgcolor: "rgba(239,68,68,0.12)",
                  color: "#f87171",
                  borderColor: "rgba(239,68,68,0.25)",
                },
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
