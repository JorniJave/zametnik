import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Electron file:// не загружает module scripts с crossorigin */
function electronHtmlPlugin() {
  return {
    name: 'electron-html',
    transformIndexHtml(html: string) {
      return html.replace(/\s+crossorigin/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), electronHtmlPlugin()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  base: './',
  build: {
    modulePreload: false,
    // Один бандл — надёжная загрузка в Electron file:// без отдельных chunks
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
});
