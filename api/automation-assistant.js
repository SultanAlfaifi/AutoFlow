import {
  ACTION_TYPES,
  AI_SAFE_DEFAULTS,
  ASSISTANT_RESPONSE_SCHEMA,
  AUTOMATION_JSON_SCHEMA,
  AUTOMATION_SCHEMA_VERSION,
  OPERATOR_TYPES,
  SANDBOX_BENEFICIARIES,
  TRIGGER_TYPES,
  getAssistantQuickReplyMode,
  getAssistantQuickReplies,
  isAssistantPublishAttempt,
  isPromptExtractionAttempt,
  normalizeWorkflowShape,
  validateAssistantEnvelope,
  validateAutomation,
} from "../src/automationContract.js";
import { AUTOMATION_ASSISTANT_SYSTEM_PROMPT } from "../src/automationAssistantPrompt.js";
import { createOrUpdateAutomationDraft } from "../server/automationDraftEngine.js";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGE_LENGTH = 2000;

const triggerDescriptions = {
  salary: "وصول راتب",
  incoming: "وصول حوالة",
  "bill-due": "استحقاق فاتورة",
  "large-expense": "تسجيل مصروف كبير",
  subscription: "خصم اشتراك",
  "balance-below": "هبوط الرصيد تحت حد محدد",
  "month-end": "نهاية الشهر",
  scheduled: "موعد بتاريخ ووقت أو تكرار يومي أو أسبوعي أو شهري",
};

const actionDescriptions = {
  save: "تحويل إلى حساب الادخار الثابت",
  "internal-transfer": "تحويل إلى حساب داخلي محدد",
  "beneficiary-transfer": "تحويل إلى مستفيد محدد",
  split: "تحويل جزء من مبلغ الحدث إلى وجهة محددة",
  "pay-bills": "سداد الفواتير المستحقة",
  notify: "إرسال إشعار",
  categorize: "تصنيف مصروف",
  pause: "إيقاف أتمتات أخرى",
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeConversationId(value) {
  const id = String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return id || null;
}

function sanitizeAccount(account) {
  if (!account || typeof account !== "object") return [];
  const id = String(account.id || "").slice(0, 100);
  const label = String(account.name || account.label || "الحساب الجاري المتصل").slice(0, 100);
  const type = String(account.type || "depository").slice(0, 50);
  const currency = String(account.currency || "SAR").slice(0, 10);
  if (!id) return [];
  return [{ id, label, type, currency }];
}

function safeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
}

function safeDate(value) {
  const date = String(value || "").slice(0, 30);
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) ? date : null;
}

function sanitizeTransactions(transactions, limit = 20) {
  if (!Array.isArray(transactions)) return [];
  return transactions.slice(0, limit).flatMap((transaction) => {
    const amount = safeAmount(transaction?.amount);
    const name = String(transaction?.name || "").trim().slice(0, 100);
    if (!name || amount === null) return [];
    return [{
      name,
      amount,
      direction: transaction.direction === "inflow" ? "inflow" : "outflow",
      currency: String(transaction.currency || "SAR").slice(0, 10),
      date: safeDate(transaction.date),
      pending: Boolean(transaction.pending),
    }];
  });
}

function sanitizeBills(bills) {
  if (!Array.isArray(bills)) return [];
  return bills.slice(0, 20).flatMap((bill) => {
    const amount = safeAmount(bill?.amount);
    const name = String(bill?.name || "").trim().slice(0, 100);
    if (!name || amount === null || bill.status !== "due") return [];
    return [{
      name,
      amount,
      currency: String(bill.currency || "SAR").slice(0, 10),
      due_date: safeDate(bill.dueDate),
      status: "due",
    }];
  });
}

function sumByCurrency(items) {
  return items.reduce((totals, item) => {
    totals[item.currency] = Math.round(((totals[item.currency] || 0) + item.amount) * 100) / 100;
    return totals;
  }, {});
}

