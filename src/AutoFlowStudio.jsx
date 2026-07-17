import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  BanknoteArrowDown,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  CircleDollarSign,
  CreditCard,
  FileText,
  Landmark,
  ListChecks,
  MessageCircle,
  Mic,
  Pause,
  PencilLine,
  Plus,
  ReceiptText,
  Repeat2,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
  WalletCards,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { actionNeedsApproval, evaluateSafety, evaluateWorkflow, resolveActionAmount } from "./workflowEngine.js";
import VoiceAssistant from "./VoiceAssistant.jsx";
import {
  ACTION_TYPES,
  AUTOMATION_ACTION_EXAMPLES,
  AUTOMATION_CATEGORIES,
  AUTOMATION_TRIGGER_EXAMPLES,
  BILL_PAYMENT_TARGETS,
  DEFAULT_SCHEDULE,
  SANDBOX_BENEFICIARIES,
  SANDBOX_BILL_SERVICES,
  TRIGGER_TYPES,
  createAiMetadata,
  getActionDestinations,
  makeAction,
  makeCondition,
  makeManualWorkflow,
  normalizeWorkflowShape,
  requiresAiReview,
  upsertWorkflow,
  validateAutomation,
} from "./automationContract.js";
import "./shortcut.css";

const WORKFLOWS_KEY = "autoflow-shortcuts-v2";
const HISTORY_KEY = "autoflow-shortcut-history-v1";
const PROCESSED_KEY = "autoflow-shortcut-processed-v1";
const AI_METADATA_KEY = "autoflow-ai-metadata-v1";
const AI_CONVERSATION_KEY = "autoflow-ai-conversation-v1";

const eventTypeDefinitions = [
  { id: "salary", label: "وصل الراتب", hint: "إيداع راتب تجريبي بقيمة 500", icon: BanknoteArrowDown, amount: 500, direction: "inflow", description: "AutoFlow Payroll", primary: true },
  { id: "incoming", label: "وصلت حوالة", hint: "حوالة واردة تجريبية بقيمة 250", icon: WalletCards, amount: 250, direction: "inflow", description: "Incoming Transfer", primary: true },
  { id: "bill-due", label: "فاتورة مستحقة", hint: "إنشاء فاتورة كهرباء بقيمة 120", icon: ReceiptText, amount: 120, direction: "outflow", description: "Electricity Bill Due", primary: true },
  { id: "large-expense", label: "تم شراء كبير", hint: "عملية شراء تجريبية بقيمة 350", icon: ShoppingCart, amount: 350, direction: "outflow", description: "Large Card Purchase", primary: true },
  { id: "subscription", label: "حان موعد اشتراك", hint: "خصم اشتراك تجريبي بقيمة 15", icon: Repeat2, amount: 15, direction: "outflow", description: "Netflix Subscription" },
  { id: "balance-below", label: "الرصيد أصبح منخفضاً", hint: "محاكاة وصول الرصيد إلى حد منخفض", icon: ShieldCheck, amount: 50, localOnly: true },
  { id: "month-end", label: "وصلنا لنهاية الشهر", hint: "تشغيل أتمتات نهاية الشهر", icon: CalendarClock, amount: 0, localOnly: true },
  { id: "scheduled", label: "موعد محدد أو متكرر", hint: "يعمل تلقائيًا حسب التاريخ والوقت", icon: CalendarClock, amount: 0, localOnly: true, hiddenFromConsole: true },
];
const eventTypes = TRIGGER_TYPES.map((id) => eventTypeDefinitions.find((item) => item.id === id));

const actionTypeDefinitions = [
  { id: "save", label: "تحويل للادخار", icon: CircleDollarSign, money: true },
  { id: "internal-transfer", label: "تحويل داخلي", icon: ArrowLeftRight, money: true },
  { id: "beneficiary-transfer", label: "تحويل لمستفيد", icon: WalletCards, money: true },
  { id: "split", label: "تقسيم المبلغ", icon: Workflow, money: true },
  { id: "pay-bills", label: "سداد المستحقات", icon: ReceiptText, money: true },
  { id: "notify", label: "إرسال إشعار", icon: Bell },
  { id: "categorize", label: "تصنيف المصروف", icon: ListChecks },
  { id: "pause", label: "إيقاف أتمتات أخرى", icon: Pause },
];
const actionTypes = ACTION_TYPES.map((id) => actionTypeDefinitions.find((item) => item.id === id));
const subscriptionServices = SANDBOX_BILL_SERVICES.filter((service) => service.kind === "subscription");

const automationIcons = [
  { id: "sparkles", label: "عام", icon: Sparkles },
  { id: "wallet", label: "ادخار", icon: WalletCards },
  { id: "receipt", label: "فواتير", icon: ReceiptText },
  { id: "shield", label: "حماية", icon: ShieldCheck },
  { id: "bell", label: "تنبيه", icon: Bell },
  { id: "calendar", label: "موعد", icon: CalendarClock },
];

const automationColors = [
  { id: "gray", label: "رمادي", value: "#718087" },
  { id: "coral", label: "مرجاني", value: "#ef795f" },
  { id: "teal", label: "فيروزي", value: "#23859b" },
  { id: "green", label: "أخضر", value: "#2e9d72" },
  { id: "gold", label: "ذهبي", value: "#c99032" },
  { id: "violet", label: "بنفسجي", value: "#8267c7" },
];

const eventHelp = {
  salary: "يبدأ عندما تُسجل دفعة راتب في الحساب.",
  incoming: "يبدأ عند وصول حوالة مالية إلى الحساب.",
  "bill-due": "يبدأ عند ظهور فاتورة حان موعد سدادها.",
  "large-expense": "يبدأ عند تسجيل عملية شراء بالمبلغ الذي تحدده.",
  subscription: "يبدأ عند خصم اشتراك دوري من الحساب.",
  "balance-below": "يبدأ عندما يصبح الرصيد أقل من الحد الذي تكتبه.",
  "month-end": "يبدأ عند الوصول إلى آخر يوم من الشهر.",
  scheduled: "يبدأ تلقائيًا في التاريخ والوقت أو حسب التكرار الذي تحدده.",
};

const scheduleModes = [
  { id: "once", label: "مرة واحدة" },
  { id: "daily", label: "يوميًا" },
  { id: "weekly", label: "أسبوعيًا" },
  { id: "monthly", label: "شهريًا" },
];

const weekdayOptions = [
  { id: "sun", label: "الأحد" }, { id: "mon", label: "الاثنين" }, { id: "tue", label: "الثلاثاء" },
  { id: "wed", label: "الأربعاء" }, { id: "thu", label: "الخميس" }, { id: "fri", label: "الجمعة" }, { id: "sat", label: "السبت" },
];

const actionHelp = {
  save: "ينقل المبلغ إلى حساب الادخار التجريبي.",
  "internal-transfer": "ينقل المبلغ بين حساباتك التجريبية.",
  "beneficiary-transfer": "يرسل المبلغ إلى مستفيد تختاره.",
  split: "يوجّه جزءاً من مبلغ الحدث إلى الوجهة المختارة.",
  "pay-bills": "يسدد الفاتورة أو الاشتراك الذي تختاره عند استحقاقه.",
  notify: "يعرض لك رسالة بعد وصول الأتمتة إلى هذه الخطوة.",
  categorize: "يضع تصنيفاً واضحاً على العملية المالية.",
  pause: "يوقف الأتمتات الأخرى مؤقتاً عند تنفيذ هذه الخطوة.",
};

