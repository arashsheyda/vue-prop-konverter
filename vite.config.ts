import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { builtinModules } from 'node:module'

export default defineConfig({
  build: {
    ssr: true, // Enable SSR mode for Node.js environment
    outDir: 'dist',
    target: 'node22',
    sourcemap: false, // disable sourcemaps
    minify: process.env.NODE_ENV === 'production', // minify in production
    emptyOutDir: true, // clean the output directory before each build
    rollupOptions: {
      // Externalize dependencies that shouldn't be bundled
      external: [
        'vscode', // VS Code provides this at runtime
        ...builtinModules, // Node.js built-in modules with `node:*` prefix
        ...builtinModules.map(m => `node:${m}`),
      ],
      input: {
        extension: resolve(__dirname, 'src/extension.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'cjs',
        exports: 'named',
        manualChunks: undefined,
        // Stub out missing modules with a function that throws an error
        // This prevents the "Cannot find module" errors at runtime
        intro: `
          const __stubRequire = (id) => {
            throw new Error(\`Module \${id} not found. This is an optional dependency that is not needed for this extension.\`);
          };
        `,
        // Replace dynamic requires with stubs for optional dependencies
        interop: 'auto',
      },
      // Custom plugin to replace consolidate require calls
      plugins: [
        {
          name: 'stub-consolidate',
          renderChunk(code) {
            // List of all optional template engines
            const optionalModules = [
              'consolidate', 'velocityjs', 'dustjs-linkedin', 'atpl', 'liquor', 
              'twig', 'ejs', 'eco', 'jazz', 'jqtpl', 'hamljs', 'hamlet', 
              'whiskers', 'haml-coffee', 'hogan.js', 'templayed', 'walrus', 
              'mustache', 'just', 'ect', 'mote', 'toffee', 'dot', 
              'bracket-template', 'ractive', 'htmling', 'babel-core', 'plates',
              'react-dom/server', 'react', 'vash', 'slm', 'marko', 
              'teacup/lib/express', 'coffee-script', 'squirrelly', 'twing',
              'dust', 'dustjs-helpers', 'jade', 'then-jade', 'pug', 'then-pug',
              'tinyliquid', 'liquid-node', 'qejs', 'arc-templates/dist/es5',
              'nunjucks', 'razor-tmpl', 'swig', 'swig-templates'
            ];
            
            // Replace require calls for optional modules with empty object stubs
            // This prevents errors when consolidate tries to load them at module init
            for (const mod of optionalModules) {
              const regex = new RegExp(`require\\(["'\`]${mod.replace(/\//g, '\\/')}["'\`]\\)`, 'g');
              code = code.replace(regex, '(void 0)');
            }
            
            return { code };
          }
        }
      ]
    },
  },
  ssr: {
    noExternal: true,
  },
})
