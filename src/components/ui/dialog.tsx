"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Botones de acción, alineados a la derecha. */
  footer?: ReactNode;
  className?: string;
};

/**
 * Diálogo modal basado en <dialog> nativo: el navegador gestiona el foco
 * atrapado, la tecla Escape y el fondo inerte.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();

    // Con Cache Components, las rutas ocultas conservan el estado pero limpian
    // sus efectos: cerrar aquí evita un modal huérfano al navegar.
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Escape dispara "cancel"; se delega en el estado del padre.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Clic en el fondo (el propio <dialog>, fuera del panel) cierra el diálogo.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-full max-w-lg rounded-lg border border-line bg-surface p-0 text-ink shadow-xl",
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-4 p-6">
          <header className="flex flex-col gap-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="text-sm text-muted">
                {description}
              </p>
            )}
          </header>
          <div>{children}</div>
          {footer && <footer className="flex justify-end gap-2">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
