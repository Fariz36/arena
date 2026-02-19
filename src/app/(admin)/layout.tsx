import type { ReactNode } from "react";
import AppNavigation from "@/components/navigation/app-navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6">
      <AppNavigation />
      {children}
    </div>
  );
}
