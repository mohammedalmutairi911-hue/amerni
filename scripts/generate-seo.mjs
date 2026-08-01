// ─────────────────────────────────────────────────────────────
//  مولّد صفحات SEO الثابتة لأمرني
//  ينشئ صفحات HTML كاملة (قابلة للفهرسة بدون JavaScript) في public/
//  + sitemap.xml. لا يمسّ تطبيق React إطلاقاً.
//  التشغيل:  node scripts/generate-seo.mjs
// ─────────────────────────────────────────────────────────────
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const PUBLIC = resolve(ROOT, 'public')
const BASE = 'https://www.amerniksa.com'

// نظّف مخرجات التوليد السابقة فقط (لا نلمس بقية public)
for (const d of ['khadamat', 'munshaat']) {
  const p = resolve(PUBLIC, d)
  if (existsSync(p)) rmSync(p, { recursive: true, force: true })
}

// ── المدن (خدمات الأفراد) ─────────────────────────────────────
const CITIES = [
  { slug: 'riyadh',  name: 'الرياض',        blurb: 'العاصمة وأكبر مدن المملكة، حركة طلبات عالية على مدار اليوم' },
  { slug: 'jeddah',  name: 'جدة',           blurb: 'عروس البحر الأحمر ومركز تجاري نشط على الساحل الغربي' },
  { slug: 'dammam',  name: 'الدمام',        blurb: 'قلب المنطقة الشرقية وبوابتها الاقتصادية' },
  { slug: 'makkah',  name: 'مكة المكرمة',   blurb: 'مدينة يزدهر فيها الطلب على الخدمات طوال العام ومواسم الحج والعمرة' },
  { slug: 'madinah', name: 'المدينة المنورة', blurb: 'مدينة تنمو خدماتها مع تزايد الزوّار والسكان' },
  { slug: 'khobar',  name: 'الخبر',         blurb: 'وجهة حيوية في الشرقية تجمع بين الأعمال والترفيه' },
  { slug: 'taif',    name: 'الطائف',        blurb: 'مصيف المملكة، طلب موسمي مرتفع على الخدمات' },
]

