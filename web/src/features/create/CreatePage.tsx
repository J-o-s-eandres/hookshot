import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/Layout";
import { Button } from "../../components/Button";
import { CopyButton } from "../../components/CopyButton";
import { BoltIcon, CheckIcon, LockIcon } from "../../components/Icons";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/client";
import { setStoredToken } from "../../lib/store";
import type { SafeWebhook } from "../../types";

/** URL pública de ingesta de un webhook. */
function ingestUrl(token: string): string {
  return `${window.location.origin}/h/${token}`;
}

export function CreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<SafeWebhook | null>(null);
  const [sendingPing, setSendingPing] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      toast.show("El PIN debe tener entre 4 y 8 dígitos.", "error");
      return;
    }
    setLoading(true);
    try {
      const { token: jwt, webhook } = await api.createWebhook({
        name: name.trim() || undefined,
        pin,
      });
      setStoredToken(webhook.token, jwt);
      setCreated(webhook);
      toast.show("Webhook creado. Ya tienes sesión iniciada.", "success");
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : "Error al crear.", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendTestPing = async () => {
    if (!created) return;
    setSendingPing(true);
    try {
      await fetch(`/h/${created.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "test", message: "¡Hola HookShot!" }),
      });
      navigate(`/w/${created.token}`);
    } catch {
      toast.show("No se pudo enviar el ping de prueba.", "error");
      setSendingPing(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-brand-300 bg-brand-500/10 ring-1 ring-inset ring-brand-500/30 rounded-full px-3 py-1">
            <BoltIcon width={14} height={14} /> Tiempo real · SSE · PIN + JWT
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Inspecciona webhooks <span className="text-brand-400">al instante</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Crea una URL única, recibe cualquier petición HTTP y obsérvala en vivo.
            Configura la respuesta, protégela con un PIN y depura sin fricción.
          </p>
        </div>

        {/* Tarjeta de creación / resultado */}
        <div className="mt-12 max-w-xl mx-auto">
          {!created ? (
            <form onSubmit={submit} className="panel p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nombre <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p. ej. Pagos Stripe (sandbox)"
                  maxLength={80}
                  className="w-full bg-ink-850 border border-white/10 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focusable"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  PIN de acceso <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <LockIcon
                    width={16}
                    height={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="4 a 8 dígitos"
                    maxLength={8}
                    className="w-full bg-ink-850 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder:text-slate-500 font-mono tracking-widest focusable"
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  Necesitarás este PIN para ver el historial del webhook.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creando…" : "Crear webhook"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-0 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckIcon width={14} height={14} />
                  <span>Creado</span>
                </div>
                <span className="w-6 h-px mx-1.5 bg-emerald-500/50" />
                <div className={`flex items-center gap-1.5 ${sendingPing ? "text-brand-400" : "text-slate-400"}`}>
                  <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
                  <span>Enviar test</span>
                </div>
                <span className="w-6 h-px mx-1.5 bg-white/10" />
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
                  <span>Inspeccionar</span>
                </div>
              </div>

              <div className="panel p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    ¡Tu webhook está listo!
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Envía cualquier petición a esta URL y aparecerá en el inspector.
                  </p>
                </div>

                <div>
                  <span className="block text-xs uppercase tracking-wide text-slate-500 mb-2">
                    URL de ingesta
                  </span>
                  <div className="flex items-center gap-2 bg-ink-850 border border-white/10 rounded-xl px-4 py-3">
                    <code className="code flex-1 truncate text-brand-200">
                      {ingestUrl(created.token)}
                    </code>
                    <CopyButton value={ingestUrl(created.token)} />
                  </div>
                </div>

                <div>
                  <span className="block text-xs uppercase tracking-wide text-slate-500 mb-2">
                    Probar con curl
                  </span>
                  <div className="bg-ink-850 border border-white/10 rounded-xl overflow-hidden">
                    <pre className="code text-sm text-slate-200 px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">{`curl -X POST ${ingestUrl(created.token)} \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"test","message":"hello"}'`}</pre>
                    <div className="px-4 py-2 border-t border-white/5 flex justify-end">
                      <CopyButton
                        value={`curl -X POST ${ingestUrl(created.token)} -H "Content-Type: application/json" -d '{"event":"test","message":"hello"}'`}
                        label="Copiar curl"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={sendTestPing}
                  disabled={sendingPing}
                  className="w-full"
                >
                  {sendingPing ? "Enviando…" : "🚀 Enviar ping de prueba"}
                </Button>

                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-200">
                  Guarda tu PIN en un lugar seguro: no se puede recuperar y es la
                  única forma de ver el historial.
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => navigate(`/w/${created.token}`)}
                  >
                    Abrir inspector
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setCreated(null);
                      setName("");
                      setPin("");
                    }}
                  >
                    Crear otro
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
