import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SALES_PAGE_SIZE } from "@/lib/page-sizes";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSkeleton } from "@/components/skeletons";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { getDashboard, getSalesAnalytics } from "@/server/services/analytics";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Métricas de ventas en tiempo real." />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </>
  );
}

/** Carga inicial en el servidor (sin esperar a la hidratación para pedir datos). */
async function DashboardData() {
  if (!(await getSessionUser())) redirect("/login");
  const db = getDb();
  const [dashboard, sales] = await Promise.all([
    getDashboard(db, "all"),
    getSalesAnalytics(db, { page: 1, limit: SALES_PAGE_SIZE }),
  ]);
  return <DashboardView initialDashboard={dashboard} initialSales={sales} />;
}
