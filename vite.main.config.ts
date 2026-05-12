import { defineConfig } from 'vite'
import { externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/main'),
  build: {
    outDir: resolve(__dirname, 'out/main'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  },
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [externalizeDepsPlugin()]
})
