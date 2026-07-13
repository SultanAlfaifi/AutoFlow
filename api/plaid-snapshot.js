const PLAID_HOSTS = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

let sandboxAccessToken = null;
const USD_TO_SAR = 3.75;

export function convertPlaidAmountToSar(amount, currency) {
  const numericAmount = Number(amount || 0);
  return String(currency || "").toUpperCase() === "USD"
    ? Math.round(numericAmount * USD_TO_SAR * 100) / 100
    : numericAmount;
}

function normalizeTransactionToSar(transaction) {
  if (transaction.currency !== "USD") return transaction;
  return { ...transaction, amount: convertPlaidAmountToSar(transaction.amount, transaction.currency), currency: "SAR" };
}

const demoSnapshot = {
  source: "demo",
  connected: false,
  syncedAt: new Date().toISOString(),
  account: {
    id: "demo-checking",
    name: "حساب جاري 1000",
    type: "depository",
    currency: "SAR",
    currentBalance: 12480.75,
    availableBalance: 11980.75,
  },
  latestSalary: {
    id: "demo-salary-july",
    name: "إيداع راتب - بيانات تجريبية",
    amount: 8500,
    currency: "SAR",
    date: "2026-07-01",
  },
  recentTransactions: [
    { id: "demo-salary-july", name: "إيداع راتب - بيانات تجريبية", amount: 8500, direction: "inflow", currency: "SAR", date: "2026-07-01" },
    { id: "demo-electricity", name: "فاتورة الكهرباء", amount: 286.4, direction: "outflow", currency: "SAR", date: "2026-07-05" },
    { id: "demo-telecom", name: "فاتورة الاتصالات", amount: 172.5, direction: "outflow", currency: "SAR", date: "2026-07-07" },
  ],
};

