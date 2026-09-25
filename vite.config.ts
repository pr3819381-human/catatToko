import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // GitHub Pages memakai /catatToko/,
  // sedangkan Vercel memakai root /
  base: process.env.VERCEL
    ? '/'
    : '/catatToko/',
})