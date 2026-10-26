import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/domain";
import { STATUS_STYLE } from "./status-style";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={STATUS_STYLE[status].tone} data-status={status}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
