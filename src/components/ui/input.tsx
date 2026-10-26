import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldControlClasses = cn(
  "w-full rounded-md border border-line bg-surface px-3 text-sm text-ink",
  "placeholder:text-muted/80 disabled:cursor-not-allowed disabled:bg-subtle",
  "aria-invalid:border-danger aria-invalid:outline-danger",
);

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return <input type={type} className={cn(fieldControlClasses, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldControlClasses, "min-h-20 py-2", className)} {...props} />;
}
