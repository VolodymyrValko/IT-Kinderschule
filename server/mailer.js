// ─────────────────────────────────────────────────────────────
//  Надсилання листів через Nodemailer (SMTP).
//  Якщо SMTP не налаштовано — листи не падають, а лише логуються,
//  щоб сайт працював і без пошти (заявки все одно зберігаються в БД).
//  Тексти листів беруться з редагованих шаблонів (mail-templates.js).
//  Масова розсилка: адреси живуть ЛИШЕ в пам'яті процесу на час
//  надсилання і ніде не зберігаються та не логуються.
// ─────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';
import { getTemplates, fill } from './mail-templates.js';

let transporter = null;
let mailReady = false;

export function initMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '⚠️  SMTP не налаштовано (.env). Листи не надсилатимуться, ' +
        'але заявки зберігаються в адмін-панелі.'
    );
    return;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  transporter.verify((err) => {
    if (err) console.error('❌ SMTP помилка:', err.message);
    else {
      mailReady = true;
      console.log('✅ SMTP готовий до надсилання листів.');
    }
  });
}

export function isMailReady() { return mailReady; }

function fromAddress() {
  const fromName = process.env.MAIL_FROM_NAME || 'IT Kinderschule';
  return `"${fromName}" <${process.env.SMTP_USER}>`;
}

// Назва курсів зі знімка, збереженого в заявці (coursesLabel),
// з резервом для старих заявок зі статичним полем course.
function courseText(app) {
  return app.coursesLabel || app.course || '—';
}

const esc = (s = '') =>
  String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');

// Фірмова «обгортка» листа: градієнтна шапка + біла картка з текстом.
// Редагується лише текст (із шаблону) — оформлення стале.
function brandHtml(bodyText, extraHtml = '') {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#f6f7fb;padding:24px;border-radius:16px">
    <div style="background:linear-gradient(135deg,#6d5efc,#22d3ee);padding:20px 24px;border-radius:12px;color:#fff">
      <h2 style="margin:0">IT Kinderschule</h2>
      <p style="margin:6px 0 0;opacity:.9">Школа робототехніки та програмування · Hamburg</p>
    </div>
    <div style="background:#fff;border-radius:12px;padding:24px;margin-top:18px;color:#0f172a;line-height:1.65">
      ${nl2br(bodyText)}
    </div>
    ${extraHtml}
  </div>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:10px 16px;color:#64748b;border-bottom:1px solid #eef0f6;width:38%">${label}</td>
    <td style="padding:10px 16px;color:#0f172a;border-bottom:1px solid #eef0f6;font-weight:600">${value}</td>
  </tr>`;
}

// Таблиця з даними заявки (додається до листа адміністратору автоматично)
function appTableHtml(app) {
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border-radius:12px;overflow:hidden">
      ${row('Курси', esc(courseText(app)))}
      ${row("Ім'я дитини", esc(app.childName))}
      ${row('Вік дитини', esc(app.childAge))}
      ${row("Ім'я батьків", esc(app.parentName))}
      ${row('Телефон', esc(app.phone))}
      ${row('E-mail', esc(app.email))}
      ${row('Досвід', esc(app.experience || '—'))}
      ${row('Коментар', esc(app.message || '—'))}
    </table>`;
}

// ── Листи про нову заявку (адміну + підтвердження батькам) ────
export async function sendApplicationMails(app) {
  if (!mailReady || !transporter) return { sent: false };
  const tpl = await getTemplates();
  const from = fromAddress();
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const vars = {
    childName: app.childName, childAge: app.childAge, parentName: app.parentName,
    phone: app.phone, email: app.email, courses: courseText(app),
    experience: app.experience, message: app.message,
    date: new Date(app.createdAt).toLocaleString('uk-UA'),
  };

  if (tpl.appAdmin.subject) {
    await transporter.sendMail({
      from,
      to: adminEmail,
      replyTo: app.email,
      subject: fill(tpl.appAdmin.subject, vars),
      text: fill(tpl.appAdmin.body, vars),
      html: brandHtml(fill(tpl.appAdmin.body, vars), appTableHtml(app)),
    });
  }

  if (String(process.env.SEND_CONFIRMATION).toLowerCase() === 'true' && app.email && tpl.appParent.subject) {
    await transporter.sendMail({
      from,
      to: app.email,
      subject: fill(tpl.appParent.subject, vars),
      text: fill(tpl.appParent.body, vars),
      html: brandHtml(fill(tpl.appParent.body, vars)),
    }).catch((e) => console.warn('Не вдалося надіслати підтвердження:', e.message));
  }
  return { sent: true };
}

