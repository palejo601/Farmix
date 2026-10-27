import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El backend valida el Origin (APP_ORIGIN=http://localhost:5173): se mantiene el puerto fijo.
// El proxy hace que el navegador hable con un solo origen, así la cookie de sesión funciona sin CORS.
const proxy = { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 5173, strictPort: true, proxy },
});
