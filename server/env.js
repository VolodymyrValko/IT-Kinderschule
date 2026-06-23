// ─────────────────────────────────────────────────────────────
//  Завантаження змінних середовища ПЕРШИМ — до інших модулів,
//  щоб DATA_DIR / SMTP / AUTH_SECRET були доступні одразу.
//  На хостингу змінні беруться з налаштувань платформи;
//  локально — з файлу server/.env (якщо він є).
// ─────────────────────────────────────────────────────────────
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
