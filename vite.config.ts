import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  envPrefix: ["NEXT_PUBLIC_"],
  plugins: [react()],
});
