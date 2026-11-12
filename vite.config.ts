import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** 로컬 개발에서 Vercel 서버 함수(/api/books)를 그대로 실행 */
function apiRoutes(): Plugin {
  return {
    name: 'booklog-api-routes',
    configureServer(server) {
      server.middlewares.use('/api/books', async (req, res) => {
        try {
          const mod = (await server.ssrLoadModule('/api/books.ts')) as { GET: (r: Request) => Promise<Response> };
          const response = await mod.GET(new Request(`http://localhost${req.originalUrl ?? req.url}`));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await response.text());
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // 서버 전용 키(VITE_ 접두사 없음)를 로컬 서버 함수에서만 쓰도록 process.env 로
  const env = loadEnv(mode, process.cwd(), '');
  if (env.ALADIN_TTB_KEY) process.env.ALADIN_TTB_KEY = env.ALADIN_TTB_KEY;
  return {
  plugins: [react(), apiRoutes()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 모든 SCSS 모듈에서 토큰/믹스인을 바로 사용
        additionalData: `@use "@/styles/abstracts" as *;\n`,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: { port: 5180 },
  };
});
