import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Button } from "../../components/Button";
import { CopyButton } from "../../components/CopyButton";
import { ArrowLeftIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/client";
import { getSessionId } from "../../lib/store";
import type { SessionWebhook } from "../../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [webhooks, setWebhooks] = useState<SessionWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const sessionId = getSessionId();
  const maxWebhooks = 10;
  const webhookCount = webhooks.length;
  const remaining = maxWebhooks - webhookCount;

  // Cargar webhooks de la sesión
  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.listSessionWebhooks(sessionId);
        setWebhooks(res.webhooks || []);
        setError(null);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al cargar webhooks";
        setError(message);
        toast.show(message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [sessionId, toast]);

  // Eliminar webhook
  const handleDelete = useCallback(
    async (token: string) => {
      if (!window.confirm("¿Eliminar este webhook y todas sus peticiones?")) return;
      setDeleting(token);
      try {
        await api.deleteWebhook(token, "");
        setWebhooks((prev) => prev.filter((w) => w.token !== token));
        toast.show("Webhook eliminado.", "success");
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "No se pudo eliminar";
        toast.show(message, "error");
      } finally {
        setDeleting(null);
      }
    },
    [toast]
  );

  // Navegar al inspector
  const goToInspector = (token: string) => {
    navigate(`/w/${token}`);
  };

  // Crear nuevo webhook
  const createNew = () => {
    navigate("/");
  };

  if (loading) {
    return (
      <Layout right={<Button variant="secondary" size="sm" onClick={() => navigate("/")} className="gap-1"><ArrowLeftIcon width={14} height={14} /> Atrás</Button>}>
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="text-center text-slate-400">Cargando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout right={<Button variant="secondary" size="sm" onClick={() => navigate("/")} className="gap-1"><ArrowLeftIcon width={14} height={14} /> Atrás</Button>}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mis webhooks</h1>
            <p className="text-sm text-slate-400 mt-1">
              {webhookCount} de {maxWebhooks} webhooks usados
            </p>
          </div>
          <Button onClick={createNew} disabled={webhookCount >= maxWebhooks}>
            {webhookCount >= maxWebhooks ? "Límite alcanzado" : "+ Crear nuevo"}
          </Button>
        </div>

        {/* Quota bar */}
        <div className="mb-8 p-4 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">Cuota de sesión</span>
            <span className="text-slate-400">{webhookCount}/{maxWebhooks}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
              style={{ width: `${(webhookCount / maxWebhooks) * 100}%` }}
            />
          </div>
          {remaining === 0 && (
            <p className="text-xs text-rose-300 mt-2">⚠️ Has alcanzado el límite. Elimina uno para crear otro.</p>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-900/20 border border-rose-500/30">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {webhookCount === 0 ? (
          <div className="panel p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-2">Sin webhooks aún</h3>
            <p className="text-sm text-slate-400 mb-6">
              Crea tu primer webhook para empezar a capturar peticiones HTTP.
            </p>
            <Button onClick={createNew} size="lg">
              Crear mi primer webhook
            </Button>
          </div>
        ) : (
          /* Webhooks list */
          <div className="space-y-3">
            {webhooks.map((webhook) => {
              const isExpired = webhook.expiresAt
                ? new Date(webhook.expiresAt) < new Date()
                : false;
              const expiresIn = webhook.expiresAt
                ? Math.ceil(
                    (new Date(webhook.expiresAt).getTime() - Date.now()) / 60000
                  )
                : null;

              return (
                <div
                  key={webhook.token}
                  className="panel p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-800/50 transition-colors group"
                >
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => goToInspector(webhook.token)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {webhook.name && (
                        <h3 className="font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                          {webhook.name}
                        </h3>
                      )}
                      {webhook.hasPin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-300">
                          🔐 Protegido
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300">
                          Expirado
                        </span>
                      )}
                      {!isExpired && expiresIn !== null && expiresIn < 10 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 ring-1 ring-amber-500/30 text-amber-300">
                          Expira en {expiresIn}m
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="code text-xs text-slate-400 truncate">
                        {webhook.token}
                      </code>
                      <CopyButton
                        value={`${window.location.origin}/h/${webhook.token}`}
                        size="sm"
                        title="Copiar URL"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Creado {new Date(webhook.createdAt).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => goToInspector(webhook.token)}
                      className="flex-1 sm:flex-none"
                    >
                      Inspector
                    </Button>
                    <button
                      onClick={() => handleDelete(webhook.token)}
                      disabled={deleting === webhook.token}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors focusable disabled:opacity-50"
                      title="Eliminar webhook"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
