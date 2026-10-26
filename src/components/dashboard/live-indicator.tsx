import type { LiveStatus } from "@/hooks/use-realtime-orders";
import { cn } from "@/lib/cn";

const LABELS: Record<LiveStatus, string> = {
  connecting: "Conectando…",
  live: "En vivo",
  polling: "Actualización cada 15 s",
};

/** Estado de la actualización en tiempo real. role="status" lo anuncia al cambiar. */
export function LiveIndicator({ status }: { status: LiveStatus }) {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted"
      data-testid="live-indicator"
      data-status={status}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          status === "live" && "bg-success",
          status === "polling" && "bg-warning",
          status === "connecting" && "animate-pulse bg-skeleton",
        )}
      />
      {LABELS[status]}
    </span>
  );
}
