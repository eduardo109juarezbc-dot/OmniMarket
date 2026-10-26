import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { loginErrorMessage, sanitizeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Iniciar sesión" };

/**
 * Inicio de sesión. Solo OAuth (Google y GitHub): no hay formularios de email
 * ni contraseña (Requisito 2.3). Si ya hay sesión, el proxy redirige al dashboard.
 */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 pt-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">OmniMarket</p>
          <CardTitle as="h1" className="text-xl">
            Operations Hub
          </CardTitle>
          <CardDescription>Inicia sesión con tu cuenta de Google o de GitHub.</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          {/* searchParams es un dato de la petición: se resuelve dentro de Suspense. */}
          <Suspense fallback={<LoginOptionsSkeleton />}>
            <LoginOptions searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}

async function LoginOptions({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const next = sanitizeNextPath(first(params.next));
  const error = loginErrorMessage(first(params.error));

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
          data-testid="login-error"
        >
          {error}
        </p>
      )}
      <OAuthButtons next={next} />
    </div>
  );
}

function LoginOptionsSkeleton() {
  return (
    <LoadingRegion label="Cargando opciones de inicio de sesión…" className="flex flex-col gap-3">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </LoadingRegion>
  );
}
