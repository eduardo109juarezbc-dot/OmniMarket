import Image from "next/image";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { LOGIN_PATH, PROVIDER_LABELS } from "@/lib/auth";
import { getSessionUser } from "@/server/auth";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Operador autenticado en la cabecera: nombre, avatar y proveedor (Requisito 2.8)
 * y botón de cierre de sesión (Requisito 2.7). Lee la sesión: va dentro de Suspense.
 */
export async function UserMenu() {
  const user = await getSessionUser();
  // Defensa en profundidad: el proxy ya redirige, pero no se confía solo en él.
  if (!user) redirect(LOGIN_PATH);

  return (
    <div className="flex items-center gap-3" data-testid="user-menu">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={32} height={32} className="size-8 rounded-full" />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
        >
          {initials(user.name)}
        </span>
      )}
      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-sm font-medium" data-testid="user-name">
          {user.name}
        </span>
        {user.provider && (
          <Badge tone="neutral" className="w-fit" data-testid="user-provider">
            {PROVIDER_LABELS[user.provider]}
          </Badge>
        )}
      </div>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm" data-testid="signout">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <LoadingRegion label="Cargando usuario…" className="flex items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="hidden flex-col gap-1 sm:flex">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="h-8 w-28" />
    </LoadingRegion>
  );
}
