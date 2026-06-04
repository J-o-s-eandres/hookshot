import { useState } from "react";
import { CopyIcon, CheckIcon } from "./Icons";

/** Botón que copia texto al portapapeles y muestra confirmación efímera. */
export function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* sin acceso al portapapeles */
      }
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-all focusable rounded-md px-2 py-1 ${className}`}
      title="Copiar"
    >
      {copied ? (
        <CheckIcon width={14} height={14} className="text-emerald-400 scale-110 transition-transform" />
      ) : (
        <CopyIcon width={14} height={14} />
      )}
      {label && <span className={copied ? "text-emerald-400" : ""}>{copied ? "Copiado" : label}</span>}
    </button>
  );
}
