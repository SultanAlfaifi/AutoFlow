export const AUTOMATION_SCHEMA_VERSION = "autoflow-workflow-v3";

export const TRIGGER_TYPES = [
  "salary",
  "incoming",
  "bill-due",
  "large-expense",
  "subscription",
  "balance-below",
  "month-end",
  "scheduled",
];

export const ACTION_TYPES = [
  "save",
  "internal-transfer",
  "beneficiary-transfer",
  "split",
  "pay-bills",
  "notify",
  "categorize",
  "pause",
];

export const AUTOMATION_TRIGGER_EXAMPLES = Object.freeze({
  salary: "إذا نزل راتبي وكان 5,000 ر.س أو أكثر.",
  incoming: "عند وصول أي حوالة إلى الحساب.",
  "bill-due": "عند استحقاق فاتورة الكهرباء.",
  "large-expense": "إذا تم شراء بقيمة 300 ر.س أو أكثر.",
  subscription: "عند استحقاق اشتراك ChatGPT Plus.",
  "balance-below": "إذا انخفض الرصيد عن 1,000 ر.س.",
  "month-end": "في آخر يوم من كل شهر.",
  scheduled: "يوم 1 من كل شهر الساعة 9 صباحًا.",
});

export const AUTOMATION_ACTION_EXAMPLES = Object.freeze({
  save: "حوّل 10% من مبلغ الحدث إلى الادخار.",
  "internal-transfer": "حوّل 500 ر.س بين حساباتي.",
  "beneficiary-transfer": "حوّل 200 ر.س إلى سارة أحمد.",
  split: "وجّه 20% من مبلغ الحدث إلى حساب العائلة.",
  "pay-bills": "سدّد ChatGPT Plus عند استحقاقه.",
  notify: "أرسل إشعارًا: تم تنفيذ الأتمتة.",
  categorize: "صنّف العملية باسم «اشتراكات».",
  pause: "أوقف الأتمتات الأخرى عند انخفاض الرصيد.",
});

export const OPERATOR_TYPES = ["any", "gte", "lte"];
export const JOIN_TYPES = ["and", "or"];
export const AMOUNT_MODES = ["percent", "balance-percent", "fixed"];
export const APPROVAL_MODES = ["auto", "always", "above"];
export const MATCH_MODES = ["all", "any"];
export const SCHEDULE_MODES = ["once", "daily", "weekly", "monthly"];
export const WEEKDAY_TYPES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const DEFAULT_TIMEZONE = "Asia/Riyadh";
export const AUTOMATION_COLORS = ["gray", "coral", "teal", "green", "gold", "violet"];
export const AUTOMATION_ICONS = ["sparkles", "wallet", "receipt", "shield", "bell", "calendar"];
export const AUTOMATION_CATEGORIES = ["شخصية", "ادخار", "مدفوعات", "تحويلات", "حماية الرصيد", "تنظيم مالي"];

export const BILL_PAYMENT_TARGETS = [
  { id: "all", label: "كل الفواتير والاشتراكات المستحقة" },
  { id: "electricity", label: "الكهرباء" },
  { id: "water", label: "المياه" },
  { id: "xbox", label: "Xbox Game Pass" },
  { id: "chatgpt", label: "ChatGPT Plus" },
  { id: "amazon-prime", label: "Amazon Prime" },
];

export const SANDBOX_BILL_SERVICES = [
  { id: "electricity", name: "فاتورة الكهرباء", amount: 286.4, kind: "utility" },
  { id: "water", name: "فاتورة المياه", amount: 95.75, kind: "utility" },
  { id: "xbox", name: "Xbox Game Pass", amount: 39.99, kind: "subscription" },
  { id: "chatgpt", name: "ChatGPT Plus", amount: 75, kind: "subscription" },
  { id: "amazon-prime", name: "Amazon Prime", amount: 16, kind: "subscription" },
];

export const SANDBOX_BENEFICIARIES = [
  { id: "plaid-savings", name: "حساب الادخار", account: "Plaid Savings •• 4321", kind: "internal" },
  { id: "sara", name: "سارة أحمد", account: "Plaid Checking •• 1188", kind: "beneficiary" },
  { id: "mohammed", name: "محمد علي", account: "Plaid Money Market •• 9074", kind: "beneficiary" },
  { id: "family", name: "حساب العائلة", account: "Plaid Checking •• 5540", kind: "beneficiary" },
];

