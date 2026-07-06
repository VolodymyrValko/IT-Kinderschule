// ─────────────────────────────────────────────────────────────
//  Контент сайту (CMS). Джерело правди для курсів, викладачів,
//  відгуків, FAQ, соцмереж та контактів. Редагується з адмінки,
//  зберігається у data/content.json. Зміни застосовуються одразу,
//  без перезапуску сервера (in-memory кеш + атомарний запис).
// ─────────────────────────────────────────────────────────────
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'content.json');

// ── Контент за замовчуванням (засів при першому запуску) ──────
export const DEFAULT_CONTENT = {
  courses: [
    { id: 'scratch', icon: 'bi-puzzle', cls: 'c-scratch', cats: ['young', 'coding'], age: '7–12', schedule: 'SA 16:30–19:00',
      uk: { title: 'Scratch', desc: 'Перші кроки у програмуванні: діти створюють власні ігри та анімації, розвиваючи логіку, креативність і вміння працювати в команді.' },
      de: { title: 'Scratch', desc: 'Erste Schritte beim Programmieren: Kinder erstellen eigene Spiele und Animationen und entwickeln Logik und Kreativität.' } },
    { id: 'microbit', icon: 'bi-cpu', cls: 'c-microbit', cats: ['young', 'robotics'], age: '10–14', schedule: 'SA 16:30–19:00',
      uk: { title: 'BBC micro:bit', desc: 'Діти створюють справжні розумні пристрої на платі BBC micro:bit — сучасному інструменті для навчання робототехніки та програмування.' },
      de: { title: 'BBC micro:bit', desc: 'Kinder bauen echte smarte Geräte mit dem BBC micro:bit — einem modernen Werkzeug für Robotik und Programmierung.' } },
    { id: 'arduino', icon: 'bi-motherboard', cls: 'c-arduino', cats: ['teen', 'robotics'], age: '12–18', schedule: 'SA 16:30–19:00',
      uk: { title: 'Arduino', desc: 'Програмування та створення роботів на базі мікроконтролера Arduino. Для тих, хто цікавиться електронікою, схемами та програмуванням.' },
      de: { title: 'Arduino', desc: 'Programmieren und Roboterbau mit dem Mikrocontroller Arduino. Für alle, die sich für Elektronik und Schaltungen interessieren.' } },
    { id: 'ai', icon: 'bi-cpu-fill', cls: 'c-ai', cats: ['teen', 'robotics', 'coding'], age: '12–18', schedule: 'SA 16:30–19:00',
      uk: { title: 'Штучний інтелект', desc: 'Створюємо та використовуємо роботизовані пристрої на базі штучного інтелекту (AI). Сучасний напрямок для допитливих підлітків.' },
      de: { title: 'Künstliche Intelligenz', desc: 'Wir bauen und nutzen robotergestützte Geräte auf Basis von KI. Eine moderne Richtung für neugierige Jugendliche.' } },
    { id: 'webdev', icon: 'bi-code-slash', cls: 'c-webdev', cats: ['teen', 'coding'], age: '12–18', schedule: 'SA 16:30–19:00',
      uk: { title: 'HTML + CSS + JS', desc: 'Веброзробка з нуля: від першої сторінки до інтерактивного сайту. Не лише хобі, а й основа майбутньої професії у сфері ІТ.' },
      de: { title: 'HTML + CSS + JS', desc: 'Webentwicklung von Grund auf: von der ersten Seite bis zur interaktiven Website — die Basis für einen IT-Beruf.' } },
  ],
  hero: {
    image: 'images/20250524_170940.jpg',
    bg: 'images/20240406_143719.jpg', // фонове фото банера (розмите, за текстом); порожньо = вимкнено
    uk: { pill: '', title: 'Програмуємо *майбутнє* разом', subtitle: 'Курси робототехніки та програмування для дітей 7–18 років. Від першого робота до власного сайту й проєктів зі штучного інтелекту.' },
    de: { pill: '', title: 'Wir programmieren die *Zukunft* gemeinsam', subtitle: 'Spannende Robotik- und Programmierkurse für Kinder von 7–18 Jahren. Vom ersten Roboter bis zur eigenen Website und KI-Projekten.' },
    stats: [
      { value: '350+', uk: 'учнів навчалося', de: 'Schüler unterrichtet' },
      { value: '5', uk: 'напрямків', de: 'Fachrichtungen' },
      { value: '3', uk: 'роки у Гамбурзі', de: 'Jahre in Hamburg' },
    ],
  },
  about: {
    image: 'images/IMG_2840.jpg',
    uk: { title: 'Чому батьки обирають IT Kinderschule?', text: 'Ми віримо, що кожна дитина має потенціал стати винахідником. Наша місія — дати дітям знання та навички в галузі STEM через гру, творчість і реальні проєкти. Ми розвиваємо логіку, креативність і вміння працювати в команді.' },
    de: { title: 'Warum Eltern IT Kinderschule wählen', text: 'Wir glauben, dass jedes Kind das Potenzial hat, Erfinder zu werden. Unsere Mission: Kindern STEM-Wissen durch Spiel, Kreativität und echte Projekte zu vermitteln. Wir fördern Logik, Kreativität und Teamarbeit.' },
    features: [
      { icon: 'bi-person-workspace', uk: { title: 'Викладачі-практики', desc: 'Досвідчені інженери та розробники, які надихають.' }, de: { title: 'Lehrkräfte aus der Praxis', desc: 'Erfahrene Ingenieure und Entwickler, die begeistern.' } },
      { icon: 'bi-bar-chart-steps', uk: { title: 'Від простого до складного', desc: 'Унікальна методика, комфортна для новачків.' }, de: { title: 'Vom Einfachen zum Komplexen', desc: 'Eine Methodik, die auch Anfängern Freude macht.' } },
      { icon: 'bi-tools', uk: { title: 'Сучасне обладнання', desc: 'Роботи, плати, ноутбуки — все надаємо ми.' }, de: { title: 'Moderne Ausstattung', desc: 'Roboter, Boards, Laptops — alles von uns gestellt.' } },
      { icon: 'bi-heart', uk: { title: 'Тепла атмосфера', desc: 'Дружнє україномовне середовище у Гамбурзі.' }, de: { title: 'Herzliche Atmosphäre', desc: 'Freundliches Umfeld in Hamburg.' } },
    ],
  },
  teachers: [
    { initials: 'IT', photo: '', uk: { name: 'Команда викладачів', role: 'Інженери та розробники', bio: 'Практики з досвідом у робототехніці, електроніці та веброзробці, які вміють зацікавити технологіями.' }, de: { name: 'Lehrkräfte-Team', role: 'Ingenieure & Entwickler', bio: 'Praktikanten mit Erfahrung in den Bereichen Robotik, Elektronik und Webentwicklung, die das Interesse an Technologien wecken können.' } },
    { initials: 'AI', photo: '', uk: { name: 'Наставники з AI', role: 'Курс штучного інтелекту', bio: 'Допомагають підліткам зрозуміти, як працює сучасний штучний інтелект — на практиці.' }, de: { name: 'KI-Mentoren', role: 'Kurs künstliche Intelligenz', bio: 'Sie helfen Jugendlichen dabei, in der Praxis zu verstehen, wie moderne künstliche Intelligenz funktioniert.' } },
    { initials: 'RB', photo: '', uk: { name: 'Тренери з робототехніки', role: 'micro:bit та Arduino', bio: 'Перетворюють складні інженерні концепції на захопливі ігрові завдання.' }, de: { name: 'Robotik-Trainer', role: 'micro:bit & Arduino', bio: 'Verwandeln komplexe Technik in spannende, spielerische Aufgaben.' } },
  ],
  reviews: [
    { initials: 'АК', uk: { text: 'Син просто в захваті! Раніше не відривався від ігор, а тепер сам просить нові набори, щоб збирати щось вдома. Дякую IT Kinderschule!', name: 'Анна К.', role: 'Мама учня' }, de: { text: 'Mein Sohn ist begeistert! Früher nur Videospiele, jetzt baut er selbst zu Hause. Danke IT Kinderschule!', name: 'Anna K.', role: 'Mutter eines Schülers' } },
    { initials: 'ІП', uk: { text: 'Найкраща інвестиція в розвиток дитини. Бачу, як у доньки розвивається логіка. Викладачі — справжні професіонали.', name: 'Іван П.', role: 'Тато учениці' }, de: { text: 'Die beste Investition in mein Kind. Die Logik meiner Tochter wächst sichtbar. Die Lehrkräfte sind echte Profis.', name: 'Ivan P.', role: 'Vater einer Schülerin' } },
    { initials: 'О', uk: { text: 'Тут дуже круто! Ми збирали робота, який їздить по чорній лінії. Складно, але цікаво. Я знайшов нових друзів.', name: 'Олег', role: 'Учень, 11 років' }, de: { text: 'Hier ist es super! Wir haben einen Roboter gebaut, der einer Linie folgt. Schwer, aber spannend. Neue Freunde gefunden!', name: 'Oleg', role: 'Schüler, 11 Jahre' } },
  ],
  faq: [
    { uk: { q: 'Що потрібно для першого заняття?', a: 'Нічого спеціального — лише гарний настрій і бажання творити. Ноутбуки, плати та набори робототехніки ми надаємо.' }, de: { q: 'Was wird für die erste Stunde benötigt?', a: 'Nichts Besonderes — nur gute Laune. Laptops, Boards und Robotik-Sets stellen wir.' } },
    { uk: { q: 'Дитина ніколи не програмувала. Підійдуть курси?', a: 'Так! Курси розраховані на різний рівень, зокрема абсолютних новачків. Ми починаємо з азів і поступово ускладнюємо.' }, de: { q: 'Mein Kind hat nie programmiert. Passen die Kurse?', a: 'Ja! Die Kurse sind für jedes Niveau, auch für absolute Anfänger. Wir starten bei den Grundlagen.' } },
    { uk: { q: 'Де і коли проходять заняття?', a: 'Überseering 26, 22297 Hamburg (Ukraine Haus). Заняття по суботах, 16:30–19:00.' }, de: { q: 'Wo und wann findet der Unterricht statt?', a: 'Überseering 26, 22297 Hamburg (Ukraine Haus). Jeden Samstag, 16:30–19:00.' } },
    { uk: { q: 'Якою мовою проходять заняття?', a: 'Заняття проводяться українською мовою у дружньому середовищі. Викладачі спілкуються обома мовами — німецькою і українською.' }, de: { q: 'In welcher Sprache findet der Unterricht statt?', a: 'Der Unterricht findet in ukrainischer Sprache in einer freundlichen Atmosphäre statt. Die Lehrkräfte kommunizieren in beiden Sprachen – Deutsch und Ukrainisch.' } },
  ],
  gallery: [
    'images/20240217_101500.jpg', 'images/20230415_124730.jpg', 'images/IMG_2810.jpg',
    'images/20230415_140833.jpg', 'images/20231007_104906.jpg', 'images/20240217_135218.jpg',
    'images/20240406_143755.jpg', 'images/20240406_143719.jpg', 'images/IMG_2840.jpg'
  ],
  social: {
    facebook: 'https://www.facebook.com/ukrainian.hacker.school/',
    instagram: '',
    whatsapp: '',
    telegram: '',
    youtube: '',
  },
  contact: {
    email: 'hackerschoolua@gmail.com',
    phone: '',
    addressUk: 'Überseering 26, 22297 Hamburg',
    addressDe: 'Überseering 26, 22297 Hamburg',
    addressUrl: 'https://maps.app.goo.gl/1o1XzMTQrUvzUWFv9',
    scheduleUk: 'Заняття по суботах, 16:30–19:00',
    scheduleDe: 'Unterricht am Samstag, 16:30–19:00',
  },
  // Перевизначення статичних текстів (data-i18n) — редагуються в адмінці
  // прямо на полотні. Накладаються поверх перекладів I18N на сайті.
  texts: {
    uk: {
      badge1: 'Програмування роботів',
      heroCta1: 'Пробне заняття',
      filterYoung: '7–12 років',
      step1d: "Залиште заявку на сайті — ми зв'яжемося з Вами найближчим часом.",
      step2d: 'Одне заняття, щоб дитина спробувала й обрала напрямок.',
      step3d: 'Регулярні заняття по суботах в групах із реальними проєктами.',
      enrollTitle: 'Запишіть дитину на пробне заняття',
      footAbout: 'Школа робототехніки та програмування для дітей у Гамбурзі. Навчаємо майбутніх інженерів через гру та творчість.',
    },
    de: {
      badge1: 'Programmieren Roboter',
      heroCta1: 'Probestunde',
      step2d: 'Eine Probestunde, damit das Kind es ausprobieren und sich für eine Richtung entscheiden kann.',
      step3d: 'Regelmäßige Kurse samstags in Gruppen mit konkreten Projekten.',
      enrollTitle: 'Melden Sie Ihr Kind zur Probestunde an',
      footAbout: 'Schule für Robotik und Programmierung für Kinder in Hamburg. Wir bringen zukünftigen Ingenieuren das Fachwissen durch Spiel und Kreativität bei.',
    },
  },
};

