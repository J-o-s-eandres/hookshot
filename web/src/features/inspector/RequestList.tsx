import type { CapturedRequest } from "../../types";
import { MethodBadge } from "../../components/MethodBadge";
import { formatBytes, formatRelative } from "../../lib/format";

/**
 * Lista de peticiones (columna izquierda del inspector).
 * Resalta la seleccionada; las recién llegadas entran con animación.
 */
export function RequestList({
  requests,
  selectedId,
  onSelect,
  liveIds,
  ingestUrl,
}: {
  requests: CapturedRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  liveIds: Set<string>;
  ingestUrl?: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="h-full grid place-items-center p-8 text-center">
        <div className="max-w-xs">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-700/10 grid place-items-center mb-4 ring-1 ring-inset ring-brand-500/20">
            <span className="w-3 h-3 rounded-full bg-brand-500 animate-pulse-slow shadow-glow" />
          </div>
          <p className="text-slate-200 font-medium">A la espera de peticiones</p>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Las peticiones que lleguen a tu URL aparecerán aquí en tiempo real.
          </p>
          {ingestUrl && (
            <>
              <div className="mt-4 mb-2 text-[11px] uppercase tracking-wider text-slate-600 font-medium">
                Tu URL de ingesta
              </div>
              <code className="code text-xs text-brand-200 block break-all bg-ink-850 border border-white/5 rounded-xl px-3 py-2">
                {ingestUrl}
              </code>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {requests.map((r) => {
        const active = r.id === selectedId;
        return (
          <li key={r.id}>
            <button
              onClick={() => onSelect(r.id)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors focusable ${
                active ? "bg-brand-500/10" : "hover:bg-white/5"
              } ${liveIds.has(r.id) ? "animate-flash-in" : ""}`}
            >
              <MethodBadge method={r.method} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[13px] text-slate-200 truncate">
                  {r.path}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatRelative(r.createdAt)} · {formatBytes(r.size)}
                </div>
              </div>
              {active && <span className="w-1.5 h-8 rounded-full bg-brand-500" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
