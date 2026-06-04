/**
 * Utilidades de formato para la UI.
 */

/** Formatea bytes en una unidad legible. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/** Hora local corta (HH:MM:SS). */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Fecha + hora legible. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Tiempo relativo aproximado ("hace 3 s", "hace 5 min"). */
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

/**
 * Intenta formatear un cuerpo como JSON indentado.
 * Si no es JSON válido, devuelve el texto tal cual.
 */
export function prettyMaybeJson(body: string): { text: string; isJson: boolean } {
  const trimmed = body.trim();
  if (!trimmed) return { text: "", isJson: false };
  if (trimmed[0] !== "{" && trimmed[0] !== "[") return { text: body, isJson: false };
  try {
    return { text: JSON.stringify(JSON.parse(trimmed), null, 2), isJson: true };
  } catch {
    return { text: body, isJson: false };
  }
}

/** Color de marca por método HTTP (clases Tailwind). */
export function methodClasses(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30";
    case "POST":
      return "text-sky-300 bg-sky-500/10 ring-sky-500/30";
    case "PUT":
      return "text-amber-300 bg-amber-500/10 ring-amber-500/30";
    case "PATCH":
      return "text-violet-300 bg-violet-500/10 ring-violet-500/30";
    case "DELETE":
      return "text-rose-300 bg-rose-500/10 ring-rose-500/30";
    default:
      return "text-slate-300 bg-slate-500/10 ring-slate-500/30";
  }
}

/** Color del badge de status HTTP. */
export function statusClasses(status: number): string {
  if (status < 300) return "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30";
  if (status < 400) return "text-sky-300 bg-sky-500/10 ring-sky-500/30";
  if (status < 500) return "text-amber-300 bg-amber-500/10 ring-amber-500/30";
  return "text-rose-300 bg-rose-500/10 ring-rose-500/30";
}
