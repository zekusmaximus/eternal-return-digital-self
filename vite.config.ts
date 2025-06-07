import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['react-markdown', 'remark-gfm'],
  },
  // Ensure content files are properly served
  publicDir: 'public',
  // Configure static file serving
  server: {
    fs: {
      // Allow serving files from one level up the project root
      allow: ['..']
    }
  }
});