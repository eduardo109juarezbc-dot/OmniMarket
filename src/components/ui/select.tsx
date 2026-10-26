import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClasses } from "./input";

/** Select nativo: accesible por teclado y lector de pantalla sin JS adicional. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(fieldControlClasses, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}
