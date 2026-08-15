import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'bun',
  dts: true,
  sourcemap: 'linked',
  clean: true
})