// ── Листи про нову підписку (підписнику + адміну) ─────────────
export async function sendSubscribeMails(email) {
  if (!mailReady || !transporter) return { sent: false };
  const tpl = await getTemplates();
  const from = fromAddress();
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const vars = { email, date: new Date().toLocaleString('uk-UA') };

  if (tpl.subUser.subject) {
    await transporter.sendMail({
      from,
      to: email,
      subject: fill(tpl.subUser.subject, vars),
      text: fill(tpl.subUser.body, vars),
      html: brandHtml(fill(tpl.subUser.body, vars)),
      headers: { 'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>` },
    }).catch((e) => console.warn('Не вдалося надіслати підтвердження підписки:', e.message));
  }
  if (tpl.subAdmin.subject) {
    await transporter.sendMail({
      from,
      to: adminEmail,
      subject: fill(tpl.subAdmin.subject, vars),
      text: fill(tpl.subAdmin.body, vars),
      html: brandHtml(fill(tpl.subAdmin.body, vars)),
    }).catch((e) => console.warn('Не вдалося сповістити адміна про підписку:', e.message));
  }
  return { sent: true };
}

// ═══════════ Масова розсилка (вкладка «Розсилка») ═══════════
// Анти-спам: листи йдуть ПО ОДНОМУ (кожен отримувач бачить лише свою
// адресу в «To»), з паузою ~1.5–2 с між листами, з text+html версіями
// та заголовком List-Unsubscribe. Приватність: список адрес живе лише
// в цій функції; у статусі — тільки лічильники та адреси-невдахи
// (в пам'яті, до наступної розсилки чи перезапуску; на диск не пишуться).
let job = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function broadcastStatus() {
  if (!job) return { exists: false, running: false };
  return {
    exists: true,
    running: job.running,
    cancelled: job.cancelled,
    total: job.total,
    sent: job.sent,
    failed: job.failed.slice(),
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    subject: job.subject,
  };
}

export function cancelBroadcast() {
  if (job && job.running) job.cancelled = true;
  return broadcastStatus();
}

export function startBroadcast(emails, subject, message) {
  if (!mailReady || !transporter) throw new Error('SMTP не налаштовано — розсилка неможлива');
  if (job && job.running) throw new Error('Попередня розсилка ще триває');
  job = {
    running: true, cancelled: false,
    total: emails.length, sent: 0, failed: [],
    startedAt: new Date().toISOString(), finishedAt: null,
    subject,
  };
  runBroadcast(emails, subject, message); // у фоні, відповідь не чекає
  return broadcastStatus();
}

async function runBroadcast(emails, subject, message) {
  const from = fromAddress();
  const html = brandHtml(message);
  for (const to of emails) {
    if (job.cancelled) break;
    try {
      await transporter.sendMail({
        from,
        to, // індивідуальний лист — без масового BCC (краща доставність)
        subject,
        text: message,
        html,
        headers: { 'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}?subject=unsubscribe>` },
      });
      job.sent += 1;
    } catch (e) {
      job.failed.push(to);
      console.warn('Розсилка: лист не пішов (%d/%d): %s', job.sent + job.failed.length, job.total, e.message);
    }
    // пауза з невеликим розкидом — рівний «машинний» ритм виглядає як спам
    if (!job.cancelled) await sleep(1500 + Math.floor(Math.random() * 700));
  }
  job.running = false;
  job.finishedAt = new Date().toISOString();
  // список адрес далі ніде не живе — лише підсумкові лічильники
  console.log(`📮 Розсилку завершено: надіслано ${job.sent} із ${job.total}${job.cancelled ? ' (зупинено вручну)' : ''}.`);
}
