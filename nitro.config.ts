import { defineNitroConfig } from 'nitro/config';

export default defineNitroConfig({
  preset: 'vercel',
  serverDir: 'server',
  publicAssets: [
    {
      dir: 'dist',
      maxAge: 60 * 60 * 24 * 365,
      baseURL: '/',
    },
  ],
});
