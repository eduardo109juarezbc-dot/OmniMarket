import { PageHeader } from "@/components/layout/page-header";
import { KanbanSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";

export default function KanbanLoading() {
  return (
    <>
      <PageHeader
        title="Kanban de pedidos"
        description="Arrastra los pedidos entre estados; los cambios se guardan al instante."
      />
      <LoadingRegion label="Cargando tablero…">
        <KanbanSkeleton />
      </LoadingRegion>
    </>
  );
}
