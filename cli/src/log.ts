/** Logging con colores ANSI (sin dependencias). */
const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const sym = {
  ok: "\u2713",
  err: "\u2717",
};

function hhmmss(): string {
  return new Date().toTimeString().slice(0, 8);
}

export const log = {
  banner(server: string, token: string, target: string): void {
    console.log(c.bold("HookShot · túnel local"));
    console.log(
      `  Reenviando  ${c.cyan(`${server}/h/${token}`)}  \u2192  ${c.cyan(target)}`,
    );
    console.log(
      c.dim("  Conectado. Esperando peticiones (Ctrl+C para salir)\u2026\n"),
    );
  },
  forwarded(method: string, path: string, status: number | null, ms: number): void {
    const code =
      status === null
        ? c.red("ERR")
        : status < 400
          ? c.green(String(status))
          : c.red(String(status));
    console.log(
      `${c.dim(hhmmss())}  ${method.padEnd(5)} ${path}  \u2192 ${code}  ${c.dim(`${ms}ms`)}`,
    );
  },
  info(msg: string): void {
    console.log(c.dim(msg));
  },
  error(msg: string): void {
    console.error(c.red(`${sym.err} ${msg}`));
  },
  success(msg: string): void {
    console.log(c.green(`${sym.ok} ${msg}`));
  },
  highlight(msg: string): string {
    return c.cyan(c.bold(msg));
  },
  bold(msg: string): string {
    return c.bold(msg);
  },
};
