import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <>
      <PageHeader title="Pedidos" description="Consulta, filtra y crea pedidos." />
      <LoadingRegion label="Cargando pedidos…">
        <TableSkeleton rows={10} columns={6} />
      </LoadingRegion>
    </>
  );
}
