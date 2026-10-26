import { PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <>
      <PageHeader title="Productos" description="Gestiona el catálogo: alta, edición y bajas." />
      <LoadingRegion label="Cargando productos…">
        <TableSkeleton rows={10} columns={8} />
      </LoadingRegion>
    </>
  );
}
