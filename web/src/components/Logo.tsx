import { Link } from "react-router-dom";
import { HookIcon } from "./Icons";

/** Marca de HookShot: icono en gradiente + wordmark. */
export function Logo({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 group focusable rounded-lg">
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow">
        <HookIcon width={20} height={20} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">
        Hook<span className="text-brand-400">Shot</span>
      </span>
    </Link>
  );
}
