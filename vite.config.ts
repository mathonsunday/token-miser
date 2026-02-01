import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    warmup: {
      clientFiles: ['src/**/*.tsx', 'src/**/*.ts'],
    },
  },
})
