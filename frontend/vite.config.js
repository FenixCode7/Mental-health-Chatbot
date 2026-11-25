import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all network interfaces so phones on the same Wi-Fi can open it.
    host: true,
    // Forward /api calls to the FastAPI backend during development.
    proxy: { "/api": "http://localhost:8000" },
  },
});
