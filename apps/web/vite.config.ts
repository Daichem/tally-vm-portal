import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs support both /tally-vm-portal/ and a future custom-domain root.
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
