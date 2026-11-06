import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-sync-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/sync', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.statusCode = 200;
          res.end(JSON.stringify({
            success: true,
            syncedAt: new Date().toISOString(),
            status: 'ONLINE',
            server: 'JJB Dev Server Sync Mock (Port 3000)'
          }));
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
})
