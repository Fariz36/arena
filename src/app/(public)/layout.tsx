import type { ReactNode } from "react";
import { AppPageCard, AppPageContainer } from "@/components/ui/page-shell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <AppPageContainer maxWidth="xs">
      <AppPageCard>{children}</AppPageCard>
    </AppPageContainer>
  );
}