export function getActionDestinations(actionType, beneficiaries = SANDBOX_BENEFICIARIES) {
  if (actionType === "internal-transfer") {
    return beneficiaries.filter((item) => item.kind === "internal");
  }
  if (actionType === "beneficiary-transfer") {
    return beneficiaries.filter((item) => item.kind === "beneficiary");
  }
  return beneficiaries;
}

export const DEFAULT_SAFETY = Object.freeze({
  balanceAboveOn: false,
  balanceAbove: "",
  minBalanceOn: false,
  minBalance: "",
  maxAmountOn: false,
  maxAmount: "",
  dailyLimitOn: false,
  dailyLimit: "",
  hoursOn: false,
  startHour: "6",
  endHour: "23",
});

export const DEFAULT_SCHEDULE = Object.freeze({
  mode: "once",
  date: "",
  time: "09:00",
  weekdays: [],
  dayOfMonth: "",
  timezone: DEFAULT_TIMEZONE,
});

export const AI_SAFE_DEFAULTS = Object.freeze({
  category: "شخصية",
  color: "gray",
  icon: "sparkles",
  active: false,
  match: "all",
  runs: 0,
  condition: {
    joinWith: "and",
    operator: "any",
    value: "",
    merchant: "",
    schedule: DEFAULT_SCHEDULE,
  },
  action: {
    amountMode: "percent",
    beneficiaryId: "",
    message: "",
    safety: DEFAULT_SAFETY,
    approval: { mode: "always", threshold: "" },
  },
});

const stringEnum = (values) => ({ type: "string", enum: values });

export const AUTOMATION_JSON_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    category: stringEnum(AUTOMATION_CATEGORIES),
    color: stringEnum(AUTOMATION_COLORS),
    icon: stringEnum(AUTOMATION_ICONS),
    active: { type: "boolean" },
    match: stringEnum(MATCH_MODES),
    runs: { type: "number" },
    conditions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: stringEnum(TRIGGER_TYPES),
          joinWith: stringEnum(JOIN_TYPES),
          operator: stringEnum(OPERATOR_TYPES),
          value: { type: "string" },
          merchant: { type: "string" },
          schedule: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: stringEnum(SCHEDULE_MODES),
              date: { type: "string" },
              time: { type: "string" },
              weekdays: { type: "array", items: stringEnum(WEEKDAY_TYPES) },
              dayOfMonth: { type: "string" },
              timezone: { type: "string", enum: [DEFAULT_TIMEZONE] },
            },
            required: ["mode", "date", "time", "weekdays", "dayOfMonth", "timezone"],
          },
        },
        required: ["id", "type", "joinWith", "operator", "value", "merchant", "schedule"],
      },
    },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: stringEnum(ACTION_TYPES),
          amountMode: stringEnum(AMOUNT_MODES),
          value: { type: "string" },
          beneficiaryId: { type: "string" },
          message: { type: "string" },
          safety: {
            type: "object",
            additionalProperties: false,
            properties: {
              balanceAboveOn: { type: "boolean" },
              balanceAbove: { type: "string" },
              minBalanceOn: { type: "boolean" },
              minBalance: { type: "string" },
              maxAmountOn: { type: "boolean" },
              maxAmount: { type: "string" },
              dailyLimitOn: { type: "boolean" },
              dailyLimit: { type: "string" },
              hoursOn: { type: "boolean" },
              startHour: { type: "string" },
              endHour: { type: "string" },
            },
            required: ["balanceAboveOn", "balanceAbove", "minBalanceOn", "minBalance", "maxAmountOn", "maxAmount", "dailyLimitOn", "dailyLimit", "hoursOn", "startHour", "endHour"],
          },
          approval: {
            type: "object",
            additionalProperties: false,
            properties: {
              mode: stringEnum(APPROVAL_MODES),
              threshold: { type: "string" },
            },
            required: ["mode", "threshold"],
          },
        },
        required: ["id", "type", "amountMode", "value", "beneficiaryId", "message", "safety", "approval"],
      },
    },
  },
  required: ["id", "name", "category", "color", "icon", "active", "match", "runs", "conditions", "actions"],
});

