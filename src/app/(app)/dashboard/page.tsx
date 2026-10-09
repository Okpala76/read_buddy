import { DashboardContent } from "@/features/dashboard/ui/DashboardContent";
import { loadDashboardData } from "@/features/dashboard/ui/dashboard-loader";

export default async function DashboardPage() {
  const data = await loadDashboardData();
  return <DashboardContent {...data} />;
}
