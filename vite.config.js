import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("PLAID_") || key.startsWith("OPENAI_"))));

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
          server.middlewares.use("/api/automation-assistant", async (request, response) => {
            const { default: handler } = await import("./api/automation-assistant.js");
            await handler(request, response);
          });
          server.middlewares.use("/api/automation-draft", async (request, response) => {
            const { default: handler } = await import("./api/automation-draft.js");
            await handler(request, response);
          });
          server.middlewares.use("/api/openai/realtime/session", async (request, response) => {
            const { default: handler } = await import("./api/openai/realtime/session.js");
            await handler(request, response);
          });
          server.middlewares.use("/api/automation-publish", async (request, response) => {
            const { default: handler } = await import("./api/automation-publish.js");
            await handler(request, response);
          });
        },
      },
    ],
  };
});
