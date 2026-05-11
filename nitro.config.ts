<<<<<<< HEAD
import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  compatibilityDate: "2024-04-03",
  srcDir: "server",
=======
import { defineConfig } from "nitro";

export default defineConfig({
  preset: "cloudflare-module",
  serverDir: "server",
  publicAssets: [
    {
      dir: "dist",
      maxAge: 60 * 60 * 24 * 365,
      baseURL: "/",
    },
  ],
>>>>>>> nitro
});
