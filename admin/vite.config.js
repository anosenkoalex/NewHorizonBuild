import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Загружаем env-файлы (admin/.env, .env.development, .env.production и т.д.)
    var env = loadEnv(mode, process.cwd(), '');
    // Если хочешь в деве ходить через /api (без CORS) — включай прокси.
    // Пример:
    //   VITE_API_URL=/api
    //   VITE_API_PROXY_TARGET=http://localhost:3000
    var proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
    return {
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: true,
            // ВАЖНО: проксируем ТОЛЬКО /api и /uploads,
            // чтобы не ломать SPA-роуты типа /units, /viewer и т.д.
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                    rewrite: function (path) { return path.replace(/^\/api/, ''); },
                },
                '/uploads': {
                    target: proxyTarget,
                    changeOrigin: true,
                },
            },
        },
        preview: {
            port: 4173,
            strictPort: true,
        },
        // Если будешь деплоить в подпапку (GitHub Pages), меняешь base:
        // base: '/your-repo-name/',
        base: '/',
    };
});
