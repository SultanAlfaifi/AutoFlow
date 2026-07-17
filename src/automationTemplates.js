import {
  DEFAULT_SCHEDULE,
  makeAction,
  makeCondition,
  makeManualWorkflow,
} from "./automationContract.js";

export const COMMON_AUTOMATION_TEMPLATES = Object.freeze([
  {
    id: "salary-savings",
    title: "ادخار من الراتب",
    description: "ادخر 10% تلقائيًا عند وصول الراتب.",
    badge: "الأكثر استخدامًا",
    icon: "salary",
    tone: "green",
  },
  {
    id: "electricity-bill",
    title: "سداد الكهرباء",
    description: "جهّز فاتورة الكهرباء للموافقة عند استحقاقها.",
    badge: "فواتير",
    icon: "receipt",
    tone: "coral",
  },
  {
    id: "monthly-family-transfer",
    title: "تحويل شهري",
    description: "حوّل 500 ريال لحساب العائلة يوم 1 من كل شهر.",
    badge: "شهري",
    icon: "calendar",
    tone: "teal",
  },
  {
    id: "low-balance-alert",
    title: "تنبيه انخفاض الرصيد",
    description: "نبّهني إذا أصبح الرصيد أقل من 1,000 ريال.",
    badge: "حماية",
    icon: "shield",
    tone: "gold",
  },
  {
    id: "water-bill",
    title: "سداد المياه",
    description: "جهّز فاتورة المياه للموافقة عند استحقاقها.",
    badge: "فواتير",
    icon: "receipt",
    tone: "blue",
  },
  {
    id: "chatgpt-subscription",
    title: "اشتراك ChatGPT",
    description: "جهّز سداد ChatGPT Plus عند موعد الاشتراك.",
    badge: "اشتراك",
    icon: "repeat",
    tone: "violet",
  },
]);

function financialAction(type, patch = {}) {
  const action = makeAction(type);
  return {
    ...action,
    ...patch,
    safety: { ...action.safety, ...(patch.safety || {}) },
    approval: { mode: "always", threshold: "", ...(patch.approval || {}) },
  };
}

export function buildAutomationTemplate(templateId, workflowId = `template-${templateId}-${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  const workflow = makeManualWorkflow(workflowId);

  if (templateId === "salary-savings") {
    return {
      ...workflow,
      name: "ادخار 10% من الراتب",
      category: "ادخار",
      color: "green",
      icon: "wallet",
      conditions: [makeCondition("salary")],
      actions: [financialAction("save", { amountMode: "percent", value: "10" })],
    };
  }

  if (templateId === "electricity-bill" || templateId === "water-bill") {
    const isElectricity = templateId === "electricity-bill";
    return {
      ...workflow,
      name: isElectricity ? "سداد فاتورة الكهرباء" : "سداد فاتورة المياه",
      category: "مدفوعات",
      color: isElectricity ? "coral" : "teal",
      icon: "receipt",
      conditions: [makeCondition("bill-due")],
      actions: [financialAction("pay-bills", {
        amountMode: "fixed",
        value: "",
        message: isElectricity ? "electricity" : "water",
      })],
    };
  }

  if (templateId === "monthly-family-transfer") {
    const condition = makeCondition("scheduled");
    condition.schedule = /** @type {any} */ ({
      ...DEFAULT_SCHEDULE,
      mode: "monthly",
      dayOfMonth: "1",
      time: "09:00",
      weekdays: [],
    });
    return {
      ...workflow,
      name: "تحويل شهري للعائلة",
      category: "تحويلات",
      color: "teal",
      icon: "calendar",
      conditions: [condition],
      actions: [financialAction("beneficiary-transfer", {
        amountMode: "fixed",
        value: "500",
        beneficiaryId: "family",
        safety: { maxAmountOn: true, maxAmount: "500" },
      })],
    };
  }

  if (templateId === "low-balance-alert") {
    const condition = makeCondition("balance-below");
    condition.operator = "lte";
    condition.value = "1000";
    return {
      ...workflow,
      name: "تنبيه انخفاض الرصيد",
      category: "حماية الرصيد",
      color: "gold",
      icon: "shield",
      conditions: [condition],
      actions: [financialAction("notify", {
        amountMode: "fixed",
        value: "",
        message: "تنبيه: أصبح رصيد الحساب أقل من 1,000 ريال.",
      })],
    };
  }

  if (templateId === "chatgpt-subscription") {
    const condition = makeCondition("subscription");
    condition.merchant = "ChatGPT Plus";
    return {
      ...workflow,
      name: "سداد اشتراك ChatGPT Plus",
      category: "مدفوعات",
      color: "violet",
      icon: "receipt",
      conditions: [condition],
      actions: [financialAction("pay-bills", {
        amountMode: "fixed",
        value: "",
        message: "chatgpt",
      })],
    };
  }

  return null;
}
