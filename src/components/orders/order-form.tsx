"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { CustomerOptionDto, OrderDto, ProductDto } from "@/lib/api-types";
import { formatMoney } from "@/lib/format";
import { ORDER_DEPENDENT_KEYS } from "@/lib/query-keys";
import {
  ORDER_MAX_ITEMS,
  ORDER_MAX_QUANTITY,
  orderCreateSchema,
  type OrderCreateInput,
} from "@/lib/schemas";

type FormInput = z.input<typeof orderCreateSchema>;

/**
 * Alta de pedido (Requisito 10.6). El total mostrado es una estimación: el
 * servidor recalcula precios y totales al guardar.
 */
export function OrderForm({
  customers,
  products,
}: {
  customers: CustomerOptionDto[];
  products: ProductDto[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormInput, unknown, OrderCreateInput>({
    resolver: zodResolver(orderCreateSchema),
    defaultValues: { customerId: "", items: [{ productId: "", quantity: 1 }] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const items = useWatch({ control: form.control, name: "items" });
  const { errors } = form.formState;

  const byId = new Map(products.map((product) => [product.id, product]));
  const estimated = (items ?? []).reduce((sum, item) => {
    const product = byId.get(item?.productId ?? "");
    const quantity = Number(item?.quantity);
    return product && Number.isFinite(quantity) ? sum + product.price * quantity : sum;
  }, 0);

  const create = useMutation({
    mutationFn: (input: OrderCreateInput) =>
      apiFetch<OrderDto>("/api/orders", { method: "POST", json: input }),
    onSuccess: async (order) => {
      toast.success(`Pedido ${order.code} creado: ${formatMoney(order.total)}`);
      for (const queryKey of ORDER_DEPENDENT_KEYS) {
        await queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
      router.push(`/orders?created=${encodeURIComponent(order.code)}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details.length > 0) {
        for (const detail of error.details) {
          form.setError(detail.path as keyof FormInput, { message: detail.message });
        }
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "No se pudo crear el pedido.");
    },
  });

  const onSubmit = form.handleSubmit((values) => create.mutate(values));
  const itemsError = errors.items?.root?.message ?? errors.items?.message;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex max-w-3xl flex-col gap-6"
      data-testid="order-form"
    >
      <Card>
        <CardContent className="flex flex-col gap-5 pt-5">
          <Field id="order-customer" label="Cliente" error={errors.customerId?.message}>
            {(aria) => (
              <Select {...aria} {...form.register("customerId")}>
                <option value="">Selecciona un cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.city}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">Productos</legend>
            {fields.map((field, index) => {
              const product = byId.get(items?.[index]?.productId ?? "");
              const quantity = Number(items?.[index]?.quantity);
              return (
                <div
                  key={field.id}
                  className="grid items-start gap-3 sm:grid-cols-[1fr_7rem_8rem_auto]"
                  data-testid={`order-line-${index}`}
                >
                  <Field
                    id={`item-${index}-product`}
                    label={`Producto ${index + 1}`}
                    error={errors.items?.[index]?.productId?.message}
                  >
                    {(aria) => (
                      <Select {...aria} {...form.register(`items.${index}.productId`)}>
                        <option value="">Selecciona un producto</option>
                        {products.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.sku} · {option.name} ({formatMoney(option.price)})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field
                    id={`item-${index}-quantity`}
                    label="Cantidad"
                    error={errors.items?.[index]?.quantity?.message}
                  >
                    {(aria) => (
                      <Input
                        {...aria}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={ORDER_MAX_QUANTITY}
                        step={1}
                        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                    )}
                  </Field>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Subtotal</span>
                    <span className="flex h-10 items-center tabular-nums">
                      {product && Number.isFinite(quantity)
                        ? formatMoney(product.price * quantity)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span aria-hidden="true" className="text-sm">
                      &nbsp;
                    </span>
                    <Button
                      variant="ghost"
                      className="text-danger"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label={`Quitar producto ${index + 1}`}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              );
            })}
            {itemsError && (
              <p role="alert" className="text-xs font-medium text-danger">
                {itemsError}
              </p>
            )}
            <div>
              <Button
                variant="secondary"
                size="sm"
                disabled={fields.length >= ORDER_MAX_ITEMS}
                onClick={() => append({ productId: "", quantity: 1 })}
                data-testid="add-line"
              >
                Añadir producto
              </Button>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">
          Total estimado: <strong className="text-lg tabular-nums">{formatMoney(estimated)}</strong>
          <span className="block text-xs text-muted">
            El total definitivo lo calcula el servidor.
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => router.push("/orders")}
            disabled={create.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" pending={create.isPending} data-testid="order-submit">
            Crear pedido
          </Button>
        </div>
      </div>
    </form>
  );
}
