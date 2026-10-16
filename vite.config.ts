import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  // The Workers plugin starts its own dev server, which collides with Vitest's.
  plugins: process.env.VITEST ? [] : [cloudflare()],
});
