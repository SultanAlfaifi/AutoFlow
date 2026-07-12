import React, { useEffect, useMemo, useState } from "react";
import {
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
  Pause,
  PencilLine,
  Plus,
  ReceiptText,
  Repeat2,
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
import "./shortcut.css";

const WORKFLOWS_KEY = "autoflow-shortcuts-v2";
const HISTORY_KEY = "autoflow-shortcut-history-v1";
const PROCESSED_KEY = "autoflow-shortcut-processed-v1";

const eventTypes = [
  { id: "salary", label: "وصل الراتب", hint: "إيداع راتب تجريبي بقيمة 500", icon: BanknoteArrowDown, amount: 500, direction: "inflow", description: "AutoFlow Payroll", primary: true },
  { id: "incoming", label: "وصلت حوالة", hint: "حوالة واردة تجريبية بقيمة 250", icon: WalletCards, amount: 250, direction: "inflow", description: "Incoming Transfer", primary: true },
  { id: "bill-due", label: "فاتورة مستحقة", hint: "إنشاء فاتورة كهرباء بقيمة 120", icon: ReceiptText, amount: 120, direction: "outflow", description: "Electricity Bill Due", primary: true },
  { id: "large-expense", label: "تم شراء كبير", hint: "عملية شراء تجريبية بقيمة 350", icon: ShoppingCart, amount: 350, direction: "outflow", description: "Large Card Purchase", primary: true },
  { id: "subscription", label: "حان موعد اشتراك", hint: "خصم اشتراك تجريبي بقيمة 15", icon: Repeat2, amount: 15, direction: "outflow", description: "Netflix Subscription" },
  { id: "balance-below", label: "الرصيد أصبح منخفضاً", hint: "محاكاة وصول الرصيد إلى حد منخفض", icon: ShieldCheck, amount: 50, localOnly: true },
  { id: "month-end", label: "وصلنا لنهاية الشهر", hint: "تشغيل أتمتات نهاية الشهر", icon: CalendarClock, amount: 0, localOnly: true },
];

const actionTypes = [
  { id: "save", label: "تحويل للادخار", icon: CircleDollarSign, money: true },
  { id: "internal-transfer", label: "تحويل داخلي", icon: ArrowLeftRight, money: true },
  { id: "beneficiary-transfer", label: "تحويل لمستفيد", icon: WalletCards, money: true },
  { id: "split", label: "تقسيم المبلغ", icon: Workflow, money: true },
  { id: "pay-bills", label: "سداد المستحقات", icon: ReceiptText, money: true },
  { id: "notify", label: "إرسال إشعار", icon: Bell },
  { id: "categorize", label: "تصنيف المصروف", icon: ListChecks },
  { id: "pause", label: "إيقاف أتمتات أخرى", icon: Pause },
];

const eventHelp = {
  salary: "يبدأ عندما تُسجل دفعة راتب في الحساب.",
  incoming: "يبدأ عند وصول حوالة مالية إلى الحساب.",
  "bill-due": "يبدأ عند ظهور فاتورة حان موعد سدادها.",
  "large-expense": "يبدأ عند تسجيل عملية شراء بالمبلغ الذي تحدده.",
  subscription: "يبدأ عند خصم اشتراك دوري من الحساب.",
  "balance-below": "يبدأ عندما يصبح الرصيد أقل من الحد الذي تكتبه.",
  "month-end": "يبدأ عند الوصول إلى آخر يوم من الشهر.",
};

const actionHelp = {
  save: "ينقل المبلغ إلى حساب الادخار التجريبي.",
  "internal-transfer": "ينقل المبلغ بين حساباتك التجريبية.",
  "beneficiary-transfer": "يرسل المبلغ إلى مستفيد تختاره.",
  split: "يوجّه جزءاً من مبلغ الحدث إلى الوجهة المختارة.",
  "pay-bills": "يسدد جميع الفواتير التي حالتها مستحقة.",
  notify: "يعرض لك رسالة بعد وصول الأتمتة إلى هذه الخطوة.",
  categorize: "يضع تصنيفاً واضحاً على العملية المالية.",
  pause: "يوقف الأتمتات الأخرى مؤقتاً عند تنفيذ هذه الخطوة.",
};

const defaultSafety = {
  minBalanceOn: false,
  minBalance: "",
  maxAmountOn: false,
  maxAmount: "",
  dailyLimitOn: false,
  dailyLimit: "",
  hoursOn: false,
  startHour: "6",
  endHour: "23",
};

const makeCondition = (type = "", joinWith = "and") => ({ id: `condition-${Date.now()}-${Math.random()}`, type, joinWith, operator: "any", value: "", merchant: "" });
const makeAction = (type = "") => ({
  id: `action-${Date.now()}-${Math.random()}`,
  type,
  amountMode: "percent",
  value: "",
  beneficiaryId: "",
  message: "",
  safety: { ...defaultSafety },
  approval: { mode: "", threshold: "" },
});

function loadList(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : fallback;
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
  if (["gte", "lte"].includes(condition.operator)) return `${event.label} ${condition.operator === "gte" ? "بأكثر من" : "بأقل من"} ${condition.value}`;
  return event.label;
}

function actionLabel(action) {
  return actionTypes.find((item) => item.id === action.type)?.label || action.type;
}

function ShortcutEditor({ workflow, beneficiaries, close, save }) {
  const [draft, setDraft] = useState(() => structuredClone(workflow));
  const [openActionId, setOpenActionId] = useState(draft.actions[0]?.id || null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const updateCondition = (id, patch) => update({ conditions: draft.conditions.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateAction = (id, patch) => update({ actions: draft.actions.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const moveAction = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= draft.actions.length) return;
    const actions = [...draft.actions];
    [actions[index], actions[nextIndex]] = [actions[nextIndex], actions[index]];
    update({ actions });
  };
  const actionIsComplete = (action) => {
    if (!action.type || !action.approval.mode) return false;
    if (action.approval.mode === "above" && !Number(action.approval.threshold)) return false;
    if (["save", "internal-transfer", "beneficiary-transfer", "split"].includes(action.type) && (!action.beneficiaryId || !Number(action.value))) return false;
    if (["notify", "categorize"].includes(action.type) && !action.message.trim()) return false;
    return true;
  };
  const isComplete = Boolean(
    draft.name.trim()
    && draft.conditions.length
    && draft.conditions.every((condition) => condition.type)
    && draft.actions.length
    && draft.actions.every(actionIsComplete),
  );
  const finishWithAnimation = (callback) => {
    setIsClosing(true);
    window.setTimeout(callback, 200);
  };
  const requestClose = () => finishWithAnimation(close);
  const requestSave = () => {
    if (!isComplete) return;
    finishWithAnimation(() => save(draft));
  };

  return (
    <div className={`shortcut-editor-layer ${isClosing ? "is-closing" : ""}`}>
      <section className="shortcut-editor" role="dialog" aria-modal="true" aria-label="محرر أتمتة متقدم">
        <header className="shortcut-editor__header">
          <button type="button" onClick={requestClose} aria-label="إغلاق"><X /></button>
          <div><span>اسم الأتمتة</span><input value={draft.name} onChange={(event) => update({ name: event.target.value })} aria-label="اسم الأتمتة" placeholder="مثال: ادخار من الراتب" /></div>
          <button type="button" className="shortcut-help-button" onClick={() => setGuideOpen(true)} aria-label="شرح طريقة بناء الأتمتة" title="شرح طريقة بناء الأتمتة"><CircleHelp /></button>
          <button type="button" className="save-shortcut" onClick={requestSave} disabled={!isComplete}><CheckCircle2 /> حفظ</button>
        </header>

        <div className="shortcut-editor__progress"><span className={draft.conditions.length ? "is-done" : ""}>1 حدث البدء</span><i /><span className={draft.actions.length ? "is-done" : ""}>2 خطوات التنفيذ</span><i /><span className={draft.actions.length && draft.actions.every((action) => action.approval.mode) ? "is-done" : ""}>3 الموافقة</span></div>

        <div className="shortcut-editor__scroll">
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
                    {condition.type && !["balance-below", "month-end"].includes(condition.type) && <div className="inline-settings"><select aria-label="تحديد مبلغ الحدث" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.target.value })}><option value="any">مهما كان المبلغ</option><option value="gte">إذا كان المبلغ يساوي أو يزيد عن</option><option value="lte">إذا كان المبلغ يساوي أو يقل عن</option></select>{condition.operator !== "any" && <input aria-label="قيمة المبلغ" type="number" min="0" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} placeholder="اكتب المبلغ" />}</div>}
                    {condition.type === "balance-below" && <input type="number" min="0" value={condition.value} onChange={(event) => updateCondition(condition.id, { value: event.target.value })} placeholder="حد الرصيد" />}
                    {condition.type === "subscription" && <input value={condition.merchant} onChange={(event) => updateCondition(condition.id, { merchant: event.target.value })} placeholder="اسم الجهة، مثل Netflix (اختياري)" />}
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
            <div className="shortcut-section-heading"><div><small>ماذا تفعل الأتمتة؟</small><h2>خطوات التنفيذ بالترتيب</h2><p>تُنفذ الخطوة رقم 1 أولاً، ثم التي تحتها.</p></div><span>{draft.actions.length} خطوات</span></div>
            <div className="shortcut-stack">
              {draft.actions.map((action, index) => {
                const meta = actionTypes.find((item) => item.id === action.type);
                const Icon = meta?.icon || Settings2;
                const expanded = openActionId === action.id;
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
                    <label><span>ماذا تنفذ هذه الخطوة؟</span><select className={!action.type ? "is-placeholder" : ""} value={action.type} onChange={(event) => updateAction(action.id, { type: event.target.value })}><option value="">اختر الإجراء</option>{actionTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                    {action.type && <small className="field-help">{actionHelp[action.type]}</small>}
                    {meta?.money && action.type !== "pay-bills" && <div className="two-fields"><label><span>كيف يُحسب المبلغ؟</span><select value={action.amountMode} onChange={(event) => updateAction(action.id, { amountMode: event.target.value })}><option value="percent">نسبة من مبلغ الحدث</option><option value="fixed">مبلغ ثابت أحدده</option></select></label><label><span>{action.amountMode === "percent" ? "النسبة المئوية" : "المبلغ"}</span><input type="number" min="0" value={action.value} onChange={(event) => updateAction(action.id, { value: event.target.value })} placeholder="اكتب القيمة" /></label></div>}
                    {["internal-transfer", "beneficiary-transfer", "split", "save"].includes(action.type) && <label><span>إلى أين يذهب المبلغ؟</span><select className={!action.beneficiaryId ? "is-placeholder" : ""} value={action.beneficiaryId} onChange={(event) => updateAction(action.id, { beneficiaryId: event.target.value })}><option value="">اختر الحساب أو المستفيد</option>{beneficiaries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
                    {["notify", "categorize"].includes(action.type) && <label><span>{action.type === "notify" ? "نص الإشعار" : "التصنيف"}</span><input value={action.message} onChange={(event) => updateAction(action.id, { message: event.target.value })} placeholder={action.type === "notify" ? "اكتب الرسالة التي ستظهر" : "اكتب اسم التصنيف"} /></label>}

                    {action.type && <><div className="block-settings-title"><ShieldCheck /><div><strong>حدود الأمان لهذه الخطوة <em>اختياري</em></strong><small>لا يوجد حد مفعّل تلقائياً. فعّل فقط ما تحتاجه.</small></div></div>
                    <div className="safety-grid">
                      <SafetySetting label="اترك في الحساب رصيداً لا يقل عن" help="تُمنع الخطوة إذا كان الرصيد بعدها أقل من هذا المبلغ." checked={action.safety.minBalanceOn} value={action.safety.minBalance} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, minBalanceOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, minBalance: value } })} />
                      <SafetySetting label="لا تنفذ مبلغاً أكبر من" help="يضع سقفاً أعلى لمبلغ هذه الخطوة الواحدة." checked={action.safety.maxAmountOn} value={action.safety.maxAmount} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, maxAmountOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, maxAmount: value } })} />
                      <SafetySetting label="لا أتجاوز هذا الإجمالي في اليوم" help="يجمع تحويلات اليوم ويمنع ما يتجاوز هذا الحد." checked={action.safety.dailyLimitOn} value={action.safety.dailyLimit} onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, dailyLimitOn: checked } })} onValue={(value) => updateAction(action.id, { safety: { ...action.safety, dailyLimit: value } })} />
                      <SafetySetting label="نفذ فقط خلال هذه الساعات" help="تُمنع الخطوة خارج وقت البداية والنهاية المحدد." checked={action.safety.hoursOn} value={`${action.safety.startHour}-${action.safety.endHour}`} isHours onToggle={(checked) => updateAction(action.id, { safety: { ...action.safety, hoursOn: checked } })} onHours={(startHour, endHour) => updateAction(action.id, { safety: { ...action.safety, startHour, endHour } })} />
                    </div>

                    <div className="block-settings-title"><ShieldCheck /><div><strong>هل تحتاج هذه الخطوة موافقتي؟</strong><small>يمكن أن تختلف الموافقة من خطوة إلى أخرى.</small></div></div>
                    <div className="approval-choice">{[["auto", "لا، نفّذها تلقائياً"], ["always", "نعم، اطلبها دائماً"], ["above", "اطلبها فوق مبلغ"]].map(([value, label]) => <button type="button" key={value} className={action.approval.mode === value ? "is-selected" : ""} onClick={() => updateAction(action.id, { approval: { ...action.approval, mode: value } })}>{label}</button>)}</div>
                    {action.approval.mode === "above" && <label><span>المبلغ الذي تبدأ بعده الموافقة</span><input type="number" min="0" value={action.approval.threshold} onChange={(event) => updateAction(action.id, { approval: { ...action.approval, threshold: event.target.value } })} /></label>}
                    </>}
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
              <p className="shortcut-guide__intro">الأتمتة عبارة عن أحداث تبدأها، ثم خطوات ينفذها AutoFlow بالترتيب مع حدود الأمان التي تختارها.</p>
              <article><b>1</b><div><strong>اختر متى تبدأ</strong><p>مثلاً: عند نزول الراتب، أو عند استحقاق فاتورة. يمكنك إضافة أكثر من شرط.</p></div></article>
              <article><b>2</b><div><strong>اربط الشروط بـ «و» أو «أو»</strong><p><b>و</b> تعني أن الشرطين مطلوبان معاً. <b>أو</b> تعني أن تحقق أحدهما يكفي. تُقرأ العلاقات من الأعلى إلى الأسفل.</p></div></article>
              <article><b>3</b><div><strong>أضف خطوات التنفيذ</strong><p>اختر التحويل أو السداد أو الإشعار، ثم استخدم زري «أعلى» و«أسفل» لتحديد ترتيب التنفيذ.</p></div></article>
              <article><b>4</b><div><strong>ضع حدود الأمان والموافقة</strong><p>حدد أقل رصيد مسموح، وسقف العملية واليوم ووقت التنفيذ، ثم قرر هل تحتاج كل خطوة موافقتك.</p></div></article>
              <div className="shortcut-guide__example"><strong>مثال واضح</strong><span>نزل الراتب <b>و</b> الرصيد أعلى من الحد</span><i>ثم</i><span>حوّل 20% للادخار ← سدّد الفواتير ← أرسل إشعاراً</span></div>
            </div>
            <button className="shortcut-guide__done" type="button" onClick={() => setGuideOpen(false)}>فهمت، ابدأ البناء</button>
          </section>
        </div>}
      </section>
    </div>
  );
}

