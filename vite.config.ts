<<<<<<< HEAD
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { spawn } from 'child_process';
=======
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "path";
import { defineConfig, loadEnv } from "vite";
>>>>>>> nitro

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "18" }]],
        },
<<<<<<< HEAD
      }), 
      tailwindcss(),
      {
        name: 'nitro-dev',
        configureServer(server) {
          console.log('[Vite Nitro] Starting Nitro dev on port 3001...');
          const nitroProc = spawn('npx', ['-y', 'nitropack', 'dev', '--port', '3001'], {
            stdio: 'inherit',
            shell: true
          });
          server.httpServer?.on('close', () => nitroProc.kill());
          process.on('exit', () => nitroProc.kill());
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': 'http://localhost:3001'
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
=======
      }),
      tailwindcss(),
      nitro(),
    ],
    
    // resolve: {
    //   alias: {
    //     "@": path.resolve(__dirname, "."),
    //   },
    // },
>>>>>>> nitro
  };
});
