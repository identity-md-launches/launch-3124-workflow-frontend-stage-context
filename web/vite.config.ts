import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "same-deployment-in-development",
      configureServer(server) {
        // Development reads the same generated deployment and ABI files as the export.
        server.middlewares.use(async (request, response, next) => {
          const pathname = (request.url ?? "").split("?")[0];
          if (
            !/^\/(?:imd-deployment\.json|indexing\.json|abi\/[A-Za-z0-9_-]+\.json)$/.test(
              pathname,
            )
          )
            return next();
          try {
            const filename = fileURLToPath(
              new URL(`../dist${pathname}`, import.meta.url),
            );
            const bytes = await readFile(filename);
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-cache");
            response.end(bytes);
          } catch {
            response.statusCode = 503;
            response.end(
              "Deployment files are unavailable. Run npm run build first.",
            );
          }
        });
      },
    },
  ],
  base: "./",
  build: { outDir: "../dist", emptyOutDir: true, sourcemap: false },
});
