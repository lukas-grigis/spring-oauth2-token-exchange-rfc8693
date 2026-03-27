import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    server: {
        port: 5173,
        proxy: {
            '/debug': {target: 'http://localhost:8000', changeOrigin: true},
            '/talk-service': {target: 'http://localhost:8000', changeOrigin: true},
            '/review-service': {target: 'http://localhost:8000', changeOrigin: true},
        },
    },
});
