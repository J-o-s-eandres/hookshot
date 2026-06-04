import type { Config } from "tailwindcss";

/**
 * Sistema de diseño de HookShot.
 *
 * Estética: herramienta de desarrolladores en modo oscuro (referencias:
 * Linear / Vercel / Railway). Fondo profundo, paneles elevados sutiles,
 * acento violeta-índigo y una escala de color por método HTTP.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Acento de marca.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        // Superficies (más oscuro = más al fondo).
        ink: {
          950: "#0a0b10",
          900: "#0f111a",
          850: "#141725",
          800: "#1a1e2e",
          700: "#252a3d",
          600: "#333a52",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,0.25), 0 8px 30px -8px rgba(99,102,241,0.35)",
      },
      keyframes: {
        "flash-in": {
          "0%": { backgroundColor: "rgba(99,102,241,0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "flash-in": "flash-in 1.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "pulse-slow": "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
