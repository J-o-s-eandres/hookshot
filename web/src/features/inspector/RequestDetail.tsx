import { useMemo, useState } from "react";
import type { CapturedRequest } from "../../types";
import { MethodBadge } from "../../components/MethodBadge";
import { CopyButton } from "../../components/CopyButton";
import { Button } from "../../components/Button";
import { TrashIcon } from "../../components/Icons";
import {
  formatBytes,
  formatRelative,
  formatDateTime,
  prettyMaybeJson,
} from "../../lib/format";

type Tab = "body" | "headers" | "query";

/** Panel de detalle de una petición (columna derecha del inspector). */
export function RequestDetail({
  request,
  onDelete,
}: {
  request: CapturedRequest;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("body");

  const pretty = useMemo(() => prettyMaybeJson(request.body), [request.body]);
  const headerEntries = Object.entries(request.headers);
  const queryEntries = Object.entries(request.query);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", count: headerEntries.length },
    { id: "query", label: "Query", count: queryEntries.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Cabecera del detalle */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <MethodBadge method={request.method} />
              <code className="code text-slate-200 truncate">{request.path}</code>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span title={formatDateTime(request.createdAt)}>{formatRelative(request.createdAt)}</span>
              {request.ip && <span>IP {request.ip}</span>}
              <span>{formatBytes(request.size)}</span>
              {request.contentType && (
                <span className="truncate max-w-[16rem]">{request.contentType}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(request.id)}
              title="Borrar petición"
              className="text-slate-400 hover:text-rose-300"
            >
              <TrashIcon width={16} height={16} />
            </Button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="mt-4 flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors focusable ${
                tab === t.id
                  ? "bg-ink-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 text-xs text-slate-500">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña */}
      <div className="flex-1 min-h-0 overflow-auto p-5">
        {tab === "body" && <BodyView pretty={pretty} raw={request.body} />}
        {tab === "headers" && <KeyValueTable entries={headerEntries} />}
        {tab === "query" && (
          <KeyValueTable
            entries={queryEntries.map(([k, v]) => [k, String(v)])}
            empty="Sin parámetros de query."
          />
        )}

      </div>

    </div>
  );
}

const TRUNCATION_WARN = 100 * 1024; // 100 KB

function BodyView({
  pretty,
  raw,
}: {
  pretty: { text: string; isJson: boolean };
  raw: string;
}) {
  if (!raw) {
    return <p className="text-sm text-slate-500">Esta petición no tiene cuerpo.</p>;
  }
  const truncated = raw.length >= TRUNCATION_WARN;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-slate-500">
          {pretty.isJson ? "JSON" : "Texto plano"}
          {truncated && (
            <span className="ml-2 text-amber-400 font-semibold">
              · Truncado (&gt;{formatBytes(TRUNCATION_WARN)})
            </span>
          )}
        </span>
        <CopyButton value={raw} label="Copiar" />
      </div>
      <pre className="code bg-ink-950/60 border border-white/5 rounded-xl p-4 overflow-auto whitespace-pre-wrap break-words text-slate-200 max-h-[60vh]">
        {pretty.text}
      </pre>
    </div>
  );
}

function KeyValueTable({
  entries,
  empty = "Sin datos.",
}: {
  entries: [string, string][];
  empty?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">{empty}</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/5">
          {entries.map(([k, v]) => (
            <tr key={k} className="align-top">
              <td className="px-4 py-2.5 font-mono text-xs text-brand-200 w-1/3 break-words">
                {k}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-300 break-words">
                {v}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
