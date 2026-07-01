import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
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
  PiggyBank,
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

const quickActions = [
  { label: "دفع\nالفواتير", icon: ReceiptText },
  { label: "الحوالات\nالسريعة", icon: WalletCards },
  { label: "شحن\nالجوال", icon: Smartphone },
  { label: "المخالفات\nالمرورية", icon: Car },
];

const promos = [
  {
    kicker: "جديد الإنماء",
    title: "خلّ مالك يمشي\nعلى خطتك",
    body: "أتمت التحويلات والفواتير والادخار من مكان واحد.",
    cta: "اكتشف AutoFlow",
    variant: "flow",
  },
  {
    kicker: "مساعد AutoFlow",
    title: "اكتب فكرتك…\nونرتبها بلوكات",
    body: "أنت تختار حساباتك وتراجع كل خطوة قبل التفعيل.",
    cta: "جرّب المساعد",
    variant: "ai",
  },
  {
    kicker: "معتمدة من الإنماء",
    title: "قوالب جاهزة\nلروتينك المالي",
    body: "ابدأ بقالب موثوق، ثم عدّل المبالغ والصلاحيات كما تريد.",
    cta: "عرض القوالب",
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

function TransfersScreen({ announce }) {
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

        {favoritesOpen && (
          <div className="empty-favorites">
            <div className="empty-favorites__icon"><UserRoundPlus /></div>
            <strong>لا يوجد مستفيدون مفضلون!</strong>
            <button onClick={() => announce("أضف النجمة بجانب أي مستفيد ليظهر هنا") }>كيفية الإضافة؟</button>
          </div>
        )}
      </section>

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
        <button onClick={() => announce("سيتم تحويلك إلى قالب الحوالات في AutoFlow") }>استخدم القالب</button>
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

function PaymentsScreen({ announce }) {
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
          <button type="button" key={title} onClick={() => announce(title)}>
            <Icon />
            <strong>{title}</strong>
          </button>
        ))}
      </div>

      <section className="empty-bills-card">
        <div><FileText /><span><strong>لا توجد فواتير</strong><small>أضف فواتيرك لعرض وسداد المستحقات.</small></span></div>
        <button type="button" onClick={() => announce("إضافة أول فاتورة") }><Plus /> أضف فاتورتك الأولى</button>
      </section>
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
  { title: "الإدخار", icon: PiggyBank },
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
          <div><strong>6</strong><span>تنفيذات</span></div>
        </div>
        <div className="flow-orbit" aria-hidden="true"><i /><i /><i /></div>
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
                <div className="automation-card__title"><strong>{flow.title}</strong><span>{flow.caption}</span></div>
                <button
                  className={`flow-switch ${flow.active ? "is-on" : ""}`}
                  onClick={() => toggleAutomation(flow.id)}
                  aria-label={`${flow.active ? "إيقاف" : "تشغيل"} ${flow.title}`}
                  aria-pressed={flow.active}
                ><i /></button>
              </div>
              <div className="mini-flow">
                {flow.steps.map((step, index) => (
                  <React.Fragment key={step}>
                    <span>{step}</span>
                    {index < flow.steps.length - 1 && <ArrowDown />}
                  </React.Fragment>
                ))}
              </div>
              <div className="automation-card__meta">
                <span>{flow.active ? <><i /> مفعّلة</> : <><Power /> متوقفة</>}</span>
                <small>{flow.runs ? `نُفذت ${flow.runs} مرات هذا الشهر` : "لم تُنفذ بعد"}</small>
                <button onClick={() => announce(`إعدادات ${flow.title}`)} aria-label={`إعدادات ${flow.title}`}><Settings2 /></button>
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

      <section className="last-run-card">
        <div className="last-run-card__icon"><CheckCircle2 /></div>
        <div><span>آخر تنفيذ</span><strong>تم تحويل 2,000 ر.س إلى الادخار</strong><small>راتبي الذكي • اليوم، 8:31 ص</small></div>
        <ChevronLeft />
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

function buildAutomationMiniSteps(form) {
  const triggerLabel = { salary: "الراتب", incoming: "الحوالة", scheduled: "الموعد", bill: "الفاتورة" }[form.trigger];
  const actionLabel = { save: `ادخار ${formatWizardAmount(form)}`, bill: "سداد فاتورة", transfer: "تحويل داخلي", notify: "إشعار" }[form.action];
  const approvalLabel = { auto: "تلقائي", approval: "موافقة", conditional: "موافقة مشروطة" }[form.approval];
  return [triggerLabel, actionLabel, approvalLabel];
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

function AutomationWizard({ initialIdea, initialPreset, close, announce, onSave }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => ({ ...defaultWizardState, ...initialPreset }));
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const currentStep = wizardSteps[stepIndex];

  const goNext = () => setStepIndex((index) => Math.min(index + 1, wizardSteps.length - 1));
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const handleSave = () => {
    onSave(form);
    announce(`تم حفظ ${form.name} بنجاح`);
    close();
  };

  return (
    <div className="draft-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="draft-sheet wizard-sheet" role="dialog" aria-modal="true" aria-label="إنشاء أتمتة">
        <div className="draft-sheet__handle" />
        <header className="wizard-header">
          <div><span>إنشاء أتمتة جديدة</span><h2>{wizardStepTitles[currentStep]}</h2></div>
          <button onClick={close} aria-label="إغلاق"><X /></button>
        </header>

        <div className="wizard-progress" aria-label={`الخطوة ${stepIndex + 1} من ${wizardSteps.length}`}>
          {wizardSteps.map((step, index) => <i key={step} className={index <= stepIndex ? "is-done" : ""} />)}
        </div>

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
  const [theme, setTheme] = useState(() => localStorage.getItem("autoflow-theme") || "light");
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);
  const [activeNav, setActiveNav] = useState("home");
  const [toast, setToast] = useState("");
  const [draftIdea, setDraftIdea] = useState("");
  const [draftPreset, setDraftPreset] = useState(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [showAutoFlowHint, setShowAutoFlowHint] = useState(true);
  const [automations, setAutomations] = useState([
    {
      id: "salary-flow",
      title: "راتبي الذكي",
      caption: "عند نزول الراتب",
      active: true,
      runs: 3,
      icon: BanknoteArrowDown,
      steps: ["راتب", "ادخار 20%", "موافقة"],
    },
    {
      id: "bills-flow",
      title: "فواتيري في موعدها",
      caption: "قبل الاستحقاق بيومين",
      active: false,
      runs: 0,
      icon: ReceiptText,
      steps: ["تذكير", "فحص الرصيد", "سداد"],
    },
  ]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#002d3f" : "#fbf8f5");
    localStorage.setItem("autoflow-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setPromoIndex((current) => (current + 1) % promos.length), 5500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const scrollArea = document.querySelector(".screen-scroll");
    if (scrollArea) scrollArea.scrollTop = 0;
  }, [activeNav]);

  const promo = promos[promoIndex];
  const time = useMemo(() => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date()), []);

  const announce = (message) => setToast(message);
  const openDraft = (idea, preset) => {
    setDraftIdea(idea);
    setDraftPreset(preset || null);
    setDraftOpen(true);
  };
  const toggleAutomation = (id) => {
    setAutomations((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item));
  };
  const addAutomation = (form) => {
    setAutomations((items) => [{
      id: `flow-${Date.now()}`,
      title: form.name,
      caption: triggerCaptions[form.trigger],
      active: form.activeAfterSave,
      runs: 0,
      icon: triggerIcons[form.trigger],
      steps: buildAutomationMiniSteps(form),
    }, ...items]);
  };

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
            <TransfersScreen announce={announce} />
          ) : activeNav === "autoflow" ? (
            <AutoFlowScreen announce={announce} openDraft={openDraft} automations={automations} toggleAutomation={toggleAutomation} />
          ) : activeNav === "payments" ? (
            <PaymentsScreen announce={announce} />
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
            <div className="account-name">حساب جاري 1000 <span>…</span></div>
            <button className="balance" onClick={() => setBalanceVisible((value) => !value)} aria-label="إظهار أو إخفاء الرصيد">
              {balanceVisible ? <b>12,480.75 <small>ر.س</small></b> : <b>••••••••</b>}
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
              <button onClick={() => { setActiveNav("autoflow"); announce("سيفتح مركز AutoFlow في القسم التالي"); }}>
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
            {quickActions.map(({ label, icon: Icon }) => (
              <button key={label} onClick={() => announce(label.replace("\n", " "))}>
                <span><Icon /></span>
                {label.split("\n").map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}
              </button>
            ))}
          </section>

          <section className="autoflow-teaser" onClick={() => { setActiveNav("autoflow"); announce("سنبني مركز AutoFlow بعد الواجهة الرئيسية"); }}>
            <div className="autoflow-teaser__icon"><WandSparkles /></div>
            <div>
              <span>قالب مقترح لك</span>
              <strong>ادخر تلقائيًا عند نزول الراتب</strong>
              <small>قالب معتمد • تحت تحكمك الكامل</small>
            </div>
            <ChevronLeft />
          </section>
          </>
          )}
        </div>

        {draftOpen && activeNav === "autoflow" && (
          <AutomationWizard
            initialIdea={draftIdea}
            initialPreset={draftPreset}
            close={() => setDraftOpen(false)}
            announce={announce}
            onSave={addAutomation}
          />
        )}

        {activeNav === "autoflow" && !draftOpen && (
          <AutoFlowAssistant openDraft={openDraft} />
        )}

        <nav className="bottom-nav" aria-label="التنقل الرئيسي">
          {navItems.map(({ id, label, icon: Icon, featured }) => (
            <button key={id} className={`${activeNav === id ? "active" : ""} ${featured ? "featured" : ""}`} onClick={() => {
              setDraftOpen(false);
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
