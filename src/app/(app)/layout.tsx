import { AppShell } from "@/components/layout/AppShell";
import { config } from "@/config/env";
import { requireAuth } from "@/lib/auth/server";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAuth();

  return (
    <AppShell vapidPublicKey={config.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}>
      {children}
    </AppShell>
  );
}
