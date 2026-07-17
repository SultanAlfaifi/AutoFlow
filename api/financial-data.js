import { getLeanSnapshot, isLeanConfigured } from "./lean-client.js";
import { getPlaidSnapshot } from "./plaid-snapshot.js";

export async function getFinancialSnapshot({ fetchImpl = fetch, env = process.env } = {}) {
  const requested = String(env.FINANCIAL_DATA_PROVIDER || "auto").toLowerCase();
  const shouldTryLean = requested === "lean" || (requested === "auto" && isLeanConfigured(env));

  if (shouldTryLean) {
    try {
      return await getLeanSnapshot({ fetchImpl, env });
    } catch {
      const fallback = await getPlaidSnapshot();
      return {
        ...fallback,
        provider: {
          requested: "lean",
          active: "plaid",
          status: "fallback",
          environment: env.LEAN_ENV === "production" ? "production" : "sandbox",
        },
      };
    }
  }

  const snapshot = await getPlaidSnapshot();
  return {
    ...snapshot,
    provider: {
      requested: requested === "plaid" ? "plaid" : "auto",
      active: "plaid",
      status: snapshot.connected ? "connected" : "demo",
      environment: env.PLAID_ENV || "sandbox",
    },
  };
}

export default async function handler(request, response) {
  if (request.method && request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }
  try {
    const snapshot = await getFinancialSnapshot();
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify(snapshot));
  } catch {
    response.statusCode = 502;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "تعذر تحديث البيانات المالية" }));
  }
}