// ── خدمات الأفراد ─────────────────────────────────────────────
const SERVICES = [
  {
    slug: 'tawsil', name: 'توصيل', emoji: '🚗',
    tagline: 'توصيل طلبات ومشاوير موثوقة',
    intro: 'خدمة توصيل الطلبات والمشاوير عند الطلب: توصيل أغراض، مستندات، طلبات متاجر، أو مشاوير خاصة عبر مزوّدين موثّقين.',
    subs: ['توصيل أغراض ومشتريات', 'توصيل مستندات وأوراق', 'مشاوير خاصة', 'استلام وتسليم من المتاجر', 'توصيل هدايا'],
  },
  {
    slug: 'taswir', name: 'تصوير', emoji: '📸',
    tagline: 'مصوّرون محترفون لكل مناسبة',
    intro: 'خدمة تصوير احترافية: مناسبات، منتجات، عقارات، صور شخصية، وتغطيات فعاليات — تحجز المصوّر المناسب بضغطة زر.',
    subs: ['تصوير مناسبات', 'تصوير منتجات للمتاجر', 'تصوير عقاري', 'صور شخصية واحترافية', 'تصوير فيديو وريلز'],
  },
  {
    slug: 'tahaqquq', name: 'تحقق', emoji: '🔍',
    tagline: 'خدمات تحقّق ومعاينة ميدانية',
    intro: 'خدمة تحقّق ومعاينة ميدانية: معاينة عقار أو سلعة قبل الشراء، تأكيد عنوان، أو التحقق من حالة شيء نيابةً عنك.',
    subs: ['معاينة عقار قبل الاستئجار', 'فحص سلعة قبل الشراء', 'تأكيد عنوان أو موقع', 'حضور نيابة عنك', 'توثيق حالة بالصور'],
  },
  {
    slug: 'tasawwuq', name: 'تسوق', emoji: '🛍️',
    tagline: 'مساعد تسوّق يشتري نيابةً عنك',
    intro: 'خدمة تسوّق شخصي: نشتري لك احتياجاتك من الأسواق والمتاجر ونوصلها لباب بيتك، مع اختيار دقيق وأمانة في الحساب.',
    subs: ['تسوّق البقالة والاحتياجات', 'شراء هدايا', 'تسوّق من محلات محدّدة', 'مقارنة وشراء أفضل سعر', 'توصيل المشتريات'],
  },
  {
    slug: 'taleem', name: 'تعليم', emoji: '📚',
    tagline: 'معلّمون ومدرّبون خصوصيون',
    intro: 'خدمة تعليم ودروس خصوصية: مدرّسون لكل المراحل والمواد، دروس لغات، وتدريب على مهارات — حضورياً أو عن بُعد.',
    subs: ['دروس تقوية لكل المراحل', 'تعليم لغات', 'تحضير للاختبارات', 'تدريب مهارات', 'تعليم قرآن وتجويد'],
  },
  {
    slug: 'musaada', name: 'مساعدة إدارية', emoji: '🤝',
    tagline: 'مساعد إداري لإنجاز مهامك',
    intro: 'خدمة مساعدة إدارية: إدخال بيانات، تنسيق مواعيد، إنجاز معاملات، وتنظيم أعمال مكتبية نيابةً عنك بسرعة واحترافية.',
    subs: ['إدخال ومعالجة بيانات', 'تنسيق مواعيد وحجوزات', 'إنجاز معاملات', 'أعمال مكتبية', 'مساعدة افتراضية'],
  },
  {
    slug: 'istisharat', name: 'استشارات', emoji: '⚖️',
    tagline: 'استشارات متخصصة عند الطلب',
    intro: 'خدمة استشارات متخصصة: استشارات قانونية، مالية، تقنية، وريادة أعمال من مختصين موثّقين — جلسة واحدة أو متابعة.',
    subs: ['استشارة قانونية', 'استشارة مالية', 'استشارة تقنية', 'استشارة ريادة أعمال', 'مراجعة عقود ومستندات'],
  },
  {
    slug: 'ukhra', name: 'خدمات أخرى', emoji: '✨',
    tagline: 'أي مهمة أخرى تحتاجها',
    intro: 'خدمات متنوّعة عند الطلب: أي مهمة يومية تحتاج من ينجزها بدلاً عنك — اكتب طلبك وسيصلك من ينفّذه بثقة.',
    subs: ['مهام يومية متنوّعة', 'تركيب وتجهيز', 'تنظيم فعاليات صغيرة', 'مهام عاجلة', 'طلبات خاصة'],
  },
]

// ── تخصصات المنشآت (B2B) ──────────────────────────────────────
const B2B = [
  { slug: 'governance',  name: 'الحوكمة والامتثال',   desc: 'سياسات وهياكل تنظيمية وأنظمة GRC للمنشآت' },
  { slug: 'saudization', name: 'نطاقات والتوطين',      desc: 'رفع نسب التوطين ومعالجة نطاقات وزارة الموارد البشرية' },
  { slug: 'legal',       name: 'الاستشارات القانونية', desc: 'صياغة العقود والنزاعات وقانون العمل السعودي' },
  { slug: 'audit',       name: 'التدقيق والمراجعة',    desc: 'مراجعة داخلية وتقارير امتثال' },
  { slug: 'finance',     name: 'المالية والزكاة',      desc: 'ضريبة القيمة المضافة والزكاة والتدقيق المالي' },
  { slug: 'insurance',   name: 'التأمين',             desc: 'تأمين طبي وممتلكات للمنشآت' },
  { slug: 'procurement', name: 'المشتريات',           desc: 'تأهيل موردين وسياسات شراء' },
  { slug: 'strategy',    name: 'الاستراتيجية',        desc: 'خطط تشغيلية وOKRs ومواءمة رؤية 2030' },
  { slug: 'tech',        name: 'التقنية والأمن السيبراني', desc: 'التحول الرقمي وحماية البيانات' },
  { slug: 'marketing',   name: 'التسويق الرقمي',       desc: 'الهوية والمحتوى والحملات الإعلانية' },
  { slug: 'translation', name: 'الترجمة والتعريب',     desc: 'ترجمة مستندات رسمية وتعريب' },
  { slug: 'esg',         name: 'الاستدامة وESG',       desc: 'تقارير الاستدامة والمسؤولية الاجتماعية' },
  { slug: 'training',    name: 'التدريب والتطوير',     desc: 'برامج تأهيل وتطوير قيادات' },
  { slug: 'hse',         name: 'السلامة المهنية',      desc: 'أنظمة HSE وتقييم المخاطر' },
  { slug: 'quality',     name: 'الجودة وISO',          desc: 'شهادات ISO 9001 وISO 14001' },
  { slug: 'government',  name: 'العلاقات الحكومية',    desc: 'التراخيص والتسجيل والتعاملات الحكومية' },
  { slug: 'pm',          name: 'إدارة المشاريع',       desc: 'مكاتب PMO ومنهجيات PMP وPMBOK' },
  { slug: 'realestate',  name: 'العقارات والمرافق',    desc: 'تقييم عقاري وإيجار تجاري وإدارة مرافق' },
]

