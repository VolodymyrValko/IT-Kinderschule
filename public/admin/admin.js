// ═══════════════════════════════════════════════════════════════
//  IT Kinderschule — адмін-панель (логіка)
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const TOKEN_KEY = 'itk_admin_token';
  let token = localStorage.getItem(TOKEN_KEY);
  let apps = [];
  let subscribers = [];
  let content = null;
  let draft = null;
  let dirty = false;
  let filter = { status: 'all', q: '', sort: 'createdAt', dir: -1 };
  let current = null;

  // мапа id→назва будується з контенту; має резерв для старих заявок
  let COURSE = { microbit: 'BBC micro:bit', arduino: 'Arduino', ai: 'Штучний інтелект', scratch: 'Scratch', webdev: 'HTML+CSS+JS', unsure: 'Допоможіть обрати' };
  function buildCourseMap() {
    const m = { unsure: 'Допоможіть обрати' };
    if (content && content.courses) content.courses.forEach((c) => (m[c.id] = c.uk.title));
    COURSE = m;
  }
  function courseLabel(a) {
    if (a.coursesLabel) return a.coursesLabel;
    if (a.courses) return a.courses.map((id) => COURSE[id] || id).join(', ');
    return COURSE[a.course] || a.course || '—';
  }
  const STATUS = { new: 'Нова', contacted: "Зв'язалися", enrolled: 'Записаний', rejected: 'Відмова' };
  const STATUS_COLOR = { new: '#6d5efc', contacted: '#ffb443', enrolled: '#34d399', rejected: '#ef4444' };

  // ── API helper ─────────────────────────────────────────────
  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
    });
    if (res.status === 401) { logout(); throw new Error('Сесія завершилась'); }
    return res;
  }

  // ── Логін ──────────────────────────────────────────────────
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn'), old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Вхід...';
    $('#loginErr').textContent = '';
    const body = { login: e.target.login.value, password: e.target.password.value };
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка входу');
      token = data.token; localStorage.setItem(TOKEN_KEY, token);
      showApp();
    } catch (err) {
      $('#loginErr').textContent = err.message;
    } finally { btn.disabled = false; btn.innerHTML = old; }
  });

  function logout() {
    localStorage.removeItem(TOKEN_KEY); token = null;
    $('#appView').classList.add('hide'); $('#loginView').classList.remove('hide');
  }
  $('#logoutBtn').onclick = logout;

  async function showApp() {
    $('#loginView').classList.add('hide'); $('#appView').classList.remove('hide');
    await loadAll();
  }

  // ── Навігація між в'юшками ─────────────────────────────────
  const VIEW_TITLES = { dashboard: 'Огляд', applications: 'Заявки', subscribers: 'Підписники', content: 'Редагування сайту' };
  $$('.side nav a[data-view]').forEach((a) => {
    a.onclick = () => {
      $$('.side nav a').forEach((x) => x.classList.remove('active'));
      a.classList.add('active');
      const v = a.dataset.view;
      ['dashboard', 'applications', 'subscribers', 'content'].forEach((id) => $('#' + id).classList.toggle('hide', id !== v));
      $('#viewTitle').textContent = VIEW_TITLES[v];
      // верхня кнопка «Експорт CSV» (заявки) лише в огляді/заявках
      $('#exportBtn').style.display = v === 'content' || v === 'subscribers' ? 'none' : '';
      if (v === 'content') openContentEditor();
      if (v === 'subscribers') loadSubscribers();
    };
  });

  // ── Завантаження даних ─────────────────────────────────────
  async function loadAll() {
    const [aRes, sRes, cRes] = await Promise.all([api('/admin/applications'), api('/admin/stats'), api('/admin/content')]);
    apps = await aRes.json();
    const stats = await sRes.json();
    content = await cRes.json();
    buildCourseMap();
    renderStats(stats);
    renderTable();
    renderRecent();
  }
  $('#refreshBtn').onclick = async () => {
    await loadAll();
    if (!$('#subscribers').classList.contains('hide')) await loadSubscribers();
    toast('Оновлено');
  };

  // ── Статистика ─────────────────────────────────────────────
  function renderStats(s) {
    const cards = [
      { ic: 'bi-inbox', g: 'linear-gradient(135deg,#6d5efc,#22d3ee)', v: s.total, l: 'Усього заявок' },
      { ic: 'bi-calendar-week', g: 'linear-gradient(135deg,#34d399,#22d3ee)', v: s.last7, l: 'За 7 днів' },
      { ic: 'bi-hourglass-split', g: 'linear-gradient(135deg,#8b5cf6,#6d5efc)', v: s.byStatus.new, l: 'Нові' },
      { ic: 'bi-mortarboard', g: 'linear-gradient(135deg,#34d399,#10b981)', v: s.byStatus.enrolled, l: 'Записані' },
      { ic: 'bi-envelope-heart', g: 'linear-gradient(135deg,#ff7a59,#ffb443)', v: s.subscribers, l: 'Підписники' },
    ];
    $('#statCards').innerHTML = cards.map((c) => `
      <div class="stat"><div class="ic" style="background:${c.g}"><i class="bi ${c.ic}"></i></div>
      <div class="v">${c.v}</div><div class="l">${c.l}</div></div>`).join('');

    // бари за курсами
    const ids = [...(content ? content.courses.map((c) => c.id) : []), 'unsure'];
    const max = Math.max(1, ...Object.values(s.byCourse));
    $('#courseBars').innerHTML = ids.map((k) => {
      const v = s.byCourse[k] || 0;
      return `<div class="bar-row"><span class="name">${COURSE[k] || k}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / max) * 100}%"></div></div>
        <span class="val">${v}</span></div>`;
    }).join('');

    renderDonut(s.byStatus);
  }

  function renderDonut(byStatus) {
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
    let offset = 25; // старт зверху
    const svg = $('#donut'); svg.innerHTML = `<circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--panel)" stroke-width="6"/>`;
    const order = ['new', 'contacted', 'enrolled', 'rejected'];
    order.forEach((k) => {
      const val = byStatus[k] || 0; if (!val) return;
      const pct = (val / total) * 100;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', 21); c.setAttribute('cy', 21); c.setAttribute('r', 15.915);
      c.setAttribute('fill', 'none'); c.setAttribute('stroke', STATUS_COLOR[k]); c.setAttribute('stroke-width', 6);
      c.setAttribute('stroke-dasharray', `${pct} ${100 - pct}`); c.setAttribute('stroke-dashoffset', offset);
      svg.appendChild(c); offset -= pct;
    });
    const center = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    center.setAttribute('x', 21); center.setAttribute('y', 22); center.setAttribute('text-anchor', 'middle');
    center.setAttribute('font-size', 7); center.setAttribute('font-weight', 800); center.setAttribute('fill', 'var(--text)');
    center.textContent = total; svg.appendChild(center);
    $('#donutLegend').innerHTML = order.map((k) =>
      `<div><span class="dot" style="background:${STATUS_COLOR[k]}"></span>${STATUS[k]}: <b>&nbsp;${byStatus[k] || 0}</b></div>`).join('');
  }

  // ── Останні ────────────────────────────────────────────────
  function renderRecent() {
    const recent = apps.slice(0, 5);
    $('#recentBody').innerHTML = recent.length ? recent.map((a) => `
      <tr data-id="${a.id}"><td>${fmtDate(a.createdAt)}</td><td><b>${esc(a.childName)}</b></td>
      <td><span class="course-pill">${esc(courseLabel(a))}</span></td>
      <td>${statusBadge(a.status)}</td></tr>`).join('')
      : `<tr><td colspan="4" style="color:var(--mute);padding:20px">Заявок поки немає</td></tr>`;
    $$('#recentBody tr[data-id]').forEach((tr) => (tr.onclick = () => openModal(tr.dataset.id)));
  }

  // ── Таблиця заявок ─────────────────────────────────────────
  function filtered() {
    let list = apps.filter((a) => filter.status === 'all' || a.status === filter.status);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      list = list.filter((a) => [a.childName, a.parentName, a.phone, a.email].some((f) => String(f).toLowerCase().includes(q)));
    }
    list.sort((a, b) => {
      let x = a[filter.sort], y = b[filter.sort];
      if (filter.sort === 'createdAt') { x = new Date(x); y = new Date(y); }
      return (x > y ? 1 : x < y ? -1 : 0) * filter.dir;
    });
    return list;
  }
  function renderTable() {
    const list = filtered();
    $('#emptyMsg').classList.toggle('hide', list.length > 0);
    $('#appsBody').innerHTML = list.map((a) => `
      <tr data-id="${a.id}">
        <td>${fmtDate(a.createdAt)}</td>
        <td><b>${esc(a.childName)}</b></td>
        <td class="hide-sm">${esc(a.childAge)}</td>
        <td><span class="course-pill">${esc(courseLabel(a))}</span></td>
        <td class="hide-sm">${esc(a.parentName)}</td>
        <td class="hide-sm"><div style="font-size:.82rem">${esc(a.phone)}<br><span style="color:var(--mute)">${esc(a.email)}</span></div></td>
        <td>${statusBadge(a.status)}</td>
      </tr>`).join('');
    $$('#appsBody tr').forEach((tr) => (tr.onclick = () => openModal(tr.dataset.id)));
  }
  $('#search').addEventListener('input', (e) => { filter.q = e.target.value; renderTable(); });
  $('#statusFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#statusFilter button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active'); filter.status = b.dataset.st; renderTable();
  });
  $$('th[data-sort]').forEach((th) => th.addEventListener('click', () => {
    const s = th.dataset.sort;
    if (filter.sort === s) filter.dir *= -1; else { filter.sort = s; filter.dir = 1; }
    renderTable();
  }));

  // ── Модалка ────────────────────────────────────────────────
  function openModal(id) {
    current = apps.find((a) => a.id === id); if (!current) return;
    const a = current;
    $('#mTitle').textContent = a.childName + ', ' + a.childAge + ' р.';
    $('#mCourse').textContent = courseLabel(a);
    $('#mKv').innerHTML = [
      ['Дата', fmtDate(a.createdAt, true)],
      ["Ім'я батьків", esc(a.parentName)],
      ['Телефон', `<a href="tel:${esc(a.phone)}">${esc(a.phone)}</a>`],
      ['E-mail', `<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>`],
      ['Досвід', expLabel(a.experience)],
      ['Коментар', esc(a.message) || '—'],
    ].map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
    $('#mStatus').value = a.status;
    $('#mNote').value = a.note || '';
    $('#mMail').href = `mailto:${a.email}?subject=${encodeURIComponent('IT Kinderschule — ваша заявка')}`;
    $('#modal').classList.add('open');
  }
  $('#mClose').onclick = () => $('#modal').classList.remove('open');
  $('#modal').onclick = (e) => { if (e.target.id === 'modal') $('#modal').classList.remove('open'); };

  $('#mSave').onclick = async () => {
    if (!current) return;
    const patch = { status: $('#mStatus').value, note: $('#mNote').value };
    const res = await api('/admin/applications/' + current.id, { method: 'PATCH', body: JSON.stringify(patch) });
    if (res.ok) { $('#modal').classList.remove('open'); await loadAll(); toast('Збережено'); }
    else toast('Помилка збереження', 'err');
  };
  $('#mDelete').onclick = async () => {
    if (!current || !confirm('Видалити цю заявку назавжди?')) return;
    const res = await api('/admin/applications/' + current.id, { method: 'DELETE' });
    if (res.ok) { $('#modal').classList.remove('open'); await loadAll(); toast('Заявку видалено'); }
    else toast('Помилка', 'err');
  };

  // ── Експорт ────────────────────────────────────────────────
  $('#exportBtn').onclick = async (e) => {
    e.preventDefault();
    const res = await api('/admin/export.csv');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'applications.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ═══════════════ Підписники розсилки ═══════════════════════
  async function loadSubscribers() {
    const res = await api('/admin/subscribers');
    subscribers = await res.json();
    renderSubscribers();
  }
  function renderSubscribers() {
    $('#subsCount').textContent = subscribers.length ? `Усього підписників: ${subscribers.length}` : '';
    $('#subsEmpty').classList.toggle('hide', subscribers.length > 0);
    $('#subsBody').innerHTML = subscribers.map((s, i) => `
      <tr><td>${i + 1}</td>
        <td><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></td>
        <td>${fmtDate(s.createdAt, true)}</td>
        <td style="text-align:right"><button class="mini del" data-subdel="${s.id}" title="Видалити"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('');
    $$('#subsBody [data-subdel]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Видалити цього підписника?')) return;
      const r = await api('/admin/subscribers/' + b.dataset.subdel, { method: 'DELETE' });
      if (r.ok) { await loadSubscribers(); toast('Підписника видалено'); } else toast('Помилка', 'err');
    }));
  }
  $('#subsExport').onclick = async (e) => {
    e.preventDefault();
    const res = await api('/admin/subscribers/export.csv');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'subscribers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ═══════════════ Редактор контенту (CMS) ═══════════════════
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ICONS = ['bi-puzzle', 'bi-cpu', 'bi-cpu-fill', 'bi-motherboard', 'bi-robot', 'bi-code-slash', 'bi-braces', 'bi-palette', 'bi-controller', 'bi-mortarboard', 'bi-lightbulb', 'bi-rocket', 'bi-diagram-3', 'bi-window', 'bi-pc-display', 'bi-joystick'];
  const COLORS = [['c-scratch', 'Рожевий'], ['c-microbit', 'Помаранчевий'], ['c-arduino', 'Бірюзовий'], ['c-ai', 'Фіолетовий'], ['c-webdev', 'Синій']];
  const COLOR_HEX = { 'c-scratch': '#f472b6', 'c-microbit': '#ff7a59', 'c-arduino': '#22d3ee', 'c-ai': '#8b5cf6', 'c-webdev': '#6d5efc' };
  const CATS = [['young', '7–12'], ['teen', '12–18'], ['robotics', 'Робототехніка'], ['coding', 'Програмування']];

  function setPath(obj, path, val) {
    const ks = path.split('.'); let o = obj;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function markDirty() {
    dirty = true;
    const s = $('#cmsStatus'); s.textContent = '● Є незбережені зміни'; s.className = 'cms-status dirty';
  }
  function setStatusClean() { const s = $('#cmsStatus'); if (!dirty) { s.textContent = ''; s.className = 'cms-status'; } }

  function openContentEditor() {
    if (!draft) draft = clone(content);
    renderAllEditors();
    setStatusClean();
  }
  function renderAllEditors() { renderHeroEditor(); renderAboutEditor(); renderCourses(); renderTeachers(); renderGalleryEditor(); renderReviews(); renderFaq(); fillSettings(); }
  function renderColl(coll) { ({ courses: renderCourses, teachers: renderTeachers, reviews: renderReviews, faq: renderFaq }[coll] || (() => {}))(); }

  const moveBtns = (coll, i) =>
    `<button class="mini" data-action="up" data-coll="${coll}" data-idx="${i}" title="Вгору"><i class="bi bi-arrow-up"></i></button>
     <button class="mini" data-action="down" data-coll="${coll}" data-idx="${i}" title="Вниз"><i class="bi bi-arrow-down"></i></button>
     <button class="mini del" data-action="del" data-coll="${coll}" data-idx="${i}" title="Видалити"><i class="bi bi-trash"></i></button>`;
  const langCol = (flag, fields) => `<div class="lang-col"><div class="flag">${flag}</div>${fields}</div>`;
  const fld = (coll, i, path, label, val, ta) => ta
    ? `<label class="fld-label">${label}</label><textarea data-coll="${coll}" data-idx="${i}" data-path="${path}" rows="3">${esc(val)}</textarea>`
    : `<label class="fld-label">${label}</label><input data-coll="${coll}" data-idx="${i}" data-path="${path}" value="${esc(val)}">`;

  function renderCourses() {
    const box = $('#courseEditor');
    if (!draft.courses.length) { box.innerHTML = '<div class="empty-mini">Курсів немає. Натисніть «Додати курс».</div>'; return; }
    box.innerHTML = draft.courses.map((c, i) => `
      <div class="edit-card">
        <div class="edit-head">
          <div class="ttl"><span class="dot" style="background:${COLOR_HEX[c.cls] || '#6d5efc'}"><i class="bi ${c.icon}"></i></span>${esc(c.uk.title) || 'Новий курс'}</div>
          <div class="acts">${moveBtns('courses', i)}</div>
        </div>
        <div class="edit-body">
          <div class="lang-cols">
            ${langCol('🇺🇦 Українська', fld('courses', i, 'uk.title', 'Назва', c.uk.title) + '<div style="height:8px"></div>' + fld('courses', i, 'uk.desc', 'Опис', c.uk.desc, true))}
            ${langCol('🇩🇪 Deutsch', fld('courses', i, 'de.title', 'Назва', c.de.title) + '<div style="height:8px"></div>' + fld('courses', i, 'de.desc', 'Опис', c.de.desc, true))}
          </div>
          <div class="edit-row thirds">
            <div>${fld('courses', i, 'age', 'Вік', c.age)}</div>
            <div><label class="fld-label">Іконка</label><select data-coll="courses" data-idx="${i}" data-path="icon">${ICONS.map((ic) => `<option value="${ic}" ${ic === c.icon ? 'selected' : ''}>${ic.replace('bi-', '')}</option>`).join('')}</select></div>
            <div><label class="fld-label">Колір</label><select data-coll="courses" data-idx="${i}" data-path="cls">${COLORS.map(([v, l]) => `<option value="${v}" ${v === c.cls ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          </div>
          <div>${fld('courses', i, 'schedule', 'Розклад', c.schedule)}</div>
          <div><label class="fld-label">Категорії (для фільтра на сайті)</label>
            <div class="cat-chips">${CATS.map(([v, l]) => `<label><input type="checkbox" data-cat="${v}" data-idx="${i}" ${c.cats.includes(v) ? 'checked' : ''}><span class="c">${l}</span></label>`).join('')}</div>
          </div>
        </div>
      </div>`).join('');
  }

  function renderTeachers() {
    const box = $('#teacherEditor');
    if (!draft.teachers.length) { box.innerHTML = '<div class="empty-mini">Викладачів немає.</div>'; return; }
    box.innerHTML = draft.teachers.map((tt, i) => `
      <div class="edit-card">
        <div class="edit-head"><div class="ttl"><span class="dot" style="background:linear-gradient(135deg,#6d5efc,#22d3ee)">${esc(tt.initials)}</span>${esc(tt.uk.name) || 'Викладач'}</div><div class="acts">${moveBtns('teachers', i)}</div></div>
        <div class="edit-body">
          <label class="fld-label">Фото (необов'язково — якщо порожньо, показуються ініціали)</label>
          ${imgPickerHtml(tt.photo, 'teacher', i)}
          <div style="max-width:140px">${fld('teachers', i, 'initials', 'Ініціали', tt.initials)}</div>
          <div class="lang-cols">
            ${langCol('🇺🇦 Українська', fld('teachers', i, 'uk.name', "Ім'я", tt.uk.name) + '<div style="height:8px"></div>' + fld('teachers', i, 'uk.role', 'Роль', tt.uk.role) + '<div style="height:8px"></div>' + fld('teachers', i, 'uk.bio', 'Опис', tt.uk.bio, true))}
            ${langCol('🇩🇪 Deutsch', fld('teachers', i, 'de.name', 'Name', tt.de.name) + '<div style="height:8px"></div>' + fld('teachers', i, 'de.role', 'Rolle', tt.de.role) + '<div style="height:8px"></div>' + fld('teachers', i, 'de.bio', 'Beschreibung', tt.de.bio, true))}
          </div>
        </div>
      </div>`).join('');
  }

  function renderReviews() {
    const box = $('#reviewEditor');
    if (!draft.reviews.length) { box.innerHTML = '<div class="empty-mini">Відгуків немає.</div>'; return; }
    box.innerHTML = draft.reviews.map((r, i) => `
      <div class="edit-card">
        <div class="edit-head"><div class="ttl"><span class="dot" style="background:linear-gradient(135deg,#6d5efc,#22d3ee)">${esc(r.initials)}</span>${esc(r.uk.name) || 'Відгук'}</div><div class="acts">${moveBtns('reviews', i)}</div></div>
        <div class="edit-body">
          <div style="max-width:140px">${fld('reviews', i, 'initials', 'Ініціали', r.initials)}</div>
          <div class="lang-cols">
            ${langCol('🇺🇦 Українська', fld('reviews', i, 'uk.text', 'Текст', r.uk.text, true) + '<div style="height:8px"></div>' + fld('reviews', i, 'uk.name', "Ім'я", r.uk.name) + '<div style="height:8px"></div>' + fld('reviews', i, 'uk.role', 'Хто (напр. Мама учня)', r.uk.role))}
            ${langCol('🇩🇪 Deutsch', fld('reviews', i, 'de.text', 'Text', r.de.text, true) + '<div style="height:8px"></div>' + fld('reviews', i, 'de.name', 'Name', r.de.name) + '<div style="height:8px"></div>' + fld('reviews', i, 'de.role', 'Wer', r.de.role))}
          </div>
        </div>
      </div>`).join('');
  }

  function renderFaq() {
    const box = $('#faqEditor');
    if (!draft.faq.length) { box.innerHTML = '<div class="empty-mini">Запитань немає.</div>'; return; }
    box.innerHTML = draft.faq.map((f, i) => `
      <div class="edit-card">
        <div class="edit-head"><div class="ttl"><span class="dot" style="background:linear-gradient(135deg,#6d5efc,#22d3ee)"><i class="bi bi-question-lg"></i></span>${esc(f.uk.q) || 'Запитання'}</div><div class="acts">${moveBtns('faq', i)}</div></div>
        <div class="edit-body">
          <div class="lang-cols">
            ${langCol('🇺🇦 Українська', fld('faq', i, 'uk.q', 'Запитання', f.uk.q) + '<div style="height:8px"></div>' + fld('faq', i, 'uk.a', 'Відповідь', f.uk.a, true))}
            ${langCol('🇩🇪 Deutsch', fld('faq', i, 'de.q', 'Frage', f.de.q) + '<div style="height:8px"></div>' + fld('faq', i, 'de.a', 'Antwort', f.de.a, true))}
          </div>
        </div>
      </div>`).join('');
  }

  function fillSettings() {
    const s = draft.social || {}, c = draft.contact || {};
    ['facebook', 'instagram', 'whatsapp', 'telegram', 'youtube'].forEach((k) => { const el = $('#s-' + k); if (el) el.value = s[k] || ''; });
    ['email', 'phone', 'addressUk', 'addressDe', 'addressUrl', 'scheduleUk', 'scheduleDe'].forEach((k) => { const el = $('#c-' + k); if (el) el.value = c[k] || ''; });
  }

  // ── Зображення: завантаження та редактори Hero/About/Gallery ──
  const FEATURE_ICONS = ['bi-person-workspace', 'bi-bar-chart-steps', 'bi-tools', 'bi-heart', 'bi-check-circle', 'bi-stars', 'bi-lightbulb', 'bi-trophy', 'bi-people', 'bi-shield-check', 'bi-clock-history', 'bi-rocket', 'bi-emoji-smile', 'bi-gem'];
  const inp = (attrs, val, ta) => ta ? `<textarea ${attrs} rows="3">${esc(val)}</textarea>` : `<input ${attrs} value="${esc(val)}">`;

  function imgPickerHtml(url, role, idx) {
    const ix = idx != null ? `data-idx="${idx}"` : '';
    const thumb = url
      ? `<img class="thumb" src="/${esc(url)}" alt="">`
      : `<div class="thumb" style="display:grid;place-items:center;color:var(--mute);font-size:1.4rem"><i class="bi bi-image"></i></div>`;
    return `<div class="img-picker">${thumb}
      <div class="pick-actions">
        <label class="btn tiny"><i class="bi bi-upload"></i> Завантажити<input type="file" accept="image/*" data-upload="${role}" ${ix} hidden></label>
        ${url ? `<button type="button" class="btn ghost tiny" data-imgclear="${role}" ${ix}><i class="bi bi-x-lg"></i> Прибрати</button>` : ''}
      </div>
      <div class="up-progress hide" data-progress></div>
    </div>`;
  }

  function renderHeroEditor() {
    const h = draft.hero; if (!h) return;
    const heroFields = (lng) => {
      const L = h[lng];
      return `<label class="fld-label">Бейдж (рядок зверху)</label>${inp(`data-obj="hero" data-path="${lng}.pill"`, L.pill)}
        <div style="height:8px"></div><label class="fld-label">Заголовок (виділення: *слово*)</label>${inp(`data-obj="hero" data-path="${lng}.title"`, L.title)}
        <div style="height:8px"></div><label class="fld-label">Підзаголовок</label>${inp(`data-obj="hero" data-path="${lng}.subtitle"`, L.subtitle, true)}`;
    };
    const statRow = (s, i) => `<div class="edit-row thirds" style="align-items:end">
      <div><label class="fld-label">Цифра</label>${inp(`data-obj="hero" data-path="stats.${i}.value"`, s.value)}</div>
      <div><label class="fld-label">Підпис (UA)</label>${inp(`data-obj="hero" data-path="stats.${i}.uk"`, s.uk)}</div>
      <div><label class="fld-label">Підпис (DE)</label>${inp(`data-obj="hero" data-path="stats.${i}.de"`, s.de)}</div>
    </div>`;
    $('#heroEditor').innerHTML = `<div class="edit-card"><div class="edit-body">
      <label class="fld-label">Головне фото</label>${imgPickerHtml(h.image, 'hero')}
      <div class="lang-cols">${langCol('🇺🇦 Українська', heroFields('uk'))}${langCol('🇩🇪 Deutsch', heroFields('de'))}</div>
      <label class="fld-label">Показники під заголовком (3)</label>
      <div class="editor-list">${h.stats.map(statRow).join('')}</div>
    </div></div>`;
  }

  function renderAboutEditor() {
    const a = draft.about; if (!a) return;
    const tx = (lng) => `<label class="fld-label">Заголовок</label>${inp(`data-obj="about" data-path="${lng}.title"`, a[lng].title)}
      <div style="height:8px"></div><label class="fld-label">Текст</label>${inp(`data-obj="about" data-path="${lng}.text"`, a[lng].text, true)}`;
    const featureRow = (f, i) => `<div class="edit-card"><div class="edit-body">
      <div style="max-width:240px"><label class="fld-label">Іконка</label>
        <select data-obj="about" data-path="features.${i}.icon">${FEATURE_ICONS.map((ic) => `<option value="${ic}" ${ic === f.icon ? 'selected' : ''}>${ic.replace('bi-', '')}</option>`).join('')}</select></div>
      <div class="lang-cols">
        ${langCol('🇺🇦 Українська', inp(`data-obj="about" data-path="features.${i}.uk.title"`, f.uk.title) + '<div style="height:6px"></div>' + inp(`data-obj="about" data-path="features.${i}.uk.desc"`, f.uk.desc, true))}
        ${langCol('🇩🇪 Deutsch', inp(`data-obj="about" data-path="features.${i}.de.title"`, f.de.title) + '<div style="height:6px"></div>' + inp(`data-obj="about" data-path="features.${i}.de.desc"`, f.de.desc, true))}
      </div>
    </div></div>`;
    $('#aboutEditor').innerHTML = `<div class="edit-card"><div class="edit-body">
      <label class="fld-label">Фото секції</label>${imgPickerHtml(a.image, 'about')}
      <div class="lang-cols">${langCol('🇺🇦 Українська', tx('uk'))}${langCol('🇩🇪 Deutsch', tx('de'))}</div>
      <label class="fld-label">Переваги</label>
      <div class="editor-list">${a.features.map(featureRow).join('')}</div>
    </div></div>`;
  }

  function renderGalleryEditor() {
    const tiles = (draft.gallery || []).map((src, i) => `
      <div class="g-item"><img src="/${esc(src)}" alt="">
        <div class="g-acts"><div></div><div class="row">
          <button class="gbtn" data-gmove="-1" data-idx="${i}" title="Вліво"><i class="bi bi-arrow-left"></i></button>
          <button class="gbtn" data-gmove="1" data-idx="${i}" title="Вправо"><i class="bi bi-arrow-right"></i></button>
          <button class="gbtn del" data-gdel="${i}" title="Видалити"><i class="bi bi-trash"></i></button>
        </div></div>
      </div>`).join('');
    const tile = `<label class="gallery-upload-tile"><span style="text-align:center"><i class="bi bi-plus-lg" style="font-size:1.4rem"></i><br>Додати</span><input type="file" accept="image/*" data-upload="gallery" multiple hidden></label>`;
    $('#galleryEditor').innerHTML = tiles + tile;
  }

  async function uploadImage(file) {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Помилка завантаження');
    return d.url;
  }
  async function handleUpload(fileEl) {
    const role = fileEl.dataset.upload, files = [...fileEl.files];
    if (!files.length) return;
    const prog = fileEl.closest('.img-picker') && fileEl.closest('.img-picker').querySelector('[data-progress]');
    try {
      if (role === 'gallery') {
        toast(`Завантаження ${files.length} фото...`);
        for (const f of files) draft.gallery.push(await uploadImage(f));
        markDirty(); renderGalleryEditor();
        toast('Фото додано. Не забудьте «Зберегти».');
      } else {
        if (prog) { prog.classList.remove('hide'); prog.textContent = 'Завантаження...'; }
        const url = await uploadImage(files[0]);
        applyImage(role, fileEl.dataset.idx, url); markDirty();
      }
    } catch (err) { toast(err.message, 'err'); }
    finally { fileEl.value = ''; }
  }
  function applyImage(role, idx, url) {
    if (role === 'hero') { draft.hero.image = url; renderHeroEditor(); }
    else if (role === 'about') { draft.about.image = url; renderAboutEditor(); }
    else if (role === 'teacher') { draft.teachers[+idx].photo = url; renderTeachers(); }
  }

  const blank = {
    courses: () => ({ id: '', icon: 'bi-mortarboard', cls: 'c-webdev', cats: [], age: '', schedule: 'СБ 16:30–19:00', uk: { title: '', desc: '' }, de: { title: '', desc: '' } }),
    teachers: () => ({ initials: '', photo: '', uk: { name: '', role: '', bio: '' }, de: { name: '', role: '', bio: '' } }),
    reviews: () => ({ initials: '', uk: { text: '', name: '', role: '' }, de: { text: '', name: '', role: '' } }),
    faq: () => ({ uk: { q: '', a: '' }, de: { q: '', a: '' } }),
  };
  $('#addCourse').onclick = () => { draft.courses.push(blank.courses()); markDirty(); renderCourses(); };
  $('#addTeacher').onclick = () => { draft.teachers.push(blank.teachers()); markDirty(); renderTeachers(); };
  $('#addReview').onclick = () => { draft.reviews.push(blank.reviews()); markDirty(); renderReviews(); };
  $('#addFaq').onclick = () => { draft.faq.push(blank.faq()); markDirty(); renderFaq(); };

  // CMS під-вкладки
  $('#cmsTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#cmsTabs button').forEach((x) => x.classList.remove('active')); b.classList.add('active');
    ['hero', 'about', 'courses', 'teachers', 'gallery', 'reviews', 'faq', 'settings'].forEach((p) => $('#pane-' + p).classList.toggle('hide', p !== b.dataset.tab));
  });

  // Введення тексту (live-оновлення draft)
  $('#content').addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.coll && el.dataset.path) { setPath(draft[el.dataset.coll][+el.dataset.idx], el.dataset.path, el.value); markDirty(); }
    else if (el.dataset.obj && el.dataset.path) { setPath(draft[el.dataset.obj], el.dataset.path, el.value); markDirty(); }
    else if (el.id && el.id.startsWith('s-')) { draft.social[el.id.slice(2)] = el.value; markDirty(); }
    else if (el.id && el.id.startsWith('c-')) { draft.contact[el.id.slice(2)] = el.value; markDirty(); }
  });
  // Зміна select / категорій / файли
  $('#content').addEventListener('change', async (e) => {
    const el = e.target;
    if (el.type === 'file' && el.dataset.upload) { await handleUpload(el); return; }
    if (el.dataset.cat) {
      const arr = draft.courses[+el.dataset.idx].cats, v = el.dataset.cat;
      if (el.checked) { if (!arr.includes(v)) arr.push(v); } else { const k = arr.indexOf(v); if (k >= 0) arr.splice(k, 1); }
      markDirty();
    } else if (el.dataset.coll && el.dataset.path) {
      setPath(draft[el.dataset.coll][+el.dataset.idx], el.dataset.path, el.value); markDirty();
      if (el.dataset.path === 'icon' || el.dataset.path === 'cls') renderCourses();
    } else if (el.dataset.obj && el.dataset.path) {
      setPath(draft[el.dataset.obj], el.dataset.path, el.value); markDirty();
    }
  });
  // Дії галереї та очищення зображення
  $('#content').addEventListener('click', (e) => {
    const del = e.target.closest('[data-gdel]');
    if (del) { draft.gallery.splice(+del.dataset.gdel, 1); markDirty(); renderGalleryEditor(); return; }
    const mv = e.target.closest('[data-gmove]');
    if (mv) { const i = +mv.dataset.idx, j = i + +mv.dataset.gmove; if (j >= 0 && j < draft.gallery.length) { [draft.gallery[i], draft.gallery[j]] = [draft.gallery[j], draft.gallery[i]]; markDirty(); renderGalleryEditor(); } return; }
    const clr = e.target.closest('[data-imgclear]');
    if (clr) { applyImage(clr.dataset.imgclear, clr.dataset.idx, ''); markDirty(); return; }
  });
  // Дії: вгору / вниз / видалити
  $('#content').addEventListener('click', (e) => {
    const b = e.target.closest('.mini[data-action]'); if (!b) return;
    const coll = b.dataset.coll, i = +b.dataset.idx, arr = draft[coll];
    if (b.dataset.action === 'del') { if (!confirm('Видалити цей елемент?')) return; arr.splice(i, 1); }
    if (b.dataset.action === 'up' && i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
    if (b.dataset.action === 'down' && i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; }
    markDirty(); renderColl(coll);
  });

  $('#cmsReset').onclick = () => {
    if (dirty && !confirm('Скасувати всі незбережені зміни?')) return;
    draft = clone(content); dirty = false; renderAllEditors(); setStatusClean();
  };
  $('#cmsSave').onclick = async () => {
    const btn = $('#cmsSave'), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Збереження...';
    try {
      const res = await api('/admin/content', { method: 'PUT', body: JSON.stringify(draft) });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error || 'Помилка збереження');
      content = saved; draft = clone(saved); dirty = false; buildCourseMap();
      renderAllEditors();
      const s = $('#cmsStatus'); s.textContent = 'Збережено та опубліковано ✓'; s.className = 'cms-status saved';
      toast('Зміни опубліковано на сайті');
    } catch (err) { toast(err.message, 'err'); }
    finally { btn.disabled = false; btn.innerHTML = old; }
  };
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ── Утиліти ────────────────────────────────────────────────
  function esc(s) { return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }
  function fmtDate(iso, full) {
    const d = new Date(iso);
    const opt = full ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleString('uk-UA', opt);
  }
  function statusBadge(s) { return `<span class="badge st-${s}">${STATUS[s] || s}</span>`; }
  function expLabel(e) { return { none: 'Без досвіду', little: 'Трохи пробували', some: 'Є базові знання' }[e] || e || '—'; }
  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'err' ? 'err' : '');
    el.textContent = msg;
    $('#toastWrap').appendChild(el);
    setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 350); }, 3000);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').classList.remove('open'); });

  // ── Старт ──────────────────────────────────────────────────
  if (token) showApp().catch(() => logout());
})();
