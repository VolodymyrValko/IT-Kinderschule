// ─────────────────────────────────────────────────────────────
//  Шаблони автоматичних листів. Редагуються в адмінці («Листи»),
//  зберігаються у data/mail-templates.json. Відсутні ключі
//  доповнюються стандартними (безпечний апгрейд).
//  Плейсхолдери {{name}} підставляються при надсиланні.
//  Порожня тема шаблону = цей лист не надсилається.
// ─────────────────────────────────────────────────────────────
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'mail-templates.json');

// Метадані для адмінки: назва шаблону + доступні плейсхолдери
export const TEMPLATE_META = {
  appAdmin: {
    label: 'Нова заявка → лист адміністратору',
    placeholders: ['childName', 'childAge', 'parentName', 'phone', 'email', 'courses', 'date'],
    note: 'Таблиця з усіма даними заявки додається під текстом автоматично.',
  },
  appParent: {
    label: 'Нова заявка → підтвердження батькам',
    placeholders: ['parentName', 'childName', 'courses'],
  },
  subUser: {
    label: 'Підписка на розсилку → підтвердження підписнику',
    placeholders: ['email'],
  },
  subAdmin: {
    label: 'Підписка на розсилку → повідомлення адміністратору',
    placeholders: ['email', 'date'],
  },
};

export const DEFAULT_TEMPLATES = {
  appAdmin: {
    subject: '🎉 Нова заявка: {{childName}} → {{courses}}',
    body: 'Нова заявка на курс!\n\nВідкрийте адмін-панель, щоб опрацювати заявку.',
  },
  appParent: {
    subject: 'Дякуємо за заявку — IT Kinderschule',
    body: "Вітаємо, {{parentName}}!\n\nМи отримали вашу заявку на курс «{{courses}}» для {{childName}}. Найближчим часом наш викладач зв'яжеться з вами, щоб узгодити пробне заняття.\n\nАдреса школи: Überseering 26, 22297 Hamburg\nEmail: hackerschoolua@gmail.com\n\nЗ теплом, команда IT Kinderschule 💜",
  },
  subUser: {
    subject: 'Ви підписалися на новини IT Kinderschule 💜',
    body: 'Вітаємо!\n\nДякуємо за підписку на новини IT Kinderschule. Приблизно раз на місяць надсилатимемо анонси наборів, майстер-класів та подій — без спаму.\n\nЯкщо ви не підписувалися на розсилку, просто проігноруйте цей лист.',
  },
  subAdmin: {
    subject: '📬 Новий підписник розсилки',
    body: 'На сайті новий підписник розсилки: {{email}}\nДата: {{date}}\n\nПовний список — в адмін-панелі, розділ «Підписники».',
  },
};

let cache = null;
const clone = (o) => JSON.parse(JSON.stringify(o));
const str = (v, max) => String(v ?? '').trim().slice(0, max);

function sanitize(input) {
  const out = clone(DEFAULT_TEMPLATES);
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULT_TEMPLATES)) {
    const t = input[key];
    if (!t || typeof t !== 'object') continue;
    out[key] = {
      subject: str(t.subject, 200), // порожня тема дозволена = лист вимкнено
      body: str(t.body, 5000),
    };
  }
  return out;
}

async function persist(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, FILE);
}

export async function getTemplates() {
  if (cache) return cache;
  try {
    const loaded = JSON.parse(await fs.readFile(FILE, 'utf8'));
    cache = sanitize(loaded);
  } catch (e) {
    if (e.code === 'ENOENT') cache = clone(DEFAULT_TEMPLATES);
    else throw e;
  }
  return cache;
}

export async function saveTemplates(input) {
  cache = sanitize(input);
  await persist(cache);
  return cache;
}

// Підстановка плейсхолдерів {{key}} значеннями (відсутні → '—')
export function fill(template, vars) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (m, k) =>
    (vars && vars[k] != null && vars[k] !== '' ? String(vars[k]) : '—'));
}
