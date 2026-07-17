import { getLeanConnectionSession } from "./lean-client.js";

export default async function handler(request, response) {
  if (request.method && request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  try {
    const session = await getLeanConnectionSession();
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify(session));
  } catch (error) {
    response.statusCode = error.statusCode || 502;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: error.message || "تعذر بدء ربط Lean" }));
  }
}
