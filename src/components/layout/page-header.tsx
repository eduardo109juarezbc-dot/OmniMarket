import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/** Marcador temporal para secciones que se implementan en tareas posteriores. */
export function ComingSoon({ task }: { task: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
      Esta sección se implementa en la {task} del plan.
    </div>
  );
}
