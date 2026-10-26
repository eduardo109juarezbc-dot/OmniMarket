import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { PageHeader } from "@/components/layout/page-header";
import { KanbanSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { getBoard } from "@/server/services/orders";

export const metadata: Metadata = { title: "Kanban" };

export default function KanbanPage() {
  return (
    <>
      <PageHeader
        title="Kanban de pedidos"
        description="Arrastra los pedidos entre estados; los cambios se guardan al instante."
      />
      <Suspense fallback={<BoardSkeleton />}>
        <BoardData />
      </Suspense>
    </>
  );
}

function BoardSkeleton() {
  return (
    <LoadingRegion label="Cargando tablero…">
      <KanbanSkeleton />
    </LoadingRegion>
  );
}

async function BoardData() {
  if (!(await getSessionUser())) redirect("/login");
  return <KanbanBoard initialData={await getBoard(getDb())} />;
}
