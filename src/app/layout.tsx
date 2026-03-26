import type { Metadata } from "next";
import "./globals.css";
import MuiThemeRegistry from "@/components/ui/mui-theme-registry";

export const metadata: Metadata = {
  title: "Arena Starter",
  description: "Next.js + Supabase + Tailwind + MUI + TanStack Table starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <MuiThemeRegistry>{children}</MuiThemeRegistry>
      </body>
    </html>
  );
}
