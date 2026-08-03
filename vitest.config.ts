import { defineConfig } from 'vitest/config'

// اختبارات الوحدة والتكامل للواجهة (لا تحتاج شبكة/بيئة حقيقية).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
    environment: 'node',
    globals: true,
  },
})