function SafetySetting({ label, help, checked, value, onToggle, onValue, isHours = false, onHours }) {
  const [start = "6", end = "23"] = String(value).split("-");
  return <div className={`safety-setting ${checked ? "is-on" : ""}`}><label><input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} /><span><strong>{label}</strong><small>{help}</small></span></label>{checked && (isHours ? <div className="hour-fields"><input aria-label="ساعة البداية" type="number" min="0" max="23" value={start} onChange={(event) => onHours(event.target.value, end)} /><b>إلى</b><input aria-label="ساعة النهاية" type="number" min="1" max="24" value={end} onChange={(event) => onHours(start, event.target.value)} /></div> : <input aria-label={label} type="number" min="0" value={value} onChange={(event) => onValue(event.target.value)} />)}</div>;
}

export default function AutoFlowStudio({ announce, plaidSnapshot, refreshPlaid, updatePlaidSnapshot, beneficiaries, transfers, bills, createTransfer, addBill, payBills }) {
  const [workflows, setWorkflows] = useState(() => loadList(WORKFLOWS_KEY, []));
  const [history, setHistory] = useState(() => loadList(HISTORY_KEY, []));
  const [processed, setProcessed] = useState(() => loadList(PROCESSED_KEY, []));
  const [eventFacts, setEventFacts] = useState({});
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [editor, setEditor] = useState(null);
  const [activeTab, setActiveTab] = useState("flows");
  const [busyEvent, setBusyEvent] = useState(null);
  const [showMoreEvents, setShowMoreEvents] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const currency = plaidSnapshot?.account?.currency || "USD";
  const rawBalance = Number(plaidSnapshot?.account?.availableBalance ?? plaidSnapshot?.account?.currentBalance ?? 0);
  const virtualOutflow = transfers.filter((item) => item.status === "completed" && !item.plaidRecorded).reduce((sum, item) => sum + item.amount, 0);
  const balance = Math.max(0, rawBalance - virtualOutflow);
  const pendingApproval = approvalQueue[0] || null;
  const today = new Date().toISOString().slice(0, 10);
  const todayTransfers = transfers.filter((item) => item.date === today && item.status === "completed").reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows)), [workflows]);
  useEffect(() => localStorage.setItem(HISTORY_KEY, JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem(PROCESSED_KEY, JSON.stringify(processed.slice(-300))), [processed]);

  const addHistory = (status, title, detail) => setHistory((items) => [{ id: `log-${Date.now()}-${Math.random()}`, status, title, detail, time: new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit" }).format(new Date()) }, ...items].slice(0, 60));

  const postSandbox = async (payload) => {
    const response = await fetch("/api/plaid-snapshot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Sandbox event failed");
    const snapshot = await response.json();
    updatePlaidSnapshot(snapshot);
    return snapshot;
  };

  const recordSandboxAction = async (payload) => {
    try {
      await postSandbox(payload);
      return true;
    } catch {
      addHistory("warning", "اكتمل محليًا دون تسجيل Plaid", "تعذر تسجيل المعاملة الثانوية في Sandbox، ولم يتوقف الاختصار");
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
      const due = bills.filter((bill) => bill.status === "due");
      if (run.primaryFact?.bill && !due.some((bill) => bill.id === run.primaryFact.bill.id)) due.push(run.primaryFact.bill);
      const total = due.reduce((sum, bill) => sum + bill.amount, 0);
      if (!due.length) addHistory("skipped", "لا توجد مستحقات", `${run.workflowTitle} لم يجد فاتورة مستحقة`);
      else {
        payBills(due.map((bill) => bill.id));
        await recordSandboxAction({ action: "record-execution", amount: total, currency, description: "AutoFlow - Bill Payment" });
        addHistory("success", "تم سداد المستحقات افتراضيًا", `${due.length} فاتورة · ${formatMoney(total, currency)}`);
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

  const runMatchingWorkflows = async (facts) => {
    const context = { balance, todayTransfers };
    const matches = workflows.map((workflow) => evaluateWorkflow(workflow, facts, context, processed)).filter(Boolean);
    if (!matches.length) addHistory("idle", "لم ترتبط أتمتة بالحدث", "يمكنك إنشاء اختصار جديد لهذا الحدث");
    for (const run of matches) {
      setProcessed((keys) => [...new Set([...keys, run.signature])].slice(-300));
      addHistory("detected", "تم تفعيل الأتمتة", `${run.workflowTitle} · ${run.primaryFact.label}`);
      await continueRun(run, 0);
    }
    return matches.length;
  };

  const fireEvent = async (eventMeta) => {
    setBusyEvent(eventMeta.id);
    const bill = eventMeta.id === "bill-due" ? { id: `bill-${Date.now()}`, name: "فاتورة الكهرباء", amount: eventMeta.amount, currency, dueDate: today, status: "due", source: "Plaid Sandbox" } : null;
    const event = { id: `event-${eventMeta.id}-${Date.now()}`, type: eventMeta.id, amount: eventMeta.amount, merchant: eventMeta.description, label: eventMeta.label, bill, createdAt: new Date().toISOString() };
    try {
      if (!eventMeta.localOnly) {
        try {
          await postSandbox({ action: eventMeta.id === "salary" ? "inject-salary" : "inject-event", direction: eventMeta.direction, amount: eventMeta.amount, currency, description: `${eventMeta.description} ${Date.now()}` });
        } catch {
          addHistory("warning", "الحدث يعمل محليًا", `${eventMeta.label} لم يُسجل في Plaid هذه المرة`);
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
      announce("تعذر الاتصال بـ Plaid Sandbox");
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
    setWorkflows((items) => items.some((item) => item.id === workflow.id) ? items.map((item) => item.id === workflow.id ? workflow : item) : [workflow, ...items]);
    setEditor(null);
    announce("تم حفظ الاختصار وتفعيله");
  };

  const newWorkflow = () => setEditor({ id: `shortcut-${Date.now()}`, name: "", active: true, match: "all", runs: 0, conditions: [], actions: [] });

  const eventCount = useMemo(() => Object.keys(eventFacts).length, [eventFacts]);
  const primaryEvents = eventTypes.filter((event) => event.primary);
  const additionalEvents = eventTypes.filter((event) => !event.primary);
  const renderEventButton = ({ icon: Icon, ...event }) => <button className="event-choice" type="button" key={event.id} disabled={Boolean(busyEvent)} onClick={() => fireEvent({ ...event, icon: Icon })}>
    <span className="event-choice__icon"><Icon /></span>
    <span className="event-choice__copy"><strong>{event.label}</strong><small>{event.hint}</small></span>
    <ChevronLeft className="event-choice__arrow" />
    {busyEvent === event.id && <i className="event-choice__loader" />}
  </button>;

  return <div className="shortcut-studio">
    <header className="shortcut-studio__header"><div><span className="shortcut-logo"><Workflow /></span><div><h1>AutoFlow</h1><span><i /> البيانات التجريبية متصلة</span></div></div><button type="button" onClick={newWorkflow}><Plus /> أتمتة جديدة</button></header>

    {!workflows.length ? <section className="automation-empty-state">
      <span className="automation-empty-state__icon"><Sparkles /></span>
      <small>ابدأ بطريقتك</small>
      <h2>لا توجد أتمتات بعد</h2>
      <p>أنشئ أول أتمتة وحدد متى تبدأ، ماذا تنفذ، وهل تحتاج موافقتك.</p>
      <button type="button" onClick={newWorkflow}><Plus /> إنشاء أول أتمتة</button>
      <div className="automation-empty-state__steps"><span><b>1</b> اختر حدث البدء</span><span><b>2</b> أضف خطوات التنفيذ</span><span><b>3</b> حدد الموافقة</span></div>
    </section> : <>
    <section className="event-console">
      <div className="event-console__heading">
        <span className="event-console__step">1</span>
        <div><small>جرّب الأتمتة</small><h2>ما الذي حدث في الحساب؟</h2><p>اختر حدثاً واحداً. سيبحث AutoFlow عن الأتمتات المرتبطة به وينفذ خطواتها بالترتيب.</p></div>
        <button type="button" onClick={refreshPlaid} aria-label="تحديث بيانات الحساب التجريبي" title="جلب أحدث بيانات الحساب التجريبي"><Repeat2 /></button>
      </div>

      <div className="event-console__notice"><ShieldCheck /><span><strong>هذه تجربة آمنة</strong><small>الأحداث والأموال هنا افتراضية ولا تحرك أموالاً حقيقية.</small></span></div>

      <div className="event-grid">{primaryEvents.map(renderEventButton)}</div>

      <button className={`event-more-toggle ${showMoreEvents ? "is-open" : ""}`} type="button" onClick={() => setShowMoreEvents((value) => !value)} aria-expanded={showMoreEvents}>
        <span><strong>أحداث أخرى</strong><small>اشتراك، انخفاض الرصيد، ونهاية الشهر</small></span><ChevronDown />
      </button>
      {showMoreEvents && <div className="event-grid event-grid--additional">{additionalEvents.map(renderEventButton)}</div>}

      {lastEvent && <div className={`event-result ${lastEvent.matchedCount ? "is-success" : "is-neutral"}`}>
        <CheckCircle2 />
        <span><strong>تمت محاكاة: {lastEvent.label}</strong><small>{lastEvent.matchedCount ? `تم تشغيل ${lastEvent.matchedCount} من الأتمتات المرتبطة. راجع النتيجة في سجل التنفيذ.` : "لا توجد أتمتة مرتبطة بهذا الحدث حالياً. يمكنك إنشاء أتمتة جديدة له."}</small></span>
      </div>}

      <div className="event-account-summary">
        <span><Landmark /><small>رصيد الحساب التجريبي</small><strong>{formatMoney(balance, currency)}</strong></span>
        <span><Zap /><small>أحداث جربتها</small><strong>{eventCount}</strong></span>
        {approvalQueue.length > 0 && <span className="needs-attention"><ShieldCheck /><small>بانتظار موافقتك</small><strong>{approvalQueue.length}</strong></span>}
      </div>
    </section>

    <div className="shortcut-tabs" role="tablist"><button role="tab" aria-selected={activeTab === "flows"} className={activeTab === "flows" ? "is-active" : ""} onClick={() => setActiveTab("flows")}>أتمتاتي</button><button role="tab" aria-selected={activeTab === "history"} className={activeTab === "history" ? "is-active" : ""} onClick={() => setActiveTab("history")}>ما الذي تم تنفيذه؟</button></div>

    {activeTab === "flows" ? <section className="shortcut-list"><div className="shortcut-list__heading"><div><h2>أتمتاتي</h2><span>{workflows.filter((item) => item.active).length} تعمل الآن</span></div></div>{workflows.map((workflow) => <article className={`shortcut-card ${workflow.active ? "is-active" : ""}`} key={workflow.id}><div className="shortcut-card__top"><span className="shortcut-card__icon"><Sparkles /></span><div><strong>{workflow.name}</strong><small>{workflow.conditions.length} من أحداث وشروط البدء · {workflow.actions.length} من خطوات التنفيذ</small></div><button className={`shortcut-toggle ${workflow.active ? "is-on" : ""}`} type="button" onClick={() => setWorkflows((items) => items.map((item) => item.id === workflow.id ? { ...item, active: !item.active } : item))} aria-label={`${workflow.active ? "إيقاف" : "تشغيل"} ${workflow.name}`}><i /></button></div><div className="shortcut-pipeline"><div><small>تبدأ عندما</small>{workflow.conditions.map((condition) => <span key={condition.id}>{conditionLabel(condition)}</span>)}</div><ChevronLeft /><div><small>ثم تنفذ</small>{workflow.actions.map((action) => <span key={action.id}>{actionLabel(action)}</span>)}</div></div><footer><span>{workflow.runs ? `نُفذت ${workflow.runs} مرة` : "لم يصل حدث مطابق بعد"}</span><button type="button" onClick={() => setEditor(workflow)}><PencilLine /> تعديل</button></footer></article>)}</section> : <section className="shortcut-history"><header><div><h2>ما الذي تم تنفيذه؟</h2><span>نتيجة كل حدث وكل خطوة بالترتيب</span></div><button type="button" onClick={() => setHistory([])}><Trash2 /> مسح السجل</button></header>{history.length ? history.map((item) => <div className={`shortcut-log shortcut-log--${item.status}`} key={item.id}><i /><div><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>) : <div className="shortcut-empty"><FileText /><strong>لم تُشغّل أي أحداث بعد</strong><span>اختر حدثاً من مربع التجربة في الأعلى.</span></div>}</section>}
    </>}

    {editor && <ShortcutEditor workflow={editor} beneficiaries={beneficiaries} close={() => setEditor(null)} save={saveWorkflow} />}
    {pendingApproval && <div className="shortcut-approval-layer"><section role="dialog" aria-modal="true" aria-label="طلب موافقة على إجراء"><span><ShieldCheck /></span><small>طلب موافقة</small><h2>{pendingApproval.run.workflowTitle}</h2><p>{actionLabel(pendingApproval.action)}{pendingApproval.amount ? ` بقيمة ${formatMoney(pendingApproval.amount, currency)}` : ""}</p><div><button type="button" onClick={reject}>رفض</button><button type="button" onClick={approve}>موافقة ومتابعة</button></div></section></div>}
  </div>;
}
