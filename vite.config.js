// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000", // ← 백엔드 주소로 바꿔주세요
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