function loadList(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function loadObject(key, fallback = {}) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function conditionLabel(condition) {
  const event = eventTypes.find((item) => item.id === condition.type);
  if (!event) return condition.type;
  if (condition.type === "scheduled") {
    const schedule = condition.schedule || DEFAULT_SCHEDULE;
    if (schedule.mode === "once") return `${event.label} · ${schedule.date} ${schedule.time}`;
    if (schedule.mode === "weekly") return `${event.label} · ${schedule.weekdays.map((day) => weekdayOptions.find((item) => item.id === day)?.label).filter(Boolean).join("، ")} ${schedule.time}`;
    if (schedule.mode === "monthly") return `${event.label} · يوم ${schedule.dayOfMonth} الساعة ${schedule.time}`;
    return `${event.label} · يوميًا ${schedule.time}`;
  }
  if (["gte", "lte"].includes(condition.operator)) return `${event.label} ${condition.operator === "gte" ? "بأكثر من" : "بأقل من"} ${condition.value}`;
  return event.label;
}

function actionLabel(action) {
  return actionTypes.find((item) => item.id === action.type)?.label || action.type;
}

function actionSummary(action) {
  const billTarget = action.type === "pay-bills"
    ? BILL_PAYMENT_TARGETS.find((item) => item.id === action.message)?.label
    : "";
  const destination = action.type === "save"
    ? "حساب الادخار"
    : SANDBOX_BENEFICIARIES.find((item) => item.id === action.beneficiaryId)?.name;
  const amount = ["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type) && action.value
    ? `${action.value}${action.amountMode === "percent" ? "%" : " ريال"}`
    : "";
  return [actionLabel(action), billTarget, amount, destination].filter(Boolean).join(" · ");
}

function actionSafetySummary(action) {
  const limits = [];
  if (action.safety?.minBalanceOn) limits.push(`أقل رصيد ${action.safety.minBalance} ريال`);
  if (action.safety?.maxAmountOn) limits.push(`أعلى تحويل ${action.safety.maxAmount} ريال`);
  if (action.safety?.dailyLimitOn) limits.push(`الحد اليومي ${action.safety.dailyLimit} ريال`);
  if (action.safety?.hoursOn) limits.push(`ساعات التنفيذ ${action.safety.startHour}:00–${action.safety.endHour}:00`);
  return limits;
}

function automationColor(colorId) {
  return automationColors.find((item) => item.id === colorId)?.value || automationColors[0].value;
}

function AutomationIcon({ iconId = "sparkles" }) {
  const Icon = automationIcons.find((item) => item.id === iconId)?.icon || Sparkles;
  return <Icon />;
}

function ShortcutEditor({ workflow, beneficiaries, account, metadata, close, save, requestPublish }) {
  const [draft, setDraft] = useState(() => structuredClone({
    ...normalizeWorkflowShape(workflow),
    category: workflow.category || "شخصية",
    color: workflow.color || "gray",
    icon: workflow.icon || "sparkles",
  }));
  const [openActionId, setOpenActionId] = useState(draft.actions[0]?.id || null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const isAiDraft = requiresAiReview(metadata);
  const usesScheduledBalance = draft.conditions.some((condition) => condition.type === "scheduled");
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const updateCondition = (id, patch) => update({ conditions: draft.conditions.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateSchedule = (id, patch) => update({ conditions: draft.conditions.map((item) => item.id === id ? { ...item, schedule: { ...DEFAULT_SCHEDULE, ...item.schedule, ...patch } } : item) });
  const updateAction = (id, patch) => update({ actions: draft.actions.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const moveAction = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.actions.length) return;
    const actions = [...draft.actions];
    [actions[index], actions[nextIndex]] = [actions[nextIndex], actions[index]];
    update({ actions });
  };
  const issues = validateAutomation(draft, { source: "manual", beneficiaries }).map((item) => item.message);
  const isComplete = issues.length === 0;
  const finishWithAnimation = (callback) => {
    setIsClosing(true);
    window.setTimeout(callback, 200);
  };
  const requestClose = () => finishWithAnimation(close);
  const requestSave = () => {
    if (!isComplete) {
      setShowValidation(true);
      return;
    }
    finishWithAnimation(() => save(draft));
  };
  const requestAiPublish = () => {
    if (!isComplete) {
      setShowValidation(true);
      return;
    }
    requestPublish({ ...draft, active: false });
  };

  return (
    <div className={`shortcut-editor-layer ${isClosing ? "is-closing" : ""}`}>
      <section className="shortcut-editor" role="dialog" aria-modal="true" aria-label="محرر أتمتة متقدم">
        <header className="shortcut-editor__header">
          <button type="button" onClick={requestClose} aria-label="إغلاق"><X /></button>
          <div className="shortcut-editor__title"><span>إنشاء أتمتة جديدة</span><strong>رتّبها بالطريقة التي تناسبك</strong></div>
          <button type="button" className="shortcut-help-button" onClick={() => setGuideOpen(true)} aria-label="شرح طريقة بناء الأتمتة" title="شرح طريقة بناء الأتمتة"><CircleHelp /></button>
          <div className="shortcut-editor__primary-actions">
            <button type="button" className="save-shortcut" onClick={requestSave}><CheckCircle2 /> {isAiDraft ? "حفظ للمراجعة" : "حفظ"}</button>
            {isAiDraft && <button type="button" className="publish-ai-draft" onClick={requestAiPublish}><ShieldCheck /> نشر بعد المراجعة</button>}
          </div>
        </header>

        <div className="shortcut-editor__progress shortcut-editor__progress--simple"><span className={draft.conditions.length ? "is-done" : ""}>1 حدث البدء</span><i /><span className={draft.actions.length ? "is-done" : ""}>2 خطوات التنفيذ</span></div>
        {isAiDraft && <div className="ai-review-banner" role="status"><Sparkles /><div><strong>تحتاج إلى مراجعة</strong><span>تم إنشاء هذه المسودة باستخدام الذكاء الاصطناعي، ولم يتم تفعيلها. راجع جميع الخطوات قبل النشر.</span><small>المصدر: {account?.name || "الحساب الجاري المتصل"} · وجهة الادخار الثابتة: {beneficiaries.find((item) => item.kind === "internal")?.name || "حساب الادخار"}</small></div></div>}
        {showValidation && !isComplete && <div className="shortcut-validation" role="alert"><strong>باقي خطوة بسيطة قبل الحفظ</strong><span>{issues[0]}</span></div>}

        <div className="shortcut-editor__scroll">
          <section className="shortcut-identity" style={{ "--automation-color": automationColor(draft.color) }}>
            <div className="shortcut-identity__heading"><span className="shortcut-identity__icon"><AutomationIcon iconId={draft.icon} /></span><div><small>هوية الأتمتة</small><h2>سمِّها ونظِّمها</h2><p>يسهّل عليك العثور عليها لاحقًا بين أتمتاتك.</p></div></div>
            <label className="shortcut-identity__name"><span>اسم الأتمتة</span><input value={draft.name} onChange={(event) => update({ name: event.target.value })} aria-label="اسم الأتمتة" placeholder="مثال: ادخار من الراتب" /></label>
            <div className="shortcut-identity__options">
              <label><span>التصنيف</span><select value={draft.category} onChange={(event) => update({ category: event.target.value })}>{AUTOMATION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
              <div><span>لون الأتمتة</span><div className="color-swatches" role="group" aria-label="لون الأتمتة">{automationColors.map((color) => <button key={color.id} type="button" className={draft.color === color.id ? "is-selected" : ""} style={{ "--swatch-color": color.value }} onClick={() => update({ color: color.id })} aria-label={color.label} title={color.label} />)}</div></div>
              <div><span>أيقونة الأتمتة</span><div className="icon-choices" role="group" aria-label="أيقونة الأتمتة">{automationIcons.map((item) => <button key={item.id} type="button" className={draft.icon === item.id ? "is-selected" : ""} onClick={() => update({ icon: item.id })} aria-label={item.label} title={item.label}><item.icon /></button>)}</div></div>
            </div>
          </section>

          <section className="shortcut-block-section shortcut-block-section--conditions">
            <div className="shortcut-section-heading"><div><small>متى تبدأ الأتمتة؟</small><h2>أحداث وشروط البدء</h2><p>اختر الحدث، ثم حدّد علاقته بالشرط الذي قبله.</p></div></div>
            <div className="shortcut-stack">
              {draft.conditions.map((condition, index) => {
                const meta = eventTypes.find((item) => item.id === condition.type);
                const Icon = meta?.icon || CalendarClock;
                const joinWith = condition.joinWith || (draft.match === "any" ? "or" : "and");
                return <React.Fragment key={condition.id}>
                  {index > 0 && <div className="condition-joiner">
                    <div className="condition-joiner__buttons" role="group" aria-label={`العلاقة بين الشرط ${index} والشرط ${index + 1}`}>
                      <button type="button" className={joinWith === "and" ? "is-selected" : ""} onClick={() => updateCondition(condition.id, { joinWith: "and" })}>و</button>
                      <button type="button" className={joinWith === "or" ? "is-selected" : ""} onClick={() => updateCondition(condition.id, { joinWith: "or" })}>أو</button>
                    </div>
                    <span>{joinWith === "and" ? "يجب أن يتحقق الشرطان معاً" : "يكفي أن يتحقق أحد الشرطين"}</span>
                  </div>}
                  <article className="shortcut-block condition-block">
                  <span className="block-order">{index + 1}</span><span className="block-icon"><Icon /></span>
                  <div className="block-fields">
                    <select className={!condition.type ? "is-placeholder" : ""} value={condition.type} onChange={(event) => updateCondition(condition.id, { type: event.target.value })}><option value="">اختر الحدث الذي يبدأ الأتمتة</option>{eventTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                    {condition.type && <small className="field-help">{eventHelp[condition.type]}</small>}
                    {condition.type && <small className="field-example"><b>مثال</b><span>{AUTOMATION_TRIGGER_EXAMPLES[condition.type]}</span></small>}
                    {condition.type === "scheduled" && <div className="schedule-settings">
                      <label><span>التكرار</span><select aria-label="نوع التكرار" value={condition.schedule.mode} onChange={(event) => updateSchedule(condition.id, { mode: event.target.value })}>{scheduleModes.map((mode) => <option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
                      {condition.schedule.mode === "once" && <label><span>التاريخ</span><input aria-label="تاريخ التنفيذ" type="date" value={condition.schedule.date} onChange={(event) => updateSchedule(condition.id, { date: event.target.value })} /></label>}
                      {condition.schedule.mode === "monthly" && <label><span>يوم الشهر</span><input aria-label="يوم الشهر" type="number" min="1" max="31" value={condition.schedule.dayOfMonth} onChange={(event) => updateSchedule(condition.id, { dayOfMonth: event.target.value })} placeholder="مثال: 1" /></label>}
                      <label><span>الوقت</span><input aria-label="وقت التنفيذ" type="time" value={condition.schedule.time} onChange={(event) => updateSchedule(condition.id, { time: event.target.value })} /></label>
                      {condition.schedule.mode === "weekly" && <div className="schedule-weekdays" role="group" aria-label="أيام التكرار">{weekdayOptions.map((day) => { const selected = condition.schedule.weekdays.includes(day.id); return <button key={day.id} type="button" className={selected ? "is-selected" : ""} onClick={() => updateSchedule(condition.id, { weekdays: selected ? condition.schedule.weekdays.filter((item) => item !== day.id) : [...condition.schedule.weekdays, day.id] })}>{day.label}</button>; })}</div>}
                      <small>المنطقة الزمنية: الرياض (Asia/Riyadh)</small>
                    </div>}
                    {condition.type && !["balance-below", "month-end", "scheduled"].includes(condition.type) && <div className="inline-settings"><select aria-label="تحديد مبلغ الحدث" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.target.value })}><option value="any">مهما كان المبلغ</option><option value="gte">إذا كان المبلغ يساوي أو يزيد عن</option><option value="lte">إذا كان المبلغ يساوي أو يقل عن</option></select>{condition.operator !== "any" && <input aria-label="قيمة المبلغ" type="number" min="0" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} placeholder="مثال: 500" />}</div>}
                    {condition.type === "balance-below" && <input type="number" min="0" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} placeholder="مثال: 1000" />}
                    {condition.type === "subscription" && <label><span>اختر الاشتراك</span><select aria-label="اختر الاشتراك" value={condition.merchant} onChange={(event) => updateCondition(condition.id, { merchant: event.target.value })}>
                      <option value="">أي اشتراك دوري</option>
                      {condition.merchant && !subscriptionServices.some((service) => service.name === condition.merchant) && <option value={condition.merchant}>{condition.merchant}</option>}
                      {subscriptionServices.map((service) => <option key={service.id} value={service.name}>{service.name}</option>)}
                    </select></label>}
                  </div>
                  <button className="block-delete" type="button" onClick={() => update({ conditions: draft.conditions.filter((item) => item.id !== condition.id) })} aria-label="حذف الشرط"><Trash2 /></button>
                  </article>
                </React.Fragment>;
              })}
            </div>
            {!draft.conditions.length && <div className="builder-empty"><CalendarClock /><strong>لم تحدد حدث البدء بعد</strong><span>ابدأ باختيار الحدث الذي سيشغّل الأتمتة.</span></div>}
            <button className="add-shortcut-block" type="button" onClick={() => update({ conditions: [...draft.conditions, makeCondition("", "and")] })}><Plus /> {draft.conditions.length ? "إضافة حدث أو شرط آخر" : "اختيار حدث البدء"}</button>
          </section>

          <div className="shortcut-connector"><i /><span>ثم نفّذ بالترتيب</span><i /></div>

          <section className="shortcut-block-section shortcut-block-section--actions">
            <div className="shortcut-section-heading"><div><small>ماذا تفعل الأتمتة؟</small><h2>خطوات التنفيذ بالترتيب</h2><p>تُنفذ الخطوة رقم 1 أولاً، ثم التي تحتها. سنطلب موافقتك دائمًا بشكل افتراضي.</p></div><span>{draft.actions.length} خطوات</span></div>
            <div className="shortcut-stack">
              {draft.actions.map((action, index) => {
                const meta = actionTypes.find((item) => item.id === action.type);
                const Icon = meta?.icon || Settings2;
                const expanded = openActionId === action.id;
                const actionDestinations = getActionDestinations(action.type, beneficiaries);
                return <article className={`shortcut-block action-block ${expanded ? "is-expanded" : ""}`} key={action.id}>
                  <div className="action-block__head">
                    <button className="action-block__summary" type="button" onClick={() => setOpenActionId(expanded ? null : action.id)} aria-expanded={expanded}>
                      <span className="block-order">{index + 1}</span><span className="block-icon"><Icon /></span><span><strong>{meta?.label || "اختر نوع خطوة التنفيذ"}</strong><small>{!action.type ? "لم يتم اختيار الإجراء بعد" : action.approval.mode === "auto" ? "ينفذ تلقائياً" : action.approval.mode === "always" ? "ينتظر موافقتي" : action.approval.mode === "above" ? `يطلب موافقتي فوق ${action.approval.threshold || "مبلغ تحدده"}` : "اختر طريقة الموافقة"}</small></span><Settings2 />
                    </button>
                    <div className="action-block__quick-move" aria-label={`تغيير ترتيب الخطوة ${index + 1}`}>
                      <button type="button" onClick={() => moveAction(index, -1)} disabled={index === 0} title="نقل هذه الخطوة للأعلى"><ArrowUp /> أعلى</button>
                      <button type="button" onClick={() => moveAction(index, 1)} disabled={index === draft.actions.length - 1} title="نقل هذه الخطوة للأسفل"><ArrowDown /> أسفل</button>
                    </div>
                  </div>
                  {expanded && <div className="action-block__settings">
                    <label><span>ماذا تنفذ هذه الخطوة؟</span><select className={!action.type ? "is-placeholder" : ""} value={action.type} onChange={(event) => updateAction(action.id, { type: event.target.value, beneficiaryId: "", ...(event.target.value === "pay-bills" ? { message: "all" } : {}) })}><option value="">اختر الإجراء</option>{actionTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                    {action.type && <small className="field-help">{actionHelp[action.type]}</small>}
                    {action.type && <small className="field-example"><b>مثال</b><span>{AUTOMATION_ACTION_EXAMPLES[action.type]}</span></small>}
                    {meta?.money && action.type !== "pay-bills" && <div className="two-fields"><label><span>كيف يُحسب المبلغ؟</span><select value={action.amountMode} onChange={(event) => updateAction(action.id, { amountMode: event.target.value })}><option value="percent">{usesScheduledBalance ? "نسبة من الرصيد المتاح وقت التنفيذ" : "نسبة من مبلغ الحدث"}</option><option value="fixed">مبلغ ثابت أحدده</option></select></label><label><span>{action.amountMode === "percent" ? "النسبة المئوية" : "المبلغ"}</span><input type="number" min="0" max={action.amountMode === "percent" ? "100" : undefined} value={action.value} onChange={(event) => updateAction(action.id, { value: event.target.value })} placeholder={action.amountMode === "percent" ? "مثال: 10" : "مثال: 500"} /></label></div>}
                    {action.type === "pay-bills" && <label><span>ما الذي تريد سداده؟</span><select value={action.message || "all"} onChange={(event) => updateAction(action.id, { message: event.target.value })}>{BILL_PAYMENT_TARGETS.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label>}
                    {action.type === "save" && <div className="field-help field-help--fixed">سيُحوّل تلقائيًا إلى حساب الادخار التجريبي.</div>}
                    {["internal-transfer", "beneficiary-transfer", "split"].includes(action.type) && <label><span>إلى أين يذهب المبلغ؟</span><select className={!action.beneficiaryId ? "is-placeholder" : ""} value={action.beneficiaryId} onChange={(event) => updateAction(action.id, { beneficiaryId: event.target.value })}><option value="">{action.type === "internal-transfer" ? "اختر أحد حساباتي" : action.type === "beneficiary-transfer" ? "اختر المستفيد" : "اختر الحساب أو المستفيد"}</option>{actionDestinations.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.account}</option>)}</select></label>}
                    {["notify", "categorize"].includes(action.type) && <label><span>{action.type === "notify" ? "نص الإشعار" : "التصنيف"}</span><input value={action.message} onChange={(event) => updateAction(action.id, { message: event.target.value })} placeholder={action.type === "notify" ? "مثال: تم تنفيذ الأتمتة" : "مثال: اشتراكات"} /></label>}

                    <div className="action-block__tools"><button type="button" onClick={() => update({ actions: draft.actions.filter((item) => item.id !== action.id) })}><Trash2 /> حذف خطوة التنفيذ</button></div>
                  </div>}
                </article>;
              })}
            </div>
            {!draft.actions.length && <div className="builder-empty"><Workflow /><strong>لا توجد خطوات تنفيذ بعد</strong><span>أضف الخطوة الأولى ثم اختر ما الذي تريد من AutoFlow تنفيذه.</span></div>}
            <button className="add-shortcut-block add-shortcut-block--action" type="button" onClick={() => { const action = makeAction(); update({ actions: [...draft.actions, action] }); setOpenActionId(action.id); }}><Plus /> {draft.actions.length ? "إضافة خطوة تنفيذ جديدة" : "إضافة أول خطوة تنفيذ"}</button>
          </section>
        </div>

        {guideOpen && <div className="shortcut-guide-layer">
          <section className="shortcut-guide" role="dialog" aria-modal="true" aria-label="دليل بناء الأتمتة">
            <header><div><CircleHelp /><span><small>دليل سريع</small><h2>كيف أبني أتمتة مالية؟</h2></span></div><button type="button" onClick={() => setGuideOpen(false)} aria-label="إغلاق الدليل"><X /></button></header>
            <div className="shortcut-guide__content">
              <p className="shortcut-guide__intro">الأتمتة عبارة عن أحداث تبدأها، ثم خطوات ينفذها AutoFlow بالترتيب.</p>
              <article><b>1</b><div><strong>اختر متى تبدأ</strong><p>مثلاً: عند نزول الراتب، أو عند استحقاق فاتورة. يمكنك إضافة أكثر من شرط.</p></div></article>
              <article><b>2</b><div><strong>اربط الشروط بـ «و» أو «أو»</strong><p><b>و</b> تعني أن الشرطين مطلوبان معاً. <b>أو</b> تعني أن تحقق أحدهما يكفي. تُقرأ العلاقات من الأعلى إلى الأسفل.</p></div></article>
              <article><b>3</b><div><strong>أضف خطوات التنفيذ</strong><p>اختر التحويل أو السداد أو الإشعار، ثم استخدم زري «أعلى» و«أسفل» لتحديد ترتيب التنفيذ.</p></div></article>
              <article><b>4</b><div><strong>راجعها بعد الإنشاء</strong><p>سنطلب موافقتك دائمًا بشكل افتراضي. ويمكنك تعديل حدود الأمان لاحقًا من «الخيارات المتقدمة» في بطاقة الأتمتة.</p></div></article>
              <div className="shortcut-guide__example"><strong>مثال واضح</strong><span>نزل الراتب <b>و</b> الرصيد أعلى من الحد</span><i>ثم</i><span>حوّل 20% للادخار ← سدّد الفواتير ← أرسل إشعاراً</span></div>
            </div>
            <button className="shortcut-guide__done" type="button" onClick={() => setGuideOpen(false)}>فهمت، ابدأ البناء</button>
          </section>
        </div>}
      </section>
    </div>
  );
}

function SafetySetting({
  label,
  help,
  checked,
  value,
  onToggle,
  onValue = /** @type {(value: any) => void} */ (() => {}),
  isHours = false,
  onHours = /** @type {(start: any, end: any) => void} */ (() => {}),
}) {
  const [start = "6", end = "23"] = String(value).split("-");
  return <div className={`safety-setting ${checked ? "is-on" : ""}`}><label><input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} /><span><strong>{label}</strong><small>{help}</small></span></label>{checked && (isHours ? <div className="hour-fields"><input aria-label="ساعة البداية" type="number" min="0" max="23" value={start} onChange={(event) => onHours(event.target.value, end)} /><b>إلى</b><input aria-label="ساعة النهاية" type="number" min="1" max="24" value={end} onChange={(event) => onHours(start, event.target.value)} /></div> : <input aria-label={label} type="number" min="0" value={value} onChange={(event) => onValue(event.target.value)} />)}</div>;
}

function AdvancedWorkflowSettings({ workflow, close, save }) {
  const [draft, setDraft] = useState(() => ({
    ...structuredClone(normalizeWorkflowShape(workflow)),
    actions: normalizeWorkflowShape(workflow).actions.map((action) => ({
      ...action,
      approval: { ...action.approval, mode: action.approval?.mode || "always" },
    })),
  }));
  const updateAction = (id, patch) => setDraft((current) => ({
    ...current,
    actions: current.actions.map((action) => action.id === id ? { ...action, ...patch } : action),
  }));
  const invalidAction = draft.actions.find((action) => {
    const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
    if (action.safety.minBalanceOn && !positive(action.safety.minBalance)) return true;
    if (action.safety.maxAmountOn && !positive(action.safety.maxAmount)) return true;
    if (action.safety.dailyLimitOn && !positive(action.safety.dailyLimit)) return true;
    if (action.safety.hoursOn) {
      const start = Number(action.safety.startHour);
      const end = Number(action.safety.endHour);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 || start >= end) return true;
    }
    return action.approval.mode === "above" && !positive(action.approval.threshold);
  });

  return <div className="advanced-settings-layer">
    <section className="advanced-settings" role="dialog" aria-modal="true" aria-labelledby="advanced-settings-title">
      <header>
        <button type="button" onClick={close} aria-label="إغلاق الخيارات المتقدمة"><X /></button>
        <div><small>خيارات متقدمة</small><h2 id="advanced-settings-title">{draft.name}</h2><p>هذه الإعدادات اختيارية، والموافقة مطلوبة دائمًا بشكل افتراضي.</p></div>
        <span><Settings2 /></span>
      </header>
      <div className="advanced-settings__scroll">
        {draft.actions.map((action, index) => <article className="advanced-action-settings" key={action.id}>
          <div className="advanced-action-settings__title"><span>{index + 1}</span><div><small>خطوة التنفيذ</small><strong>{actionSummary(action)}</strong></div></div>
          <div className="advanced-settings__section">
            <div className="block-settings-title"><ShieldCheck /><div><strong>حدود الأمان</strong><small>فعّل فقط الحدود التي تحتاجها.</small></div></div>
            <div className="safety-grid">
              <SafetySetting label="اترك رصيدًا لا يقل عن" help="تُمنع الخطوة إذا أصبح الرصيد أقل من هذا المبلغ." checked={action.safety.minBalanceOn} value={action.safety.minBalance} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, minBalanceOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, minBalance: value } })} />
              <SafetySetting label="ضع حدًا أعلى للعملية" help="لا تنفذ هذه الخطوة إذا تجاوزت المبلغ المحدد." checked={action.safety.maxAmountOn} value={action.safety.maxAmount} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, maxAmountOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, maxAmount: value } })} />
              <SafetySetting label="ضع حدًا يوميًا" help="يمنع تجاوز إجمالي التحويلات لهذا الحد في اليوم." checked={action.safety.dailyLimitOn} value={action.safety.dailyLimit} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, dailyLimitOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, dailyLimit: value } })} />
              <SafetySetting label="حدد ساعات التنفيذ" help="لا تعمل الخطوة خارج الوقت المحدد." checked={action.safety.hoursOn} value={`${action.safety.startHour}-${action.safety.endHour}`} isHours onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, hoursOn: checked } })} onHours={(startHour, endHour) => updateAction(action.id, { safety: { ...action.safety, startHour, endHour } })} />
            </div>
          </div>
          <div className="advanced-settings__section">
            <div className="block-settings-title"><ShieldCheck /><div><strong>متى نطلب موافقتك؟</strong><small>الخيار الافتراضي والأكثر أمانًا: دائمًا.</small></div></div>
            <div className="approval-choice">{[["always", "اطلب موافقتي دائمًا"], ["above", "اطلبها فوق مبلغ"], ["auto", "نفّذ تلقائيًا"]].map(([value, label]) => <button type="button" key={value} className={action.approval.mode === value ? "is-selected" : ""} onClick={() => updateAction(action.id, { approval: { ...action.approval, mode: value } })}>{label}</button>)}</div>
            {action.approval.mode === "above" && <label className="advanced-threshold"><span>اطلب الموافقة عندما يتجاوز المبلغ</span><input type="number" min="0" value={action.approval.threshold} onChange={(event) => updateAction(action.id, { approval: { ...action.approval, threshold: event.target.value } })} /></label>}
          </div>
        </article>)}
      </div>
      {invalidAction && <div className="advanced-settings__error" role="alert">أكمل قيمة الحد الذي فعّلته قبل الحفظ.</div>}
      <footer><button type="button" onClick={close}>إلغاء</button><button type="button" disabled={Boolean(invalidAction)} onClick={() => save(draft)}><CheckCircle2 /> حفظ الخيارات</button></footer>
    </section>
  </div>;
}

