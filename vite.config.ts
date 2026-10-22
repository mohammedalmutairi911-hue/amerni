import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'

// معرّف البناء: يُضمَّن في الكود ويُنشر في version.json لتنبيه التطبيق بوجود إصدار أحدث
const BUILD_ID = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())
const versionFile = () => ({
  name: 'amerni-version-file',
  closeBundle() { try { writeFileSync('dist/version.json', JSON.stringify({ build: BUILD_ID })) } catch {} },
})

export default defineConfig({
  plugins: [react(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  }
})
