import type { BadgeTone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/domain";

/** Color de cada estado: insignias (tono) y gráficos (hex con contraste AA sobre blanco). */
export const STATUS_STYLE: Record<OrderStatus, { tone: BadgeTone; color: string }> = {
  PENDING: { tone: "warning", color: "#a16207" },
  PROCESSING: { tone: "brand", color: "#4338ca" },
  PACKED: { tone: "neutral", color: "#4b5563" },
  SHIPPED: { tone: "brand", color: "#0369a1" },
  DELIVERED: { tone: "success", color: "#15803d" },
  CANCELLED: { tone: "danger", color: "#b91c1c" },
};
