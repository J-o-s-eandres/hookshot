import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, el frontend corre en :5173 y el backend en :3000.
// Proxyeamos `/api` y `/h` al backend para evitar problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
      "/h": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