async function plaidRequest(path, body) {
  const environment = process.env.PLAID_ENV || "sandbox";
  const host = PLAID_HOSTS[environment] || PLAID_HOSTS.sandbox;
  const response = await fetch(`${host}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_message || payload.error_code || "تعذر الاتصال بـ Plaid");
  }
  return payload;
}

function normalizeTransaction(transaction) {
  const currency = transaction.iso_currency_code || transaction.unofficial_currency_code || "USD";
  return {
    id: transaction.transaction_id,
    name: transaction.merchant_name || transaction.name || "معاملة",
    amount: Math.abs(transaction.amount),
    direction: transaction.amount < 0 ? "inflow" : "outflow",
    currency,
    date: transaction.authorized_date || transaction.date,
    category: transaction.personal_finance_category?.primary || "OTHER",
    detailedCategory: transaction.personal_finance_category?.detailed || "OTHER",
    pending: Boolean(transaction.pending),
  };
}

function findSalary(transactions) {
  const inflows = transactions.filter((transaction) => transaction.direction === "inflow");
  const salaryPattern = /salary|payroll|direct deposit|راتب/i;
  const autoFlowSalary = inflows
    .filter((transaction) => /^AutoFlow Payroll Deposit/i.test(transaction.name))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))[0];
  return autoFlowSalary
    || inflows.find((transaction) => salaryPattern.test(transaction.name))
    || null;
}

async function getSandboxAccessToken() {
  if (sandboxAccessToken) return sandboxAccessToken;

  const publicToken = await plaidRequest("/sandbox/public_token/create", {
    institution_id: "ins_109508",
    initial_products: ["transactions"],
    options: {
      override_username: "user_transactions_dynamic",
      override_password: "pass_good",
    },
  });
  const exchange = await plaidRequest("/item/public_token/exchange", {
    public_token: publicToken.public_token,
  });
  sandboxAccessToken = exchange.access_token;
  return sandboxAccessToken;
}

function buildInsights(transactions) {
  const inflows = transactions.filter((transaction) => transaction.direction === "inflow");
  const outflows = transactions.filter((transaction) => transaction.direction === "outflow");
  const merchantCounts = outflows.reduce((counts, transaction) => {
    const name = transaction.name.toLowerCase();
    counts[name] = (counts[name] || 0) + 1;
    return counts;
  }, {});

  return {
    inflowTotal: inflows.reduce((sum, transaction) => sum + transaction.amount, 0),
    outflowTotal: outflows.reduce((sum, transaction) => sum + transaction.amount, 0),
    largestExpense: outflows.sort((a, b) => b.amount - a.amount)[0] || null,
    recurringCandidates: outflows.filter((transaction) => merchantCounts[transaction.name.toLowerCase()] > 1).slice(0, 3),
    pendingCount: transactions.filter((transaction) => transaction.pending).length,
  };
}

async function syncAllTransactions(accessToken) {
  const added = [];
  let cursor;
  let hasMore = true;

  while (hasMore) {
    const page = await plaidRequest("/transactions/sync", {
      access_token: accessToken,
      ...(cursor ? { cursor } : {}),
    });
    added.push(...(page.added || []));
    cursor = page.next_cursor;
    hasMore = Boolean(page.has_more);
  }

  return added;
}

export async function getPlaidSnapshot() {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return demoSnapshot;
  }

  const accessToken = await getSandboxAccessToken();
  const [transactionData, balanceData] = await Promise.all([
    syncAllTransactions(accessToken),
    plaidRequest("/accounts/balance/get", { access_token: accessToken }),
  ]);

  const transactions = transactionData
    .map(normalizeTransaction)
    .map(normalizeTransactionToSar)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const checking = balanceData.accounts.find((account) => account.type === "depository") || balanceData.accounts[0];
  const plaidCurrency = checking?.balances?.iso_currency_code || checking?.balances?.unofficial_currency_code || "USD";
  const currency = plaidCurrency === "USD" ? "SAR" : plaidCurrency;

  return {
    source: "plaid-sandbox",
    connected: true,
    syncedAt: new Date().toISOString(),
    account: checking ? {
      id: checking.account_id,
      name: checking.name,
      type: checking.type,
      currency,
      currentBalance: convertPlaidAmountToSar(checking.balances.current, plaidCurrency),
      availableBalance: convertPlaidAmountToSar(checking.balances.available, plaidCurrency),
    } : demoSnapshot.account,
    latestSalary: findSalary(transactions),
    recentTransactions: transactions.slice(0, 100),
    insights: buildInsights(transactions),
  };
}

async function readRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function createSandboxEvent(payload) {
  const accessToken = await getSandboxAccessToken();
  const today = new Date().toISOString().slice(0, 10);
  const displayAmount = Math.abs(Number(payload.amount || 0));
  if (!displayAmount || displayAmount > 1000000) throw new Error("قيمة المعاملة غير صالحة");
  const payloadCurrency = String(payload.currency || "SAR").toUpperCase();
  const amount = payloadCurrency === "SAR" ? Math.round((displayAmount / USD_TO_SAR) * 100) / 100 : displayAmount;

  const isIncome = payload.action === "inject-salary" || payload.direction === "inflow";
  await plaidRequest("/sandbox/transactions/create", {
    access_token: accessToken,
    transactions: [{
      amount: isIncome ? -amount : amount,
      date_posted: today,
      date_transacted: today,
      description: payload.description || (isIncome ? "AutoFlow Payroll Deposit" : "AutoFlow Approved Action"),
      iso_currency_code: payloadCurrency === "SAR" ? "USD" : payloadCurrency,
    }],
  });

  await new Promise((resolve) => setTimeout(resolve, 650));
  return getPlaidSnapshot();
}

export default async function handler(request, response) {
  if (request.method && !["GET", "POST"].includes(request.method)) {
    response.statusCode = 405;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const snapshot = request.method === "POST"
      ? await createSandboxEvent(await readRequestBody(request))
      : await getPlaidSnapshot();
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify(snapshot));
  } catch (error) {
    response.statusCode = 502;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: error.message }));
  }
}
