import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-line bg-surface shadow-sm", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

type CardTitleProps = ComponentProps<"h2"> & {
  /** Nivel de encabezado adecuado a la jerarquía de la página. */
  as?: Extract<ElementType, "h1" | "h2" | "h3">;
};

export function CardTitle({ as: Heading = "h2", className, ...props }: CardTitleProps) {
  return <Heading className={cn("text-base font-semibold text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}
