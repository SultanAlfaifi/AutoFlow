import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import AutoFlowStudio from "./AutoFlowStudio.jsx";
import { SANDBOX_BENEFICIARIES, SANDBOX_BILL_SERVICES } from "./automationContract.js";
import { connectLeanAccount } from "./leanLink.js";
import {
  ArrowLeftRight,
  BadgeCheck,
  BadgeDollarSign,
  BanknoteArrowDown,
  Bell,
  Bookmark,
  Bot,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  CircleGauge,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  FileSearch,
  Gamepad2,
  Globe2,
  Grid2X2,
  HandHeart,
  History,
  Info,
  Landmark,
  LockKeyhole,
  MapPinned,
  Moon,
  Coins,
  PencilLine,
  Plus,
  Power,
  ReceiptText,
  Repeat2,
  Search,
  Settings2,
  ShieldPlus,
  ShieldCheck,
  ShoppingCart,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  UserRoundPlus,
  UserRound,
  UsersRound,
  WalletCards,
  WandSparkles,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import "./styles.css";

const TRANSFERS_KEY = "autoflow-sandbox-transfers-v1";
const BILLS_KEY = "autoflow-sandbox-bills-v1";

function loadLocalList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function storeLocalValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function currentClock() {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function formatAccountBalance(account) {
  const amount = Number(account?.availableBalance ?? account?.currentBalance ?? 12480.75);
  const currency = account?.currency || "SAR";
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function mergeBeneficiaries(providerBeneficiaries = []) {
  const usableProviderBeneficiaries = (Array.isArray(providerBeneficiaries) ? providerBeneficiaries : [])
    .filter((beneficiary) => beneficiary?.id
      && beneficiary.name
      && (beneficiary.name !== "مستفيد بنكي" || beneficiary.account !== "مستفيد من البنك المتصل"));
  const merged = [...SANDBOX_BENEFICIARIES, ...usableProviderBeneficiaries];
  return merged.filter((beneficiary, index) => {
    const identity = `${beneficiary.id}|${beneficiary.name}|${beneficiary.account}`;
    return merged.findIndex((candidate) => `${candidate.id}|${candidate.name}|${candidate.account}` === identity) === index;
  });
}

function loadSandboxBills() {
  const existing = loadLocalList(BILLS_KEY);
  const now = new Date();
  const scenarios = SANDBOX_BILL_SERVICES.filter((service) => !existing.some((bill) => bill.serviceId === service.id)).map((service, index) => {
    const dueDate = new Date(now);
    dueDate.setDate(now.getDate() + index + 1);
    return {
      id: `sandbox-${service.id}`,
      serviceId: service.id,
      name: service.name,
      amount: service.amount,
      currency: "SAR",
      dueDate: dueDate.toISOString().slice(0, 10),
      status: "due",
      kind: service.kind,
      source: "سيناريو AutoFlow التجريبي",
    };
  });
  return [...scenarios, ...existing];
}

const quickActions = [
  { label: "دفع\nالفواتير", icon: ReceiptText, target: "payments" },
  { label: "الحوالات\nالسريعة", icon: WalletCards, target: "transfers" },
  { label: "شحن\nالجوال", icon: Smartphone, target: "payments" },
  { label: "المخالفات\nالمرورية", icon: Car, target: "services" },
];

const promos = [
  {
    kicker: "جديد الإنماء",
    title: "خلّ مالك يمشي\nعلى خطتك",
    body: "أتمت التحويلات والفواتير والادخار من مكان واحد.",
    cta: "افتح AutoFlow",
    variant: "flow",
  },
  {
    kicker: "مساعد AutoFlow",
    title: "اكتب فكرتك…\nونرتبها بلوكات",
    body: "أنت تختار حساباتك وتراجع كل خطوة قبل التفعيل.",
    cta: "افتح AutoFlow",
    variant: "ai",
  },
  {
    kicker: "معتمدة من الإنماء",
    title: "قوالب جاهزة\nلروتينك المالي",
    body: "ابدأ بقالب موثوق، ثم عدّل المبالغ والصلاحيات كما تريد.",
    cta: "ابدأ أتمتة",
    variant: "templates",
  },
];

const navItems = [
  { id: "home", label: "الرئيسية", icon: Landmark },
  { id: "transfers", label: "التحويل", icon: Repeat2 },
  { id: "payments", label: "المدفوعات", icon: ReceiptText },
  { id: "autoflow", label: "AutoFlow", icon: WandSparkles, featured: true },
  { id: "store", label: "المتجر", icon: ShoppingBag },
  { id: "services", label: "الخدمات", icon: Grid2X2 },
];

function BrandMark({ small = false }) {
  return <span className={`brand-mark ${small ? "brand-mark--small" : ""}`} aria-hidden="true"><i /></span>;
}

function FlowArt({ variant }) {
  const Icon = variant === "ai" ? Sparkles : variant === "templates" ? ShieldCheck : Zap;
  return (
    <div className={`flow-art flow-art--${variant}`} aria-hidden="true">
      <span className="flow-art__line flow-art__line--one" />
      <span className="flow-art__line flow-art__line--two" />
      <span className="flow-art__node flow-art__node--one"><CircleDollarSign /></span>
      <span className="flow-art__node flow-art__node--two"><Icon /></span>
      <span className="flow-art__node flow-art__node--three"><CreditCard /></span>
    </div>
  );
}

const transferTypes = [
  {
    id: "between-accounts",
    title: "بين حساباتي",
    description: "حوّل فورًا بين حساباتك",
    icon: ArrowLeftRight,
  },
  {
    id: "alinma",
    title: "داخل الإنماء",
    description: "إلى مستفيد مسجل في الإنماء",
    icon: Building2,
  },
  {
    id: "local",
    title: "حوالة محلية",
    description: "إلى أي بنك داخل المملكة",
    icon: MapPinned,
  },
  {
    id: "international",
    title: "حوالة دولية",
    description: "تحويل آمن إلى خارج المملكة",
    icon: Globe2,
  },
  {
    id: "charity",
    title: "التبرع لمؤسسة خيرية",
    description: "اختر من الجهات المعتمدة",
    icon: HandHeart,
  },
];

function TransfersScreen({ announce, openAutoFlow, beneficiaries = [], transfers = [] }) {
  const [favoritesOpen, setFavoritesOpen] = useState(true);

  return (
    <div className="transfers-screen">
      <header className="section-header">
        <h1>الحوالات</h1>
        <div className="section-header__actions">
          <button className="icon-button" onClick={() => announce("البحث في المستفيدين والحوالات")} aria-label="البحث في الحوالات"><Search /></button>
          <button className="icon-button" onClick={() => announce("لا توجد حوالات سابقة في النموذج")} aria-label="سجل الحوالات"><History /></button>
        </div>
      </header>

      <section className="favorites-section">
        <div className="favorites-heading">
          <button className="favorites-toggle" onClick={() => setFavoritesOpen((value) => !value)} aria-expanded={favoritesOpen}>
            المستفيدون المفضلون
            <ChevronDown className={favoritesOpen ? "is-open" : ""} />
          </button>
          <button className="manage-link" onClick={() => announce("إدارة المستفيدين") }>إدارة</button>
        </div>

        {favoritesOpen && (beneficiaries.length ? (
          <div className="sandbox-beneficiaries">
            {beneficiaries.map((beneficiary) => <button type="button" className="beneficiary-card" key={beneficiary.id} onClick={() => announce(`${beneficiary.name} جاهز للتحويل الافتراضي`)}><span>{beneficiary.name.slice(0, 1)}</span><strong>{beneficiary.name}</strong><small>{beneficiary.account}</small></button>)}
          </div>
        ) : (
          <div className="empty-favorites">
            <div className="empty-favorites__icon"><UserRoundPlus /></div>
            <strong>لا يوجد مستفيدون مفضلون!</strong>
            <button onClick={() => announce("أضف النجمة بجانب أي مستفيد ليظهر هنا") }>كيفية الإضافة؟</button>
          </div>
        ))}
      </section>

      {transfers.length > 0 && <section className="autoflow-transfer-history"><div className="autoflow-transfer-history__heading"><div><h2>حوالات AutoFlow</h2><span>تنفيذ افتراضي داخل البيئة التجريبية</span></div><History /></div>{transfers.map((transfer) => <div className="autoflow-transfer-row" key={transfer.id}><span className="autoflow-transfer-row__icon"><ArrowLeftRight /></span><div><strong>{transfer.beneficiaryName}</strong><small>{transfer.note} · {transfer.date}</small></div><div><b>- {new Intl.NumberFormat("ar-SA", { style: "currency", currency: transfer.currency || "SAR" }).format(transfer.amount)}</b><small>مكتملة</small></div></div>)}</section>}

      <button className="quick-transfer-card" onClick={() => announce("الحوالة السريعة: أدخل الآيبان بدون إضافة مستفيد") }>
        <span className="quick-transfer-card__icon"><Zap /></span>
        <span>
          <strong>حوالة سريعة</strong>
          <small>بدون إضافة مستفيد</small>
        </span>
        <ChevronLeft />
      </button>

      <section className="transfer-types">
        <div className="transfer-types__title">
          <span>نوع التحويل</span>
          <small>اختر الوجهة</small>
        </div>
        <div className="transfer-list">
          {transferTypes.map(({ id, title, description, icon: Icon }) => (
            <button key={id} onClick={() => announce(`${title}: سيتم بناء نموذج التحويل في القسم التالي`) }>
              <span className="transfer-list__icon">{id === "alinma" ? <BrandMark small /> : <Icon />}</span>
              <span className="transfer-list__copy">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ChevronLeft />
            </button>
          ))}
        </div>
      </section>

      <section className="transfer-autoflow-card">
        <div className="transfer-autoflow-card__icon"><WandSparkles /></div>
        <div>
          <span><BadgeCheck /> مقترح من AutoFlow</span>
          <strong>أتمت حوالاتك المتكررة</strong>
          <p>حدد الموعد والمبلغ، واختر التنفيذ التلقائي أو بموافقتك.</p>
        </div>
        <button onClick={openAutoFlow}>استخدم القالب</button>
      </section>
    </div>
  );
}

const paymentActions = [
  { title: "إضافة فاتورة جديدة", icon: Plus },
  { title: "سداد لمرة واحدة", icon: WalletCards },
  { title: "المخالفات المرورية", icon: Car },
  { title: "المدفوعات الحكومية", icon: Landmark },
  { title: "وسطاء سداد", icon: BadgeCheck },
  { title: "الفواتير الدورية", icon: Repeat2 },
];

function PaymentsScreen({ announce, openAutoFlow, bills = [] }) {
  const [activeTab, setActiveTab] = useState("sadad");
  const tabs = [
    { id: "sadad", label: "سداد" },
    { id: "mobile", label: "شحن الجوال" },
    { id: "alinma", label: "مدفوعات الإنماء" },
  ];

  return (
    <div className="bank-section-screen payments-screen">
      <header className="section-header bank-section-header">
        <h1>المدفوعات</h1>
        <div className="section-header__actions">
          <button className="icon-button" onClick={() => announce("البحث في المدفوعات")} aria-label="البحث في المدفوعات"><Search /></button>
          <button className="icon-button" onClick={() => announce("سجل المدفوعات") } aria-label="سجل المدفوعات"><History /></button>
        </div>
      </header>

      <div className="bank-segmented" role="tablist" aria-label="نوع المدفوعات">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? "is-selected" : ""}
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id !== "sadad") announce(`${tab.label}: نموذج جاهز للعرض`); }}
          >{tab.label}</button>
        ))}
      </div>

      <div className="payment-actions-grid">
        {paymentActions.map(({ title, icon: Icon }) => (
          <button type="button" key={title} onClick={() => title === "الفواتير الدورية" ? openAutoFlow() : announce(title)}>
            <Icon />
            <strong>{title}</strong>
          </button>
        ))}
      </div>

      {bills.length ? <section className="sandbox-bills"><header><div><h2>الفواتير والمستحقات</h2><span>أنشأتها أحداث البيئة التجريبية</span></div><ReceiptText /></header>{bills.map((bill) => <div className={`sandbox-bill ${bill.status === "paid" ? "is-paid" : "is-due"}`} key={bill.id}><span><FileText /></span><div><strong>{bill.name}</strong><small>الاستحقاق {bill.dueDate} · {bill.source}</small></div><div><b>{new Intl.NumberFormat("ar-SA", { style: "currency", currency: bill.currency || "SAR" }).format(bill.amount)}</b><small>{bill.status === "paid" ? "مدفوعة" : "مستحقة"}</small></div></div>)}</section> : <section className="empty-bills-card">
        <div><FileText /><span><strong>لا توجد فواتير</strong><small>أضف فواتيرك لعرض وسداد المستحقات.</small></span></div>
        <button type="button" onClick={() => announce("إضافة أول فاتورة") }><Plus /> أضف فاتورتك الأولى</button>
      </section>}
    </div>
  );
}

