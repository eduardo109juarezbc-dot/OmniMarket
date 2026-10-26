import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-semibold text-brand">404</p>
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="max-w-sm text-sm text-muted">La página que buscas no existe o se ha movido.</p>
      <Link href="/dashboard" className={buttonClasses("primary")}>
        Ir al dashboard
      </Link>
    </main>
  );
}
