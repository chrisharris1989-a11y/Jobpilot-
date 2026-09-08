import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'jobpilot-portal-auth',
      transformIndexHtml(html) {
        if (!html.includes('<title>JobPilot Customer Portal</title>')) return html;
        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: { type: 'module', src: '/portal-auth.js' },
              injectTo: 'head',
            },
          ],
        };
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal/index.html')
      }
    }
  }
});