const storeCategories = [
  { title: "بطاقات الألعاب", icon: Gamepad2, tone: "purple" },
  { title: "الاتصالات", icon: Smartphone, tone: "coral" },
  { title: "بطاقات المتاجر", icon: ShoppingBag, tone: "blue" },
];

const storeBrands = [
  { title: "صيدلية النهدي", mark: "♡", tone: "nahdi" },
  { title: "آبل", mark: "●", tone: "apple" },
  { title: "زين", mark: "زين", tone: "zain" },
  { title: "موبايلي", mark: "M", tone: "mobily" },
  { title: "مكتبة جرير", mark: "جرير", tone: "jarir" },
  { title: "بلايستيشن", mark: "PS", tone: "playstation" },
];

function StoreScreen({ announce }) {
  return (
    <div className="bank-section-screen store-screen">
      <header className="section-header bank-section-header">
        <h1>متجر الإنماء</h1>
        <div className="section-header__actions store-header-actions">
          <button className="icon-button" onClick={() => announce("سلة المتجر فارغة") } aria-label="سلة المتجر"><ShoppingCart /></button>
          <button className="icon-button" onClick={() => announce("العناصر المحفوظة") } aria-label="العناصر المحفوظة"><Bookmark /></button>
          <button className="icon-button" onClick={() => announce("سجل الطلبات") } aria-label="سجل طلبات المتجر"><History /></button>
        </div>
      </header>

      <label className="store-search"><Search /><input aria-label="البحث في متجر الإنماء" placeholder="بحث" /></label>

      <div className="store-section-title"><h2>الفئات</h2><button type="button" onClick={() => announce("كل فئات المتجر")}>المزيد</button></div>
      <div className="store-categories">
        {storeCategories.map(({ title, icon: Icon, tone }) => (
          <button type="button" className={`store-category store-category--${tone}`} key={title} onClick={() => announce(title)}><span><Icon /></span><strong>{title}</strong></button>
        ))}
      </div>

      <div className="store-section-title"><h2>العلامات التجارية</h2><button type="button" onClick={() => announce("كل العلامات التجارية")}>المزيد</button></div>
      <div className="brand-grid">
        {storeBrands.map((brand) => (
          <button type="button" key={brand.title} onClick={() => announce(brand.title)}><span className={`brand-tile brand-tile--${brand.tone}`}>{brand.mark}</span><strong>{brand.title}</strong></button>
        ))}
      </div>

      <div className="store-section-title"><h2>الشرائح الدولية</h2><button type="button" onClick={() => announce("كل الشرائح الدولية")}>المزيد</button></div>
      <div className="international-cards">
        <button type="button" onClick={() => announce("شريحة سفر أوروبا") }><Globe2 /><span><strong>شريحة أوروبا</strong><small>بيانات أثناء السفر</small></span><Bookmark /></button>
        <button type="button" onClick={() => announce("شريحة سفر آسيا") }><Globe2 /><span><strong>شريحة آسيا</strong><small>تغطية متعددة الدول</small></span><Bookmark /></button>
      </div>
    </div>
  );
}

