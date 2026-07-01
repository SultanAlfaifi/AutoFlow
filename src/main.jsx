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
  Play,
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

function AutoFlowScreen({ announce, openDraft }) {
  const [idea, setIdea] = useState("");
  const [automations, setAutomations] = useState([
    {
      id: "salary-flow",
      title: "راتبي الذكي",
      caption: "عند نزول الراتب",
      active: true,
      runs: 3,
      steps: ["راتب", "ادخار 20%", "موافقة"],
    },
    {
      id: "bills-flow",
      title: "فواتيري في موعدها",
      caption: "قبل الاستحقاق بيومين",
      active: false,
      runs: 0,
      steps: ["تذكير", "فحص الرصيد", "سداد"],
    },
  ]);

  const toggleAutomation = (id) => {
    setAutomations((items) => items.map((item) => item.id === id ? { ...item, active: !item.active } : item));
  };

  const generateDraft = () => {
    const fallbackIdea = "عند نزول الراتب ادخر 20% ثم سدد الفواتير بعد موافقتي";
    const value = idea.trim() || fallbackIdea;
    setIdea(value);
    openDraft(value);
  };

  const useTemplate = (template) => {
    setIdea(template.idea);
    openDraft(template.idea);
  };

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

      <section className="ai-composer" hidden>
        <div className="ai-composer__heading">
          <div className="ai-composer__icon"><Bot /></div>
          <div>
            <span>مساعد AutoFlow</span>
            <strong>صف الأتمتة التي في بالك</strong>
          </div>
          <span className="privacy-chip"><LockKeyhole /> بدون بياناتك</span>
        </div>
        <div className="idea-input-wrap">
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="مثال: إذا نزل الراتب، ادخر 20% وسدد الفواتير…"
            aria-label="وصف فكرة الأتمتة"
          />
          <button onClick={generateDraft} aria-label="حوّل الفكرة إلى بلوكات"><WandSparkles /> حوّلها إلى بلوكات</button>
        </div>
        <div className="idea-suggestions">
          <span>جرّب:</span>
          <button onClick={() => setIdea("رتب لي روتين الراتب مع موافقتي")}>روتين الراتب</button>
          <button onClick={() => setIdea("ذكرني قبل الفواتير ثم انتظر موافقتي")}>الفواتير</button>
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
                <div className="automation-card__icon">{flow.id === "salary-flow" ? <BanknoteArrowDown /> : <ReceiptText />}</div>
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

const blockNames = {
  trigger: "المشغّل",
  condition: "شرط الأمان",
  action: "الإجراء",
  approval: "صلاحية التنفيذ",
};

const financialActionLibrary = [
  { id: "pay-bill", category: "payments", title: "سداد فاتورة", description: "سداد فاتورة تختارها يدويًا", icon: ReceiptText, tone: "action", variable: "اختر الفاتورة" },
  { id: "internal-transfer", category: "transfers", title: "تحويل داخلي", description: "حوّل مبلغًا بين حساباتك", icon: ArrowLeftRight, tone: "trigger", variable: "اختر المبلغ" },
  { id: "notification", category: "notifications", title: "إرسال إشعار", description: "أرسل ملخصًا بنتيجة التنفيذ", icon: Bell, tone: "condition", variable: "نص الإشعار" },
  { id: "monthly-report", category: "insights", title: "إنشاء تقرير", description: "لخّص تنفيذات الأتمتة ونتائجها", icon: FileText, tone: "approval", variable: "تقرير شهري" },
  { id: "wait", category: "control", title: "انتظار", description: "انتظر مدة قبل الخطوة التالية", icon: Clock3, tone: "condition", variable: "30 دقيقة" },
  { id: "ask", category: "control", title: "طلب قرار", description: "أوقف المسار حتى يختار العميل", icon: LockKeyhole, tone: "approval", variable: "اسأل عند التشغيل" },
];

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

function ActionLibrarySheet({ close, addAction }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("suggested");
  const categories = [
    { id: "suggested", label: "مقترحة" },
    { id: "payments", label: "سداد" },
    { id: "transfers", label: "تحويل" },
    { id: "notifications", label: "إشعارات" },
    { id: "control", label: "تحكم" },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const actions = financialActionLibrary.filter((action) => {
    const matchesCategory = category === "suggested" ? ["pay-bill", "notification", "wait"].includes(action.id) : action.category === category;
    const matchesQuery = !normalizedQuery || `${action.title} ${action.description}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="action-library-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="action-library-sheet" role="dialog" aria-modal="true" aria-label="مكتبة إجراءات AutoFlow">
        <div className="draft-sheet__handle" />
        <header className="action-library-header">
          <div><span>مكتبة الإجراءات</span><h3>ماذا يحدث بعد ذلك؟</h3></div>
          <button onClick={close} aria-label="إغلاق مكتبة الإجراءات"><X /></button>
        </header>
        <label className="action-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن سداد، تحويل، إشعار…" aria-label="البحث في الإجراءات" /></label>
        <div className="action-categories">
          {categories.map((item) => <button key={item.id} className={category === item.id ? "is-selected" : ""} onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>{item.label}</button>)}
        </div>
        <div className="suggestion-reason"><Sparkles /><span>مقترحة بناءً على الخطوة السابقة</span></div>
        <div className="action-library-list">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button key={action.id} onClick={() => addAction(action)}>
                <span className={`action-library-list__icon action-library-list__icon--${action.tone}`}><Icon /></span>
                <span><strong>{action.title}</strong><small>{action.description}</small></span>
                <Plus />
              </button>
            );
          })}
          {!actions.length && <div className="no-actions"><Search /><span>لم نجد إجراءًا مطابقًا</span></div>}
        </div>
      </section>
    </div>
  );
}

function BlockSettingsSheet({ type, settings, close, save }) {
  const [draft, setDraft] = useState(settings);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className="block-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="block-settings-sheet" role="dialog" aria-modal="true" aria-label={`إعدادات ${blockNames[type]}`}>
        <div className="draft-sheet__handle" />
        <header className="block-settings-header">
          <div className={`block-settings-header__icon block-settings-header__icon--${type}`}><Settings2 /></div>
          <div><span>إعدادات البلوك</span><h3>{blockNames[type]}</h3></div>
          <button onClick={close} aria-label="إغلاق الإعدادات"><X /></button>
        </header>

        <div className="block-settings-body">
          {type === "trigger" && (
            <>
              <fieldset className="settings-group">
                <legend>متى تبدأ الأتمتة؟</legend>
                <div className="option-grid option-grid--two">
                  {[
                    ["salary", "نزول الراتب", BanknoteArrowDown],
                    ["incoming", "وصول حوالة", WalletCards],
                    ["scheduled", "موعد مجدول", CalendarClock],
                    ["bill", "استحقاق فاتورة", ReceiptText],
                  ].map(([value, label, Icon]) => (
                    <label key={value} className="option-card">
                      <input type="radio" name="trigger-kind" value={value} checked={draft.kind === value} onChange={() => update("kind", value)} />
                      <span><Icon /><b>{label}</b><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <SettingsChoice
                label="نطاق التكرار"
                value={draft.frequency}
                onChange={(value) => update("frequency", value)}
                options={[
                  { value: "each", label: "كل حدث" },
                  { value: "once-month", label: "مرة شهريًا" },
                  { value: "once-day", label: "مرة يوميًا" },
                ]}
              />
              <div className="settings-note"><Info /><span>يتحقق النظام من نوع العملية، لكنك ستختار الحساب يدويًا لاحقًا.</span></div>
            </>
          )}

          {type === "condition" && (
            <>
              <label className="settings-field">
                <span>الحد الأدنى للرصيد بعد التنفيذ</span>
                <div className="amount-field"><input type="number" min="0" step="100" value={draft.minimumBalance} onChange={(event) => update("minimumBalance", event.target.value)} aria-label="الحد الأدنى للرصيد" /><b>ر.س</b></div>
              </label>
              <fieldset className="settings-group">
                <legend>إذا لم يتحقق الشرط</legend>
                <div className="stacked-options">
                  {[
                    ["stop", "إيقاف الأتمتة", "لا يُنفذ أي إجراء لاحق"],
                    ["skip", "تخطي الإجراء", "ينتقل إلى الخطوة التالية"],
                    ["ask", "طلب قراري", "يرسل إشعارًا قبل المتابعة"],
                  ].map(([value, title, caption]) => (
                    <label key={value} className="stacked-option">
                      <input type="radio" name="failure-policy" checked={draft.onFailure === value} onChange={() => update("onFailure", value)} />
                      <span><span className="stacked-option__copy"><b>{title}</b><small>{caption}</small></span><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {type === "action" && (
            <>
              <fieldset className="settings-group">
                <legend>نوع الإجراء</legend>
                <div className="option-grid option-grid--two">
                  {[
                    ["save", "تحويل للادخار", CircleDollarSign],
                    ["bill", "سداد فاتورة", ReceiptText],
                    ["transfer", "تحويل داخلي", ArrowLeftRight],
                    ["notify", "إرسال إشعار", Bell],
                  ].map(([value, label, Icon]) => (
                    <label key={value} className="option-card">
                      <input type="radio" name="action-kind" value={value} checked={draft.kind === value} onChange={() => update("kind", value)} />
                      <span><Icon /><b>{label}</b><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {draft.kind !== "notify" && (
                <div className="split-fields">
                  <label className="settings-field">
                    <span>القيمة</span>
                    <div className="amount-field"><input type="number" min="0" value={draft.value} onChange={(event) => update("value", event.target.value)} aria-label="قيمة الإجراء" /><b>{draft.unit === "percent" ? "%" : "ر.س"}</b></div>
                  </label>
                  <SettingsChoice
                    label="نوع القيمة"
                    value={draft.unit}
                    columns={2}
                    onChange={(value) => update("unit", value)}
                    options={[
                      { value: "percent", label: "نسبة %" },
                      { value: "fixed", label: "مبلغ ثابت" },
                    ]}
                  />
                </div>
              )}
              <SettingsChoice
                label="موقع الإجراء في المسار"
                value={draft.order}
                onChange={(value) => update("order", value)}
                options={[
                  { value: "first", label: "أولًا" },
                  { value: "after-bills", label: "بعد الفواتير" },
                  { value: "last", label: "أخيرًا" },
                ]}
              />
            </>
          )}

          {type === "approval" && (
            <>
              <fieldset className="settings-group">
                <legend>صلاحية التنفيذ</legend>
                <div className="stacked-options">
                  {[
                    ["auto", "تنفيذ تلقائي", "دون طلب موافقة كل مرة"],
                    ["approval", "انتظار موافقتي", "لن يُنفذ شيء قبل قبولي"],
                    ["conditional", "موافقة مشروطة", "عند تجاوز المبلغ حدًا معينًا"],
                  ].map(([value, title, caption]) => (
                    <label key={value} className="stacked-option">
                      <input type="radio" name="approval-mode" checked={draft.mode === value} onChange={() => update("mode", value)} />
                      <span><span className="stacked-option__copy"><b>{title}</b><small>{caption}</small></span><i /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="settings-toggle-row">
                <div><Bell /><span><strong>إرسال تذكير قبل التنفيذ</strong><small>يمكنك إلغاء المسار من الإشعار</small></span></div>
                <button className={`flow-switch ${draft.reminder ? "is-on" : ""}`} onClick={() => update("reminder", !draft.reminder)} aria-label="تفعيل تذكير قبل التنفيذ" aria-pressed={draft.reminder}><i /></button>
              </div>
              {draft.reminder && (
                <>
                  <div className="split-fields">
                    <label className="settings-field">
                      <span>التذكير قبل</span>
                      <div className="amount-field"><input type="number" min="1" value={draft.reminderMinutes} onChange={(event) => update("reminderMinutes", event.target.value)} aria-label="مدة التذكير بالدقائق" /><b>دقيقة</b></div>
                    </label>
                  </div>
                  <SettingsChoice
                    label="انتهاء مهلة الموافقة"
                    value={draft.expiry}
                    onChange={(value) => update("expiry", value)}
                    options={[
                      { value: "30", label: "30 دقيقة" },
                      { value: "120", label: "ساعتان" },
                      { value: "day", label: "نهاية اليوم" },
                    ]}
                  />
                </>
              )}
              <div className="settings-note settings-note--warning"><ShieldCheck /><span>إذا لم تصل موافقتك ضمن المهلة، يُلغى التنفيذ تلقائيًا.</span></div>
            </>
          )}
        </div>

        <footer className="block-settings-footer">
          <button className="secondary" onClick={close}>إلغاء</button>
          <button className="primary" onClick={() => save(draft)}><CheckCircle2 /> حفظ الإعدادات</button>
        </footer>
      </section>
    </div>
  );
}

function FlowDraftSheet({ idea, close, announce }) {
  const [editingBlock, setEditingBlock] = useState(null);
  const [actionLibraryOpen, setActionLibraryOpen] = useState(false);
  const [extraActions, setExtraActions] = useState([]);
  const openActionLibrary = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setActionLibraryOpen(true);
  };
  const [bindings, setBindings] = useState({ source: "", savings: "" });
  const [customization, setCustomization] = useState({
    name: "راتبي الذكي",
    color: "coral",
    icon: "workflow",
    activeAfterSave: true,
  });
  const [blockSettings, setBlockSettings] = useState({
    trigger: { kind: "salary", frequency: "each" },
    condition: { minimumBalance: "3000", onFailure: "stop" },
    action: { kind: "save", value: "20", unit: "percent", order: "first" },
    approval: { mode: "approval", reminder: true, reminderMinutes: "30", expiry: "30" },
  });

  const triggerTitles = {
    salary: "عند نزول الراتب",
    incoming: "عند وصول حوالة",
    scheduled: "في الموعد المجدول",
    bill: "قبل استحقاق الفاتورة",
  };
  const actionTitles = {
    save: `تحويل ${blockSettings.action.value}${blockSettings.action.unit === "percent" ? "%" : " ر.س"} إلى الادخار`,
    bill: `سداد فاتورة بقيمة ${blockSettings.action.value} ${blockSettings.action.unit === "percent" ? "%" : "ر.س"}`,
    transfer: `تحويل ${blockSettings.action.value}${blockSettings.action.unit === "percent" ? "%" : " ر.س"} بين الحسابات`,
    notify: "إرسال إشعار مخصص",
  };
  const approvalTitles = {
    auto: "التنفيذ التلقائي ضمن الحدود",
    approval: "انتظار موافقتي قبل التنفيذ",
    conditional: "طلب موافقة عند تجاوز الحد",
  };
  const personalizationIcons = [
    { id: "workflow", icon: Workflow, label: "مسار" },
    { id: "saving", icon: CircleDollarSign, label: "ادخار" },
    { id: "safe", icon: ShieldCheck, label: "أمان" },
    { id: "schedule", icon: CalendarClock, label: "موعد" },
  ];
  const blocks = [
    { id: "trigger", type: "البداية", title: triggerTitles[blockSettings.trigger.kind], icon: Play, tone: "trigger", output: "مبلغ الراتب" },
    { id: "condition", type: "إذا", title: `الرصيد بعد التنفيذ ≥ ${Number(blockSettings.condition.minimumBalance || 0).toLocaleString("en")} ر.س`, icon: ShieldCheck, tone: "condition", output: "نتيجة الشرط" },
    { id: "action", type: "إجراء", title: actionTitles[blockSettings.action.kind], icon: CircleDollarSign, tone: "action", output: "نتيجة التحويل" },
    ...extraActions,
    { id: "approval", type: "التنفيذ", title: approvalTitles[blockSettings.approval.mode], icon: LockKeyhole, tone: "approval", output: "حالة التنفيذ" },
  ];

  return (
    <div className="draft-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="draft-sheet" role="dialog" aria-modal="true" aria-label="تخصيص أتمتة AutoFlow">
        <div className="draft-sheet__handle" />
        <header className="draft-sheet__header">
          <div className="draft-sheet__badge"><WandSparkles /></div>
          <div><span>إنشاء بمساعدة AutoFlow</span><h2>خصص أتمتتك قبل الحفظ</h2></div>
          <button onClick={close} aria-label="إغلاق تخصيص الأتمتة"><X /></button>
        </header>
        <div className="draft-privacy"><LockKeyhole /> <span><strong>لم نطلع على أي بيانات بنكية.</strong> المساعد صمم الهيكل فقط.</span></div>
        <blockquote>{idea}</blockquote>
        <div className="shortcut-editor-label"><span>الإجراءات</span><small>تنفذ من الأعلى إلى الأسفل</small></div>
        <div className="draft-blocks">
          {blocks.map(({ id, type, title, icon: Icon, tone, output, variable }, index) => (
            <React.Fragment key={id}>
              <article className={`draft-block shortcut-action draft-block--${tone} ${editingBlock === id ? "is-configuring" : ""}`}>
                <div className="shortcut-action__header">
                  <span className="draft-block__icon"><Icon /></span>
                  <div><small>{type}</small><strong>{id.startsWith("extra-") ? title : id === "trigger" ? "مشغّل الأتمتة" : id === "condition" ? "شرط الأمان" : id === "approval" ? "طريقة التنفيذ" : "تحويل للادخار"}</strong></div>
                  {id.startsWith("extra-") ? (
                    <button onClick={() => setExtraActions((items) => items.filter((item) => item.id !== id))} aria-label={`حذف ${title}`}><X /></button>
                  ) : (
                    <button onClick={() => setEditingBlock(id)} aria-label={`تعديل ${id === "trigger" ? "المشغّل" : id === "condition" ? "شرط الأمان" : id === "action" ? "إجراء" : "صلاحية"}`}><Settings2 /></button>
                  )}
                </div>
                <div className="shortcut-sentence">
                  {id === "trigger" && <>عند <button className="parameter-pill parameter-pill--event" onClick={() => setEditingBlock("trigger")}>{title.replace("عند ", "")}</button> في <button className={`parameter-pill ${bindings.source ? "is-bound" : "is-empty"}`} onClick={() => setBindings((current) => ({ ...current, source: current.source ? "" : "جاري •••• 1000" }))}>{bindings.source || "اختر الحساب"}</button></>}
                  {id === "condition" && <>إذا كان <span className="parameter-pill parameter-pill--variable">الرصيد المتوقع</span> <span className="parameter-pill parameter-pill--operator">≥</span> <button className="parameter-pill parameter-pill--value" onClick={() => setEditingBlock("condition")}>{Number(blockSettings.condition.minimumBalance || 0).toLocaleString("en")} ر.س</button></>}
                  {id === "action" && <>حوّل <button className="parameter-pill parameter-pill--value" onClick={() => setEditingBlock("action")}>{blockSettings.action.value}{blockSettings.action.unit === "percent" ? "%" : " ر.س"}</button> من <span className="parameter-pill parameter-pill--variable">مبلغ الراتب</span> إلى <button className={`parameter-pill ${bindings.savings ? "is-bound" : "is-empty"}`} onClick={() => setBindings((current) => ({ ...current, savings: current.savings ? "" : "الادخار •••• 2030" }))}>{bindings.savings || "اختر الحساب"}</button></>}
                  {id === "approval" && <><button className="parameter-pill parameter-pill--approval" onClick={() => setEditingBlock("approval")}>{title}</button>{blockSettings.approval.reminder && <> مع تذكير قبل <button className="parameter-pill parameter-pill--value" onClick={() => setEditingBlock("approval")}>{blockSettings.approval.reminderMinutes} دقيقة</button></>}</>}
                  {id.startsWith("extra-") && <>{title} باستخدام <button className="parameter-pill parameter-pill--variable" onClick={() => announce(`تخصيص ${title}`)}>{variable}</button></>}
                </div>
                <div className="shortcut-output"><span>المخرج</span><b>{output}</b></div>
              </article>
              {index < blocks.length - 1 && <div className="block-connector"><i />{(id === "action" || id.startsWith("extra-")) && <button type="button" onMouseDown={openActionLibrary} onClick={openActionLibrary} aria-label={`إضافة إجراء بعد ${title}`}><Plus /></button>}<ChevronDown /></div>}
            </React.Fragment>
          ))}
        </div>
        <button type="button" className="add-action-button" onMouseDown={openActionLibrary} onClick={openActionLibrary}><Plus /> إضافة إجراء</button>
        <div className="variable-legend"><span className="parameter-pill parameter-pill--variable">قيمة ديناميكية</span><small>القيم الزرقاء تُملأ من الخطوة السابقة أو تختارها أنت.</small></div>

        <section className="automation-personalization">
          <div className="automation-personalization__heading"><Sparkles /><div><strong>تخصيص الأتمتة</strong><small>اجعلها واضحة وسهلة التمييز</small></div></div>
          <label className="personalization-name">
            <span>اسم الأتمتة</span>
            <input value={customization.name} onChange={(event) => setCustomization((current) => ({ ...current, name: event.target.value }))} aria-label="اسم الأتمتة" />
          </label>
          <div className="personalization-row">
            <div className="color-picker">
              <span>اللون</span>
              <div>
                {["coral", "purple", "blue", "green"].map((color) => <button key={color} className={`color-dot color-dot--${color} ${customization.color === color ? "is-selected" : ""}`} onClick={() => setCustomization((current) => ({ ...current, color }))} aria-label={`لون ${color}`} aria-pressed={customization.color === color}><i /></button>)}
              </div>
            </div>
            <div className="icon-picker">
              <span>الرمز</span>
              <div>
                {personalizationIcons.map(({ id, icon: Icon, label }) => <button key={id} className={customization.icon === id ? "is-selected" : ""} onClick={() => setCustomization((current) => ({ ...current, icon: id }))} aria-label={`رمز ${label}`} aria-pressed={customization.icon === id}><Icon /></button>)}
              </div>
            </div>
          </div>
          <div className="settings-toggle-row personalization-toggle">
            <div><Power /><span><strong>تشغيل الأتمتة بعد الحفظ</strong><small>يمكنك إيقافها لاحقًا من مركز AutoFlow</small></span></div>
            <button className={`flow-switch ${customization.activeAfterSave ? "is-on" : ""}`} onClick={() => setCustomization((current) => ({ ...current, activeAfterSave: !current.activeAfterSave }))} aria-label="تشغيل الأتمة بعد الحفظ" aria-pressed={customization.activeAfterSave}><i /></button>
          </div>
        </section>
        <footer className="draft-sheet__footer">
          <button className="secondary" onClick={close}>إلغاء</button>
          <button className="primary" onClick={() => {
            if (!bindings.source || !bindings.savings) {
              announce("اختر الحساب المصدر وحساب الادخار أولًا");
              return;
            }
            announce(`تم حفظ ${customization.name} بنجاح`);
            close();
          }}><CheckCircle2 /> حفظ الأتمتة</button>
        </footer>
        {editingBlock && (
          <BlockSettingsSheet
            type={editingBlock}
            settings={blockSettings[editingBlock]}
            close={() => setEditingBlock(null)}
            save={(value) => {
              setBlockSettings((current) => ({ ...current, [editingBlock]: value }));
              announce(`تم حفظ إعدادات ${blockNames[editingBlock]}`);
              setEditingBlock(null);
            }}
          />
        )}
        {actionLibraryOpen && (
          <ActionLibrarySheet
            close={() => setActionLibraryOpen(false)}
            addAction={(action) => {
              setExtraActions((items) => [...items, {
                ...action,
                id: `extra-${action.id}-${Date.now()}`,
                type: "إجراء",
                output: "نتيجة الإجراء",
              }]);
              announce(`تمت إضافة ${action.title}`);
              setActionLibraryOpen(false);
            }}
          />
        )}
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
  const [draftOpen, setDraftOpen] = useState(false);
  const [showAutoFlowHint, setShowAutoFlowHint] = useState(true);

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
  const openDraft = (idea) => {
    setDraftIdea(idea);
    setDraftOpen(true);
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
            <AutoFlowScreen announce={announce} openDraft={openDraft} />
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
          <FlowDraftSheet idea={draftIdea} close={() => setDraftOpen(false)} announce={announce} />
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
