import { demoSnapshot } from "./plaid-snapshot.js";

const LEAN_HOSTS = {
  sandbox: {
    api: "https://sandbox.sa.leantech.me",
    auth: "https://auth.sandbox.sa.leantech.me",
  },
  production: {
    api: "https://api2.sa.leantech.me",
    auth: "https://auth.sa.leantech.me",
  },
};

let apiTokenCache = null;
let customerIdCache = null;

function environmentConfig(env = process.env) {
  const environment = env.LEAN_ENV === "production" ? "production" : "sandbox";
  return {
    environment,
    ...LEAN_HOSTS[environment],
    applicationId: env.LEAN_APPLICATION_ID || "",
    clientSecret: env.LEAN_CLIENT_SECRET || "",
    appToken: env.LEAN_APP_TOKEN || "",
    appUserId: env.LEAN_APP_USER_ID || "autoflow-sandbox-user",
    customerId: env.LEAN_CUSTOMER_ID || "",
    entityId: env.LEAN_ENTITY_ID || "",
  };
}

export function isLeanConfigured(env = process.env) {
  const config = environmentConfig(env);
  return Boolean(config.applicationId && config.clientSecret && config.appToken);
}

function safeMessage(payload, fallback) {
  return String(payload?.message || payload?.error?.message || payload?.error || fallback).slice(0, 240);
}

async function parseResponse(response, fallback) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(safeMessage(payload, fallback));
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