function buildFinancialContext(payload) {
  const message = String(payload.message || "");
  const snapshot = payload.financial_snapshot && typeof payload.financial_snapshot === "object" ? payload.financial_snapshot : {};
  const asksBalance = /رصيد|balance/i.test(message);
  const asksSalary = /راتب|دخل|salary|income/i.test(message);
  const asksTransactions = /معاملات|عمليات|مصروف|صرف|دفعات|transactions?|spending|activity/i.test(message);
  const asksObligations = /التزام|التزامات|فاتور|فواتير|اشتراك|مستحق|bills?|obligations?|subscriptions?/i.test(message);
  const account = snapshot.account && typeof snapshot.account === "object" ? snapshot.account : {};
  const confirmedDueBills = asksObligations ? sanitizeBills(payload.bills) : [];
  const recentTransactions = sanitizeTransactions(snapshot.recentTransactions, 30);
  const billLike = recentTransactions.filter((item) => item.direction === "outflow" && /فاتور|اشتراك|bill|subscription|telecom|electric/i.test(item.name));

  return {
    source: String(snapshot.source || "unavailable").slice(0, 40),
    connected: Boolean(snapshot.connected),
    synced_at: safeDate(snapshot.syncedAt),
    account_balances: asksBalance ? {
      available: safeAmount(account.availableBalance),
      current: safeAmount(account.currentBalance),
      currency: String(account.currency || "SAR").slice(0, 10),
    } : null,
    latest_salary: asksSalary ? (sanitizeTransactions(snapshot.latestSalary ? [{ ...snapshot.latestSalary, direction: "inflow" }] : [], 1)[0] || null) : null,
    recent_transactions: asksTransactions ? recentTransactions : [],
    obligations: asksObligations ? {
      confirmed_due_bills: confirmedDueBills,
      confirmed_due_totals: sumByCurrency(confirmedDueBills),
      recurring_candidates: sanitizeTransactions(snapshot.insights?.recurringCandidates, 10),
      recent_bill_like_transactions: billLike,
      interpretation: "confirmed_due_bills are current recorded obligations. Recent transactions and recurring candidates are historical signals only, not confirmed future bills.",
    } : null,
  };
}

function detectUnsupportedCurrencyRequest(payload) {
  const message = String(payload.message || "");
  const accountCurrency = String(payload.account?.currency || payload.financial_snapshot?.account?.currency || "SAR").toUpperCase();
  const requestedCurrency = /دولار|\bUSD\b|\$/iu.test(message)
    ? "USD"
    : /ريال|ر\.س|\bSAR\b/iu.test(message) ? "SAR" : null;
  const concernsMoney = /حو[ّ]?ل|تحويل|صرف|بد[ّ]?ل|عملة|مبلغ|دولار|ريال|\b(?:USD|SAR)\b|\$/iu.test(message);
  if (!requestedCurrency || !concernsMoney || requestedCurrency === accountCurrency) return null;
  return { accountCurrency, requestedCurrency };
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-12).flatMap((message) => {
    if (!message || !["user", "assistant"].includes(message.role)) return [];
    const content = String(message.content || "").trim().slice(0, 1200);
    return content ? [{ role: message.role, content }] : [];
  });
}

function sanitizeState(state) {
  if (!state || typeof state !== "object") return {
    user_provided: {},
    inferred_values: {},
    default_values: {},
    missing_required_fields: [],
    draft: null,
  };
  const normalizedDraft = state.draft ? normalizeWorkflowShape(state.draft) : null;
  const draft = normalizedDraft && !validateAutomation(normalizedDraft, { source: "manual" }).length ? normalizedDraft : null;
  return {
    user_provided: state.user_provided && typeof state.user_provided === "object" ? state.user_provided : {},
    inferred_values: state.inferred_values && typeof state.inferred_values === "object" ? state.inferred_values : {},
    default_values: state.default_values && typeof state.default_values === "object" ? state.default_values : {},
    missing_required_fields: Array.isArray(state.missing_required_fields) ? state.missing_required_fields.slice(0, 20) : [],
    draft,
  };
}

function buildDraftIds(conversationId) {
  return {
    workflow_id: `ai-${conversationId}`,
    condition_ids: Array.from({ length: 8 }, (_, index) => `condition-${conversationId}-${index + 1}`),
    action_ids: Array.from({ length: 16 }, (_, index) => `action-${conversationId}-${index + 1}`),
  };
}

export function validateAssistantRequest(payload) {
  const issues = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["جسم الطلب غير صالح"];
  if (payload.operation !== "conversation") issues.push("عملية AI المسموحة الوحيدة هي conversation");
  if (!sanitizeConversationId(payload.conversation_id)) issues.push("معرف المحادثة غير صالح");
  if (typeof payload.message !== "string" || !payload.message.trim()) issues.push("رسالة المستخدم مطلوبة");
  if (String(payload.message || "").length > MAX_MESSAGE_LENGTH) issues.push("رسالة المستخدم أطول من الحد المسموح");
  return issues;
}

