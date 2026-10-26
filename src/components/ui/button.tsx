import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  danger: "bg-danger text-white hover:bg-danger-hover",
} as const;

const sizes = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  icon: "size-9",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Estado de carga: deshabilita el botón y aplica un pulso (patrón skeleton).
   * No se usan spinners, según el lineamiento de carga del PDF §4.
   */
  pending?: boolean;
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap",
    "transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  pending = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(buttonClasses(variant, size), pending && "animate-pulse", className)}
      {...props}
    >
      {children}
    </button>
  );
}
