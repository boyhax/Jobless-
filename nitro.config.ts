<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { defineNitroConfig } from "nitropack/config";

export default defineNitroConfig({
  compatibilityDate: "2024-04-03",
  srcDir: "server",
=======
import { defineNitroConfig } from 'nitro/config';
=======
import { defineConfig } from "nitro";
>>>>>>> 1abeaa1 (Refactor API interactions and enhance error handling)
=======
import { defineConfig } from "nitro";
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c

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
<<<<<<< HEAD
>>>>>>> d322979 (feat: Implement SurrealDB adapter and connection management)
=======
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c
});
