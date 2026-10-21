import { defineConfig } from 'vite';

// base: './' = chemins relatifs. Le même build marche en local, sur le
// téléphone et sur Cloudflare.
export default defineConfig({
  base: './',
});
