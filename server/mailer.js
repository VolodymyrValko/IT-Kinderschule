// ─────────────────────────────────────────────────────────────
//  Надсилання листів через Nodemailer (SMTP).
//  Якщо SMTP не налаштовано — листи не падають, а лише логуються,
//  щоб сайт працював і без пошти (заявки все одно зберігаються в БД).
// ─────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';

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

// Назва курсів зі знімка, збереженого в заявці (coursesLabel),
// з резервом для старих заявок зі статичним полем course.
function courseText(app) {
  return app.coursesLabel || app.course || '—';
}

const esc = (s = '') =>
  String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

function adminEmailHtml(app) {
  const course = courseText(app);
  const date = new Date(app.createdAt).toLocaleString('uk-UA');
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#f6f7fb;padding:24px;border-radius:16px">
    <div style="background:linear-gradient(135deg,#6d5efc,#22d3ee);padding:20px 24px;border-radius:12px;color:#fff">
      <h2 style="margin:0">🎉 Нова заявка на курс</h2>
      <p style="margin:6px 0 0;opacity:.9">IT Kinderschule · ${esc(date)}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border-radius:12px;overflow:hidden">
      ${row('Курси', course)}
      ${row("Ім'я дитини", esc(app.childName))}
      ${row('Вік дитини', esc(app.childAge))}
      ${row("Ім'я батьків", esc(app.parentName))}
      ${row('Телефон', esc(app.phone))}
      ${row('E-mail', esc(app.email))}
      ${row('Досвід', esc(app.experience || '—'))}
      ${row('Коментар', esc(app.message || '—'))}
    </table>
    <p style="text-align:center;margin-top:18px;color:#64748b;font-size:13px">
      Відкрийте адмін-панель, щоб опрацювати заявку.
    </p>
  </div>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:10px 16px;color:#64748b;border-bottom:1px solid #eef0f6;width:38%">${label}</td>
    <td style="padding:10px 16px;color:#0f172a;border-bottom:1px solid #eef0f6;font-weight:600">${value}</td>
  </tr>`;
}

function confirmationHtml(app) {
  const course = courseText(app);
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;background:#f6f7fb;padding:24px;border-radius:16px">
    <div style="background:linear-gradient(135deg,#6d5efc,#22d3ee);padding:24px;border-radius:12px;color:#fff;text-align:center">
      <h2 style="margin:0">Дякуємо за заявку! 🚀</h2>
    </div>
    <div style="background:#fff;border-radius:12px;padding:24px;margin-top:18px;color:#0f172a;line-height:1.6">
      <p>Вітаємо, ${esc(app.parentName)}!</p>
      <p>Ми отримали вашу заявку на курс <b>${course}</b> для <b>${esc(app.childName)}</b>.
      Найближчим часом наш викладач зв'яжеться з вами, щоб узгодити пробне заняття.</p>
      <p style="margin:20px 0 6px"><b>Адреса школи:</b><br>Überseering 26, 22297 Hamburg</p>
      <p style="margin:6px 0"><b>Email:</b> hackerschoolua@gmail.com</p>
      <p style="margin-top:22px;color:#64748b;font-size:13px">З теплом, команда IT Kinderschule 💜</p>
    </div>
  </div>`;
}

export async function sendApplicationMails(app) {
  if (!mailReady || !transporter) return { sent: false };
  const fromName = process.env.MAIL_FROM_NAME || 'IT Kinderschule';
  const from = `"${fromName}" <${process.env.SMTP_USER}>`;
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: adminEmail,
    replyTo: app.email,
    subject: `🎉 Нова заявка: ${app.childName} → ${courseText(app)}`,
    html: adminEmailHtml(app),
  });

  if (String(process.env.SEND_CONFIRMATION).toLowerCase() === 'true' && app.email) {
    await transporter.sendMail({
      from,
      to: app.email,
      subject: 'Дякуємо за заявку — IT Kinderschule',
      html: confirmationHtml(app),
    }).catch((e) => console.warn('Не вдалося надіслати підтвердження:', e.message));
  }
  return { sent: true };
}
