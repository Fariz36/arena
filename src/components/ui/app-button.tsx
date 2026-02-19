"use client";

import Button from "@mui/material/Button";

type AppButtonProps = {
  label: string;
  onClick?: () => void;
};

export default function AppButton({ label, onClick }: AppButtonProps) {
  return (
    <Button onClick={onClick} size="small" variant="contained">
      {label}
    </Button>
  );
}
