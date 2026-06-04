import { useState } from "react";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { LockIcon } from "../../components/Icons";
import { api, ApiError } from "../../lib/client";
import type { SafeWebhook } from "../../types";

/**
 * Modal de desbloqueo. Pide el PIN, lo valida contra la API y, si es correcto,
 * entrega el JWT y el webhook al padre vía `onUnlocked`.
 */
export function UnlockModal({
  token,
  open,
  onUnlocked,
}: {
  token: string;
  open: boolean;
  onUnlocked: (jwt: string, webhook: SafeWebhook) => void;
}) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.unlock(token, pin);
      onUnlocked(res.token, res.webhook);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo desbloquear.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => { /* obligatorio: sin PIN no hay acceso */ }} title="Webhook protegido">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-slate-400">
          Introduce el PIN de este webhook para ver su historial en tiempo real.
        </p>
        <div className="relative">
          <LockIcon
            width={16}
            height={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="PIN"
            maxLength={8}
            className="w-full bg-ink-850 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder:text-slate-500 font-mono tracking-widest focusable"
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Button type="submit" disabled={loading || pin.length < 4} className="w-full">
          {loading ? "Verificando…" : "Desbloquear"}
        </Button>
      </form>
    </Modal>
  );
}