// ── Порядок секцій сторінки за замовчуванням («стандартний вигляд») ──
// kind:'section' — готова секція сайту; kind:'block' — атомарний елемент
// (заголовок/текст/фото/кнопка/відступ/лінія), який можна вставляти будь-де.
export const SECTION_REFS = ['hero', 'marquee', 'about', 'courses', 'how', 'teachers', 'gallery', 'reviews', 'faq', 'enroll', 'newsletter'];
export const DEFAULT_LAYOUT = SECTION_REFS.map((ref) => ({ kind: 'section', ref }));

// Схема атомарних блоків (значення за замовчуванням + межі санітизації)
const ALIGN = ['left', 'center', 'right'];
const ATOMIC_TYPES = ['heading', 'text', 'image', 'button', 'spacer', 'divider'];

let cache = null;

const clone = (o) => JSON.parse(JSON.stringify(o));
const ICON_RE = /^bi-[a-z0-9-]+$/;
const VALID_CATS = ['young', 'teen', 'robotics', 'coding'];
const VALID_CLS = ['c-scratch', 'c-microbit', 'c-arduino', 'c-ai', 'c-webdev'];
const str = (v, max = 400) => String(v ?? '').trim().slice(0, max);
const url = (v) => {
  const s = str(v, 500);
  if (!s) return '';
  return /^https?:\/\//i.test(s) || s.startsWith('mailto:') ? s : 'https://' + s;
};
// Безпечний шлях до зображення: http(s) або відносний images/... (без пробілів/лапок)
const imgPath = (v) => {
  const s = str(v, 300);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return /^[\w./-]+$/.test(s) ? s.replace(/^\/+/, '') : '';
};

