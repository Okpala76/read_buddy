import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return <AppShell user={session?.user}>{children}</AppShell>;
}
