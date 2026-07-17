import assert from "node:assert/strict";
import test from "node:test";
import { getFinancialSnapshot } from "../api/financial-data.js";
import {
  getLeanConnectionSession,
  getLeanSnapshot,
  isLeanConfigured,
  resetLeanCachesForTests,
} from "../api/lean-client.js";

const leanEnv = {
  LEAN_ENV: "sandbox",
  LEAN_APPLICATION_ID: "application-id",
  LEAN_CLIENT_SECRET: "server-secret",
  LEAN_APP_TOKEN: "public-app-token",
  LEAN_APP_USER_ID: "autoflow-test-user",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function leanFetch(calls) {
  return async (url, init = {}) => {
    const href = String(url);
    calls.push({ url: href, init });
    if (href.includes("/oauth2/token")) return jsonResponse({ access_token: href.includes("auth.sandbox") ? "lean-jwt" : "wrong", expires_in: 3599 });
    if (href.includes("/customers/v1/app-user-id/")) return jsonResponse({ customer_id: "customer-1" });
    if (href.endsWith("/customers/v1/customer-1/entities")) return jsonResponse([{ id: "entity-1", created_at: "2026-07-17T10:00:00Z", consents: [{ consent_status: "ACTIVE" }] }]);
    if (href.includes("/data/v2/accounts?")) return jsonResponse({ accounts: [{ account_id: "account-1", name: "الحساب الجاري", account_sub_type: "CURRENT", currency: "SAR" }] });
    if (href.includes("/balances?")) return jsonResponse({ balances: [
      { balance_type: "CLOSING_AVAILABLE", amount: { value: "9500.25", currency: "SAR" } },
      { balance_type: "INTERIM_BOOKED", amount: { value: "9800.25", currency: "SAR" } },
    ] });
    if (href.includes("/transactions?")) return jsonResponse({ transactions: [
      { transaction_id: "salary-1", description: "إيداع راتب", amount: { value: "8000", currency: "SAR" }, credit_debit_indicator: "CREDIT", booking_date: "2026-07-01" },
      { transaction_id: "expense-1", description: "فاتورة كهرباء", amount: { value: "250", currency: "SAR" }, credit_debit_indicator: "DEBIT", booking_date: "2026-07-03" },
    ] });
    if (href.includes("/beneficiaries?")) return jsonResponse({ beneficiaries: [{ beneficiary_id: "beneficiary-1", beneficiary_name: "سارة", iban: "SA1234567890123456789012" }] });
    return jsonResponse({ message: `Unhandled ${href}` }, 404);
  };
}

test("Lean stays disabled until all server credentials and the public app token exist", () => {
  assert.equal(isLeanConfigured({ LEAN_APPLICATION_ID: "id", LEAN_CLIENT_SECRET: "secret" }), false);
  assert.equal(isLeanConfigured(leanEnv), true);
});

test("Lean connection session mints a customer-scoped token without exposing the client secret", async () => {
  resetLeanCachesForTests();
  const calls = [];
  const session = await getLeanConnectionSession({ fetchImpl: leanFetch(calls), env: leanEnv });
  assert.equal(session.customerId, "customer-1");
  assert.equal(session.accessToken, "lean-jwt");
  assert.equal(session.appToken, "public-app-token");
  assert.equal("clientSecret" in session, false);
  const tokenBodies = calls.filter((call) => call.url.includes("/oauth2/token")).map((call) => String(call.init.body));
  assert.ok(tokenBodies.some((body) => body.includes("scope=customer.customer-1")));
});

test("Lean data is normalized into the existing AutoFlow snapshot contract", async () => {
  resetLeanCachesForTests();
  const calls = [];
  const snapshot = await getLeanSnapshot({ fetchImpl: leanFetch(calls), env: leanEnv });
  assert.equal(snapshot.source, "lean-sandbox");
  assert.equal(snapshot.connected, true);
  assert.equal(snapshot.account.currency, "SAR");
  assert.equal(snapshot.account.availableBalance, 9500.25);
  assert.equal(snapshot.account.currentBalance, 9800.25);
  assert.equal(snapshot.latestSalary.id, "salary-1");
  assert.equal(snapshot.recentTransactions.find((item) => item.id === "expense-1").direction, "outflow");
  assert.deepEqual(snapshot.beneficiaries[0], {
    id: "lean-beneficiary-1",
    providerId: "beneficiary-1",
    name: "سارة",
    account: "IBAN •• 9012",
    kind: "beneficiary",
  });
});

test("a linked Lean entity stays in syncing state until account data is ready", async () => {
  resetLeanCachesForTests();
  const calls = [];
  const baseFetch = leanFetch(calls);
  const snapshot = await getLeanSnapshot({
    env: leanEnv,
    fetchImpl: async (url, init) => String(url).includes("/data/v2/accounts?")
      ? jsonResponse({ accounts: [] })
      : baseFetch(url, init),
  });
  assert.equal(snapshot.provider.active, "lean");
  assert.equal(snapshot.provider.status, "syncing");
  assert.equal(snapshot.connectionRequired, false);
});

test("a missing or failed Lean setup falls back to Plaid/demo instead of breaking AutoFlow", async () => {
  resetLeanCachesForTests();
  const snapshot = await getFinancialSnapshot({
    env: { FINANCIAL_DATA_PROVIDER: "lean" },
    fetchImpl: async () => jsonResponse({ message: "Lean unavailable" }, 503),
  });
  assert.equal(snapshot.provider.requested, "lean");
  assert.equal(snapshot.provider.active, "plaid");
  assert.equal(snapshot.provider.status, "fallback");
  assert.ok(snapshot.account);
});
