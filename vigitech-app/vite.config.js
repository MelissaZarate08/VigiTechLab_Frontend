import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',             // Ruta base de tu aplicación
  publicDir: 'public',   // Carpeta de archivos estáticos
  build: {
    outDir: 'dist',      // Carpeta resultante tras build
    assetsDir: 'assets', // Subcarpeta para JS/CSS/imágenes con hash
    emptyOutDir: true    // Limpia dist antes de generar
  }
})
