// ─────────────────────────────────────────────────────────────
//  IT Kinderschule — головний сервер.
//  Віддає статичний сайт (../public) та надає REST API:
//   POST   /api/applications          — нова заявка (публічно)
//   POST   /api/newsletter            — підписка на розсилку (публічно)
//   POST   /api/admin/login           — вхід в адмінку
//   GET    /api/admin/applications    — список заявок (auth)
//   GET    /api/admin/stats           — статистика (auth)
//   PATCH  /api/admin/applications/:id — оновити статус/нотатку (auth)
//   DELETE /api/admin/applications/:id — видалити (auth)
//   GET    /api/admin/export.csv      — експорт у CSV (auth)
// ─────────────────────────────────────────────────────────────
import './env.js'; // має бути ПЕРШИМ — завантажує .env до решти модулів
import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Applications, Subscribers } from './database.js';
import { initMailer, sendApplicationMails } from './mailer.js';
import { createToken, checkCredentials, requireAuth } from './auth.js';
import {
  getContent, saveContent, courseMap, stripPresets,
  listPresets, saveSlot, getSlotSnapshot, clearSlot, getDefaultSnapshot,
} from './content.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
// Шлях для завантажених зображень. На хостингу з постійним диском
// можна винести його на змонтований том через змінну UPLOAD_DIR.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(PUBLIC_DIR, 'images', 'uploads');
const PROD = process.env.NODE_ENV === 'production';
// Канонічний домен сайту — для sitemap.xml / robots.txt (SEO).
const SITE_URL = (process.env.SITE_URL || 'https://www.it-kinderschule.com').replace(/\/+$/, '');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // коректний req.ip за реверс-проксі (rate limit)
app.use(express.json({ limit: '256kb' }));

