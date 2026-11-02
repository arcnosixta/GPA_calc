import type { ReactNode } from "react";
import { AuthLayout } from "@/components/layout/auth-layout";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
