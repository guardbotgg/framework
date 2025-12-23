import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: './build',
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
})