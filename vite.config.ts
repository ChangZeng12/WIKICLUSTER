import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Sets the base path to relative ('./') so assets load correctly 
  // regardless of the repository name on GitHub Pages.
  base: './',
})