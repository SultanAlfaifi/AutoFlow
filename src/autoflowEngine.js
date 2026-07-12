const billPattern = /bill|utility|electric|water|telecom|internet|فاتور|كهرب|مياه|اتصال/i;
const subscriptionPattern = /netflix|spotify|apple|google|adobe|subscription|اشتراك/i;

function latestMatching(transactions, predicate) {
  return transactions.filter(predicate).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}

function getTriggerEvent(flow, snapshot, now = new Date()) {
  const transactions = snapshot?.recentTransactions || [];
  const config = flow.config;
  const threshold = Number(config.triggerAmount || 0);

  if (config.trigger === "salary") {
    const transaction = snapshot.latestSalary;
    return transaction && { transaction, amount: transaction.amount, label: `راتب من ${transaction.name}` };
  }

  if (config.trigger === "incoming") {
    const transaction = latestMatching(transactions, (item) => item.direction === "inflow");
    return transaction && { transaction, amount: transaction.amount, label: `حوالة واردة من ${transaction.name}` };
  }

  if (config.trigger === "large-expense") {
    const transaction = latestMatching(transactions, (item) => item.direction === "outflow" && item.amount >= threshold && !item.name.startsWith("AutoFlow -"));
    return transaction && { transaction, amount: transaction.amount, label: `مصروف كبير لدى ${transaction.name}` };
  }

  if (config.trigger === "bill") {
    const transaction = latestMatching(transactions, (item) => item.direction === "outflow" && billPattern.test(`${item.name} ${item.category}`));
    return transaction && { transaction, amount: transaction.amount, label: `فاتورة لدى ${transaction.name}` };
  }

  if (config.trigger === "subscription") {
    const keyword = String(config.merchantKeyword || "").trim().toLowerCase();
    const transaction = latestMatching(transactions, (item) => item.direction === "outflow" && (subscriptionPattern.test(item.name) || (keyword && item.name.toLowerCase().includes(keyword))));
    return transaction && { transaction, amount: transaction.amount, label: `اشتراك لدى ${transaction.name}` };
  }

  if (config.trigger === "low-balance") {
    const balance = Number(snapshot?.account?.availableBalance ?? snapshot?.account?.currentBalance ?? 0);
    if (balance > threshold) return null;
    return { transaction: null, amount: balance, label: `الرصيد وصل إلى ${balance}`, syntheticId: `balance-${balance}` };
  }

  if (config.trigger === "scheduled") {
    const day = Math.min(28, Math.max(1, Number(config.scheduleDay || 28)));
    if (now.getDate() < day) return null;
    const period = `${now.getFullYear()}-${now.getMonth() + 1}`;
    return { transaction: null, amount: 0, label: `موعد يوم ${day} من الشهر`, syntheticId: `scheduled-${period}-${day}` };
  }

  return null;
}

function calculateActionAmount(config, triggerAmount) {
  if (config.action === "notify") return 0;
  if (config.action === "bill" && !Number(config.value)) return triggerAmount;
  return config.unit === "percent"
    ? triggerAmount * (Number(config.value || 0) / 100)
    : Number(config.value || 0);
}

export function evaluateAutomation(flow, snapshot, processedKeys = []) {
  if (!flow.active) return null;
  const triggerEvent = getTriggerEvent(flow, snapshot);
  if (!triggerEvent) return null;

  const transactionId = triggerEvent.transaction?.id || triggerEvent.syntheticId;
  const eventKey = `${flow.id}:${transactionId}`;
  if (processedKeys.includes(eventKey)) return null;

  const currency = triggerEvent.transaction?.currency || snapshot?.account?.currency || "SAR";
  const actionAmount = calculateActionAmount(flow.config, triggerEvent.amount);
  const availableBalance = Number(snapshot?.account?.availableBalance ?? snapshot?.account?.currentBalance ?? 0);
  const safetyBalance = ["salary", "incoming"].includes(flow.config.trigger)
    ? Math.max(availableBalance, triggerEvent.amount)
    : availableBalance;
  const projectedBalance = safetyBalance - actionAmount;
  const blocked = flow.config.safetyOn && actionAmount > 0 && projectedBalance < Number(flow.config.minimumBalance || 0);
  const requiresApproval = flow.config.approval === "approval"
    || (flow.config.approval === "conditional" && actionAmount > Number(flow.config.approvalLimit || 0));

  return {
    id: `${eventKey}:${Date.now()}`,
    eventKey,
    flowId: flow.id,
    flowTitle: flow.title,
    triggerLabel: triggerEvent.label,
    sourceTransactionId: triggerEvent.transaction?.id || null,
    triggerAmount: triggerEvent.amount,
    action: flow.config.action,
    actionAmount,
    currency,
    projectedBalance,
    blocked,
    requiresApproval,
    message: flow.config.message,
  };
}

export function actionCaption(candidate) {
  if (candidate.action === "notify") return candidate.message || "إرسال إشعار فوري";
  if (candidate.action === "save") return "تحويل إلى حساب الادخار";
  if (candidate.action === "transfer") return "تحويل بين الحسابات";
  if (candidate.action === "bill") return "سداد الفاتورة";
  return "تنفيذ الإجراء";
}
