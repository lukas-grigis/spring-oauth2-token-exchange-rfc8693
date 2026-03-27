import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5174,
        proxy: {
            '/debug': {target: 'http://localhost:8000', changeOrigin: true},
            '/talk-service': {target: 'http://localhost:8000', changeOrigin: true},
            '/review-service': {target: 'http://localhost:8000', changeOrigin: true},
        },
    },
});
