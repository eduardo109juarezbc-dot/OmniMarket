"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  /**
   * Estado mixto, p. ej. la casilla "seleccionar todo" con selección parcial.
   * El navegador lo expone a los lectores de pantalla como "mixed".
   */
  indeterminate?: boolean;
};

export function Checkbox({ indeterminate = false, className, ref, ...props }: CheckboxProps) {
  const innerRef = useRef<HTMLInputElement | null>(null);

  // `indeterminate` solo existe como propiedad del DOM, no como atributo HTML.
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={(node) => {
        innerRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      className={cn("size-4 cursor-pointer rounded border-line accent-brand", className)}
      {...props}
    />
  );
}
