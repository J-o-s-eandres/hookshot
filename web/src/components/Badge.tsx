import type { ReactNode } from "react";

/** Pastilla monoespaciada con anillo de color (usada por método y status). */
export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center font-mono text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}
