import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Button } from "../../components/Button";
import { CopyButton } from "../../components/CopyButton";
import { ArrowLeftIcon, SearchIcon, SettingsIcon, TrashIcon } from "../../components/Icons";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/client";
import { getStoredToken, setStoredToken, clearStoredToken } from "../../lib/store";
import { subscribeToWebhook } from "../../lib/sse";
import type {
  CapturedRequest,
  SafeWebhook,
} from "../../types";
import { RequestList } from "./RequestList";
import { RequestDetail } from "./RequestDetail";
import { UnlockModal } from "../unlock/UnlockModal";
import { ResponseSettings } from "../settings/ResponseSettings";


const MAX_IN_MEMORY = 500; // tope de filas que mantenemos en el cliente

export function InspectorPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [jwt, setJwt] = useState<string | null>(() => getStoredToken(token));
  const [webhook, setWebhook] = useState<SafeWebhook | null>(null);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [connected, setConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const liveTimers = useRef<Map<string, number>>(new Map());
  const pulseTimer = useRef<number>();
  const [liveIds, setLiveIds] = useState<Set<string>>(new Set());
  const [liveCount, setLiveCount] = useState(0);
  const [badgePulse, setBadgePulse] = useState(false);

  const ingestUrl = `${window.location.origin}/h/${token}`;

  // Marca una petición como "recién llegada" para la animación de entrada.
  const [hasMore, setHasMore] = useState(true);

  // Refetch requests when filter or method change (server-side search).
  const searchParams = useMemo(() => {
    const p: { limit?: number; q?: string; method?: string } = {};
    const trimmed = filter.trim();
    if (trimmed) p.q = trimmed;
    if (methodFilter) p.method = methodFilter;
    return p;
  }, [filter, methodFilter]);

  // Carga más peticiones (paginación).
  const loadMore = useCallback(async () => {
    if (!jwt || requests.length === 0) return;
    setLoadingMore(true);
    try {
      const last = requests[requests.length - 1];
      if (!last) return;
      const res = await api.listRequests(token, jwt, { limit: 100, before: last.createdAt, ...searchParams });
      setRequests((prev) => [...prev, ...res.requests]);
      if (res.requests.length < 100) setHasMore(false);
    } catch {
      toast.show("No se pudieron cargar más peticiones.", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [jwt, requests, token, toast, searchParams]);

  const markLive = useCallback((id: string) => {
    setLiveIds((s) => new Set(s).add(id));
    const handle = window.setTimeout(() => {
      setLiveIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
      liveTimers.current.delete(id);
    }, 1300);
    liveTimers.current.set(id, handle);
  }, []);

  // Sesión inválida: limpiamos el JWT para volver a pedir el PIN.
  const invalidateSession = useCallback(() => {
    clearStoredToken(token);
    setJwt(null);
    setWebhook(null);
  }, [token]);

  // Carga inicial del historial cuando tenemos JWT.
  useEffect(() => {
    if (!jwt) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listRequests(token, jwt, { limit: 100, ...searchParams });
        if (cancelled) return;
        setWebhook(res.webhook);
        setRequests(res.requests);
        setHasMore(res.requests.length >= 100);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          invalidateSession();
          toast.show("Tu sesión expiró. Vuelve a introducir el PIN.", "info");
        } else {
          setLoadError(err instanceof ApiError ? err.message : "Error de conexión");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jwt, token, invalidateSession, toast, fetchKey, searchParams]);

  // Suscripción SSE en vivo.
  useEffect(() => {
    if (!jwt || !webhook) return;
    const sub = subscribeToWebhook(token, jwt, {
      onOpen: () => {
        setConnected(true);
        setLiveCount(0);
      },
      onError: () => setConnected(false),
      onUnauthorized: () => {
        invalidateSession();
        toast.show("Sesión expirada. Vuelve a introducir el PIN.", "info");
      },
      onRequest: (req) => {
        markLive(req.id);
        setRequests((prev) => [req, ...prev].slice(0, MAX_IN_MEMORY));
        setLiveCount((c) => c + 1);
        setBadgePulse(true);
        clearTimeout(pulseTimer.current);
        pulseTimer.current = window.setTimeout(() => setBadgePulse(false), 800);
      },
    });
    return () => sub.close();
  }, [jwt, webhook, token, markLive, invalidateSession, toast]);

  const onUnlocked = useCallback(
    (newJwt: string, wh: SafeWebhook) => {
      setStoredToken(token, newJwt);
      setWebhook(wh);
      setJwt(newJwt);
    },
    [token],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!jwt) return;
      try {
        await api.deleteRequest(token, jwt, id);
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setSelectedId((cur) => (cur === id ? null : cur));
      } catch {
        toast.show("No se pudo borrar la petición.", "error");
      }
    },
    [jwt, token, toast],
  );

  const handleRename = useCallback(async () => {
    if (!jwt || !webhook) return;
    const name = window.prompt("Nombre del webhook:", webhook.name ?? "");
    if (name === null) return;
    try {
      const { webhook: updated } = await api.renameWebhook(token, jwt, name);
      setWebhook(updated);
      toast.show("Nombre actualizado.", "success");
    } catch {
      toast.show("No se pudo actualizar el nombre.", "error");
    }
  }, [jwt, webhook, token, toast]);

  const handleDeleteWebhook = useCallback(async () => {
    if (!jwt) return;
    if (!window.confirm("¿Eliminar este webhook para siempre? También se borrarán todas las peticiones.")) return;
    try {
      await api.deleteWebhook(token, jwt);
      clearStoredToken(token);
      navigate("/");
      toast.show("Webhook eliminado.", "success");
    } catch {
      toast.show("No se pudo eliminar el webhook.", "error");
    }
  }, [jwt, token, navigate, toast]);

  const handleClear = useCallback(async () => {
    if (!jwt) return;
    if (!window.confirm("¿Borrar TODAS las peticiones de este webhook?")) return;
    try {
      await api.clearRequests(token, jwt);
      setRequests([]);
      setSelectedId(null);
      toast.show("Historial vaciado.", "success");
    } catch {
      toast.show("No se pudo vaciar el historial.", "error");
    }
  }, [jwt, token, toast]);

  // Filtro local (instantáneo) combinado con el filtro del servidor.
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const m = methodFilter.toUpperCase();
    return requests.filter((r) => {
      if (m && r.method.toUpperCase() !== m) return false;
      if (q && !r.method.toLowerCase().includes(q) && !r.path.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [requests, filter, methodFilter]);

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  // Carga inicial del historial (refetch tras error).
  const retry = useCallback(() => {
    setLoadError(null);
    setFetchKey((k) => k + 1);
  }, []);

  // Error de carga (no es 401, es un error de red/server).
  if (loadError) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <p className="text-rose-300 font-medium">Error al cargar el historial</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{loadError}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={retry}>
            Reintentar
          </Button>
        </div>
      </Layout>
    );
  }

  // Sin JWT → modal de desbloqueo (bloqueante).
  if (!jwt) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 py-20 text-center text-slate-500">
          Este webhook está protegido por PIN.
        </div>
        <UnlockModal token={token} open onUnlocked={onUnlocked} />
      </Layout>
    );
  }

  return (
    <Layout
      right={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 ring-inset transition-all ${
              connected
                ? "text-emerald-300 ring-emerald-500/30 bg-emerald-500/10"
                : "text-slate-400 ring-white/10"
            } ${badgePulse ? "!ring-brand-400 !ring-2" : ""}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-emerald-400 animate-pulse-slow" : "bg-slate-500"
              }`}
            />
            {connected
              ? liveCount > 0
                ? `+${liveCount}`
                : "En vivo"
              : "Desconectado"}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(true)} title="Respuesta personalizada">
            <SettingsIcon width={16} height={16} />
            <span className="hidden sm:inline">Respuesta</span>
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 h-[calc(100vh-4rem)] flex flex-col">
        {/* Barra de la URL + acciones */}
        <div className="panel px-4 py-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <button onClick={handleRename} className="block text-[11px] uppercase tracking-wide text-slate-500 hover:text-slate-300 focusable rounded" title="Cambiar nombre">
              {webhook?.name || "URL de ingesta"}
            </button>
            <div className="flex items-center gap-2">
              <code className="code text-brand-200 truncate">{ingestUrl}</code>
              <CopyButton value={ingestUrl} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {requests.length} petición{requests.length === 1 ? "" : "es"}
            </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-slate-400 hover:text-rose-300"
                disabled={requests.length === 0}
                title="Vaciar historial de peticiones"
              >
                <TrashIcon width={16} height={16} />
                <span className="hidden sm:inline">Vaciar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteWebhook}
                className="text-slate-500 hover:text-rose-300"
                title="Eliminar webhook para siempre"
              >
                Eliminar
              </Button>
          </div>
        </div>

        {/* Master-detail */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-4">
          {/* Lista */}
          <div
            className={`panel flex flex-col min-h-0 ${
              selected ? "hidden lg:flex" : "flex"
            }`}
          >
            <div className="p-3 border-b border-white/5 space-y-2.5">
              <div className="relative">
                <SearchIcon
                  width={16}
                  height={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Buscar por ruta…"
                  className="w-full bg-ink-850 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focusable"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["", "GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <button
                    key={m || "all"}
                    onClick={() => setMethodFilter(methodFilter === m ? "" : m)}
                    className={`text-xs px-2 py-1 rounded-md font-medium transition-all ${
                      (methodFilter || "") === m
                        ? "bg-brand-500/20 text-brand-300 ring-1 ring-inset ring-brand-500/40"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {m || "Todas"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <RequestList
                requests={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                liveIds={liveIds}
                ingestUrl={ingestUrl}
              />
              {hasMore && (
                <div className="p-3 border-t border-white/5 text-center">
                  <Button variant="ghost" size="sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Cargando…" : "Cargar más"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Detalle */}
          <div
            className={`panel min-h-0 ${selected ? "flex flex-col" : "hidden lg:flex"}`}
          >
            {selected ? (
              <>
                {/* Volver (solo móvil) */}
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 px-4 pt-3 focusable"
                >
                  <ArrowLeftIcon width={16} height={16} /> Volver a la lista
                </button>
                <RequestDetail
                  request={selected}
                  onDelete={handleDelete}
                />
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-center p-8">
                <div>
                  <p className="text-slate-300 font-medium">
                    Selecciona una petición
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Verás aquí sus cabeceras, query y cuerpo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {webhook && (
        <ResponseSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          token={token}
          jwt={jwt}
          webhook={webhook}
          onSaved={setWebhook}
        />
      )}


    </Layout>
  );
}