export const ASSISTANT_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  properties: {
    action: stringEnum(["create_draft", "ask_clarification", "unsupported_request"]),
    assistant_message: { type: "string" },
    missing_fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          question: { type: "string" },
        },
        required: ["path", "question"],
      },
    },
    automation: {
      anyOf: [AUTOMATION_JSON_SCHEMA, { type: "null" }],
    },
  },
  required: ["action", "assistant_message", "missing_fields", "automation"],
});

export function makeCondition(type = "", joinWith = "and", id = `condition-${Date.now()}-${Math.random()}`) {
  return { id, type, joinWith, operator: "any", value: "", merchant: "", schedule: { ...DEFAULT_SCHEDULE, weekdays: [] } };
}

export function makeAction(type = "", id = `action-${Date.now()}-${Math.random()}`) {
  return {
    id,
    type,
    amountMode: "percent",
    value: "",
    beneficiaryId: "",
    message: "",
    safety: { ...DEFAULT_SAFETY },
    approval: { mode: "always", threshold: "" },
  };
}

export function makeManualWorkflow(id = `shortcut-${Date.now()}`) {
  return {
    id,
    name: "",
    category: "شخصية",
    color: "gray",
    icon: "sparkles",
    active: true,
    match: "all",
    runs: 0,
    conditions: [],
    actions: [],
  };
}

const ROOT_KEYS = ["id", "name", "category", "color", "icon", "active", "match", "runs", "conditions", "actions"];
const CONDITION_KEYS = ["id", "type", "joinWith", "operator", "value", "merchant", "schedule"];
const SCHEDULE_KEYS = ["mode", "date", "time", "weekdays", "dayOfMonth", "timezone"];
const ACTION_KEYS = ["id", "type", "amountMode", "value", "beneficiaryId", "message", "safety", "approval"];
const SAFETY_KEYS = ["balanceAboveOn", "balanceAbove", "minBalanceOn", "minBalance", "maxAmountOn", "maxAmount", "dailyLimitOn", "dailyLimit", "hoursOn", "startHour", "endHour"];
const APPROVAL_KEYS = ["mode", "threshold"];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === [...expected].sort()[index]);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function issue(path, code, message, kind = "semantic") {
  return { path, code, message, kind };
}

