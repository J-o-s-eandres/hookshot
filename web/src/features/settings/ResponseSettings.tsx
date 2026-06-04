import { useState } from "react";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { TrashIcon } from "../../components/Icons";
import { api, ApiError } from "../../lib/client";
import { useToast } from "../../components/Toast";
import type { ResponseConfig, SafeWebhook } from "../../types";

/**
 * Editor de la respuesta personalizada que HookShot devuelve al emisor:
 * status, content-type, cabeceras extra y cuerpo.
 */
export function ResponseSettings({
  open,
  onClose,
  token,
  jwt,
  webhook,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  jwt: string;
  webhook: SafeWebhook;
  onSaved: (w: SafeWebhook) => void;
}) {
  const toast = useToast();
  const [status, setStatus] = useState(webhook.response.status);
  const [contentType, setContentType] = useState(webhook.response.contentType);
  const [body, setBody] = useState(webhook.response.body);
  const [headers, setHeaders] = useState<[string, string][]>(
    Object.entries(webhook.response.headers),
  );
  const [saving, setSaving] = useState(false);

  const setHeader = (i: number, idx: 0 | 1, value: string) => {
    setHeaders((h) => h.map((row, j) => (j === i ? (idx === 0 ? [value, row[1]] : [row[0], value]) : row)));
  };
  const addHeader = () => setHeaders((h) => [...h, ["", ""]]);
  const removeHeader = (i: number) => setHeaders((h) => h.filter((_, j) => j !== i));

  const save = async () => {
    setSaving(true);
    try {
      const headerObj: Record<string, string> = {};
      for (const [k, v] of headers) {
        if (k.trim()) headerObj[k.trim()] = v;
      }
      const payload: ResponseConfig = {
        status,
        contentType: contentType.trim() || "application/json",
        headers: headerObj,
        body,
      };
      const { webhook: updated } = await api.updateResponse(token, jwt, payload);
      onSaved(updated);
      toast.show("Respuesta actualizada.", "success");
      onClose();
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Error al guardar.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Respuesta personalizada">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Status HTTP
            </label>
            <input
              type="number"
              min={100}
              max={599}
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
              className="w-full bg-ink-850 border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono focusable"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Content-Type
            </label>
            <input
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full bg-ink-850 border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focusable"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-slate-300">
              Cabeceras extra
            </label>
            <button
              onClick={addHeader}
              className="text-xs text-brand-300 hover:text-brand-200 focusable rounded px-1"
            >
              + Añadir
            </button>
          </div>
          <div className="space-y-2">
            {headers.length === 0 && (
              <p className="text-xs text-slate-500">Sin cabeceras extra.</p>
            )}
            {headers.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row[0]}
                  onChange={(e) => setHeader(i, 0, e.target.value)}
                  placeholder="Nombre"
                  className="flex-1 bg-ink-850 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-mono focusable"
                />
                <input
                  value={row[1]}
                  onChange={(e) => setHeader(i, 1, e.target.value)}
                  placeholder="Valor"
                  className="flex-1 bg-ink-850 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm font-mono focusable"
                />
                <button
                  onClick={() => removeHeader(i)}
                  className="text-slate-500 hover:text-rose-300 p-1 focusable rounded"
                  title="Quitar"
                >
                  <TrashIcon width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Cuerpo de la respuesta
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            className="w-full bg-ink-850 border border-white/10 rounded-xl px-3 py-2 text-slate-100 font-mono text-sm focusable resize-y"
          />
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