const serviceTiles = [
  { title: "الحسابات", icon: UserRound },
  { title: "البطاقات", icon: CreditCard },
  { title: "التمويل", icon: CircleDollarSign },
  { title: "الإدخار", icon: Coins },
  { title: "الاستثمار", icon: WalletCards },
  { title: "العائلة", icon: UsersRound },
  { title: "أكثر", icon: Sparkles, accent: true },
  { title: "الشهادات", icon: BadgeCheck },
  { title: "متابعة الطلبات", icon: FileSearch },
  { title: "التأمين", icon: ShieldPlus },
];

function ServicesScreen({ announce }) {
  return (
    <div className="bank-section-screen services-screen">
      <header className="services-profile">
        <div className="avatar">14</div>
        <div><strong>عاصم</strong><span><b>0</b><Sparkles /></span></div>
      </header>

      <div className="services-grid">
        {serviceTiles.map(({ title, icon: Icon, accent }) => (
          <button type="button" className={accent ? "is-accent" : ""} key={title} onClick={() => announce(title)}><Icon /><strong>{title}</strong></button>
        ))}
      </div>

      <section className="service-links">
        <button type="button" onClick={() => announce("النقد الطارئ") }><WalletCards /><strong>النقد الطارئ</strong><ChevronLeft /></button>
        <button type="button" onClick={() => announce("محول العملات") }><ArrowLeftRight /><strong>محول العملات</strong><ChevronLeft /></button>
        <button type="button" onClick={() => announce("أسعار صرف العملات") }><BadgeDollarSign /><strong>أسعار صرف العملات</strong><ChevronLeft /></button>
      </section>
    </div>
  );
}

