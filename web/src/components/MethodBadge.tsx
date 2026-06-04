import { Badge } from "./Badge";
import { methodClasses, statusClasses } from "../lib/format";

export function MethodBadge({ method }: { method: string }) {
  return <Badge className={methodClasses(method)}>{method.toUpperCase()}</Badge>;
}

export function StatusBadge({ status }: { status: number }) {
  return <Badge className={statusClasses(status)}>{status}</Badge>;
}
