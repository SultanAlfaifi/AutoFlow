import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("PLAID_"))));

  return {
    plugins: [
      react(),
      {
        name: "autoflow-local-api",
        configureServer(server) {
          server.middlewares.use("/api/plaid-snapshot", async (request, response) => {
            const { default: handler } = await import("./api/plaid-snapshot.js");
            await handler(request, response);
          });
        },
      },
    ],
  };
});