async function generateAccessToken(scope, { fetchImpl = fetch, env = process.env } = {}) {
  const config = environmentConfig(env);
  const body = new URLSearchParams({
    client_id: config.applicationId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
    scope,
  });
  const response = await fetchImpl(`${config.auth}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseResponse(response, "تعذر إنشاء جلسة Lean");
}

async function getApiToken(options = {}) {
  if (apiTokenCache && apiTokenCache.expiresAt > Date.now() + 60_000) return apiTokenCache.value;
  const payload = await generateAccessToken("api", options);
  apiTokenCache = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(0, Number(payload.expires_in || 0) - 60) * 1000,
  };
  return apiTokenCache.value;
}

async function leanApi(path, {
  method = "GET",
  body,
  token,
  fetchImpl = fetch,
  env = process.env,
} = /** @type {{ method?: string, body?: any, token?: string, fetchImpl?: typeof fetch, env?: NodeJS.ProcessEnv }} */ ({})) {
  const config = environmentConfig(env);
  const accessToken = token || await getApiToken({ fetchImpl, env });
  const response = await fetchImpl(`${config.api}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return parseResponse(response, "تعذر الاتصال بخدمة Lean");
}

function customerIdFrom(payload) {
  return payload?.customer_id || payload?.id || payload?.data?.customer_id || "";
}

export async function ensureLeanCustomer({ fetchImpl = fetch, env = process.env } = {}) {
  const config = environmentConfig(env);
  if (config.customerId) return config.customerId;
  if (customerIdCache) return customerIdCache;

  try {
    const existing = await leanApi(`/customers/v1/app-user-id/${encodeURIComponent(config.appUserId)}`, { fetchImpl, env });
    customerIdCache = customerIdFrom(existing);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  if (!customerIdCache) {
    const created = await leanApi("/customers/v1", {
      method: "POST",
      body: { app_user_id: config.appUserId },
      fetchImpl,
      env,
    });
    customerIdCache = customerIdFrom(created);
  }
  if (!customerIdCache) throw new Error("لم تُرجع Lean معرّف العميل");
  return customerIdCache;
}

function asList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function entityIsActive(entity) {
  if (!entity?.consents?.length) return true;
  return entity.consents.some((consent) => ["ACTIVE", "AUTHORISED", "AUTHORIZED"].includes(String(consent.consent_status || consent.status || "").toUpperCase()));
}

export async function getLeanEntities(customerId, options = {}) {
  const payload = await leanApi(`/customers/v1/${encodeURIComponent(customerId)}/entities`, options);
  return asList(payload, ["entities"]);
}

async function resolveLeanEntity(customerId, { fetchImpl = fetch, env = process.env } = {}) {
  const config = environmentConfig(env);
  if (config.entityId) return { id: config.entityId };
  const entities = await getLeanEntities(customerId, { fetchImpl, env });
  return entities.filter(entityIsActive).sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0] || null;
}

function numericAmount(value) {
  const candidate = value?.value ?? value?.amount ?? value;
  const number = Number(candidate || 0);
  return Number.isFinite(number) ? Math.abs(number) : 0;
}

function currencyOf(value, fallback = "SAR") {
  return String(value?.currency || value?.amount?.currency || fallback || "SAR").toUpperCase();
}

function normalizeAccount(account) {
  return {
    id: account.account_id || account.id,
    name: account.name || account.account_name || account.display_name || "حساب بنكي متصل",
    type: account.account_sub_type || account.account_type || account.type || "depository",
    currency: currencyOf(account),
  };
}

function normalizeBalance(balance) {
  return {
    type: String(balance.type || balance.balance_type || "").toUpperCase(),
    amount: numericAmount(balance.amount ?? balance),
    currency: currencyOf(balance),
  };
}

function normalizeTransaction(transaction, accountCurrency) {
  const indicator = String(transaction.credit_debit_indicator || transaction.direction || transaction.type || "").toUpperCase();
  const direction = indicator.includes("CREDIT") || indicator === "INFLOW" ? "inflow" : "outflow";
  return {
    id: transaction.transaction_id || transaction.id,
    name: transaction.merchant_name || transaction.description || transaction.name || transaction.transaction_information || "معاملة",
    amount: numericAmount(transaction.amount),
    direction,
    currency: currencyOf(transaction, accountCurrency),
    date: String(transaction.booking_date_time || transaction.booking_date || transaction.value_date_time || transaction.date || "").slice(0, 10),
    category: transaction.category || transaction.transaction_category || "OTHER",
    detailedCategory: transaction.sub_category || transaction.transaction_type || "OTHER",
    pending: String(transaction.status || "").toUpperCase() === "PENDING",
  };
}

function normalizeBeneficiary(beneficiary) {
  const providerId = beneficiary.beneficiary_id || beneficiary.id || beneficiary.account_id;
  const account = beneficiary.iban || beneficiary.account_number || beneficiary.account?.iban || "";
  return {
    id: `lean-${providerId}`,
    providerId,
    name: beneficiary.name || beneficiary.beneficiary_name || beneficiary.account?.name || "مستفيد بنكي",
    account: account ? `IBAN •• ${String(account).slice(-4)}` : "مستفيد من البنك المتصل",
    kind: "beneficiary",
  };
}

function buildInsights(transactions) {
  const inflows = transactions.filter((item) => item.direction === "inflow");
  const outflows = transactions.filter((item) => item.direction === "outflow");
  const merchantCounts = outflows.reduce((counts, transaction) => {
    const key = transaction.name.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return {
    inflowTotal: inflows.reduce((sum, item) => sum + item.amount, 0),
    outflowTotal: outflows.reduce((sum, item) => sum + item.amount, 0),
    largestExpense: [...outflows].sort((a, b) => b.amount - a.amount)[0] || null,
    recurringCandidates: outflows.filter((item) => merchantCounts[item.name.toLowerCase()] > 1).slice(0, 5),
    pendingCount: transactions.filter((item) => item.pending).length,
  };
}

function findSalary(transactions) {
  return transactions.find((transaction) => transaction.direction === "inflow" && /salary|payroll|راتب/i.test(transaction.name)) || null;
}

export async function getLeanConnectionSession({ fetchImpl = fetch, env = process.env } = {}) {
  if (!isLeanConfigured(env)) {
    const error = new Error("أضف إعدادات Lean في الخادم أولًا");
    error.statusCode = 503;
    throw error;
  }
  const config = environmentConfig(env);
  const customerId = await ensureLeanCustomer({ fetchImpl, env });
  const customerToken = await generateAccessToken(`customer.${customerId}`, { fetchImpl, env });
  return {
    provider: "lean",
    environment: config.environment,
    sandbox: config.environment === "sandbox",
    appToken: config.appToken,
    customerId,
    accessToken: customerToken.access_token,
    permissions: ["identity", "accounts", "balance", "transactions", "beneficiaries", "scheduled_payments", "direct_debits", "standing_orders"],
  };
}

export async function getLeanSnapshot({ fetchImpl = fetch, env = process.env } = {}) {
  if (!isLeanConfigured(env)) {
    const error = new Error("Lean غير مهيأ");
    error.statusCode = 503;
    throw error;
  }
  const config = environmentConfig(env);
  const customerId = await ensureLeanCustomer({ fetchImpl, env });
  const entity = await resolveLeanEntity(customerId, { fetchImpl, env });
  if (!entity) {
    return {
      ...structuredClone(demoSnapshot),
      source: `lean-${config.environment}`,
      connected: false,
      connectionRequired: true,
      provider: { requested: "lean", active: "lean", status: "connection_required", environment: config.environment },
    };
  }

  const entityId = entity.id || entity.entity_id;
  const accountPayload = await leanApi(`/data/v2/accounts?entity_id=${encodeURIComponent(entityId)}&size=100`, { fetchImpl, env });
  const accounts = asList(accountPayload, ["accounts"]).map(normalizeAccount).filter((account) => account.id);
  const account = accounts[0];
  if (!account) {
    return {
      ...structuredClone(demoSnapshot),
      source: `lean-${config.environment}`,
      connected: false,
      connectionRequired: false,
      provider: { requested: "lean", active: "lean", status: "syncing", environment: config.environment },
    };
  }

  const query = `entity_id=${encodeURIComponent(entityId)}&size=100`;
  const [balancePayload, transactionPayload, beneficiaryPayload] = await Promise.all([
    leanApi(`/data/v2/accounts/${encodeURIComponent(account.id)}/balances?${query}`, { fetchImpl, env }),
    leanApi(`/data/v2/accounts/${encodeURIComponent(account.id)}/transactions?${query}`, { fetchImpl, env }),
    leanApi(`/data/v2/accounts/${encodeURIComponent(account.id)}/beneficiaries?${query}`, { fetchImpl, env }).catch(() => []),
  ]);
  const balances = asList(balancePayload, ["balances"]).map(normalizeBalance);
  const available = balances.find((item) => item.type.includes("AVAILABLE")) || balances[0];
  const current = balances.find((item) => item.type.includes("BOOKED") || item.type.includes("CURRENT")) || available;
  const recentTransactions = asList(transactionPayload, ["transactions"])
    .map((item) => normalizeTransaction(item, account.currency))
    .filter((item) => item.id)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 100);
  const beneficiaries = asList(beneficiaryPayload, ["beneficiaries"])
    .map(normalizeBeneficiary)
    .filter((item) => item.providerId);

  return {
    source: `lean-${config.environment}`,
    connected: true,
    connectionRequired: false,
    syncedAt: new Date().toISOString(),
    provider: { requested: "lean", active: "lean", status: "connected", environment: config.environment },
    account: {
      ...account,
      currentBalance: current?.amount || 0,
      availableBalance: available?.amount ?? current?.amount ?? 0,
    },
    accounts,
    beneficiaries,
    latestSalary: findSalary(recentTransactions),
    recentTransactions,
    insights: buildInsights(recentTransactions),
  };
}

export function resetLeanCachesForTests() {
  apiTokenCache = null;
  customerIdCache = null;
}
