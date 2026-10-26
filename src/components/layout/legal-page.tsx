import Link from "next/link";
import type { ReactNode } from "react";

/** Plantilla de las páginas públicas legales (requeridas por Google para publicar la app OAuth). */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/login" className="text-sm font-medium text-brand hover:underline">
        ← OmniMarket · Operations Hub
      </Link>
      <article className="mt-6 flex flex-col gap-4 text-sm leading-6 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted">Última actualización: {updated}</p>
        {children}
      </article>
    </main>
  );
}