function makeConversationId() {
  return globalThis.crypto?.randomUUID?.() || `conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newAssistantConversation() {
  return {
    conversation_id: makeConversationId(),
    messages: [{
      id: "welcome",
      role: "assistant",
      content: "صف لي الأتمتة التي تريدها، وسأجهزها لك كمسودة قابلة للمراجعة.",
    }],
    state: {
      user_provided: {},
      inferred_values: {},
      default_values: {},
      missing_required_fields: [],
      draft: null,
    },
    quick_replies: [],
    quick_reply_mode: "single",
  };
}

function AutomationAssistant({ account, financialSnapshot, bills, workflows, workflowMetadata, onDraft, openDraft, open, initialMode, onClose }) {
  const [conversation, setConversation] = useState(() => {
    const stored = loadObject(AI_CONVERSATION_KEY, null);
    return stored?.conversation_id && Array.isArray(stored.messages) ? stored : newAssistantConversation();
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedReplies, setSelectedReplies] = useState([]);
  const [mode, setMode] = useState("text");

  useEffect(() => localStorage.setItem(AI_CONVERSATION_KEY, JSON.stringify(conversation)), [conversation]);
  useEffect(() => {
    if (open) setMode(initialMode || "text");
  }, [open, initialMode]);
  useEffect(() => {
    const currentWorkflow = workflows.find((workflow) => workflow.id === `ai-${conversation.conversation_id}`);
    if (!currentWorkflow || currentWorkflow === conversation.state?.draft) return;
    if (JSON.stringify(currentWorkflow) === JSON.stringify(conversation.state?.draft)) return;
    setConversation((current) => ({ ...current, state: { ...current.state, draft: currentWorkflow } }));
  }, [workflows, conversation.conversation_id]);

  const resetConversation = () => {
    setConversation(newAssistantConversation());
    setError("");
    setInput("");
    setSelectedReplies([]);
  };

  const acceptDraft = (automation, metadata) => {
    setConversation((current) => ({ ...current, state: { ...current.state, draft: automation } }));
    onDraft(automation, metadata, { openReview: mode === "text" });
  };

  const submitMessage = async (rawMessage) => {
    const message = String(rawMessage || "").trim();
    if (!message || busy) return;
    const userMessage = { id: `user-${Date.now()}`, role: "user", content: message };
    const recentMessages = [...conversation.messages, userMessage].map(({ role, content }) => ({ role, content }));
    setConversation((current) => ({ ...current, messages: [...current.messages, userMessage], quick_replies: [], quick_reply_mode: "single" }));
    setSelectedReplies([]);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/automation-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "conversation",
          conversation_id: conversation.conversation_id,
          message,
          state: conversation.state,
          account: account ? { id: account.id, name: account.name, type: account.type, currency: account.currency } : null,
          financial_snapshot: financialSnapshot ? {
            source: financialSnapshot.source,
            connected: financialSnapshot.connected,
            syncedAt: financialSnapshot.syncedAt,
            account: financialSnapshot.account,
            latestSalary: financialSnapshot.latestSalary,
            recentTransactions: financialSnapshot.recentTransactions?.slice(0, 30) || [],
            insights: { recurringCandidates: financialSnapshot.insights?.recurringCandidates?.slice(0, 10) || [] },
          } : null,
          bills: bills?.slice(0, 20) || [],
          conversation_summary: "",
           recent_messages: recentMessages,
           current_metadata: workflowMetadata?.[conversation.state?.draft?.id] || null,
         }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر تشغيل المساعد الآن");
      const assistantMessage = { id: `assistant-${Date.now()}`, role: "assistant", content: result.assistant_message };
      setConversation((current) => ({
        ...current,
        messages: [...current.messages, assistantMessage],
        state: result.state,
        quick_replies: result.quick_replies || [],
        quick_reply_mode: result.quick_reply_mode || "single",
      }));
      if (result.action === "create_draft" && result.automation) acceptDraft(result.automation, result.metadata);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const draft = conversation.state?.draft;
  if (!open) return null;
  return <div className="assistant-drawer-layer" role="presentation">
    <button className="assistant-drawer-backdrop" type="button" onClick={onClose} aria-label="إغلاق مساعد AutoFlow" />
    <section className="automation-assistant automation-assistant--drawer" role="dialog" aria-modal="true" aria-label="مساعد إنشاء الأتمتة">
    <header><span><Sparkles /></span><div><small>مساعد AutoFlow</small><h2>وش تبي تسوي؟</h2></div><div className="assistant-header-actions"><button type="button" onClick={resetConversation} title="بدء محادثة جديدة" aria-label="محادثة جديدة"><RotateCcw /></button><button type="button" onClick={onClose} title="إغلاق" aria-label="إغلاق المساعد"><X /></button></div></header>
    <div className="assistant-mode-tabs" role="tablist" aria-label="طريقة إنشاء الأتمتة">
      <button type="button" role="tab" aria-selected={mode === "text"} className={mode === "text" ? "is-active" : ""} onClick={() => setMode("text")}>اكتب ما تريد</button>
      <button type="button" role="tab" aria-selected={mode === "voice"} className={mode === "voice" ? "is-active" : ""} onClick={() => setMode("voice")}><Mic /> تحدث مع AutoFlow</button>
    </div>
    {mode === "text" ? <>
    <div className="automation-assistant__messages" aria-live="polite" role="log">
      {conversation.messages.map((message) => <div key={message.id} className={`assistant-message assistant-message--${message.role}`}><span>{message.content}</span></div>)}
      {busy && <div className="assistant-message assistant-message--assistant assistant-message--loading"><i /><i /><i /><span>أجهز المسودة الآمنة…</span></div>}
    </div>
    {conversation.quick_replies?.length > 0 && <div className="assistant-quick-replies">{conversation.quick_replies.map((reply) => {
      const selected = selectedReplies.includes(reply.id);
      return <button type="button" className={selected ? "is-selected" : ""} key={reply.id} onClick={() => conversation.quick_reply_mode === "multiple" ? setSelectedReplies((items) => selected ? items.filter((id) => id !== reply.id) : [...items, reply.id]) : submitMessage(reply.value)} disabled={busy}>{selected && <CheckCircle2 />} {reply.label}</button>;
    })}{conversation.quick_reply_mode === "multiple" && <button type="button" className="assistant-quick-replies__confirm" disabled={busy || !selectedReplies.length} onClick={() => submitMessage(`المستفيدون المختارون: ${conversation.quick_replies.filter((reply) => selectedReplies.includes(reply.id)).map((reply) => reply.value).join("، ")}`)}>اعتماد المستفيدين ({selectedReplies.length})</button>}</div>}
    {draft && <div className="assistant-understanding"><div><Sparkles /><span><strong>ما فهمه المساعد</strong><small>{draft.conditions.map(conditionLabel).join("، ")} ← {draft.actions.map(actionSummary).join("، ")}</small></span></div><button type="button" onClick={() => openDraft(draft.id)}>فتح المسودة في المحرر <ChevronLeft /></button></div>}
    {error && <div className="assistant-error" role="alert"><AlertTriangle /><span>{error}</span></div>}
    <form onSubmit={(event) => { event.preventDefault(); submitMessage(input); }}>
      <input value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} maxLength={2000} placeholder="مثال: إذا نزل راتبي حوّل 10% إلى الادخار" aria-label="وصف الأتمتة" />
      <button type="submit" disabled={busy || !input.trim()} aria-label="إرسال"><Send /></button>
    </form>
    <footer><ShieldCheck /><span>ينشئ مسودة غير مفعلة فقط. النشر يتم يدويًا بعد المراجعة.</span></footer>
    </> : <VoiceAssistant
      key={conversation.conversation_id}
      conversationId={conversation.conversation_id}
      draft={draft}
      metadata={workflowMetadata?.[draft?.id] || null}
      account={account}
      conditionLabels={draft ? draft.conditions.map(conditionLabel) : []}
      actionLabels={draft ? draft.actions.map(actionSummary) : []}
      safetyLabels={draft ? draft.actions.flatMap(actionSafetySummary) : []}
      onDraft={acceptDraft}
      onReview={openDraft}
      onReset={resetConversation}
    />}
    </section>
  </div>;
}

export default function AutoFlowStudio({ announce, financialSnapshot, refreshFinancialData, updateFinancialSnapshot, connectLean, leanConnectBusy, beneficiaries, transfers, bills, createTransfer, addBill, payBills }) {
  const [workflows, setWorkflows] = useState(() => loadList(WORKFLOWS_KEY, []).map(normalizeWorkflowShape));
  const [workflowMetadata, setWorkflowMetadata] = useState(() => loadObject(AI_METADATA_KEY, {}));
  const [history, setHistory] = useState(() => loadList(HISTORY_KEY, []));
  const [processed, setProcessed] = useState(() => loadList(PROCESSED_KEY, []));
  const [eventFacts, setEventFacts] = useState({});
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [editor, setEditor] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab] = useState("flows");
  const [busyEvent, setBusyEvent] = useState(null);
  const [showMoreEvents, setShowMoreEvents] = useState(false);
  const [showTestTools, setShowTestTools] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMode, setAssistantMode] = useState("text");
  const [advancedTarget, setAdvancedTarget] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState("");
  const currency = financialSnapshot?.account?.currency || "SAR";
  const rawBalance = Number(financialSnapshot?.account?.availableBalance ?? financialSnapshot?.account?.currentBalance ?? 0);
  const provider = financialSnapshot?.provider || { active: "plaid", status: financialSnapshot?.connected ? "connected" : "demo" };
  const virtualOutflow = transfers.filter((item) => item.status === "completed" && !item.plaidRecorded).reduce((sum, item) => sum + item.amount, 0);
  const balance = Math.max(0, rawBalance - virtualOutflow);
  const pendingApproval = approvalQueue[0] || null;
  const today = new Date().toISOString().slice(0, 10);
  const todayTransfers = transfers.filter((item) => item.date === today && item.status === "completed").reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows)), [workflows]);
  useEffect(() => localStorage.setItem(AI_METADATA_KEY, JSON.stringify(workflowMetadata)), [workflowMetadata]);
  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem(PROCESSED_KEY, JSON.stringify(processed.slice(-300))), [processed]);

  const addHistory = (status, title, detail) => setHistory((items) => [{ id: `log-${Date.now()}-${Math.random()}`, status, title, detail, time: new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit" }).format(new Date()) }, ...items].slice(0, 60));

  const postSandbox = async (payload) => {
    const response = await fetch("/api/plaid-snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Sandbox event failed");
    const snapshot = await response.json();
    if (provider.active === "plaid") updateFinancialSnapshot((current) => ({ ...snapshot, provider: current?.provider || provider }));
    return snapshot;
  };

  const recordSandboxAction = async (payload) => {
    try {
      await postSandbox(payload);
      return true;
    } catch {
      addHistory("warning", "اكتمل محليًا فقط", "تعذر تسجيل المعاملة داخل بيئة الاختبار، ولم تتوقف الأتمتة");
      return false;
    }
  };

  const executeAction = async (run, action) => {
    const amount = resolveActionAmount(action, run);
    if (["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type)) {
      const beneficiary = beneficiaries.find((item) => item.id === action.beneficiaryId) || beneficiaries[0];
      const plaidRecorded = await recordSandboxAction({ action: "record-execution", amount, currency, description: `AutoFlow - ${beneficiary.name}` });
      createTransfer({ id: `transfer-${Date.now()}`, workflowId: run.workflowId, beneficiaryId: beneficiary.id, beneficiaryName: beneficiary.name, amount, currency, date: today, status: "completed", plaidRecorded, note: run.workflowTitle });
      addHistory("success", "تم التحويل افتراضيًا", `${formatMoney(amount, currency)} إلى ${beneficiary.name}`);
    } else if (action.type === "pay-bills") {
      const targetId = action.message || "all";
      const due = bills.filter((bill) => bill.status === "due" && (targetId === "all" || bill.serviceId === targetId));
      if (run.primaryFact?.bill && (targetId === "all" || run.primaryFact.bill.serviceId === targetId) && !due.some((bill) => bill.id === run.primaryFact.bill.id)) due.push(run.primaryFact.bill);
      const total = due.reduce((sum, bill) => sum + bill.amount, 0);
      const targetLabel = BILL_PAYMENT_TARGETS.find((target) => target.id === targetId)?.label || "المستحقات";
      if (!due.length) addHistory("skipped", "لا توجد مستحقات", `${run.workflowTitle} لم يجد مستحقًا لـ ${targetLabel}`);
      else {
        payBills(due.map((bill) => bill.id));
        await recordSandboxAction({ action: "record-execution", amount: total, currency, description: `AutoFlow - ${targetLabel}` });
        addHistory("success", "تم السداد افتراضيًا", `${targetLabel} · ${formatMoney(total, currency)}`);
      }
    } else if (action.type === "notify") addHistory("success", "تم إرسال إشعار", action.message);
    else if (action.type === "categorize") addHistory("success", "تم تصنيف العملية", action.message || "مصروف تلقائي");
    else if (action.type === "pause") addHistory("success", "تم تعليق الأتمتات الاختيارية", run.workflowTitle);
  };

  const continueRun = async (run, startIndex = 0) => {
    for (let index = startIndex; index < run.actions.length; index += 1) {
      const action = run.actions[index];
      const amount = resolveActionAmount(action, run);
      const failures = evaluateSafety(action, amount, { balance, todayTransfers });
      if (failures.length) {
        addHistory("blocked", "منع شرط الأمان الإجراء", `${actionLabel(action)} · ${failures.join("، ")}`);
        continue;
      }
      if (actionNeedsApproval(action, amount)) {
        setApprovalQueue((queue) => [...queue, { id: `approval-${Date.now()}-${index}`, run, action, actionIndex: index, amount }]);
        addHistory("approval", "بانتظار الموافقة", `${run.workflowTitle} · ${actionLabel(action)}`);
        return;
      }
      await executeAction(run, action);
    }
    setWorkflows((items) => items.map((item) => item.id === run.workflowId ? { ...item, runs: (item.runs || 0) + 1, lastRunAt: new Date().toISOString() } : item));
  };

  const runMatchingWorkflows = async (facts, options = {}) => {
    const context = { balance, todayTransfers, now: options.now || new Date() };
    const matches = workflows.map((workflow) => evaluateWorkflow(workflow, facts, context, processed)).filter(Boolean);
    if (!matches.length && !options.silent) addHistory("idle", "لم ترتبط أتمتة بالحدث", "يمكنك إنشاء اختصار جديد لهذا الحدث");
    for (const run of matches) {
      setProcessed((keys) => [...new Set([...keys, run.signature])].slice(-300));
      addHistory("detected", "تم تفعيل الأتمتة", `${run.workflowTitle} · ${run.primaryFact.label}`);
      await continueRun(run, 0);
    }
    return matches.length;
  };

  useEffect(() => {
    let running = false;
    const checkSchedules = async () => {
      if (running || !workflows.some((workflow) => workflow.active && workflow.conditions.some((condition) => condition.type === "scheduled"))) return;
      running = true;
      try {
        await runMatchingWorkflows(eventFacts, { silent: true, now: new Date() });
      } finally {
        running = false;
      }
    };
    checkSchedules();
    const timer = window.setInterval(checkSchedules, 30_000);
    return () => window.clearInterval(timer);
  }, [workflows, processed, balance, todayTransfers, eventFacts]);

  const fireEvent = async (eventMeta) => {
    setBusyEvent(eventMeta.id);
    const bill = eventMeta.id === "bill-due" ? { id: `bill-${Date.now()}`, serviceId: "electricity", name: "فاتورة الكهرباء", amount: eventMeta.amount, currency, dueDate: today, status: "due", source: "بيئة AutoFlow التجريبية" } : null;
    const event = { id: `event-${eventMeta.id}-${Date.now()}`, type: eventMeta.id, amount: eventMeta.amount, merchant: eventMeta.description, label: eventMeta.label, bill, createdAt: new Date().toISOString() };
    try {
      if (!eventMeta.localOnly) {
        try {
          await postSandbox({ action: eventMeta.id === "salary" ? "inject-salary" : "inject-event", direction: eventMeta.direction, amount: eventMeta.amount, currency, description: `${eventMeta.description} ${Date.now()}` });
        } catch {
          addHistory("warning", "الحدث يعمل محليًا", `${eventMeta.label} لم يُسجل في مزود البيانات هذه المرة`);
        }
      }
      if (bill) addBill(bill);
      const facts = { ...eventFacts, [eventMeta.id]: event };
      setEventFacts(facts);
      addHistory("event", "تم تشغيل حدث", `${eventMeta.label} · ${eventMeta.amount ? formatMoney(eventMeta.amount, currency) : "بدون مبلغ"}`);
      const matchedCount = await runMatchingWorkflows(facts);
      setLastEvent({ label: eventMeta.label, matchedCount });
    } catch {
      addHistory("blocked", "تعذر تشغيل الحدث", eventMeta.label);
      announce("تعذر الاتصال ببيئة البيانات التجريبية");
    } finally {
      setBusyEvent(null);
    }
  };

  const approve = async () => {
    if (!pendingApproval) return;
    setApprovalQueue((queue) => queue.slice(1));
    await executeAction(pendingApproval.run, pendingApproval.action);
    await continueRun(pendingApproval.run, pendingApproval.actionIndex + 1);
    announce("تمت الموافقة وتنفيذ البلوكات التالية");
  };

  const reject = () => {
    if (!pendingApproval) return;
    addHistory("rejected", "رُفض الإجراء", `${pendingApproval.run.workflowTitle} · ${actionLabel(pendingApproval.action)}`);
    setApprovalQueue((queue) => queue.slice(1));
  };

  const saveWorkflow = (workflow) => {
    const metadata = workflowMetadata[workflow.id];
    if (requiresAiReview(metadata)) {
      const inactiveDraft = { ...workflow, active: false };
      setWorkflows((items) => upsertWorkflow(items, inactiveDraft));
      setWorkflowMetadata((items) => ({ ...items, [workflow.id]: createAiMetadata(items[workflow.id]) }));
      setEditor(null);
      announce("تم حفظ مسودة الذكاء الاصطناعي وهي تحتاج إلى مراجعة");
      return;
    }
    setWorkflows((items) => upsertWorkflow(items, workflow));
    setEditor(null);
    announce("تم حفظ الاختصار وتفعيله");
  };

  const saveAiDraft = (workflow, serverMetadata = null, options = {}) => {
    const inactiveDraft = { ...workflow, active: false, runs: 0 };
    setWorkflows((items) => upsertWorkflow(items, inactiveDraft));
    setWorkflowMetadata((items) => ({ ...items, [workflow.id]: createAiMetadata({ ...items[workflow.id], ...serverMetadata }) }));
    if (options.openReview) setEditor(inactiveDraft);
    announce("جهزت لك مسودة غير مفعلة للمراجعة");
  };

  const openDraftById = (id) => {
    const workflow = workflows.find((item) => item.id === id);
    if (workflow) setEditor(workflow);
  };

  const requestPublishFromEditor = (workflow) => {
    const inactiveDraft = { ...workflow, active: false };
    setWorkflows((items) => upsertWorkflow(items, inactiveDraft));
    setWorkflowMetadata((items) => ({ ...items, [workflow.id]: createAiMetadata(items[workflow.id]) }));
    setEditor(null);
    setPublishError("");
    setPublishTarget(inactiveDraft);
  };

  const publishAiWorkflow = async () => {
    if (!publishTarget || publishBusy) return;
    setPublishBusy(true);
    setPublishError("");
    try {
      const response = await fetch("/api/automation-publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "publish_ai_draft",
          source: "editor",
          manual_review_confirmed: true,
          automation: { ...publishTarget, active: false },
          metadata: workflowMetadata[publishTarget.id] || createAiMetadata(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "لم تجتز المسودة تحقق النشر");
      setWorkflows((items) => upsertWorkflow(items, result.automation));
      setWorkflowMetadata((items) => ({ ...items, [publishTarget.id]: result.metadata }));
      setPublishTarget(null);
      announce("تم نشر الأتمتة وتفعيلها بعد المراجعة اليدوية");
    } catch (requestError) {
      setPublishError(requestError.message);
    } finally {
      setPublishBusy(false);
    }
  };

  const deleteWorkflow = () => {
    if (!deleteTarget) return;
    setWorkflows((items) => items.filter((item) => item.id !== deleteTarget.id));
    setWorkflowMetadata((items) => Object.fromEntries(Object.entries(items).filter(([id]) => id !== deleteTarget.id)));
    setApprovalQueue((queue) => queue.filter((item) => item.run.workflowId !== deleteTarget.id));
    setEditor((current) => current?.id === deleteTarget.id ? null : current);
    announce(`تم حذف أتمتة ${deleteTarget.name} نهائيًا`);
    setDeleteTarget(null);
  };

  const newWorkflow = () => setEditor(makeManualWorkflow());
  const saveAdvancedSettings = (workflow) => {
    setWorkflows((items) => upsertWorkflow(items, workflow));
    setAdvancedTarget(null);
    announce("تم حفظ الخيارات المتقدمة");
  };
  const openAssistant = (mode = "text") => {
    setAssistantMode(mode);
    setAssistantOpen(true);
  };

  const eventCount = useMemo(() => Object.keys(eventFacts).length, [eventFacts]);
  const primaryEvents = eventTypes.filter((event) => event.primary);
  const additionalEvents = eventTypes.filter((event) => !event.primary && !event.hiddenFromConsole);
  const workflowCategories = useMemo(() => Object.entries(workflows.reduce((counts, item) => {
    const category = item.category || "شخصية";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {})).sort(([, firstCount], [, secondCount]) => secondCount - firstCount).map(([category]) => category), [workflows]);
  const visibleCategories = workflowCategories.slice(0, 2);
  const moreCategories = workflowCategories.slice(2);
  const visibleWorkflows = useMemo(() => categoryFilter === "all" ? workflows : workflows.filter((item) => (item.category || "شخصية") === categoryFilter), [categoryFilter, workflows]);
  const renderEventButton = ({ icon: Icon, ...event }) => <button className="event-choice" type="button" key={event.id} disabled={Boolean(busyEvent)} onClick={() => fireEvent({ ...event, icon: Icon })}>
    <span className="event-choice__icon"><Icon /></span>
    <span className="event-choice__copy"><strong>{event.label}</strong><small>{event.hint}</small></span>
    <ChevronLeft className="event-choice__arrow" />
    {busyEvent === event.id && <i className="event-choice__loader" />}
  </button>;

  return <div className="shortcut-studio">
    <header className="shortcut-studio__header"><div><span className="shortcut-logo"><Workflow /></span><div><h1>AutoFlow</h1><span><i /> جاهز للعمل</span></div></div></header>
    <section className={`financial-provider-card financial-provider-card--${provider.status}`} aria-label="مصدر البيانات المالية">
      <span><Landmark /></span>
      <div>
        <small>{provider.status === "connected" ? "الحساب البنكي" : "مصدر البيانات"}</small>
        <strong>{provider.active === "lean" ? "Lean السعودية" : "بيانات تجريبية"}</strong>
        <p>{provider.status === "connected" && provider.active === "lean"
          ? "حسابك متصل بموافقتك عبر الخدمات المصرفية المفتوحة."
          : provider.status === "connection_required"
            ? "اربط حسابك البنكي لقراءة الرصيد والمعاملات بموافقتك."
            : provider.status === "syncing"
              ? "تم الربط، وLean يجهز بيانات البنك. حدّث بعد اكتمال المزامنة."
            : provider.status === "fallback"
              ? "Lean غير متاح الآن؛ استمرت البيانات التجريبية دون تعطيل AutoFlow."
              : "AutoFlow يعمل بأمان على بيانات العرض الحالية."}</p>
      </div>
      {provider.status === "syncing"
        ? <button type="button" onClick={refreshFinancialData}>تحديث</button>
        : ["connection_required", "fallback"].includes(provider.status) && <button type="button" onClick={connectLean} disabled={leanConnectBusy}>{leanConnectBusy ? "جارٍ الفتح…" : provider.status === "fallback" ? "إعادة الربط" : "ربط الحساب"}</button>}
    </section>
    <button className="create-automation-primary" type="button" onClick={newWorkflow}>
      <span><Plus /></span>
      <span><strong>إنشاء أتمتة جديدة</strong><small>اختر متى تبدأ وماذا تنفّذ</small></span>
      <ChevronLeft />
    </button>

    {!workflows.length ? <section className="automation-empty-state">
      <span className="automation-empty-state__icon"><Sparkles /></span>
      <small>خلها علينا</small>
      <h2>وش ودك يصير تلقائيًا؟</h2>
      <p>قل لـ AutoFlow طلبك بكلماتك، وهو يجهز لك مسودة آمنة تراجعها قبل تشغيلها.</p>
      <button type="button" onClick={() => openAssistant("text")}><MessageCircle /> تحدث مع المساعد</button>
      <button className="automation-empty-state__manual" type="button" onClick={newWorkflow}>أو أنشئها يدويًا</button>
    </section> : <>
    <div className="shortcut-tabs" role="tablist"><button role="tab" aria-selected={activeTab === "flows"} className={activeTab === "flows" ? "is-active" : ""} onClick={() => setActiveTab("flows")}>أتمتاتي</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "is-active" : ""} onClick={() => setActiveTab("history")}>ما الذي تم تنفيذه؟</button></div>

    {activeTab === "flows" ? <section className="shortcut-list">
      <div className="shortcut-list__heading"><div><h2>أتمتاتي</h2><span>{workflows.filter((item) => item.active).length} من {workflows.length} تعمل الآن</span></div></div>
      {workflowCategories.length > 1 && <div className="workflow-category-filter" aria-label="تصفية الأتمتات حسب التصنيف"><span>اعرض:</span><div>
        <button className={categoryFilter === "all" ? "is-active" : ""} type="button" onClick={() => { setCategoryFilter("all"); setShowMoreCategories(false); }}>كل الأتمتات</button>
        {visibleCategories.map((category) => <button key={category} className={categoryFilter === category ? "is-active" : ""} type="button" onClick={() => { setCategoryFilter(category); setShowMoreCategories(false); }}>{category}</button>)}
        {moreCategories.length > 0 && <span className="workflow-category-filter__more"><button className={moreCategories.includes(categoryFilter) ? "is-active" : ""} type="button" onClick={() => setShowMoreCategories((open) => !open)} aria-expanded={showMoreCategories}>المزيد <ChevronDown /></button>{showMoreCategories && <span role="menu">{moreCategories.map((category) => <button key={category} role="menuitem" className={categoryFilter === category ? "is-active" : ""} type="button" onClick={() => { setCategoryFilter(category); setShowMoreCategories(false); }}>{category}</button>)}</span>}</span>}
      </div></div>}
      {visibleWorkflows.length ? visibleWorkflows.map((workflow) => {
        const metadata = workflowMetadata[workflow.id];
        const needsReview = requiresAiReview(metadata);
        return <article className={`shortcut-card ${workflow.active ? "is-active" : ""} ${needsReview ? "needs-review" : ""}`} style={{ "--automation-color": automationColor(workflow.color) }} key={workflow.id}>
          {needsReview && <div className="ai-review-badge"><Sparkles /> تحتاج إلى مراجعة</div>}
          <div className="shortcut-card__top">
            <span className="shortcut-card__icon"><AutomationIcon iconId={workflow.icon} /></span>
            <div><strong>{workflow.name}</strong><small>{workflow.category || "شخصية"} · {workflow.conditions.length + workflow.actions.length} خطوات</small></div>
            <div className="shortcut-card__controls">
              <button className="shortcut-card__advanced" type="button" onClick={() => setAdvancedTarget(workflow)} aria-label={`الخيارات المتقدمة لـ ${workflow.name}`} title="خيارات متقدمة"><Settings2 /></button>
              {needsReview
                ? <button className="review-ai-button" type="button" onClick={() => setEditor(workflow)}>مراجعة ونشر</button>
                : <button className={`shortcut-toggle ${workflow.active ? "is-on" : ""}`} type="button" onClick={() => setWorkflows((items) => items.map((item) => item.id === workflow.id ? { ...item, active: !item.active } : item))} aria-label={`${workflow.active ? "إيقاف" : "تشغيل"} ${workflow.name}`}><i /></button>}
            </div>
          </div>
          <div className="shortcut-pipeline"><div><small>عندما</small>{workflow.conditions.map((condition) => <span key={condition.id}>{conditionLabel(condition)}</span>)}</div><ChevronLeft /><div><small>ينفّذ</small>{workflow.actions.map((action) => <span key={action.id}>{actionSummary(action)}</span>)}</div></div>
          <footer><span>{needsReview ? "غير مفعلة · راجعها قبل النشر" : workflow.runs ? `نُفذت ${workflow.runs} مرة` : "لم يصل حدث مطابق بعد"}</span><div><button type="button" onClick={() => setEditor(workflow)}><PencilLine /> تعديل</button><button className="shortcut-card__delete" type="button" onClick={() => setDeleteTarget(workflow)} aria-label={`حذف ${workflow.name}`} title="حذف الأتمتة"><Trash2 /></button></div></footer>
        </article>;
      }) : <div className="shortcut-filter-empty"><ListChecks /><strong>لا توجد أتمتات ضمن «{categoryFilter}»</strong><span>اختر تصنيفًا آخر أو أنشئ أتمتة جديدة.</span></div>}
      <section className="test-tools-disclosure">
        <button type="button" onClick={() => setShowTestTools((value) => !value)} aria-expanded={showTestTools}>
          <span><Zap /><span><strong>اختبار الأتمتات</strong><small>شغّل حدثًا تجريبيًا بأمان</small></span></span><ChevronDown />
        </button>
        {showTestTools && <section className="event-console">
          <div className="event-console__heading">
            <span className="event-console__step">1</span>
            <div><small>اختبار آمن</small><h2>اختر حدثًا تجريبيًا</h2><p>سنشغّل الأتمتة المرتبطة دون تحريك أموال حقيقية.</p></div>
            <button type="button" onClick={refreshFinancialData} aria-label="تحديث بيانات الحساب" title="جلب أحدث بيانات الحساب"><Repeat2 /></button>
          </div>
          <div className="event-grid">{primaryEvents.map(renderEventButton)}</div>
          <button className={`event-more-toggle ${showMoreEvents ? "is-open" : ""}`} type="button" onClick={() => setShowMoreEvents((value) => !value)} aria-expanded={showMoreEvents}>
            <span><strong>أحداث أخرى</strong><small>اشتراك، رصيد منخفض، ونهاية الشهر</small></span><ChevronDown />
          </button>
          {showMoreEvents && <div className="event-grid event-grid--additional">{additionalEvents.map(renderEventButton)}</div>}
          {lastEvent && <div className={`event-result ${lastEvent.matchedCount ? "is-success" : "is-neutral"}`}>
            <CheckCircle2 />
            <span><strong>تمت محاكاة: {lastEvent.label}</strong><small>{lastEvent.matchedCount ? `تم تشغيل ${lastEvent.matchedCount} من الأتمتات المرتبطة. راجع النتيجة في سجل التنفيذ.` : "لا توجد أتمتة مرتبطة بهذا الحدث حالياً."}</small></span>
          </div>}
          <div className="event-account-summary">
            <span><Landmark /><small>رصيد الحساب التجريبي</small><strong>{formatMoney(balance, currency)}</strong></span>
            <span><Zap /><small>أحداث جربتها</small><strong>{eventCount}</strong></span>
            {approvalQueue.length > 0 && <span className="needs-attention"><ShieldCheck /><small>بانتظار موافقتك</small><strong>{approvalQueue.length}</strong></span>}
          </div>
        </section>}
      </section>
    </section> : <section className="shortcut-history"><header><div><h2>ما الذي تم تنفيذه؟</h2><span>نتيجة كل حدث وكل خطوة بالترتيب</span></div><button type="button" onClick={() => setHistory([])}><Trash2 /> مسح السجل</button></header>{history.length ? history.map((item) => <div className={`shortcut-log shortcut-log--${item.status}`} key={item.id}><i /><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>) : <div className="shortcut-empty"><FileText /><strong>لم تُشغّل أي أحداث بعد</strong><span>اختبر أتمتة لتظهر النتيجة هنا.</span></div>}</section>}
    </>}

    <div className="assistant-launcher" aria-label="التواصل مع مساعد AutoFlow">
      <button className="assistant-launcher__chat" type="button" onClick={() => openAssistant("text")} aria-label="فتح مساعد AutoFlow"><Sparkles /><span>اسأل AutoFlow</span></button>
    </div>
    <AutomationAssistant open={assistantOpen} initialMode={assistantMode} onClose={() => setAssistantOpen(false)} account={financialSnapshot?.account} financialSnapshot={financialSnapshot} bills={bills} workflows={workflows} workflowMetadata={workflowMetadata} onDraft={saveAiDraft} openDraft={openDraftById} />
    {advancedTarget && <AdvancedWorkflowSettings workflow={advancedTarget} close={() => setAdvancedTarget(null)} save={saveAdvancedSettings} />}
    {editor && <ShortcutEditor workflow={editor} beneficiaries={beneficiaries} account={financialSnapshot?.account} metadata={workflowMetadata[editor.id]} close={() => setEditor(null)} save={saveWorkflow} requestPublish={requestPublishFromEditor} />}
    {deleteTarget && <div className="shortcut-delete-layer"><section role="dialog" aria-modal="true" aria-labelledby="delete-automation-title"><span className="shortcut-delete-layer__icon"><AlertTriangle /></span><small>حذف نهائي</small><h2 id="delete-automation-title">حذف «{deleteTarget.name}»؟</h2><p>سيتم حذف الأتمتة وكل إعداداتها من هذا الجهاز. لا يمكن التراجع عن هذا الإجراء.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>إلغاء</button><button type="button" onClick={deleteWorkflow}><Trash2 /> حذف الأتمتة نهائيًا</button></div></section></div>}
    {pendingApproval && <div className="shortcut-approval-layer"><section role="dialog" aria-modal="true" aria-label="طلب موافقة على إجراء"><span><ShieldCheck /></span><small>طلب موافقة</small><h2>{pendingApproval.run.workflowTitle}</h2><p>{actionLabel(pendingApproval.action)}{pendingApproval.amount ? ` بقيمة ${formatMoney(pendingApproval.amount, currency)}` : ""}</p><div><button type="button" onClick={reject}>رفض</button><button type="button" onClick={approve}>موافقة ومتابعة</button></div></section></div>}
    {publishTarget && <div className="ai-publish-layer"><section role="dialog" aria-modal="true" aria-labelledby="ai-publish-title"><span className="ai-publish-layer__icon"><AlertTriangle /></span><small>تأكيد النشر اليدوي</small><h2 id="ai-publish-title">نشر «{publishTarget.name}»؟</h2><p>هذه الأتمتة تم إنشاؤها باستخدام الذكاء الاصطناعي، وقد تحتوي على أخطاء أو تنفذ إجراءات غير متوقعة.</p><p>يرجى مراجعة المحفزات والشروط والحسابات والمستفيدين والمبالغ وجميع خطوات الأتمتة قبل النشر.</p><p>هل أنت متأكد من رغبتك في نشرها؟</p>{publishError && <div className="assistant-error" role="alert"><AlertTriangle /><span>{publishError}</span></div>}<div><button type="button" onClick={() => { setPublishTarget(null); setPublishError(""); }} disabled={publishBusy}>العودة للمراجعة</button><button type="button" onClick={publishAiWorkflow} disabled={publishBusy}>{publishBusy ? "جارٍ التحقق…" : "نعم، راجعت الأتمتة وأرغب في نشرها"}</button></div></section></div>}
  </div>;
}
