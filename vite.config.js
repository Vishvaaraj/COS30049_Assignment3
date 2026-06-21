import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the AI4Cyber dashboard front-end.
// dev server runs on 5173 by default; proxy is not used because the
// FastAPI backend URL is read from VITE_API_BASE_URL (see .env.example).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
