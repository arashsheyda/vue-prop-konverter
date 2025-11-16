import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  build: {
    ssr: true, // Enable SSR mode for Node.js environment
    outDir: 'dist',
    target: 'node22',
    sourcemap: false, // disable sourcemaps
    minify: process.env.NODE_ENV === 'production', // minify in production
    emptyOutDir: true, // clean the output directory before each build
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      name: 'extension',
      fileName: 'extension',
      // CommonJS format for VS Code extensions
      formats: ['cjs'],
    },
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [
        'vscode', // VS Code provides this at runtime
        /^node:/, // Node.js built-in modules with `node:*` prefix
        '@babel/parser',
        '@babel/traverse',
        '@babel/generator',
        '@babel/types',
      ],
    },
  },
})