export function buildModelContext(payload) {
  const conversationId = sanitizeConversationId(payload.conversation_id);
  const state = sanitizeState(payload.state);
  const defaults = clone(AI_SAFE_DEFAULTS);
  defaults.draft_ids = buildDraftIds(conversationId);
  defaults.fixed_source_account = "الحساب الجاري المتصل الوحيد؛ لا يوجد له حقل داخل JSON الحالي";
  defaults.fixed_savings_destination = "إجراء save يستخدم حساب الادخار الثابت ويُبقي beneficiaryId فارغًا";

  return {
    automation_schema: AUTOMATION_JSON_SCHEMA,
    available_triggers: TRIGGER_TYPES.map((id) => ({ id, label: triggerDescriptions[id] })),
    available_conditions: TRIGGER_TYPES.map((id) => ({
      id,
      label: triggerDescriptions[id],
      fields: id === "scheduled"
        ? ["schedule.mode", "schedule.date", "schedule.time", "schedule.weekdays", "schedule.dayOfMonth", "schedule.timezone"]
        : id === "subscription" ? ["operator", "value", "merchant"] : ["operator", "value"],
    })),
    available_actions: ACTION_TYPES.map((id) => ({ id, label: actionDescriptions[id], repeatable: true })),
    supports_multiple_actions: true,
    multi_beneficiary_rule: "Use one ordered action object per selected beneficiary or destination. Multiple transfer actions in one automation are supported.",
    action_selection_rules: {
      savings_account: "save",
      internal_account: "internal-transfer",
      named_beneficiary: "beneficiary-transfer",
      explicit_multiple_destinations: "one specific action per destination; do not use generic split actions",
      equal_distribution: "divide 100 percent by the number of selected destinations; total must not exceed 100 percent",
    },
    financial_safety_policy: {
      fixed_transfer: "enable maxAmountOn with maxAmount equal to the fixed action value",
      user_supplied_limits: "preserve and enable supported min balance, max amount, daily limit, or hours",
      unknown_limits: "leave disabled and do not invent or ask unless requested",
    },
    available_operators: OPERATOR_TYPES,
    available_accounts: sanitizeAccount(payload.account),
    available_beneficiaries: SANDBOX_BENEFICIARIES.map((item) => ({ id: item.id, label: item.name, type: item.kind })),
    safe_defaults: defaults,
    confirmed_values: {
      user_provided: state.user_provided,
      inferred_values: state.inferred_values,
    },
    current_draft: state.draft,
    conversation_summary: String(payload.conversation_summary || "").slice(0, 1200),
    recent_messages: sanitizeMessages(payload.recent_messages),
    financial_context: buildFinancialContext(payload),
    latest_user_message: String(payload.message).trim(),
    current_date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
  };
}

function buildOpenAIRequest(context, repairIssues = []) {
  const input = repairIssues.length
    ? {
        task: "Repair the previous response structurally. Do not invent or change financial information. If required financial information is missing, return ask_clarification instead.",
        validation_errors: repairIssues.map((item) => ({ path: item.path, message: item.message })),
        context,
      }
    : { task: "Create or update the AutoFlow draft from the latest user message.", context };

  return {
    model: process.env.OPENAI_AUTOMATION_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "low" },
    instructions: AUTOMATION_ASSISTANT_SYSTEM_PROMPT,
    input: [{ role: "user", content: [{ type: "input_text", text: JSON.stringify(input) }] }],
    text: {
      format: {
        type: "json_schema",
        name: "autoflow_automation_assistant_response",
        strict: true,
        schema: ASSISTANT_RESPONSE_SCHEMA,
      },
    },
  };
}

export function extractResponseText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "refusal") throw new Error("رفض النموذج إنشاء الاستجابة المطلوبة");
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("لم تُرجع OpenAI نصًا منظمًا");
}

function enforceDraftSecurity(envelope, currentDraft) {
  if (!envelope?.automation || typeof envelope.automation !== "object") return envelope;
  return {
    ...envelope,
    automation: {
      ...envelope.automation,
      active: false,
      runs: currentDraft?.runs || 0,
    },
  };
}