const flowTemplates = [
  {
    id: "salary",
    title: "روتين الراتب",
    description: "ادخار، فواتير، ومصروف",
    icon: BanknoteArrowDown,
    color: "coral",
    idea: "عند نزول الراتب ادخر 20% ثم سدد الفواتير واطلب موافقتي",
  },
  {
    id: "bills",
    title: "الفواتير الذكية",
    description: "تذكير ثم سداد آمن",
    icon: ReceiptText,
    color: "blue",
    idea: "ذكرني قبل استحقاق الفواتير بيومين ثم انتظر موافقتي للسداد",
  },
  {
    id: "safe-balance",
    title: "حارس الرصيد",
    description: "لا ينخفض عن حدك",
    icon: ShieldCheck,
    color: "purple",
    idea: "إذا انخفض الرصيد عن 3000 ريال أوقف الأتمتات الاختيارية وأرسل تنبيهًا",
  },
  {
    id: "monthly",
    title: "فائض الشهر",
    description: "حوّل المتبقي لهدفك",
    icon: CircleGauge,
    color: "green",
    idea: "في نهاية الشهر حول المبلغ الزائد عن الحد الآمن إلى هدف الادخار",
  },
];

const templatePresets = {
  salary: { trigger: "salary", action: "save", value: "20", unit: "percent", safetyOn: true, minimumBalance: "3000", approval: "approval" },
  bills: { trigger: "bill", action: "bill", value: "150", unit: "fixed", safetyOn: false, minimumBalance: "3000", approval: "approval" },
  "safe-balance": { trigger: "scheduled", action: "notify", message: "الرصيد اقترب من الحد الآمن", safetyOn: true, minimumBalance: "3000", approval: "auto" },
  monthly: { trigger: "scheduled", action: "save", value: "500", unit: "fixed", safetyOn: true, minimumBalance: "3000", approval: "approval" },
};

