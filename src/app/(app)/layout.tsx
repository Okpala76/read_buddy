import { AppShell } from "@/components/layout/AppShell";
import { requireAuth } from "@/lib/auth/server";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuth();

  return <AppShell>{children}</AppShell>;
}
