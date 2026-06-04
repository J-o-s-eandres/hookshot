import type { ReactNode } from "react";
import { Logo } from "./Logo";

/** Cabecera fija + contenedor de la página. */
export function Layout({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
