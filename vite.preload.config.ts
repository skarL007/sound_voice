import { defineConfig } from 'vite'
import { externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/preload'),
  build: {
    outDir: resolve(__dirname, 'out/preload'),
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/preload/index.ts'),
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
      '@preload': resolve(__dirname, 'src/preload'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  plugins: [externalizeDepsPlugin()]
})
