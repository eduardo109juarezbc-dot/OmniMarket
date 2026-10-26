import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Contenedor con scroll horizontal para tablas anchas en pantallas pequeñas. */
export function TableContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-x-auto rounded-lg border border-line bg-surface", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />;
}

export function THead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-subtle text-xs text-muted uppercase", className)} {...props} />;
}

export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TR({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn("transition-colors hover:bg-subtle/60 aria-selected:bg-brand-soft", className)}
      {...props}
    />
  );
}

export function TH({ className, scope = "col", ...props }: ComponentProps<"th">) {
  return (
    <th
      scope={scope}
      className={cn("px-4 py-3 font-semibold whitespace-nowrap", className)}
      {...props}
    />
  );
}

export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
