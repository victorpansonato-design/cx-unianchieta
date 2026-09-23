import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Caminhos relativos: o build abre em qualquer subcaminho do Funcionário Online
  // sem configuração de servidor. As rotas vivem no hash (#/processos), então
  // nenhum servidor precisa reescrever URL.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 3000, host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas num arquivo à parte: mudam pouco, então o navegador as
        // mantém em cache quando só o código do sistema é atualizado.
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['motion', 'motion/react'],
          icones: ['lucide-react'],
        },
      },
    },
  },
});
