import { defineConfig } from 'astro/config';

// Site tĩnh: mọi trang build ra HTML trong /dist, deploy được lên Vercel / Netlify / GitHub Pages.
export default defineConfig({
  output: 'static',
  build: { format: 'directory' }
});
