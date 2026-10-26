"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDeleteProduct } from "@/hooks/use-product-mutations";
import type { ProductDto } from "@/lib/api-types";

/** Confirmación antes de eliminar (Requisito 10.3). */
export function DeleteProductDialog({
  product,
  onClose,
}: {
  product: ProductDto | null;
  onClose: () => void;
}) {
  const remove = useDeleteProduct();

  return (
    <Dialog
      open={product !== null}
      onClose={onClose}
      title="Eliminar producto"
      description={
        product
          ? `Se eliminará ${product.sku} · ${product.name}. Esta acción no se puede deshacer.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            data-testid="confirm-delete"
            onClick={() => {
              if (product) remove.mutate(product);
              onClose();
            }}
          >
            Eliminar
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">
        Si el producto tiene ventas registradas no se podrá eliminar; en ese caso puedes
        desactivarlo.
      </p>
    </Dialog>
  );
}
