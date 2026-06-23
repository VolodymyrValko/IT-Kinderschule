// ─────────────────────────────────────────────────────────────
//  Проста файлова база даних (JSON).
//  Без нативних залежностей — працює всюди, де є Node.js.
//  Дані зберігаються в ../data/*.json. Запис атомарний (через .tmp).
// ─────────────────────────────────────────────────────────────
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// На хостингу з постійним диском вкажіть DATA_DIR (напр. /var/data),
// щоб заявки, підписники та контент не зникали після передеплою.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readCollection(name) {
  await ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeCollection(name, data) {
  await ensureDir();
  const file = path.join(DATA_DIR, `${name}.json`);
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

const id = () => crypto.randomBytes(8).toString('hex');

// ── Заявки на курси ──────────────────────────────────────────
export const Applications = {
  async all() {
    const list = await readCollection('applications');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async create(payload) {
    const list = await readCollection('applications');
    const record = {
      id: id(),
      ...payload,
      status: 'new', // new | contacted | enrolled | rejected
      note: '',
      createdAt: new Date().toISOString(),
    };
    list.push(record);
    await writeCollection('applications', list);
    return record;
  },

  async update(recordId, patch) {
    const list = await readCollection('applications');
    const idx = list.findIndex((r) => r.id === recordId);
    if (idx === -1) return null;
    const allowed = ['status', 'note'];
    for (const key of allowed) {
      if (key in patch) list[idx][key] = patch[key];
    }
    list[idx].updatedAt = new Date().toISOString();
    await writeCollection('applications', list);
    return list[idx];
  },

  async remove(recordId) {
    const list = await readCollection('applications');
    const next = list.filter((r) => r.id !== recordId);
    if (next.length === list.length) return false;
    await writeCollection('applications', next);
    return true;
  },
};

// ── Підписники розсилки ──────────────────────────────────────
export const Subscribers = {
  async all() {
    const list = await readCollection('subscribers');
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  async create(email) {
    const list = await readCollection('subscribers');
    if (list.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      return { duplicate: true };
    }
    const record = { id: id(), email, createdAt: new Date().toISOString() };
    list.push(record);
    await writeCollection('subscribers', list);
    return record;
  },
  async remove(recordId) {
    const list = await readCollection('subscribers');
    const next = list.filter((s) => s.id !== recordId);
    if (next.length === list.length) return false;
    await writeCollection('subscribers', next);
    return true;
  },
};