function AutoFlowScreen({ announce, openDraft, automations, toggleAutomation }) {
  const useTemplate = (template) => openDraft(template.idea, templatePresets[template.id]);

  return (
    <div className="autoflow-screen">
      <header className="autoflow-header">
        <div className="autoflow-header__title">
          <div className="autoflow-logo"><Workflow /></div>
          <div>
            <h1>AutoFlow</h1>
            <span><i /> مركز الأتمتة المالية</span>
          </div>
        </div>
        <div className="section-header__actions">
          <button className="icon-button" onClick={() => announce("هنا ستظهر تنفيذات AutoFlow وحالاتها") } aria-label="سجل AutoFlow"><Clock3 /></button>
          <button className="icon-button" onClick={() => announce("AutoFlow لا ينفذ أي عملية دون الصلاحية التي تختارها") } aria-label="معلومات AutoFlow"><Info /></button>
        </div>
      </header>

      <section className="flow-overview">
        <div className="flow-overview__copy">
          <span>مالك، على طريقتك</span>
          <h2>خلّ روتينك المالي<br />يشتغل عنك.</h2>
          <p>أنت تصمم، تراجع، وتختار صلاحية التنفيذ.</p>
        </div>
        <div className="flow-overview__stats">
          <div><strong>{automations.filter((item) => item.active).length}</strong><span>مفعّلة</span></div>
          <div><strong>{automations.reduce((sum, item) => sum + (item.runs || 0), 0)}</strong><span>تنفيذات</span></div>
        </div>
      </section>

      <section className="my-flows">
        <div className="content-heading">
          <div><span>أتمتاتي</span><small>{automations.length} أتمتة</small></div>
          <button onClick={() => openDraft("أنشئ أتمتة جديدة")}><Plus /> أتمتة جديدة</button>
        </div>
        <div className="automation-list">
          {automations.map((flow) => (
            <article className={`automation-card ${flow.active ? "is-active" : ""}`} key={flow.id}>
              <div className="automation-card__top">
                <div className="automation-card__icon"><flow.icon /></div>
                <div className="automation-card__title"><strong>{flow.title}</strong><span>{triggerCaptions[flow.config.trigger]}</span></div>
                <button
                  className={`flow-switch ${flow.active ? "is-on" : ""}`}
                  onClick={() => toggleAutomation(flow.id)}
                  aria-label={`${flow.active ? "إيقاف" : "تشغيل"} ${flow.title}`}
                  aria-pressed={flow.active}
                ><i /></button>
              </div>
              <p className="automation-card__summary">{buildAutomationSummary(flow.config)}</p>
              <div className="automation-card__meta">
                <span>{flow.active ? <><i /> مفعّلة</> : <><Power /> متوقفة</>}</span>
                <small>{flow.runs ? `نُفذت ${flow.runs} مرات هذا الشهر` : "لم تُنفذ بعد"}</small>
                <button onClick={() => openDraft(null, flow.config, flow.id)} aria-label={`تعديل ${flow.title}`}><Settings2 /></button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flow-templates">
        <div className="content-heading">
          <div><span>قوالب من الإنماء</span><small>هياكل مراجعة وجاهزة للتعديل</small></div>
          <BadgeCheck />
        </div>
        <div className="template-grid">
          {flowTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <button className={`template-card template-card--${template.color}`} key={template.id} onClick={() => useTemplate(template)}>
                <span className="template-card__icon"><Icon /></span>
                <strong>{template.title}</strong>
                <small>{template.description}</small>
                <span className="template-card__action">استخدم القالب <ChevronLeft /></span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AutoFlowAssistant({ openDraft }) {
  const [isOpen, setIsOpen] = useState(false);
  const [idea, setIdea] = useState("");

  const buildFlow = () => {
    const value = idea.trim() || "عند نزول الراتب ادخر 20% ثم سدد الفواتير بعد موافقتي";
    setIdea(value);
    openDraft(value);
  };

  if (!isOpen) {
    return (
      <button
        className="ai-assistant-dock"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-label="فتح مساعد AutoFlow"
      >
        <span className="ai-assistant-dock__icon"><WandSparkles /></span>
        <span className="ai-assistant-dock__copy">
          <small>مساعد AutoFlow</small>
          <strong>حوّل فكرتك إلى أتمتة</strong>
        </span>
        <span className="ai-assistant-dock__action"><Sparkles /></span>
      </button>
    );
  }

  return (
    <div className="ai-assistant-layer">
      <div
        className="ai-assistant-backdrop"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      <section className="ai-assistant-panel" role="dialog" aria-modal="true" aria-label="مساعد AutoFlow">
        <div className="sheet-handle" />
        <header className="ai-assistant-panel__header">
          <span className="ai-assistant-panel__icon"><Bot /></span>
          <div>
            <small>مساعد AutoFlow</small>
            <h2>ما الأتمتة التي في بالك؟</h2>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق مساعد AutoFlow"><X /></button>
        </header>

        <div className="ai-trust-note">
          <LockKeyhole />
          <span><strong>يصمم الهيكل فقط.</strong> لا يرى حساباتك ولا يختار بياناتك ولا ينفذ أي عملية.</span>
        </div>

        <label className="ai-prompt-field">
          <span>اكتب فكرتك بأسلوبك</span>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="مثال: عند نزول الراتب ادخر 20% واطلب موافقتي قبل السداد"
            aria-label="وصف فكرة الأتمتة"
          />
        </label>

        <div className="ai-suggestion-chips" aria-label="أمثلة جاهزة">
          <button type="button" onClick={() => setIdea("رتب لي روتين الراتب مع موافقتي")}>روتين الراتب</button>
          <button type="button" onClick={() => setIdea("ذكرني قبل الفواتير ثم انتظر موافقتي")}>الفواتير</button>
          <button type="button" onClick={() => setIdea("حول فائض نهاية الشهر إلى الادخار")}>فائض الشهر</button>
        </div>

        <button className="ai-build-button" type="button" onClick={buildFlow}>
          <WandSparkles /> إنشاء البلوكات للمراجعة
        </button>
        <p className="ai-review-note">ستراجع كل خطوة وتختار الحسابات والصلاحيات بنفسك.</p>
      </section>
    </div>
  );
}

const triggerOptions = [
  { value: "salary", label: "نزول الراتب", icon: BanknoteArrowDown },
  { value: "incoming", label: "وصول حوالة", icon: WalletCards },
  { value: "scheduled", label: "موعد مجدول", icon: CalendarClock },
  { value: "bill", label: "استحقاق فاتورة", icon: ReceiptText },
];

const actionOptions = [
  { value: "save", label: "تحويل للادخار", icon: CircleDollarSign },
  { value: "bill", label: "سداد فاتورة", icon: ReceiptText },
  { value: "transfer", label: "تحويل داخلي", icon: ArrowLeftRight },
  { value: "notify", label: "إرسال إشعار", icon: Bell },
];

const approvalOptions = [
  { value: "auto", title: "تنفيذ تلقائي", caption: "دون طلب موافقة كل مرة" },
  { value: "approval", title: "انتظار موافقتي", caption: "لن يُنفذ شيء قبل قبولي" },
  { value: "conditional", title: "موافقة مشروطة", caption: "عند تجاوز المبلغ حدًا معينًا" },
];

const defaultWizardState = {
  trigger: "salary",
  action: "save",
  value: "20",
  unit: "percent",
  safetyOn: false,
  minimumBalance: "3000",
  approval: "approval",
  approvalLimit: "500",
  message: "تم تنفيذ الأتمتة بنجاح",
  name: "أتمتتي الجديدة",
  color: "coral",
  activeAfterSave: true,
};

const triggerCaptions = {
  salary: "عند نزول الراتب",
  incoming: "عند وصول حوالة",
  scheduled: "في كل موعد مجدول",
  bill: "قبل استحقاق الفاتورة",
};

const triggerIcons = {
  salary: BanknoteArrowDown,
  incoming: WalletCards,
  scheduled: CalendarClock,
  bill: ReceiptText,
};

function formatWizardAmount(form) {
  return form.unit === "percent" ? `${form.value || 0}%` : `${Number(form.value || 0).toLocaleString("en")} ر.س`;
}

function buildAutomationSummary(form) {
  const actionText = {
    save: `حوّل ${formatWizardAmount(form)} إلى حساب الادخار`,
    bill: `سدّد الفاتورة (${formatWizardAmount(form)})`,
    transfer: `حوّل ${formatWizardAmount(form)} بين حساباتك`,
    notify: `أرسل لك إشعارًا بنص: "${form.message}"`,
  }[form.action];

  const safetyText = form.safetyOn
    ? `، بشرط ألا ينزل رصيدك عن ${Number(form.minimumBalance || 0).toLocaleString("en")} ر.س`
    : "";

  const approvalText = {
    auto: "وتُنفَّذ تلقائيًا دون انتظار.",
    approval: "وتنتظر موافقتك في كل مرة قبل التنفيذ.",
    conditional: `وتنتظر موافقتك فقط إذا تجاوز المبلغ ${Number(form.approvalLimit || 0).toLocaleString("en")} ر.س.`,
  }[form.approval];

  return `${triggerCaptions[form.trigger]}، ${actionText}${safetyText}، ${approvalText}`;
}

function SettingsChoice({ label, value, options, onChange, columns = 3 }) {
  return (
    <div className="settings-choice">
      <span>{label}</span>
      <div className={`settings-choice__options settings-choice__options--${columns}`} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            className={value === option.value ? "is-selected" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const wizardSteps = ["trigger", "action", "safety", "approval", "review"];
const wizardStepTitles = {
  trigger: "متى تبدأ؟",
  action: "وش يصير؟",
  safety: "شرط أمان",
  approval: "مين يوافق؟",
  review: "المراجعة والحفظ",
};

function AutomationWizard({ initialIdea, initialPreset, editingId, close, announce, onSave }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => ({ ...defaultWizardState, ...initialPreset }));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const currentStep = wizardSteps[stepIndex];

  const goNext = () => setStepIndex((index) => Math.min(index + 1, wizardSteps.length - 1));
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const handleSave = () => {
    onSave(form, editingId);
    announce(`تم حفظ ${form.name} بنجاح`);
    close();
  };

  return (
    <div className="draft-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="draft-sheet wizard-sheet" role="dialog" aria-modal="true" aria-label="إنشاء أتمتة">
        <div className="draft-sheet__handle" />
        <header className="wizard-header">
          <div><span>{editingId ? "تعديل الأتمتة" : "إنشاء أتمتة جديدة"}</span><h2>{wizardStepTitles[currentStep]}</h2></div>
          <button onClick={close} aria-label="إغلاق"><X /></button>
        </header>

        <div className="wizard-progress" aria-label={`الخطوة ${stepIndex + 1} من ${wizardSteps.length}`}>
          {wizardSteps.map((step, index) => <i key={step} className={index <= stepIndex ? "is-done" : ""} />)}
        </div>

        <div className="wizard-demo-note"><Info /><span>هذه نسخة تجريبية (Demo) — الخيارات المعروضة هنا لغرض التجربة فقط، وسيتم إطلاق خيارات أتمتة متقدمة أوسع في النسخة النهائية.</span></div>

        {initialIdea && stepIndex === 0 && <blockquote className="wizard-idea-note">{initialIdea}</blockquote>}

        <div className="wizard-body">
          {currentStep === "trigger" && (
            <fieldset className="settings-group">
              <legend>اختر متى تبدأ الأتمتة</legend>
              <div className="option-grid option-grid--two">
                {triggerOptions.map(({ value, label, icon: Icon }) => (
                  <label key={value} className="option-card">
                    <input type="radio" name="wizard-trigger" checked={form.trigger === value} onChange={() => update("trigger", value)} />
                    <span><Icon /><b>{label}</b><i /></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {currentStep === "action" && (
            <>
              <fieldset className="settings-group">
                <legend>اختر ماذا يحدث</legend>
                <div className="option-grid option-grid--two">
                  {actionOptions.map(({ value, label, icon: Icon }) => (
                    <label key={value} className="option-card">
                      <input type="radio" name="wizard-action" checked={form.action === value} onChange={() => update("action", value)} />
                      <span><Icon /><b>{label}</b><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.action === "notify" ? (
                <label className="text-field">
                  <span>نص الإشعار</span>
                  <input value={form.message} onChange={(event) => update("message", event.target.value)} />
                </label>
              ) : form.action === "bill" ? (
                <label className="settings-field">
                  <span>مبلغ الفاتورة التقريبي</span>
                  <div className="amount-field"><input type="number" min="0" value={form.value} onChange={(event) => update("value", event.target.value)} /><b>ر.س</b></div>
                </label>
              ) : (
                <div className="split-fields">
                  <label className="settings-field">
                    <span>القيمة</span>
                    <div className="amount-field"><input type="number" min="0" value={form.value} onChange={(event) => update("value", event.target.value)} /><b>{form.unit === "percent" ? "%" : "ر.س"}</b></div>
                  </label>
                  <SettingsChoice
                    label="نوع القيمة"
                    value={form.unit}
                    columns={2}
                    onChange={(value) => update("unit", value)}
                    options={[{ value: "percent", label: "نسبة %" }, { value: "fixed", label: "مبلغ ثابت" }]}
                  />
                </div>
              )}
            </>
          )}

          {currentStep === "safety" && (
            <>
              <div className="settings-toggle-row">
                <div><ShieldCheck /><span><strong>وقف الأتمتة إذا الرصيد قليل</strong><small>حماية بسيطة قبل أي تنفيذ</small></span></div>
                <button className={`flow-switch ${form.safetyOn ? "is-on" : ""}`} onClick={() => update("safetyOn", !form.safetyOn)} aria-label="تفعيل شرط الأمان" aria-pressed={form.safetyOn}><i /></button>
              </div>
              {form.safetyOn && (
                <label className="settings-field">
                  <span>لا تنفّذ إذا سينزل الرصيد عن</span>
                  <div className="amount-field"><input type="number" min="0" step="100" value={form.minimumBalance} onChange={(event) => update("minimumBalance", event.target.value)} /><b>ر.س</b></div>
                </label>
              )}
              <div className="settings-note"><Info /><span>إذا ما تحقق الشرط، تُلغى العملية تلقائيًا وتوصلك رسالة.</span></div>
            </>
          )}

          {currentStep === "approval" && (
            <>
              <fieldset className="settings-group">
                <legend>صلاحية التنفيذ</legend>
                <div className="stacked-options">
                  {approvalOptions.map(({ value, title, caption }) => (
                    <label key={value} className="stacked-option">
                      <input type="radio" name="wizard-approval" checked={form.approval === value} onChange={() => update("approval", value)} />
                      <span><span className="stacked-option__copy"><b>{title}</b><small>{caption}</small></span><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.approval === "conditional" && (
                <label className="settings-field">
                  <span>اسألني فقط إذا تجاوز المبلغ</span>
                  <div className="amount-field"><input type="number" min="0" value={form.approvalLimit} onChange={(event) => update("approvalLimit", event.target.value)} /><b>ر.س</b></div>
                </label>
              )}
            </>
          )}

          {currentStep === "review" && (
            <>
              <p className="wizard-summary">{buildAutomationSummary(form)}</p>
              <label className="text-field">
                <span>اسم الأتمتة</span>
                <input value={form.name} onChange={(event) => update("name", event.target.value)} />
              </label>
              <div className="color-picker">
                <span>اللون</span>
                <div>
                  {["coral", "purple", "blue", "green"].map((color) => (
                    <button key={color} type="button" className={`color-dot color-dot--${color} ${form.color === color ? "is-selected" : ""}`} onClick={() => update("color", color)} aria-label={`لون ${color}`} aria-pressed={form.color === color}><i /></button>
                  ))}
                </div>
              </div>
              <div className="settings-toggle-row">
                <div><Power /><span><strong>تشغيل الأتمتة بعد الحفظ</strong><small>يمكنك إيقافها لاحقًا من مركز AutoFlow</small></span></div>
                <button className={`flow-switch ${form.activeAfterSave ? "is-on" : ""}`} onClick={() => update("activeAfterSave", !form.activeAfterSave)} aria-label="تشغيل الأتمتة بعد الحفظ" aria-pressed={form.activeAfterSave}><i /></button>
              </div>
            </>
          )}
        </div>

        <footer className="draft-sheet__footer">
          <button className="secondary" onClick={stepIndex === 0 ? close : goBack}>{stepIndex === 0 ? "إلغاء" : "رجوع"}</button>
          {currentStep === "review" ? (
            <button className="primary" onClick={handleSave}><CheckCircle2 /> حفظ الأتمتة</button>
          ) : (
            <button className="primary" onClick={goNext}>التالي <ChevronLeft /></button>
          )}
        </footer>
      </section>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("autoflow-theme") || "light";
    } catch {
      return "light";
    }
  });
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const [activeNav, setActiveNav] = useState("home");
  const [toast, setToast] = useState("");
  const [time, setTime] = useState(currentClock);
  const [showAutoFlowHint, setShowAutoFlowHint] = useState(true);
  const [financialSnapshot, setFinancialSnapshot] = useState(null);
  const [leanConnectBusy, setLeanConnectBusy] = useState(false);
  const [transfers, setTransfers] = useState(() => loadLocalList(TRANSFERS_KEY));
  const [bills, setBills] = useState(loadSandboxBills);
  const financialDataLoaded = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#002d3f" : "#fbf8f5");
    try {
      localStorage.setItem("autoflow-theme", theme);
    } catch {
      // Keep the selected theme for this session when persistence is blocked.
    }
  }, [theme]);

  useEffect(() => {
    if (globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setPromoIndex((current) => (current + 1) % promos.length), 5500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(currentClock()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => { storeLocalValue(TRANSFERS_KEY, transfers); }, [transfers]);
  useEffect(() => { storeLocalValue(BILLS_KEY, bills); }, [bills]);

  useEffect(() => {
    const scrollArea = document.querySelector(".screen-scroll");
    if (scrollArea) scrollArea.scrollTop = 0;
  }, [activeNav]);

  const promo = promos[promoIndex];
  const homeAccount = financialSnapshot?.account;
  const beneficiaries = mergeBeneficiaries(financialSnapshot?.beneficiaries);

  const announce = (message) => setToast(message);
  const openAutoFlow = () => {
    setActiveNav("autoflow");
    setShowAutoFlowHint(false);
    announce("تم فتح مركز AutoFlow");
  };
  const refreshFinancialData = async () => {
    try {
      const response = await fetch("/api/financial-data");
      if (!response.ok) throw new Error("Financial data request failed");
      const snapshot = await response.json();
      if (!snapshot?.account) throw new Error("Financial data response was incomplete");
      setFinancialSnapshot(snapshot);
    } catch {
      announce("تعذر تحديث البيانات التجريبية الآن");
    }
  };

  useEffect(() => {
    if (financialDataLoaded.current) return;
    financialDataLoaded.current = true;
    refreshFinancialData();
  }, []);

  const connectLean = async () => {
    if (leanConnectBusy) return;
    setLeanConnectBusy(true);
    try {
      const response = await fetch("/api/lean-session", { method: "POST" });
      const session = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(session.error || "تعذر بدء ربط الحساب");
      const result = await connectLeanAccount(session);
      if (result.status === "SUCCESS") {
        announce("تم ربط الحساب. ننتظر وصول بيانات البنك.");
        window.setTimeout(refreshFinancialData, 2500);
      } else if (result.status === "CANCELLED" || result.status === "LINK_CLOSED_PROGRAMMATICALLY") {
        announce("تم إلغاء ربط الحساب");
      } else if (result.status !== "REDIRECT") {
        throw new Error(result.message || "لم يكتمل ربط الحساب");
      }
    } catch (error) {
      announce(error.message || "تعذر ربط الحساب عبر Lean");
    } finally {
      setLeanConnectBusy(false);
    }
  };

  const createTransfer = (transfer) => setTransfers((items) => [transfer, ...items].slice(0, 50));
  const addBill = (bill) => setBills((items) => [bill, ...items].slice(0, 50));
  const payBills = (ids, { plaidRecorded = false } = {}) => setBills((items) => items.map((bill) => ids.includes(bill.id)
    ? { ...bill, status: "paid", paidAt: new Date().toISOString(), plaidRecorded }
    : bill));

  return (
    <main className="stage">
      <section className="phone" aria-label="نموذج تطبيق الإنماء">
        <div className="status-bar" dir="ltr">
          <span className="status-bar__time">{time}</span>
          <div className="status-bar__indicators" aria-hidden="true">
            <span className="signal"><i /><i /><i /><i /></span>
            <span className="wifi">)))</span>
            <span className="battery">83</span>
          </div>
        </div>

        <div className={`screen-scroll ${activeNav === "transfers" ? "screen-scroll--transfers" : ""} ${activeNav === "autoflow" ? "screen-scroll--autoflow" : ""} ${["payments", "store", "services"].includes(activeNav) ? "screen-scroll--bank-section" : ""}`}>
          {activeNav === "transfers" ? (
            <TransfersScreen announce={announce} openAutoFlow={openAutoFlow} beneficiaries={beneficiaries} transfers={transfers} />
          ) : activeNav === "autoflow" ? (
            <AutoFlowStudio
              announce={announce}
              financialSnapshot={financialSnapshot}
              refreshFinancialData={refreshFinancialData}
              updateFinancialSnapshot={setFinancialSnapshot}
              connectLean={connectLean}
              leanConnectBusy={leanConnectBusy}
              beneficiaries={beneficiaries}
              transfers={transfers}
              bills={bills}
              createTransfer={createTransfer}
              addBill={addBill}
              payBills={payBills}
            />
          ) : activeNav === "payments" ? (
            <PaymentsScreen announce={announce} openAutoFlow={openAutoFlow} bills={bills} />
          ) : activeNav === "store" ? (
            <StoreScreen announce={announce} />
          ) : activeNav === "services" ? (
            <ServicesScreen announce={announce} />
          ) : (
          <>
          <header className="app-header">
            <div className="profile">
              <div className="avatar">14</div>
              <div>
                <strong>عاصم</strong>
                <span className="rewards"><b>0</b><Sparkles size={14} /></span>
              </div>
            </div>
            <div className="header-actions">
              <button className="icon-button logout" onClick={() => announce("تسجيل الخروج غير مفعل في النموذج")} aria-label="تسجيل الخروج">
                <BrandMark small />
              </button>
              <button className="icon-button" onClick={() => announce("لا توجد إشعارات جديدة")} aria-label="الإشعارات"><Bell /></button>
              <button className="icon-button" onClick={() => announce("تعديل الشاشة الرئيسية")} aria-label="تعديل"><PencilLine /></button>
              <button className="icon-button theme-toggle" onClick={() => setTheme((value) => value === "light" ? "dark" : "light")} aria-label="تبديل نمط العرض">
                {theme === "light" ? <Moon /> : <Sun />}
              </button>
            </div>
          </header>

          <section className="account-summary">
            <div className="account-name">{homeAccount?.name || "حساب جاري 1000"} <span>…</span></div>
            <button className="balance" onClick={() => setBalanceVisible((value) => !value)} aria-label="إظهار أو إخفاء الرصيد">
              {balanceVisible ? <b>{formatAccountBalance(homeAccount)}</b> : <b>••••••••</b>}
              {balanceVisible ? <EyeOff /> : <Eye />}
            </button>
            <span className="account-kind">جاري</span>
            <div className="account-dots"><i /><i /></div>
          </section>

          <section className={`promo promo--${promo.variant}`}>
            <div className="promo__copy">
              <span className="promo__kicker">{promo.kicker}</span>
              <h1>{promo.title.split("\n").map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h1>
              <p>{promo.body}</p>
              <button onClick={openAutoFlow}>
                {promo.cta}<ChevronLeft />
              </button>
            </div>
            <FlowArt variant={promo.variant} />
          </section>

          <div className="carousel-dots" aria-label="شرائح الإعلان">
            {promos.map((item, index) => (
              <button key={item.title} className={index === promoIndex ? "active" : ""} onClick={() => setPromoIndex(index)} aria-label={`الإعلان ${index + 1}`} />
            ))}
          </div>

          <section className="quick-actions" aria-label="الإجراءات السريعة">
            {quickActions.map(({ label, icon: Icon, target }) => (
              <button key={label} onClick={() => { setActiveNav(target); announce(label.replace("\n", " ")); }}>
                <span><Icon /></span>
                {label.split("\n").map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}
              </button>
            ))}
          </section>

          <button type="button" className="autoflow-teaser" onClick={openAutoFlow}>
            <div className="autoflow-teaser__icon"><WandSparkles /></div>
            <div>
              <span>قالب مقترح لك</span>
              <strong>ادخر تلقائيًا عند نزول الراتب</strong>
              <small>قالب معتمد • تحت تحكمك الكامل</small>
            </div>
            <ChevronLeft />
          </button>
          </>
          )}
        </div>

        <nav className="bottom-nav" aria-label="التنقل الرئيسي">
          {navItems.map(({ id, label, icon: Icon, featured }) => (
            <button key={id} aria-current={activeNav === id ? "page" : undefined} className={`${activeNav === id ? "active" : ""} ${featured ? "featured" : ""}`} onClick={() => {
              setActiveNav(id);
              if (id === "autoflow") setShowAutoFlowHint(false);
            }}>
              {featured && showAutoFlowHint && activeNav === "home" && <span className="autoflow-coachmark" aria-hidden="true">جديد · جرّب AutoFlow</span>}
              {featured && activeNav !== "autoflow" && <span className="autoflow-new-badge" aria-hidden="true">جديد</span>}
              <span className="nav-icon"><Icon /></span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");
const appRoot = globalThis.__autoflowAppRoot || createRoot(rootElement);
globalThis.__autoflowAppRoot = appRoot;

appRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