// Базові заголовки безпеки
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health-check для хостингу (Render/Railway тощо)
app.get('/healthz', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── SEO: sitemap.xml та robots.txt (домен з SITE_URL) ────────
app.get('/sitemap.xml', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const langs = ['uk', 'de'];
  const alts = [
    ...langs.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}/?lang=${l}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>`,
  ].join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE_URL}/</loc>
${alts}
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(xml);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
});

// ── Завантаження зображень (multer) ──────────────────────────
const ALLOWED_IMG = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const uploadStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try { await fsp.mkdir(UPLOAD_DIR, { recursive: true }); cb(null, UPLOAD_DIR); } catch (e) { cb(e); }
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_IMG[file.mimetype] || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 МБ
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED_IMG[file.mimetype]),
});

// ── Проста анти-флуд оборона (rate limit у пам'яті) ───────────
const hits = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const rec = hits.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) {
      rec.count = 0;
      rec.reset = now + windowMs;
    }
    rec.count += 1;
    hits.set(key, rec);
    if (rec.count > max) {
      return res.status(429).json({ error: 'Забагато запитів. Спробуйте пізніше.' });
    }
    next();
  };
}

// ── Валідація заявки (курси валідуються проти поточного контенту) ──
async function validateApplication(b) {
  const errors = [];
  const childName = String(b.childName || '').trim();
  const parentName = String(b.parentName || '').trim();
  const phone = String(b.phone || '').trim();
  const email = String(b.email || '').trim();
  const age = parseInt(b.childAge, 10);

  // приймаємо масив "courses" або одиничне "course"
  let chosen = Array.isArray(b.courses) ? b.courses : b.course ? [b.course] : [];
  chosen = [...new Set(chosen.map((c) => String(c).trim()).filter(Boolean))].slice(0, 12);

  const map = await courseMap(); // { id: title, unsure: '...' }
  const valid = chosen.filter((id) => id in map);

  if (childName.length < 2) errors.push("Вкажіть ім'я дитини");
  if (parentName.length < 2) errors.push("Вкажіть ім'я батьків");
  if (!/^[+\d][\d\s()-]{6,}$/.test(phone)) errors.push('Невірний номер телефону');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Невірний e-mail');
  if (!Number.isInteger(age) || age < 5 || age > 20) errors.push('Вік має бути 5–20');
  if (!valid.length) errors.push('Оберіть хоча б один курс');

  return {
    errors,
    value: {
      childName,
      childAge: age,
      parentName,
      phone,
      email,
      courses: valid,
      coursesLabel: valid.map((id) => map[id]).join(', '),
      experience: String(b.experience || '').trim().slice(0, 60),
      message: String(b.message || '').trim().slice(0, 1000),
      // honeypot
      _hp: String(b.website || '').trim(),
    },
  };
}

// ── Публічні ендпоінти ───────────────────────────────────────
app.get('/api/content', async (req, res) => {
  res.json(stripPresets(await getContent()));
});

app.post('/api/applications', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const { errors, value } = await validateApplication(req.body || {});
  if (value._hp) return res.json({ ok: true }); // бот спіймався в honeypot
  if (errors.length) return res.status(400).json({ error: errors.join('. ') });
  delete value._hp;

  try {
    const record = await Applications.create(value);
    sendApplicationMails(record).catch((e) => console.error('Mail error:', e.message));
    res.json({ ok: true, id: record.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Помилка сервера. Спробуйте пізніше.' });
  }
});

app.post('/api/newsletter', rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Невірний e-mail' });
  }
  await Subscribers.create(email);
  res.json({ ok: true });
});

// ── Адмін ────────────────────────────────────────────────────
app.post('/api/admin/login', rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { login, password } = req.body || {};
  if (!checkCredentials(login, password)) {
    return res.status(401).json({ error: 'Невірний логін або пароль' });
  }
  res.json({ token: createToken(login) });
});

app.get('/api/admin/applications', requireAuth, async (req, res) => {
  res.json(await Applications.all());
});

// Редагування контенту сайту (конструктор)
app.get('/api/admin/content', requireAuth, async (req, res) => {
  res.json(stripPresets(await getContent()));
});
app.put('/api/admin/content', requireAuth, async (req, res) => {
  try {
    const saved = await saveContent(req.body || {});
    res.json(saved);
  } catch (e) {
    console.error('Content save error:', e.message);
    res.status(400).json({ error: 'Не вдалося зберегти контент' });
  }
});

// Слоти кастомних збережень + «стандартний вигляд»
app.get('/api/admin/presets', requireAuth, async (req, res) => {
  res.json(await listPresets());
});
app.put('/api/admin/presets/:id', requireAuth, async (req, res) => {
  try {
    res.json(await saveSlot(req.params.id, req.body?.name, req.body?.content));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Не вдалося зберегти слот' });
  }
});
app.get('/api/admin/presets/:id', requireAuth, async (req, res) => {
  const snap = await getSlotSnapshot(req.params.id);
  if (!snap) return res.status(404).json({ error: 'Слот порожній' });
  res.json(snap);
});
app.delete('/api/admin/presets/:id', requireAuth, async (req, res) => {
  res.json(await clearSlot(req.params.id));
});
// Знімок «стандартного вигляду» (дефолтні секції + порядок) для скидання полотна
app.get('/api/admin/default-layout', requireAuth, (req, res) => {
  res.json(getDefaultSnapshot());
});

// Завантаження зображення → повертає відносний шлях для контенту
app.post('/api/admin/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Файл завеликий (макс. 8 МБ)' : 'Помилка завантаження' });
    if (!req.file) return res.status(400).json({ error: 'Підтримуються лише зображення (JPG, PNG, WebP, GIF)' });
    res.json({ url: `images/uploads/${req.file.filename}` });
  });
});

// Список завантажених зображень (для вибору з бібліотеки)
app.get('/api/admin/uploads', requireAuth, async (req, res) => {
  try {
    const files = await fsp.readdir(UPLOAD_DIR).catch(() => []);
    const imgs = files.filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
      .map((f) => ({ url: `images/uploads/${f}`, name: f }))
      .sort((a, b) => (a.name < b.name ? 1 : -1));
    res.json(imgs);
  } catch { res.json([]); }
});

app.get('/api/admin/stats', requireAuth, async (req, res) => {
  const list = await Applications.all();
  const byCourse = {};
  const byStatus = { new: 0, contacted: 0, enrolled: 0, rejected: 0 };
  let last7 = 0;
  const weekAgo = Date.now() - 7 * 864e5;
  for (const a of list) {
    const cs = a.courses || (a.course ? [a.course] : []);
    for (const c of cs) byCourse[c] = (byCourse[c] || 0) + 1;
    if (a.status in byStatus) byStatus[a.status] += 1;
    if (new Date(a.createdAt).getTime() > weekAgo) last7 += 1;
  }
  const subs = await Subscribers.all();
  res.json({ total: list.length, last7, byCourse, byStatus, subscribers: subs.length });
});

app.patch('/api/admin/applications/:id', requireAuth, async (req, res) => {
  const updated = await Applications.update(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Не знайдено' });
  res.json(updated);
});

app.delete('/api/admin/applications/:id', requireAuth, async (req, res) => {
  const ok = await Applications.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Не знайдено' });
  res.json({ ok: true });
});

// ── Підписники розсилки ──────────────────────────────────────
app.get('/api/admin/subscribers', requireAuth, async (req, res) => {
  res.json(await Subscribers.all());
});

app.get('/api/admin/subscribers/export.csv', requireAuth, async (req, res) => {
  const list = await Subscribers.all();
  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = ['email,createdAt'];
  for (const s of list) rows.push([csvCell(s.email), csvCell(s.createdAt)].join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"');
  res.send('﻿' + rows.join('\r\n'));
});

app.delete('/api/admin/subscribers/:id', requireAuth, async (req, res) => {
  const ok = await Subscribers.remove(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Не знайдено' });
  res.json({ ok: true });
});

app.get('/api/admin/export.csv', requireAuth, async (req, res) => {
  const list = await Applications.all();
  const cols = ['createdAt', 'status', 'coursesLabel', 'childName', 'childAge', 'parentName', 'phone', 'email', 'experience', 'message', 'note'];
  const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(',')];
  for (const a of list) {
    const row = { ...a, coursesLabel: a.coursesLabel || a.course || '' };
    rows.push(cols.map((c) => csvCell(row[c])).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
  res.send('﻿' + rows.join('\r\n')); // BOM для Excel
});

// ── Статика ──────────────────────────────────────────────────
// Завантажені зображення (окремий маунт — працює, навіть якщо UPLOAD_DIR
// винесено на змонтований том поза текою public).
app.use('/images/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
// HTML/CSS/JS віддаємо з no-cache (revalidate за ETag) — щоб оновлення
// розмітки/стилів/скриптів застосовувались одразу, без застрягання у кеші.
// Зображення кешуємо на добу (їхні імена унікальні).
app.use(express.static(PUBLIC_DIR, {
  etag: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', /\.(html|css|js)$/i.test(filePath) ? 'no-cache' : 'public, max-age=86400');
  },
}));
app.get('/admin', async (req, res) => {
  try {
    const html = await fsp.readFile(path.join(PUBLIC_DIR, 'admin', 'index.html'), 'utf8');
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(html);
  } catch (e) {
    res.status(500).send('Admin unavailable');
  }
});

// ── Перевірка безпеки перед запуском ─────────────────────────
function securityCheck() {
  const weak = [];
  if (!process.env.ADMIN_PASSWORD || ['admin', 'change-me-please'].includes(process.env.ADMIN_PASSWORD)) weak.push('ADMIN_PASSWORD');
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) weak.push('AUTH_SECRET');
  if (weak.length) {
    const msg = `⚠️  УВАГА: ненадійні значення у ${weak.join(', ')}. Задайте їх у .env / змінних хостингу!`;
    if (PROD) console.error('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60) + '\n');
    else console.warn(msg);
  }
}

const PORT = process.env.PORT || 3000;
initMailer();
getContent().catch((e) => console.error('Content init error:', e.message)); // засів content.json
securityCheck();
app.listen(PORT, () => {
  if (PROD) {
    console.log(`🚀 IT Kinderschule запущено в режимі production на порту ${PORT}`);
  } else {
    console.log(`\n🚀 IT Kinderschule працює:  http://localhost:${PORT}`);
    console.log(`🔐 Адмін-панель:            http://localhost:${PORT}/admin\n`);
  }
});
