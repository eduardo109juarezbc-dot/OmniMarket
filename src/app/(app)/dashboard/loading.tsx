import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/skeletons";

export default function DashboardLoading() {
  return (
    <>
      <PageHeader title="Dashboard" description="Métricas de ventas en tiempo real." />
      <DashboardSkeleton />
    </>
  );
}