export function validateAutomation(automation, options = {}) {
  const source = options.source || "manual";
  const allowedBeneficiaries = options.beneficiaries || SANDBOX_BENEFICIARIES;
  const beneficiaryById = new Map(allowedBeneficiaries.map((item) => [item.id, item]));
  const issues = [];

  if (!isRecord(automation)) return [issue("automation", "invalid_type", "ملف الأتمتة غير صالح", "structure")];
  if (source === "ai" && !hasExactKeys(automation, ROOT_KEYS)) issues.push(issue("automation", "invalid_shape", "بنية ملف الأتمتة لا تطابق المنشئ الحالي", "structure"));
  if (typeof automation.name !== "string" || !automation.name.trim()) issues.push(issue("name", "required", "اكتب اسم الأتمتة"));
  if (!Array.isArray(automation.conditions) || !automation.conditions.length) issues.push(issue("conditions", "required", "أضف حدث البدء"));
  if (!Array.isArray(automation.actions) || !automation.actions.length) issues.push(issue("actions", "required", "أضف خطوة تنفيذ واحدة على الأقل"));

  if (!AUTOMATION_CATEGORIES.includes(automation.category)) issues.push(issue("category", "invalid_enum", "تصنيف غير مدعوم", "structure"));
  if (!AUTOMATION_COLORS.includes(automation.color)) issues.push(issue("color", "invalid_enum", "لون غير مدعوم", "structure"));
  if (!AUTOMATION_ICONS.includes(automation.icon)) issues.push(issue("icon", "invalid_enum", "أيقونة غير مدعومة", "structure"));
  if (!MATCH_MODES.includes(automation.match)) issues.push(issue("match", "invalid_enum", "طريقة مطابقة غير مدعومة", "structure"));
  if (source === "ai") {
    if (automation.active !== false) issues.push(issue("active", "must_be_inactive", "يجب أن تبقى مسودة الذكاء الاصطناعي غير مفعلة", "security"));
    if (options.requireZeroRuns !== false && automation.runs !== 0) issues.push(issue("runs", "invalid_default", "المسودة الجديدة يجب ألا تحتوي على مرات تنفيذ", "security"));
  }

  if (Array.isArray(automation.conditions)) automation.conditions.forEach((condition, index) => {
    const path = `conditions[${index}]`;
    if (!hasExactKeys(condition, CONDITION_KEYS)) {
      issues.push(issue(path, "invalid_shape", `بنية الشرط ${index + 1} غير صالحة`, "structure"));
      return;
    }
    if (!hasExactKeys(condition.schedule, SCHEDULE_KEYS)) {
      issues.push(issue(`${path}.schedule`, "invalid_shape", `بنية الجدول الزمني للشرط ${index + 1} غير صالحة`, "structure"));
      return;
    }
    if (!condition.type) issues.push(issue(`${path}.type`, "required", `اختر الحدث للشرط ${index + 1}`));
    else if (!TRIGGER_TYPES.includes(condition.type)) issues.push(issue(`${path}.type`, "invalid_enum", `المحفز ${condition.type} غير مدعوم`, "structure"));
    if (!JOIN_TYPES.includes(condition.joinWith)) issues.push(issue(`${path}.joinWith`, "invalid_enum", "رابط الشروط غير مدعوم", "structure"));
    if (!OPERATOR_TYPES.includes(condition.operator)) issues.push(issue(`${path}.operator`, "invalid_enum", "معامل الشرط غير مدعوم", "structure"));
    if ((condition.type === "balance-below" || ["gte", "lte"].includes(condition.operator)) && !positiveNumber(condition.value)) {
      issues.push(issue(`${path}.value`, "required_financial_value", "قيمة الشرط المالية مطلوبة وصحيحة"));
    }
    if (condition.type === "scheduled") {
      const schedule = condition.schedule;
      if (!SCHEDULE_MODES.includes(schedule.mode)) issues.push(issue(`${path}.schedule.mode`, "invalid_enum", "نوع التكرار غير مدعوم", "structure"));
      if (!validTime(schedule.time)) issues.push(issue(`${path}.schedule.time`, "required_schedule_time", "وقت التنفيذ مطلوب بصيغة صحيحة"));
      if (schedule.timezone !== DEFAULT_TIMEZONE) issues.push(issue(`${path}.schedule.timezone`, "invalid_timezone", "المنطقة الزمنية غير مدعومة", "structure"));
      if (!Array.isArray(schedule.weekdays) || schedule.weekdays.some((day) => !WEEKDAY_TYPES.includes(day))) issues.push(issue(`${path}.schedule.weekdays`, "invalid_weekdays", "أيام التكرار غير صالحة", "structure"));
      if (schedule.mode === "once" && !validDate(schedule.date)) issues.push(issue(`${path}.schedule.date`, "required_schedule_date", "تاريخ التنفيذ مطلوب بصيغة صحيحة"));
      if (schedule.mode === "weekly" && !schedule.weekdays.length) issues.push(issue(`${path}.schedule.weekdays`, "required_weekdays", "اختر يومًا واحدًا على الأقل"));
      if (schedule.mode === "monthly" && (!/^\d+$/.test(schedule.dayOfMonth) || Number(schedule.dayOfMonth) < 1 || Number(schedule.dayOfMonth) > 31)) issues.push(issue(`${path}.schedule.dayOfMonth`, "required_month_day", "يوم الشهر يجب أن يكون بين 1 و31"));
    }
  });

  if (Array.isArray(automation.actions)) automation.actions.forEach((action, index) => {
    const path = `actions[${index}]`;
    const prefix = `الخطوة ${index + 1}`;
    if (!hasExactKeys(action, ACTION_KEYS) || !hasExactKeys(action?.safety, SAFETY_KEYS) || !hasExactKeys(action?.approval, APPROVAL_KEYS)) {
      issues.push(issue(path, "invalid_shape", `${prefix}: بنية الإجراء لا تطابق المنشئ الحالي`, "structure"));
      return;
    }
    if (!action.type) issues.push(issue(`${path}.type`, "required", `${prefix}: اختر الإجراء`));
    else if (!ACTION_TYPES.includes(action.type)) issues.push(issue(`${path}.type`, "invalid_enum", `${prefix}: الإجراء غير مدعوم`, "structure"));

    const transferAction = ["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type);
    const explicitDestination = ["internal-transfer", "beneficiary-transfer", "split"].includes(action.type);
    if (explicitDestination && !action.beneficiaryId) issues.push(issue(`${path}.beneficiaryId`, "required_beneficiary", `${prefix}: اختر الحساب أو المستفيد`));
    if (transferAction && !positiveNumber(action.value)) issues.push(issue(`${path}.value`, "required_financial_value", `${prefix}: اكتب المبلغ أو النسبة`));
    if (["notify", "categorize"].includes(action.type) && !String(action.message || "").trim()) issues.push(issue(`${path}.message`, "required", `${prefix}: اكتب النص`));
    if (action.type === "pay-bills" && !BILL_PAYMENT_TARGETS.some((target) => target.id === action.message)) issues.push(issue(`${path}.message`, "invalid_bill_target", `${prefix}: اختر الفاتورة أو الاشتراك المراد سداده`, "structure"));
    if (!action.approval.mode) issues.push(issue(`${path}.approval.mode`, "required", `${prefix}: اختر طريقة الموافقة`));
    if (action.approval.mode === "above" && !positiveNumber(action.approval.threshold)) issues.push(issue(`${path}.approval.threshold`, "required_financial_value", `${prefix}: اكتب مبلغ الموافقة`));

    if (!AMOUNT_MODES.includes(action.amountMode)) issues.push(issue(`${path}.amountMode`, "invalid_enum", "طريقة حساب المبلغ غير مدعومة", "structure"));
    if (!APPROVAL_MODES.includes(action.approval.mode)) issues.push(issue(`${path}.approval.mode`, "invalid_enum", "طريقة الموافقة غير مدعومة", "structure"));
    if (["percent", "balance-percent"].includes(action.amountMode) && transferAction && Number(action.value) > 100) issues.push(issue(`${path}.value`, "invalid_percentage", "النسبة يجب ألا تتجاوز 100%"));
    if (action.type === "save" && action.beneficiaryId !== "") issues.push(issue(`${path}.beneficiaryId`, "invalid_fixed_destination", "إجراء الادخار يستخدم وجهته الثابتة ولا يقبل معرفًا إضافيًا", "security"));
    if (explicitDestination && action.beneficiaryId && !beneficiaryById.has(action.beneficiaryId)) issues.push(issue(`${path}.beneficiaryId`, "unknown_beneficiary", "الحساب أو المستفيد غير موجود ضمن خيارات المستخدم", "security"));
    if (action.type === "internal-transfer" && action.beneficiaryId && beneficiaryById.get(action.beneficiaryId)?.kind !== "internal") issues.push(issue(`${path}.beneficiaryId`, "invalid_internal_destination", "الوجهة ليست حسابًا داخليًا صالحًا", "security"));
    if (action.type === "beneficiary-transfer" && action.beneficiaryId && beneficiaryById.get(action.beneficiaryId)?.kind !== "beneficiary") issues.push(issue(`${path}.beneficiaryId`, "invalid_beneficiary", "الوجهة ليست مستفيدًا صالحًا", "security"));

    const safetyChecks = [
      ["balanceAboveOn", "balanceAbove"],
      ["minBalanceOn", "minBalance"],
      ["maxAmountOn", "maxAmount"],
      ["dailyLimitOn", "dailyLimit"],
    ];
    safetyChecks.forEach(([enabledKey, valueKey]) => {
      if (action.safety[enabledKey] && !positiveNumber(action.safety[valueKey])) issues.push(issue(`${path}.safety.${valueKey}`, "invalid_safety_value", "حد الأمان المفعّل يحتاج قيمة موجبة"));
    });
    if (action.safety.hoursOn) {
      const start = Number(action.safety.startHour);
      const end = Number(action.safety.endHour);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > 23 || end < 1 || end > 24 || start >= end) issues.push(issue(`${path}.safety`, "invalid_hours", "ساعات التنفيذ غير صالحة"));
    }
  });

  if (Array.isArray(automation.actions)) {
    const percentageTotal = automation.actions
      .filter((action) => ["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type) && ["percent", "balance-percent"].includes(action.amountMode))
      .reduce((total, action) => total + Number(action.value || 0), 0);
    if (percentageTotal > 100.0001) issues.push(issue("actions", "percentage_total_exceeded", "مجموع نسب التحويل لا يمكن أن يتجاوز 100%", "security"));
  }

  return issues;
}

export function validateAssistantEnvelope(envelope, options = {}) {
  if (!isRecord(envelope)) return [issue("response", "invalid_type", "استجابة المساعد غير صالحة", "structure")];
  const issues = [];
  const keys = ["action", "assistant_message", "missing_fields", "automation"];
  if (!hasExactKeys(envelope, keys)) issues.push(issue("response", "invalid_shape", "غلاف الاستجابة لا يطابق العقد", "structure"));
  if (!["create_draft", "ask_clarification", "unsupported_request"].includes(envelope.action)) issues.push(issue("action", "invalid_enum", "حالة استجابة غير مدعومة", "structure"));
  if (typeof envelope.assistant_message !== "string" || !envelope.assistant_message.trim()) issues.push(issue("assistant_message", "required", "رسالة المساعد مطلوبة", "structure"));
  if (!Array.isArray(envelope.missing_fields)) issues.push(issue("missing_fields", "invalid_type", "قائمة الحقول الناقصة غير صالحة", "structure"));
  else envelope.missing_fields.forEach((field, index) => {
    if (!hasExactKeys(field, ["path", "question"]) || typeof field.path !== "string" || typeof field.question !== "string") issues.push(issue(`missing_fields[${index}]`, "invalid_shape", "وصف الحقل الناقص غير صالح", "structure"));
  });
  if (envelope.action === "create_draft") {
    if (envelope.automation === null) issues.push(issue("automation", "required", "ملف الأتمتة مطلوب عند إنشاء المسودة", "structure"));
    if (envelope.missing_fields?.length) issues.push(issue("missing_fields", "must_be_empty", "لا يمكن إنشاء مسودة مع معلومات أساسية ناقصة", "security"));
    if (envelope.automation) issues.push(...validateAutomation(envelope.automation, { ...options, source: "ai" }));
  } else {
    if (envelope.automation !== null) issues.push(issue("automation", "must_be_null", "لا يجوز إرجاع ملف أتمتة في هذه الحالة", "security"));
    if (envelope.action === "unsupported_request" && envelope.missing_fields?.length) issues.push(issue("missing_fields", "must_be_empty", "الطلب غير المدعوم لا يحتوي حقولًا ناقصة", "structure"));
    if (envelope.action === "ask_clarification" && !envelope.missing_fields?.length) issues.push(issue("missing_fields", "required", "السؤال التوضيحي يجب أن يحدد المعلومات الضرورية", "structure"));
  }
  return issues;
}

function safeConversationId(conversationId) {
  const normalized = String(conversationId || "draft").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return normalized || "draft";
}

export function normalizeWorkflowShape(workflow) {
  if (!isRecord(workflow)) return workflow;
  return {
    ...workflow,
    conditions: Array.isArray(workflow.conditions) ? workflow.conditions.map((condition) => ({
      ...condition,
      schedule: {
        ...DEFAULT_SCHEDULE,
        ...(isRecord(condition?.schedule) ? condition.schedule : {}),
        weekdays: Array.isArray(condition?.schedule?.weekdays) ? condition.schedule.weekdays : [],
      },
    })) : workflow.conditions,
    actions: Array.isArray(workflow.actions) ? workflow.actions.map((action) => ({
      ...action,
      message: action?.type === "pay-bills" && !action.message ? "all" : action.message,
      safety: { ...DEFAULT_SAFETY, ...(isRecord(action?.safety) ? action.safety : {}) },
    })) : workflow.actions,
  };
}

export function normalizeAssistantAutomation(candidate, conversationId, currentDraft = null) {
  const stable = safeConversationId(conversationId);
  const normalized = normalizeWorkflowShape(candidate);
  return {
    ...normalized,
    id: currentDraft?.id || `ai-${stable}`,
    active: false,
    runs: currentDraft?.runs || 0,
    conditions: normalized.conditions.map((condition, index) => ({
      ...condition,
      id: currentDraft?.conditions?.[index]?.id || `condition-${stable}-${index + 1}`,
    })),
    actions: normalized.actions.map((action, index) => {
      const isFixedTransfer = ["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type)
        && action.amountMode === "fixed" && positiveNumber(action.value);
      const recommendedSafety = isFixedTransfer && !action.safety.maxAmountOn
        ? { ...action.safety, maxAmountOn: true, maxAmount: action.value }
        : action.safety;
      return {
        ...action,
        safety: recommendedSafety,
        id: currentDraft?.actions?.[index]?.id || `action-${stable}-${index + 1}`,
      };
    }),
  };
}

export function requiresAiReview(metadata) {
  return metadata?.generation_source === "ai" && metadata.review_status === "needs_review";
}

export function createAiMetadata(previous = null, now = new Date().toISOString()) {
  return {
    generation_source: "ai",
    review_status: "needs_review",
    status: "draft",
    enabled: false,
    published_at: null,
    activated_at: null,
    schema_version: AUTOMATION_SCHEMA_VERSION,
    created_at: previous?.created_at || now,
    updated_at: now,
  };
}

export function authorizeAiDraftPublication(automation, metadata, manualReviewConfirmed, options = {}) {
  const issues = [];
  if (metadata?.generation_source !== "ai") issues.push(issue("metadata.generation_source", "invalid_source", "السجل ليس مسودة مولدة بالذكاء الاصطناعي", "security"));
  if (metadata?.review_status !== "needs_review") issues.push(issue("metadata.review_status", "invalid_review_state", "حالة المراجعة لا تسمح بهذا الانتقال", "security"));
  if (manualReviewConfirmed !== true) issues.push(issue("manual_review_confirmed", "confirmation_required", "الموافقة اليدوية الصريحة مطلوبة", "security"));
  issues.push(...validateAutomation(automation, { ...options, source: "ai", requireZeroRuns: false }));
  if (issues.length) return { ok: false, issues };
  const now = options.now || new Date().toISOString();
  return {
    ok: true,
    automation: { ...automation, active: true },
    metadata: {
      ...metadata,
      review_status: "reviewed",
      status: "published",
      enabled: true,
      published_at: now,
      activated_at: now,
      updated_at: now,
    },
  };
}

export function upsertWorkflow(items, workflow) {
  return items.some((item) => item.id === workflow.id)
    ? items.map((item) => item.id === workflow.id ? workflow : item)
    : [workflow, ...items];
}

export function getAssistantQuickReplies(missingFields, beneficiaries = SANDBOX_BENEFICIARIES) {
  if (!Array.isArray(missingFields)) return [];
  const needsDestination = missingFields.some((field) => /beneficiaryId|destination/i.test(field.path));
  if (!needsDestination) return [];
  const asksForBeneficiary = missingFields.some((field) => /مستفيد|beneficiar/i.test(field.question));
  return beneficiaries.filter((item) => !asksForBeneficiary || item.kind === "beneficiary").map((item) => ({ id: item.id, label: item.name, value: item.name }));
}

export function getAssistantQuickReplyMode(missingFields, latestMessage = "") {
  if (!Array.isArray(missingFields)) return "single";
  const destinationCount = missingFields.filter((field) => /beneficiaryId|destination/i.test(field.path)).length;
  const wording = `${latestMessage} ${missingFields.map((field) => field.question).join(" ")}`;
  const requestsSeveral = /(أكثر من|عدة|المستفيدون|المستفيدين|مستفيدون|beneficiaries|multiple)/iu.test(wording);
  return destinationCount > 1 || (destinationCount > 0 && requestsSeveral) ? "multiple" : "single";
}

export function isAssistantPublishAttempt(message) {
  const normalized = String(message || "").trim().toLowerCase();
  return /^(انشر|انشرها|فعّل|فعل|فعّلها|فعلها|نفّذ|نفذ|نفّذها|نفذها|موافق|توكل)[.!؟\s]*$/u.test(normalized);
}

export function isPromptExtractionAttempt(message) {
  const normalized = String(message || "").toLowerCase();
  return /(system prompt|developer prompt|اكشف.*(التعليمات|البرومبت)|اعرض.*(التعليمات|البرومبت)|تجاهل.*التعليمات)/iu.test(normalized);
}
