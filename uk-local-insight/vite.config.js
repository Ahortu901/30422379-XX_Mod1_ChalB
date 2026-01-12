import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ea": {
        target: "https://environment.data.gov.uk",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ea/, ""),
      },
    },
  },
});
