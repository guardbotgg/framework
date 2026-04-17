import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outDir: 'build',
  dts: true,
  clean: true,
  sourcemap: true,
});