// ── أدوات ─────────────────────────────────────────────────────
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const urls = [] // لجمع روابط sitemap

function shell({ title, description, canonical, h1, breadcrumbs, jsonld, body }) {
  const crumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((b, i) => ({
      '@type': 'ListItem', position: i + 1, name: b.name,
      item: b.url ? BASE + b.url : undefined,
    })),
  }
  const allLd = [crumbLd, ...(jsonld || [])]
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${BASE}${canonical}" />
<meta name="robots" content="index, follow" />
<link rel="icon" type="image/png" href="/icon-192.png" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${BASE}${canonical}" />
<meta property="og:image" content="${BASE}/og-image.png" />
<meta property="og:locale" content="ar_SA" />
<meta property="og:site_name" content="أمرني" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap" rel="stylesheet" />
<script type="application/ld+json">${JSON.stringify(allLd)}</script>
<style>
:root{--p:#7c3aed;--s:#1a9e6e;--ink:#1e293b;--mut:#64748b;--bg:#f8fafc;--card:#fff;--line:#e2e8f0}
*{box-sizing:border-box}
body{margin:0;font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;color:var(--ink);background:var(--bg);line-height:1.9}
a{color:var(--p);text-decoration:none}
.wrap{max-width:860px;margin:0 auto;padding:0 20px}
header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.hd{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{font-weight:700;font-size:20px;color:var(--p)}
.cta{background:var(--p);color:#fff;padding:9px 18px;border-radius:10px;font-weight:700;font-size:14px;display:inline-block}
.crumbs{font-size:13px;color:var(--mut);padding:14px 0}
.crumbs a{color:var(--mut)}
.hero{background:linear-gradient(135deg,#0f172a,#1e293b 60%,#4c1d95);color:#fff;border-radius:20px;padding:40px 28px;margin:16px 0 28px;text-align:center}
.hero h1{font-size:30px;margin:0 0 12px;line-height:1.4}
.hero p{color:#cbd5e1;font-size:17px;margin:0 0 22px}
.hero .cta{background:#fff;color:var(--p);font-size:16px;padding:12px 28px}
h2{font-size:22px;margin:34px 0 14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:14px 0}
.steps{counter-reset:s;padding:0;list-style:none}
.steps li{counter-increment:s;position:relative;padding:8px 44px 8px 0;margin:6px 0}
.steps li::before{content:counter(s);position:absolute;right:0;top:6px;width:30px;height:30px;background:var(--p);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chip{background:#f1f5f9;border:1px solid var(--line);border-radius:999px;padding:7px 14px;font-size:14px;color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin:12px 0}
.grid a{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px;font-weight:500;color:var(--ink);transition:.15s}
.grid a:hover{border-color:var(--p);color:var(--p)}
.faq{background:#fff;border:1px solid var(--line);border-radius:12px;padding:6px 20px;margin:10px 0}
.faq summary{font-weight:700;cursor:pointer;padding:14px 0;font-size:16px}
.faq p{margin:0 0 14px;color:var(--mut)}
.trust{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.trust div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.trust b{display:block;margin-bottom:4px}
footer{background:#0f172a;color:#94a3b8;margin-top:50px;padding:34px 0;font-size:14px}
footer a{color:#cbd5e1}
.foot-cta{text-align:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:30px;margin:30px 0}
</style>
</head>
<body>
<header><div class="wrap hd">
  <a href="/" class="logo">أمرني</a>
  <a href="/" class="cta">افتح التطبيق</a>
</div></header>
<div class="wrap">
  <nav class="crumbs">${breadcrumbs.map((b, i) => i < breadcrumbs.length - 1 && b.url ? `<a href="${b.url}">${esc(b.name)}</a> ‹ ` : esc(b.name)).join('')}</nav>
  ${body}
  <div class="foot-cta">
    <h2 style="margin-top:0">جاهز تطلب الآن؟</h2>
    <p style="color:var(--mut)">اكتب طلبك على أمرني ويصلك مزوّد خدمة موثّق خلال دقائق.</p>
    <a href="/" class="cta" style="font-size:16px;padding:12px 30px">ابدأ عبر أمرني</a>
  </div>
</div>
<footer><div class="wrap">
  <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:8px">أمرني</div>
  <p>منصة سعودية تربط الأفراد والمنشآت بمزوّدي خدمات موثوقين.</p>
  <p><a href="/khadamat.html">كل الخدمات</a> · <a href="/munshaat.html">قسم المنشآت</a> · <a href="/">الصفحة الرئيسية</a></p>
  <p style="font-size:12px;margin-top:14px">© ${new Date().getFullYear()} أمرني — جميع الحقوق محفوظة.</p>
</div></footer>
</body>
</html>`
}

function writePage(relPath, html, { priority = 0.7, changefreq = 'monthly' } = {}) {
  const full = resolve(PUBLIC, relPath)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, html, 'utf8')
  urls.push({ loc: `${BASE}/${relPath.replace(/\\/g, '/')}`, priority, changefreq })
}

// ── صفحة خدمة + مدينة ─────────────────────────────────────────
function cityServicePage(svc, city) {
  const path = `khadamat/${svc.slug}-${city.slug}.html`
  const canonical = `/${path}`
  const title = `${svc.name} في ${city.name} | ${svc.tagline} — أمرني`
  const description = `${svc.intro} خدمة ${svc.name} في ${city.name} عبر مزوّدين موثّقين — سريع وآمن ومضمون مع أمرني.`
  const h1 = `${svc.name} في ${city.name}`

  const otherCities = CITIES.filter(c => c.slug !== city.slug)
    .map(c => `<a href="/khadamat/${svc.slug}-${c.slug}.html">${svc.name} في ${c.name}</a>`).join('')
  const otherSvcs = SERVICES.filter(s => s.slug !== svc.slug).slice(0, 6)
    .map(s => `<a href="/khadamat/${s.slug}-${city.slug}.html">${s.name} في ${city.name}</a>`).join('')

  const faqs = [
    { q: `كيف أطلب ${svc.name} في ${city.name}؟`, a: `افتح تطبيق أمرني، اكتب تفاصيل طلب ${svc.name}، وحدّد موقعك في ${city.name}، وسيصلك عرض من مزوّد خدمة موثّق قريب منك.` },
    { q: `هل مزوّدو ${svc.name} في ${city.name} موثوقون؟`, a: `نعم، كل مزوّد خدمة على أمرني يمر بفحص هوية وتدقيق قبل قبوله، وتظهر لك تقييمات العملاء السابقين قبل الاختيار.` },
    { q: `كم تكلفة ${svc.name} في ${city.name}؟`, a: `تختلف التكلفة حسب تفاصيل الطلب. على أمرني تصلك عروض أسعار من عدة مزوّدين وتختار الأنسب لك بشفافية كاملة.` },
    { q: `هل الدفع آمن؟`, a: `نعم، طلبك يكتمل فقط بعد تأكيدك استلام الخدمة، وتواصلك يبقى محمياً داخل المنصة دون مشاركة أرقامك.` },
  ]
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const serviceLd = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: `${svc.name} في ${city.name}`, serviceType: svc.name,
    provider: { '@type': 'Organization', name: 'أمرني', url: BASE },
    areaServed: { '@type': 'City', name: city.name },
    description,
  }

  const body = `
  <div class="hero">
    <h1>${svc.emoji} ${esc(h1)}</h1>
    <p>${esc(svc.tagline)} — بأمان وثقة في ${esc(city.name)}</p>
    <a href="/" class="cta">اطلب الآن</a>
  </div>
  <p>${esc(svc.intro)} في ${esc(city.name)} — ${esc(city.blurb)} — تجد على <strong>أمرني</strong> مزوّدي خدمة موثّقين جاهزين لتنفيذ طلبك بسرعة.</p>

  <h2>خدمات ${esc(svc.name)} المتوفرة في ${esc(city.name)}</h2>
  <div class="chips">${svc.subs.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>

  <h2>كيف تطلب ${esc(svc.name)} عبر أمرني؟</h2>
  <ol class="steps">
    <li>اكتب تفاصيل طلبك من ${esc(svc.name)} وحدّد موقعك في ${esc(city.name)}.</li>
    <li>تصلك عروض من مزوّدي خدمة موثّقين قريبين منك.</li>
    <li>قارن الأسعار والتقييمات واختر الأنسب.</li>
    <li>يُنفَّذ الطلب، وتؤكّد استلامك للخدمة قبل اكتمال الدفع.</li>
  </ol>

  <h2>ليش تختار أمرني؟</h2>
  <div class="trust">
    <div><b>مزوّدون معتمدون</b>كل مزوّد يمر بفحص هوية وتدقيق قبل قبوله.</div>
    <div><b>دفع آمن ومضمون</b>الطلب يكتمل بعد تأكيدك استلام الخدمة.</div>
    <div><b>محادثة محمية</b>تواصل داخل المنصة دون مشاركة أرقامك.</div>
    <div><b>تقييم شفاف</b>تقييمات حقيقية تبني سمعة كل مزوّد.</div>
  </div>

  <h2>أسئلة شائعة</h2>
  ${faqs.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}

  <h2>${esc(svc.name)} في مدن أخرى</h2>
  <div class="grid">${otherCities}</div>

  <h2>خدمات أخرى في ${esc(city.name)}</h2>
  <div class="grid">${otherSvcs}</div>`

  writePage(path, shell({
    title, description, canonical, h1,
    breadcrumbs: [
      { name: 'أمرني', url: '/' },
      { name: 'الخدمات', url: '/khadamat.html' },
      { name: svc.name, url: `/khadamat/${svc.slug}.html` },
      { name: city.name },
    ],
    jsonld: [serviceLd, faqLd], body,
  }), { priority: 0.7, changefreq: 'monthly' })
}

// ── صفحة خدمة وطنية (هَب) ─────────────────────────────────────
function serviceHub(svc) {
  const path = `khadamat/${svc.slug}.html`
  const canonical = `/${path}`
  const title = `${svc.name} في السعودية | ${svc.tagline} عند الطلب — أمرني`
  const description = `${svc.intro} احجز خدمة ${svc.name} في جميع مدن المملكة عبر مزوّدين موثّقين مع أمرني.`

  const cityLinks = CITIES.map(c => `<a href="/khadamat/${svc.slug}-${c.slug}.html">${svc.name} في ${c.name}</a>`).join('')
  const otherSvcs = SERVICES.filter(s => s.slug !== svc.slug)
    .map(s => `<a href="/khadamat/${s.slug}.html">${s.emoji} ${s.name}</a>`).join('')

  const serviceLd = {
    '@context': 'https://schema.org', '@type': 'Service',
    name: svc.name, serviceType: svc.name,
    provider: { '@type': 'Organization', name: 'أمرني', url: BASE },
    areaServed: { '@type': 'Country', name: 'المملكة العربية السعودية' }, description,
  }

  const body = `
  <div class="hero">
    <h1>${svc.emoji} ${esc(svc.name)} في السعودية</h1>
    <p>${esc(svc.tagline)} عبر مزوّدين موثّقين في كل مدن المملكة</p>
    <a href="/" class="cta">اطلب الآن</a>
  </div>
  <p>${esc(svc.intro)} عبر <strong>أمرني</strong> تصلك عروض من مزوّدي خدمة معتمدين، وتختار الأنسب بالسعر والتقييم بثقة وأمان.</p>

  <h2>ما الذي تشمله خدمة ${esc(svc.name)}؟</h2>
  <div class="chips">${svc.subs.map(s => `<span class="chip">${esc(s)}</span>`).join('')}</div>

  <h2>اطلب ${esc(svc.name)} في مدينتك</h2>
  <div class="grid">${cityLinks}</div>

  <h2>كيف يعمل أمرني؟</h2>
  <ol class="steps">
    <li>اكتب طلبك من ${esc(svc.name)} بتفاصيله.</li>
    <li>تصلك عروض من مزوّدين موثّقين قريبين منك.</li>
    <li>قارن واختر الأنسب لك.</li>
    <li>أكّد استلام الخدمة ليكتمل الدفع بأمان.</li>
  </ol>

  <h2>خدمات أخرى على أمرني</h2>
  <div class="grid">${otherSvcs}</div>`

  writePage(path, shell({
    title, description, canonical, h1: svc.name,
    breadcrumbs: [{ name: 'أمرني', url: '/' }, { name: 'الخدمات', url: '/khadamat.html' }, { name: svc.name }],
    jsonld: [serviceLd], body,
  }), { priority: 0.8, changefreq: 'weekly' })
}

// ── هَب المنشآت B2B ───────────────────────────────────────────
function b2bCategoryPage(cat) {
  const path = `munshaat/${cat.slug}.html`
  const canonical = `/${path}`
  const title = `${cat.name} للمنشآت | خبراء معتمدون — أمرني للأعمال`
  const description = `${cat.desc}. اطلب خدمة ${cat.name} لمنشأتك عبر خبراء ومزوّدين معتمدين في السعودية مع منصة أمرني للمنشآت.`

  const others = B2B.filter(c => c.slug !== cat.slug).slice(0, 8)
    .map(c => `<a href="/munshaat/${c.slug}.html">${c.name}</a>`).join('')

  const faqs = [
    { q: `كيف تطلب منشأتي خدمة ${cat.name}؟`, a: `أنشئ طلبك (RFP) على منصة أمرني للمنشآت، وحدّد احتياجك في ${cat.name}، وسيصلك عروض من مزوّدين معتمدين لمقارنتها والتعاقد المباشر.` },
    { q: `هل المزوّدون في ${cat.name} معتمدون؟`, a: `نعم، مزوّدو الخدمة للمنشآت يمرّون بتحقق قبل قبولهم، وتطّلع على ملفاتهم وأعمالهم السابقة قبل الاختيار.` },
    { q: `هل تناسب الخدمة المنشآت الصغيرة والكبيرة؟`, a: `نعم، تبدأ رحلتك بتقييم نضج الأعمال ثم يُصمَّم الطلب بما يناسب حجم منشأتك واحتياجها.` },
  ]
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
  const serviceLd = { '@context': 'https://schema.org', '@type': 'Service', name: cat.name, provider: { '@type': 'Organization', name: 'أمرني للمنشآت', url: BASE }, areaServed: { '@type': 'Country', name: 'المملكة العربية السعودية' }, description }

  const body = `
  <div class="hero">
    <h1>${esc(cat.name)}</h1>
    <p>${esc(cat.desc)} — عبر خبراء معتمدين لمنشأتك</p>
    <a href="/" class="cta">اطلب للمنشأة</a>
  </div>
  <p>خدمة <strong>${esc(cat.name)}</strong> ضمن منصة أمرني للمنشآت (B2B): ${esc(cat.desc)}. صمّم طلبك بذكاء، وقارن عروض مزوّدين معتمدين، وتعاقد مباشرة بثقة.</p>

  <h2>كيف تعمل منصة المنشآت؟</h2>
  <ol class="steps">
    <li>قيّم نضج أعمال منشأتك عبر تقييم سريع.</li>
    <li>يولّد النظام طلب عروض (RFP) ذكياً لاحتياجك في ${esc(cat.name)}.</li>
    <li>تصلك عروض من مزوّدين معتمدين لمقارنتها.</li>
    <li>تتعاقد مباشرة مع المزوّد الأنسب.</li>
  </ol>

  <h2>أسئلة شائعة</h2>
  ${faqs.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}

  <h2>تخصصات أخرى للمنشآت</h2>
  <div class="grid">${others}</div>`

  writePage(path, shell({
    title, description, canonical, h1: cat.name,
    breadcrumbs: [{ name: 'أمرني', url: '/' }, { name: 'المنشآت', url: '/munshaat.html' }, { name: cat.name }],
    jsonld: [serviceLd, faqLd], body,
  }), { priority: 0.7, changefreq: 'monthly' })
}

// ── الصفحات التجميعية ─────────────────────────────────────────
function servicesIndex() {
  const cards = SERVICES.map(s => `<a href="/khadamat/${s.slug}.html">${s.emoji} <strong>${s.name}</strong><br><span style="color:var(--mut);font-size:14px">${esc(s.tagline)}</span></a>`).join('')
  const body = `
  <div class="hero"><h1>كل خدمات أمرني للأفراد</h1><p>اطلب أي خدمة يومية عبر مزوّدين موثّقين في كل مدن المملكة</p><a href="/" class="cta">افتح التطبيق</a></div>
  <h2>تصفّح حسب نوع الخدمة</h2>
  <div class="grid">${cards}</div>
  <h2>للمنشآت والشركات</h2>
  <p>تبحث عن خدمات احترافية لمنشأتك؟ <a href="/munshaat.html">استعرض قسم المنشآت B2B</a> ← ١٨ تخصصاً بخبراء معتمدين.</p>`
  writePage('khadamat.html', shell({
    title: 'خدمات أمرني | اطلب أي خدمة في السعودية عبر مزوّدين موثوقين',
    description: 'تصفّح كل خدمات أمرني للأفراد: توصيل، تصوير، تحقق، تسوق، تعليم، مساعدة إدارية، استشارات والمزيد — في كل مدن المملكة.',
    canonical: '/khadamat.html', h1: 'كل الخدمات',
    breadcrumbs: [{ name: 'أمرني', url: '/' }, { name: 'الخدمات' }], jsonld: [], body,
  }), { priority: 0.9, changefreq: 'weekly' })
}

function b2bIndex() {
  const cards = B2B.map(c => `<a href="/munshaat/${c.slug}.html"><strong>${c.name}</strong><br><span style="color:var(--mut);font-size:14px">${esc(c.desc)}</span></a>`).join('')
  const body = `
  <div class="hero"><h1>أمرني للمنشآت — خدمات B2B</h1><p>ربط منشأتك بخبراء معتمدين في ١٨ تخصصاً</p><a href="/" class="cta">ابدأ الآن</a></div>
  <p>منصة <strong>أمرني للمنشآت</strong> تربط الشركات والجهات بمزوّدي خدمات وخبراء معتمدين: من تقييم نضج الأعمال، إلى توليد طلب العروض، ومقارنة العروض، والتعاقد المباشر.</p>
  <h2>التخصصات المتاحة</h2>
  <div class="grid">${cards}</div>`
  writePage('munshaat.html', shell({
    title: 'أمرني للمنشآت | خدمات B2B وخبراء معتمدون في السعودية',
    description: 'منصة أمرني للمنشآت تربط الشركات بخبراء معتمدين في ١٨ تخصصاً: الحوكمة، المالية، التقنية، الموارد البشرية، التوطين والمزيد.',
    canonical: '/munshaat.html', h1: 'أمرني للمنشآت',
    breadcrumbs: [{ name: 'أمرني', url: '/' }, { name: 'المنشآت' }], jsonld: [], body,
  }), { priority: 0.9, changefreq: 'weekly' })
}

// ── التوليد ───────────────────────────────────────────────────
servicesIndex()
for (const svc of SERVICES) {
  serviceHub(svc)
  for (const city of CITIES) cityServicePage(svc, city)
}
b2bIndex()
for (const cat of B2B) b2bCategoryPage(cat)

// ── sitemap.xml ───────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`
writeFileSync(resolve(PUBLIC, 'sitemap.xml'), sitemap, 'utf8')

console.log(`✓ تم توليد ${urls.length} صفحة SEO + sitemap.xml (${urls.length + 1} رابط)`)
