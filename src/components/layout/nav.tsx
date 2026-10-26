"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/kanban", label: "Kanban" },
  { href: "/orders", label: "Pedidos" },
  { href: "/products", label: "Productos" },
] as const;

/** Navegación principal: vertical en escritorio, horizontal con scroll en pantallas pequeñas. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal">
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "bg-brand-soft text-brand" : "text-muted hover:bg-subtle hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
