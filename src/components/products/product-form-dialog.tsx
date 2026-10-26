"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-product-mutations";
import { ApiError } from "@/lib/api-client";
import type { ProductDto } from "@/lib/api-types";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS } from "@/lib/domain";
import { productCreateSchema, type ProductCreateInput } from "@/lib/schemas";

type FormInput = z.input<typeof productCreateSchema>;

// Precio y costo sin valor inicial: el input queda vacío (con NaN el navegador
// avisa en consola) y, al enviar vacío, valueAsNumber da NaN y Zod lo rechaza.
const EMPTY: DefaultValues<FormInput> = {
  sku: "",
  name: "",
  category: "ELECTRONICS",
  stock: 0,
  active: true,
};

/**
 * Alta y edición de productos (Requisitos 10.2, 10.3, 10.7 y 10.8): el mismo
 * esquema Zod que usa la API, errores por campo en español y errores del
 * servidor (p. ej. SKU repetido) junto al campo correspondiente.
 */
export function ProductFormDialog({
  open,
  onClose,
  product,
  listKey,
}: {
  open: boolean;
  onClose: () => void;
  /** Producto a editar; sin él, el diálogo crea uno nuevo. */
  product?: ProductDto;
  listKey: readonly unknown[];
}) {
  const create = useCreateProduct(listKey);
  const update = useUpdateProduct();
  const isEdit = Boolean(product);

  const form = useForm<FormInput, unknown, ProductCreateInput>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    if (!open) return;
    form.reset(
      product
        ? {
            sku: product.sku,
            name: product.name,
            category: product.category,
            price: product.price,
            cost: product.cost,
            stock: product.stock,
            active: product.active,
          }
        : EMPTY,
    );
  }, [open, product, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (product) await update.mutateAsync({ id: product.id, patch: values });
      else await create.mutateAsync(values);
      onClose();
    } catch (error) {
      // Errores de validación del servidor: se colocan en su campo y el diálogo sigue abierto.
      if (error instanceof ApiError) {
        for (const detail of error.details) {
          form.setError(detail.path as keyof FormInput, { message: detail.message });
        }
      }
    }
  });

  const pending = isSubmitting || create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar ${product?.sku}` : "Nuevo producto"}
      description="Los importes se guardan con 2 decimales."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form="product-form" pending={pending} data-testid="product-submit">
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </Button>
        </>
      }
    >
      <form
        id="product-form"
        noValidate
        onSubmit={onSubmit}
        className="grid gap-4 sm:grid-cols-2"
        data-testid="product-form"
      >
        <Field id="product-sku" label="SKU" error={errors.sku?.message} hint="Ej.: ELE-010">
          {(aria) => (
            <Input {...aria} autoComplete="off" className="uppercase" {...form.register("sku")} />
          )}
        </Field>
        <Field id="product-category" label="Categoría" error={errors.category?.message}>
          {(aria) => (
            <Select {...aria} {...form.register("category")}>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {PRODUCT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="product-name"
          label="Nombre"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          {(aria) => <Input {...aria} autoComplete="off" {...form.register("name")} />}
        </Field>
        <Field id="product-price" label="Precio de venta" error={errors.price?.message}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              {...form.register("price", { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field id="product-cost" label="Costo unitario" error={errors.cost?.message}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              {...form.register("cost", { valueAsNumber: true })}
            />
          )}
        </Field>
        <Field id="product-stock" label="Stock" error={errors.stock?.message}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              {...form.register("stock", { valueAsNumber: true })}
            />
          )}
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox {...form.register("active")} />
            Producto activo
          </label>
        </div>
      </form>
    </Dialog>
  );
}