function slug(s) {
  return str(s, 40).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'course-' + Date.now();
}

// Безпечне посилання для блоку-кнопки: якір (#...), відносний (/...),
// mailto: або http(s). Інакше — порожньо.
const link = (v) => {
  const s = str(v, 400);
  if (!s) return '';
  if (/^#[\w-]*$/.test(s) || /^\/[\w./#?=&-]*$/.test(s)) return s;
  if (/^mailto:/i.test(s) || /^https?:\/\//i.test(s)) return s;
  return '';
};
const oneOf = (v, list, def) => (list.includes(v) ? v : def);
const genId = () => 'blk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Санітизація даних одного атомарного блоку ────────────────
function sanitizeBlockData(type, d) {
  d = d || {};
  switch (type) {
    case 'heading':
      return {
        level: [2, 3].includes(+d.level) ? +d.level : 2,
        align: oneOf(d.align, ALIGN, 'left'),
        uk: { text: str(d?.uk?.text, 200) },
        de: { text: str(d?.de?.text, 200) || str(d?.uk?.text, 200) },
      };
    case 'text':
      return {
        align: oneOf(d.align, ALIGN, 'left'),
        uk: { text: str(d?.uk?.text, 2000) },
        de: { text: str(d?.de?.text, 2000) || str(d?.uk?.text, 2000) },
      };
    case 'image':
      return {
        src: imgPath(d.src),
        alt: str(d.alt, 160),
        width: oneOf(d.width, ['normal', 'wide', 'full'], 'normal'),
        align: oneOf(d.align, ALIGN, 'center'),
      };
    case 'button':
      return {
        align: oneOf(d.align, ALIGN, 'left'),
        variant: oneOf(d.variant, ['primary', 'ghost'], 'primary'),
        href: link(d.href) || '#enroll',
        uk: { label: str(d?.uk?.label, 60) },
        de: { label: str(d?.de?.label, 60) || str(d?.uk?.label, 60) },
      };
    case 'spacer':
      return { size: oneOf(d.size, ['s', 'm', 'l'], 'm') };
    case 'divider':
      return {};
    default:
      return {};
  }
}

// ── Санітизація перевизначень статичних текстів ──────────────
const TKEY_RE = /^[A-Za-z0-9_]{1,40}$/;
function sanitizeTexts(t) {
  const out = { uk: {}, de: {} };
  if (!t || typeof t !== 'object') return out;
  for (const lng of ['uk', 'de']) {
    const src = t[lng];
    if (!src || typeof src !== 'object') continue;
    let n = 0;
    for (const k of Object.keys(src)) {
      if (n >= 300) break;
      if (!TKEY_RE.test(k)) continue;
      const v = str(src[k], 800);
      if (v) { out[lng][k] = v; n++; }
    }
  }
  return out;
}

// ── Санітизація полотна (layout) ─────────────────────────────
function sanitizeLayout(arr) {
  if (!Array.isArray(arr)) return clone(DEFAULT_LAYOUT);
  const out = [];
  const seenSection = new Set();
  for (const it of arr.slice(0, 120)) {
    if (!it || typeof it !== 'object') continue;
    if (it.kind === 'section') {
      const ref = String(it.ref || '');
      if (SECTION_REFS.includes(ref) && !seenSection.has(ref)) {
        seenSection.add(ref);
        out.push({ kind: 'section', ref });
      }
    } else if (it.kind === 'block') {
      const type = String(it.type || '');
      if (ATOMIC_TYPES.includes(type)) {
        const id = /^blk_[a-z0-9_]+$/i.test(String(it.id || '')) ? it.id : genId();
        out.push({ kind: 'block', type, id, data: sanitizeBlockData(type, it.data) });
      }
    }
  }
  return out.length ? out : clone(DEFAULT_LAYOUT);
}

// ── Санітизація вхідного контенту з адмінки ──────────────────
function sanitize(input) {
  const c = input || {};
  const out = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  const usedIds = new Set();

  if (Array.isArray(c.courses)) {
    out.courses = c.courses.slice(0, 30).map((x) => {
      let id = slug(x.id || x?.uk?.title || '');
      while (usedIds.has(id)) id += '-2';
      usedIds.add(id);
      return {
        id,
        icon: ICON_RE.test(x.icon) ? x.icon : 'bi-mortarboard',
        cls: VALID_CLS.includes(x.cls) ? x.cls : 'c-webdev',
        cats: Array.isArray(x.cats) ? x.cats.filter((t) => VALID_CATS.includes(t)) : [],
        age: str(x.age, 20),
        schedule: str(x.schedule, 40),
        uk: { title: str(x?.uk?.title, 60), desc: str(x?.uk?.desc, 600) },
        de: { title: str(x?.de?.title, 60) || str(x?.uk?.title, 60), desc: str(x?.de?.desc, 600) || str(x?.uk?.desc, 600) },
      };
    }).filter((x) => x.uk.title);
  }

  if (Array.isArray(c.teachers)) {
    out.teachers = c.teachers.slice(0, 20).map((x) => ({
      initials: str(x.initials, 3).toUpperCase() || '•',
      photo: imgPath(x.photo),
      uk: { name: str(x?.uk?.name, 60), role: str(x?.uk?.role, 60), bio: str(x?.uk?.bio, 300) },
      de: { name: str(x?.de?.name, 60) || str(x?.uk?.name, 60), role: str(x?.de?.role, 60) || str(x?.uk?.role, 60), bio: str(x?.de?.bio, 300) || str(x?.uk?.bio, 300) },
    })).filter((x) => x.uk.name);
  }

  if (c.hero && typeof c.hero === 'object') {
    const h = c.hero;
    out.hero = {
      image: imgPath(h.image) || DEFAULT_CONTENT.hero.image,
      bg: imgPath(h.bg), // порожнє значення дозволене — фон вимкнено
      uk: { pill: str(h?.uk?.pill, 80), title: str(h?.uk?.title, 120), subtitle: str(h?.uk?.subtitle, 400) },
      de: { pill: str(h?.de?.pill, 80), title: str(h?.de?.title, 120), subtitle: str(h?.de?.subtitle, 400) },
      stats: (Array.isArray(h.stats) ? h.stats : []).slice(0, 3).map((s) => ({
        value: str(s.value, 12), uk: str(s.uk, 40), de: str(s.de, 40) || str(s.uk, 40),
      })).filter((s) => s.value || s.uk),
    };
    if (!out.hero.stats.length) out.hero.stats = JSON.parse(JSON.stringify(DEFAULT_CONTENT.hero.stats));
  }

  if (c.about && typeof c.about === 'object') {
    const a = c.about;
    out.about = {
      image: imgPath(a.image) || DEFAULT_CONTENT.about.image,
      uk: { title: str(a?.uk?.title, 120), text: str(a?.uk?.text, 800) },
      de: { title: str(a?.de?.title, 120), text: str(a?.de?.text, 800) },
      features: (Array.isArray(a.features) ? a.features : []).slice(0, 6).map((f) => ({
        icon: ICON_RE.test(f.icon) ? f.icon : 'bi-check-circle',
        uk: { title: str(f?.uk?.title, 60), desc: str(f?.uk?.desc, 160) },
        de: { title: str(f?.de?.title, 60) || str(f?.uk?.title, 60), desc: str(f?.de?.desc, 160) || str(f?.uk?.desc, 160) },
      })).filter((f) => f.uk.title),
    };
    if (!out.about.features.length) out.about.features = JSON.parse(JSON.stringify(DEFAULT_CONTENT.about.features));
  }

  if (Array.isArray(c.gallery)) {
    out.gallery = c.gallery.map(imgPath).filter(Boolean).slice(0, 60);
  }

  if (Array.isArray(c.reviews)) {
    out.reviews = c.reviews.slice(0, 30).map((x) => ({
      initials: str(x.initials, 3).toUpperCase() || '•',
      uk: { text: str(x?.uk?.text, 400), name: str(x?.uk?.name, 60), role: str(x?.uk?.role, 60) },
      de: { text: str(x?.de?.text, 400) || str(x?.uk?.text, 400), name: str(x?.de?.name, 60) || str(x?.uk?.name, 60), role: str(x?.de?.role, 60) || str(x?.uk?.role, 60) },
    })).filter((x) => x.uk.text);
  }

  if (Array.isArray(c.faq)) {
    out.faq = c.faq.slice(0, 30).map((x) => ({
      uk: { q: str(x?.uk?.q, 200), a: str(x?.uk?.a, 600) },
      de: { q: str(x?.de?.q, 200) || str(x?.uk?.q, 200), a: str(x?.de?.a, 600) || str(x?.uk?.a, 600) },
    })).filter((x) => x.uk.q);
  }

  if (c.social && typeof c.social === 'object') {
    out.social = {
      facebook: url(c.social.facebook), instagram: url(c.social.instagram),
      whatsapp: url(c.social.whatsapp), telegram: url(c.social.telegram), youtube: url(c.social.youtube),
    };
  }

  if (c.contact && typeof c.contact === 'object') {
    out.contact = {
      email: str(c.contact.email, 120), phone: str(c.contact.phone, 40),
      addressUk: str(c.contact.addressUk, 160), addressDe: str(c.contact.addressDe, 160) || str(c.contact.addressUk, 160),
      addressUrl: url(c.contact.addressUrl), scheduleUk: str(c.contact.scheduleUk, 120),
      scheduleDe: str(c.contact.scheduleDe, 120) || str(c.contact.scheduleUk, 120),
    };
  }

  out.texts = sanitizeTexts(c.texts);
  out.version = 2;
  out.layout = sanitizeLayout(c.layout);
  return out;
}

async function persist(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

function emptyPresets() { return { slots: [null, null, null] }; }

// Створює нове, повністю заповнене сховище контенту (секції + полотно + пресети)
function freshStore() {
  const store = clone(DEFAULT_CONTENT);
  store.version = 2;
  store.layout = clone(DEFAULT_LAYOUT);
  store.presets = emptyPresets();
  return store;
}

export async function getContent() {
  if (cache) return cache;
  try {
    const loaded = JSON.parse(await fs.readFile(FILE, 'utf8'));
    // Доповнюємо відсутні розділи з дефолтів (безпечний апгрейд старих content.json)
    let patched = false;
    for (const key of Object.keys(DEFAULT_CONTENT)) {
      if (!(key in loaded)) { loaded[key] = clone(DEFAULT_CONTENT[key]); patched = true; }
    }
    // Міграція: нове поле hero.bg (фонове фото банера) для старих content.json
    if (loaded.hero && typeof loaded.hero === 'object' && !('bg' in loaded.hero)) {
      loaded.hero.bg = DEFAULT_CONTENT.hero.bg; patched = true;
    }
    // Міграція v1 → v2: додаємо полотно та слоти пресетів
    if (!Array.isArray(loaded.layout)) { loaded.layout = clone(DEFAULT_LAYOUT); patched = true; }
    else { loaded.layout = sanitizeLayout(loaded.layout); }
    if (!loaded.presets || typeof loaded.presets !== 'object' || !Array.isArray(loaded.presets.slots)) {
      loaded.presets = emptyPresets(); patched = true;
    }
    loaded.version = 2;
    cache = loaded;
    if (patched) await persist(cache);
  } catch (e) {
    if (e.code === 'ENOENT') {
      cache = freshStore();
      await persist(cache);
    } else throw e;
  }
  return cache;
}

// Публічний/адмінський вигляд контенту: без службових пресетів
export function stripPresets(c) {
  const { presets, ...rest } = c;
  return rest;
}

export async function saveContent(input) {
  const clean = sanitize(input); // секції + layout + version
  if (!cache) await getContent();
  clean.presets = (cache && cache.presets) || emptyPresets(); // пресети редагуються окремо
  cache = clean;
  await persist(clean);
  return stripPresets(clean);
}

// ── Слоти кастомних збережень + «стандартний вигляд» ─────────
// Знімок поточного опублікованого стану (секції + полотно, без пресетів)
function snapshotLive() {
  const snap = {};
  for (const key of Object.keys(DEFAULT_CONTENT)) snap[key] = clone(cache[key]);
  snap.layout = clone(cache.layout);
  return snap;
}

export async function listPresets() {
  await getContent();
  return {
    slots: cache.presets.slots.map((sl, i) =>
      sl ? { id: i, name: sl.name, savedAt: sl.savedAt, empty: false }
        : { id: i, name: null, savedAt: null, empty: true }),
  };
}

export async function saveSlot(i, name, contentInput) {
  await getContent();
  const idx = +i;
  if (!(idx >= 0 && idx < cache.presets.slots.length)) throw new Error('Невірний слот');
  let snapshot;
  if (contentInput && typeof contentInput === 'object') {
    // знімок поточної чернетки (без публікації на сайт)
    const clean = sanitize(contentInput);
    delete clean.version;
    snapshot = clean;
  } else {
    snapshot = snapshotLive();
  }
  cache.presets.slots[idx] = {
    name: str(name, 40) || 'Слот ' + (idx + 1),
    savedAt: new Date().toISOString(),
    snapshot,
  };
  await persist(cache);
  return listPresets();
}

export async function getSlotSnapshot(i) {
  await getContent();
  const sl = cache.presets.slots[+i];
  return sl ? clone(sl.snapshot) : null;
}

export async function clearSlot(i) {
  await getContent();
  const idx = +i;
  if (idx >= 0 && idx < cache.presets.slots.length) cache.presets.slots[idx] = null;
  await persist(cache);
  return listPresets();
}

// «Стандартний вигляд»: дефолтні секції + дефолтний порядок (для скидання полотна)
export function getDefaultSnapshot() {
  const snap = clone(DEFAULT_CONTENT);
  snap.layout = clone(DEFAULT_LAYOUT);
  return snap;
}

// id курсів, дозволені у заявці (плюс "unsure")
export async function courseMap() {
  const c = await getContent();
  const map = {};
  for (const course of c.courses) map[course.id] = course.uk.title;
  map.unsure = 'Допоможіть обрати';
  return map;
}
