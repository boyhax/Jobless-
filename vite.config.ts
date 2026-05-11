<<<<<<< HEAD
<<<<<<< HEAD
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { spawn } from 'child_process';
=======
=======
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import path from "path";
import { defineConfig, loadEnv } from "vite";
<<<<<<< HEAD
>>>>>>> 1abeaa1 (Refactor API interactions and enhance error handling)
=======
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", { target: "18" }]],
        },
<<<<<<< HEAD
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
=======
      }),
      tailwindcss(),
      nitro(),
    ],
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c
    
    // resolve: {
    //   alias: {
    //     "@": path.resolve(__dirname, "."),
    //   },
    // },
<<<<<<< HEAD
>>>>>>> 1abeaa1 (Refactor API interactions and enhance error handling)
=======
>>>>>>> 51adbfa5cad01e5a0eee6dfd6db4e0faeac2b97c
  };
});
