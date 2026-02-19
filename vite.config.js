import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dealer: 'dealer.html',
        driver: 'driver.html',
        admin: 'admin.html'
      }
    }
  }
});