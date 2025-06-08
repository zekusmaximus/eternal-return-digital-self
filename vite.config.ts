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
  },
  // Build configuration for optimized code splitting
  build: {
    minify: 'esbuild', // Use esbuild for faster and less aggressive minification
    sourcemap: true,
    rollupOptions: {
      output: {
        // Customize chunk file naming
        chunkFileNames: 'assets/[name]-[hash].js',
        // Configure code splitting
        manualChunks: {
          // Vendor chunks for major dependencies
          'react-vendor': ['react', 'react-dom', 'react-redux', 'redux-persist'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'markdown-vendor': ['react-markdown', 'remark-gfm'],
          // Feature-based chunks
          'constellation': [
            'src/components/Constellation/ConnectionsBatched.tsx',
            'src/components/Constellation/NodesInstanced.tsx',
          ],
          'node-view': [
            'src/components/NodeView/MarginaliaSidebar.tsx',
            'src/components/NodeView/MiniConstellation.tsx',
          ],
          'narramorph': [
            'src/components/NodeView/NarramorphRenderer.tsx',
            'src/services/TransformationService.ts',
          ],
          'onboarding': [
            'src/components/Onboarding/IntroductionOverlay.tsx',
            'src/components/Onboarding/NodeTooltip.tsx',
            'src/components/Onboarding/HelpIcon.tsx',
          ],
        },
      },
    },
    // Adjust minification settings to keep code more readable
    terserOptions: {
      compress: {
        // Reduce aggressive optimizations
        collapse_vars: false,
        pure_getters: false,
        reduce_vars: false,
        sequences: false,
        // Keep console logs and debugger statements in development builds
        drop_console: false,
        drop_debugger: false,
      },
      mangle: {
        // Keep function and class names
        keep_classnames: true,
        keep_fnames: true,
      },
      format: {
        // Preserve comments
        comments: true,
      },
    },
  },
});