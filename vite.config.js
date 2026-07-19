import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages отдаёт сайт из подпапки /ent-trainer/
  base: '/ent-trainer/',
  plugins: [react(), tailwindcss()],
})
