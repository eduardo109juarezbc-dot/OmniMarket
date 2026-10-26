import Link from "next/link";
import { Suspense } from "react";
import { MainNav } from "@/components/layout/nav";
import { UserMenu, UserMenuSkeleton } from "./_components/user-menu";

/**
 * Shell de las rutas privadas. La estructura es estática (forma parte del shell
 * prerenderizado); solo el bloque del usuario depende de la sesión y se
 * resuelve dentro de Suspense con un skeleton.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-brand px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <aside className="flex flex-col gap-4 border-b border-line bg-surface p-4 md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/dashboard" className="px-3 text-base font-semibold">
          <span className="text-brand">Omni</span>Market
          <span className="block text-xs font-normal text-muted">Operations Hub</span>
        </Link>
        <MainNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-line bg-surface px-4 md:px-6">
          <Suspense fallback={<UserMenuSkeleton />}>
            <UserMenu />
          </Suspense>
        </header>
        <main id="contenido" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