async function callOpenAI(requestBody, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("المساعد الذكي غير مفعّل حاليًا. أضف مفتاح OpenAI في إعدادات الخادم.");
    error.statusCode = 503;
    throw error;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`OpenAI request failed with status ${response.status}`);
      error.statusCode = 502;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function generateAssistantResult(payload, fetchImpl = fetch) {
  const requestIssues = validateAssistantRequest(payload);
  if (requestIssues.length) {
    const error = new Error(requestIssues.join("، "));
    error.statusCode = payload?.operation && payload.operation !== "conversation" ? 403 : 400;
    throw error;
  }

  const message = payload.message.trim();
  if (isAssistantPublishAttempt(message)) return {
    action: "unsupported_request",
    assistant_message: "لا أستطيع نشر أو تفعيل الأتمتة من المحادثة. افتح المسودة في المحرر، راجعها، ثم استخدم زر النشر هناك.",
    missing_fields: [],
    automation: null,
    quick_replies: [],
    quick_reply_mode: "single",
    state: sanitizeState(payload.state),
    schema_version: AUTOMATION_SCHEMA_VERSION,
  };
  if (isPromptExtractionAttempt(message)) return {
    action: "unsupported_request",
    assistant_message: "لا يمكنني عرض تعليمات النظام. أستطيع مساعدتك فقط في تجهيز مسودة أتمتة مدعومة وآمنة.",
    missing_fields: [],
    automation: null,
    quick_replies: [],
    quick_reply_mode: "single",
    state: sanitizeState(payload.state),
    schema_version: AUTOMATION_SCHEMA_VERSION,
  };

  const currencyMismatch = detectUnsupportedCurrencyRequest(payload);
  if (currencyMismatch) {
    const accountCurrencyLabel = currencyMismatch.accountCurrency === "SAR" ? "الريال السعودي" : currencyMismatch.accountCurrency;
    const requestedCurrencyLabel = currencyMismatch.requestedCurrency === "USD" ? "الدولار الأمريكي" : currencyMismatch.requestedCurrency;
    return {
      action: "unsupported_request",
      assistant_message: `فهمت أنك تريد التحويل بـ${requestedCurrencyLabel}. حسابك المتصل يعمل بـ${accountCurrencyLabel}، وAutoFlow الحالي لا يدعم صرف العملات أو تثبيت سعر صرف داخل الأتمتة. أستطيع تجهيز نفس التحويل بعملة الحساب المتصل دون تغيير بقية التفاصيل.`,
      missing_fields: [],
      automation: null,
      quick_replies: [{ id: `currency-${currencyMismatch.accountCurrency.toLowerCase()}`, label: `استخدم ${accountCurrencyLabel}`, value: `استخدم عملة الحساب المتصل ${currencyMismatch.accountCurrency} وحافظ على المبلغ والموعد وبقية التفاصيل التي ذكرتها` }],
      quick_reply_mode: "single",
      state: sanitizeState(payload.state),
      schema_version: AUTOMATION_SCHEMA_VERSION,
    };
  }

  const context = buildModelContext(payload);
  let openAIResponse = await callOpenAI(buildOpenAIRequest(context), fetchImpl);
  let envelope;
  let issues;
  try {
    envelope = enforceDraftSecurity(JSON.parse(extractResponseText(openAIResponse)), context.current_draft);
    issues = validateAssistantEnvelope(envelope, { beneficiaries: SANDBOX_BENEFICIARIES, requireZeroRuns: !context.current_draft });
  } catch (error) {
    issues = [{ path: "response", message: error.message, kind: "structure" }];
  }

  if (issues.length && issues.every((item) => item.kind === "structure")) {
    openAIResponse = await callOpenAI(buildOpenAIRequest(context, issues), fetchImpl);
    envelope = enforceDraftSecurity(JSON.parse(extractResponseText(openAIResponse)), context.current_draft);
    issues = validateAssistantEnvelope(envelope, { beneficiaries: SANDBOX_BENEFICIARIES, requireZeroRuns: !context.current_draft });
  }
  if (issues.length) {
    const error = new Error("تعذر اعتماد مخرجات النموذج لأنها لم تجتز تحقق AutoFlow");
    error.statusCode = 422;
    error.details = issues.map((item) => ({ path: item.path, code: item.code, message: item.message }));
    throw error;
  }

  let draftResult = null;
  if (envelope.action === "create_draft") {
    const shouldExplainSafety = envelope.automation.actions.some((action) => ["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type)
      && action.amountMode === "fixed" && Number(action.value) > 0 && !action.safety.maxAmountOn);
    draftResult = createOrUpdateAutomationDraft({
      operation: context.current_draft ? "update" : "create",
      conversationId: payload.conversation_id,
      candidate: envelope.automation,
      currentDraft: context.current_draft,
      currentMetadata: payload.current_metadata,
    });
    envelope.automation = draftResult.automation;
    if (shouldExplainSafety) envelope.assistant_message = `${envelope.assistant_message} أضفت حدًا أعلى آمنًا يساوي مبلغ كل تحويل ثابت.`;
  }

  const previousState = sanitizeState(payload.state);
  const nextState = {
    user_provided: {
      ...previousState.user_provided,
      latest_message: message,
    },
    inferred_values: previousState.inferred_values,
    default_values: clone(AI_SAFE_DEFAULTS),
    missing_required_fields: envelope.missing_fields,
    draft: envelope.automation || previousState.draft,
  };

  return {
    ...envelope,
    quick_replies: getAssistantQuickReplies(envelope.missing_fields),
    quick_reply_mode: getAssistantQuickReplyMode(envelope.missing_fields, message),
    state: nextState,
    ...(draftResult ? { metadata: draftResult.metadata, security: draftResult.security } : {}),
    schema_version: AUTOMATION_SCHEMA_VERSION,
  };
}

async function readRequestBody(request) {
  if (request.body && typeof request.body === "object") return request.body;
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
      const error = new Error("حجم الطلب أكبر من الحد المسموح");
      error.statusCode = 413;
      throw error;
    }
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const result = await generateAssistantResult(await readRequestBody(request));
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error.message || "تعذر تشغيل مساعد AutoFlow",
      ...(error.details ? { details: error.details } : {}),
    });
  }
}
