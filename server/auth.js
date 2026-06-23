// ─────────────────────────────────────────────────────────────
//  Проста авторизація для адмін-панелі.
//  Токен = base64(payload).підпис(HMAC-SHA256). Без зовнішніх залежностей.
// ─────────────────────────────────────────────────────────────
import crypto from 'crypto';

const TTL_MS = 1000 * 60 * 60 * 12; // 12 годин
const secret = () => process.env.AUTH_SECRET || 'dev-secret-change-me';

function sign(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

export function createToken(login) {
  const payload = Buffer.from(
    JSON.stringify({ login, exp: Date.now() + TTL_MS })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  // constant-time compare
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

export function checkCredentials(login, password) {
  const expectedLogin = process.env.ADMIN_LOGIN || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'admin';
  const a = Buffer.from(String(login));
  const b = Buffer.from(expectedLogin);
  const c = Buffer.from(String(password));
  const d = Buffer.from(expectedPass);
  const loginOk = a.length === b.length && crypto.timingSafeEqual(a, b);
  const passOk = c.length === d.length && crypto.timingSafeEqual(c, d);
  return loginOk && passOk;
}

// Express middleware
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: 'Неавторизовано' });
  req.admin = data;
  next();
}
