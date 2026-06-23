// ═══════════════════════════════════════════════════════════════
//  IT Kinderschule — клієнтська логіка головної сторінки
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  let lang = localStorage.getItem('lang') || 'uk';

  // Контент сайту: завантажується з /api/content (редагується в адмінці).
  // Якщо API недоступне — резерв із bundled-даних (data.js).
  const FALLBACK = {
    ...window.DATA,
    hero: {
      image: 'images/20250524_170940.jpg',
      uk: { pill: 'Школа майбутніх інженерів · Гамбург', title: 'Програмуємо *майбутнє* разом із дітьми', subtitle: 'Захопливі курси робототехніки та програмування для дітей 7–18 років.' },
      de: { pill: 'Schule der zukünftigen Ingenieure · Hamburg', title: 'Wir programmieren die *Zukunft* gemeinsam mit Kindern', subtitle: 'Spannende Robotik- und Programmierkurse für Kinder von 7–18 Jahren.' },
      stats: [{ value: '350+', uk: 'учнів навчалося', de: 'Schüler unterrichtet' }, { value: '5', uk: 'напрямків', de: 'Fachrichtungen' }, { value: '3', uk: 'роки у Гамбурзі', de: 'Jahre in Hamburg' }],
    },
    about: {
      image: 'images/IMG_2840.jpg',
      uk: { title: 'Чому батьки обирають IT Kinderschule?', text: 'Ми віримо, що кожна дитина має потенціал стати винахідником.' },
      de: { title: 'Warum Eltern IT Kinderschule wählen', text: 'Wir glauben, dass jedes Kind das Potenzial hat, Erfinder zu werden.' },
      features: [],
    },
    gallery: ['images/20240217_101500.jpg', 'images/20230415_124730.jpg', 'images/IMG_2810.jpg', 'images/20230415_140833.jpg', 'images/20231007_104906.jpg', 'images/20240217_135218.jpg', 'images/20240406_143755.jpg', 'images/20240406_143719.jpg', 'images/IMG_2840.jpg'],
    social: { facebook: 'https://www.facebook.com/ukrainian.hacker.school/', instagram: '', whatsapp: '', telegram: '', youtube: '' },
    contact: { email: 'hackerschoolua@gmail.com', phone: '', addressUk: 'Überseering 26, 22297 Hamburg', addressDe: 'Überseering 26, 22297 Hamburg', addressUrl: 'https://maps.app.goo.gl/1o1XzMTQrUvzUWFv9', scheduleUk: 'Заняття щосуботи, 16:30–19:00', scheduleDe: 'Unterricht jeden Samstag, 16:30–19:00' },
  };
  const escHtml = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const attr = (s) => escHtml(s).replace(/"/g, '&quot;');
  let CONTENT = FALLBACK;
  async function loadContent() {
    try {
      const res = await fetch('/api/content');
      if (res.ok) { const c = await res.json(); if (c && Array.isArray(c.courses)) CONTENT = c; }
    } catch { /* лишаємо резерв */ }
  }

  // ── i18n ───────────────────────────────────────────────────
  function t(key) { return (I18N[lang] && I18N[lang][key]) ?? key; }
  function applyI18n() {
    document.documentElement.lang = lang === 'uk' ? 'uk' : 'de';
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const val = I18N[lang][key];
      if (val == null) return;
      if (key === 'pageTitle') document.title = val;
      else if (key === 'metaDesc') el.setAttribute('content', val);
      else el.textContent = val;
    });
    $$('#lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    renderDynamic();
  }

  // ── Тема ───────────────────────────────────────────────────
  const themeBtn = $('#themeToggle');
  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    themeBtn.innerHTML = mode === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  }
  setTheme(localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeBtn.addEventListener('click', () =>
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  );

  // ── Перемикач мови ─────────────────────────────────────────
  $('#lang').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    lang = b.dataset.lang; localStorage.setItem('lang', lang); applyI18n();
  });

  // ── Рендер динамічних блоків ───────────────────────────────
  function renderDynamic() {
    renderHero();
    renderAbout();
    renderGallery();
    // курси
    const grid = $('#coursesGrid');
    grid.innerHTML = CONTENT.courses.map((c) => `
      <article class="course-card reveal" data-cats="${c.cats.join(' ')}">
        <div class="course-icon ${c.cls}"><i class="bi ${c.icon}"></i></div>
        <h3>${c[lang].title}</h3>
        <div class="course-meta">
          <span class="tag age"><i class="bi bi-person"></i> ${c.age} ${lang === 'uk' ? 'р.' : 'J.'}</span>
          <span class="tag">${c.cats.includes('robotics') ? (lang === 'uk' ? 'Робототехніка' : 'Robotik') : (lang === 'uk' ? 'Програмування' : 'Coding')}</span>
        </div>
        <p class="desc">${c[lang].desc}</p>
        <div class="course-foot">
          <span class="sched"><i class="bi bi-calendar3"></i> ${c.schedule}</span>
          <button class="enroll" data-course="${c.id}">${t('enrollNow')} <i class="bi bi-arrow-right"></i></button>
        </div>
      </article>`).join('');

    // викладачі
    $('#teamGrid').innerHTML = CONTENT.teachers.map((tt) => `
      <div class="teacher reveal">
        <div class="ph">${tt.photo ? `<img src="${attr(tt.photo)}" alt="${attr(tt[lang].name)}">` : escHtml(tt.initials)}</div>
        <div class="info"><h4>${escHtml(tt[lang].name)}</h4><div class="role">${escHtml(tt[lang].role)}</div><p>${escHtml(tt[lang].bio)}</p></div>
      </div>`).join('');

    // відгуки
    $('#reviewsTrack').innerHTML = CONTENT.reviews.map((r) => `
      <div class="review reveal">
        <div class="stars">${'<i class="bi bi-star-fill"></i>'.repeat(5)}</div>
        <div class="quote">“</div>
        <p>${r[lang].text}</p>
        <div class="who"><div class="av">${r.initials}</div><div><b>${r[lang].name}</b><span>${r[lang].role}</span></div></div>
      </div>`).join('');

    // FAQ
    $('#faqList').innerHTML = CONTENT.faq.map((f) => `
      <div class="faq-item reveal">
        <button class="faq-q" type="button">${f[lang].q}<i class="bi bi-plus-lg"></i></button>
        <div class="faq-a"><div>${f[lang].a}</div></div>
      </div>`).join('');

    // майстер форми — варіанти курсу (чекбокси: можна обрати кілька)
    const opts = CONTENT.courses.map((c) => ({ value: c.id, icon: c.icon, label: c[lang].title }));
    opts.push({ value: 'unsure', icon: 'bi-question-circle', label: lang === 'uk' ? 'Допоможіть обрати' : 'Beim Auswählen helfen' });
    $('#coursePick').innerHTML = opts.map((o) => `
      <label><input type="checkbox" name="course" value="${o.value}">
        <span class="opt"><i class="bi bi-check2 chk"></i><i class="bi ${o.icon}"></i> ${o.label}</span></label>`).join('');

    renderSocials();
    renderContacts();
    bindDynamic();
    observeReveals();
  }

  // ── Hero / Про нас / Галерея з контенту ────────────────────
  function renderHero() {
    const h = CONTENT.hero; if (!h) return;
    const L = h[lang] || h.uk;
    $('#heroPill').textContent = L.pill || '';
    // *слово* → виділення градієнтом
    $('#heroTitle').innerHTML = escHtml(L.title).replace(/\*([^*]+)\*/g, '<span class="gradient-text">$1</span>');
    $('#heroSub').textContent = L.subtitle || '';
    if (h.image) $('#heroPhoto').src = h.image;
    $('#heroStats').innerHTML = (h.stats || []).map((s) =>
      `<div><div class="num" data-val="${attr(s.value)}">${escHtml(s.value)}</div><div class="lbl">${escHtml(s[lang] || s.uk)}</div></div>`).join('');
    animateCounters();
  }
  function renderAbout() {
    const a = CONTENT.about; if (!a) return;
    const L = a[lang] || a.uk;
    $('#aboutTitle').textContent = L.title || '';
    $('#aboutText').textContent = L.text || '';
    if (a.image) $('#aboutPhoto').src = a.image;
    $('#featureList').innerHTML = (a.features || []).map((f) => `
      <li><span class="ic"><i class="bi ${f.icon || 'bi-check-circle'}"></i></span>
        <div><b>${escHtml(f[lang].title)}</b><span class="d">${escHtml(f[lang].desc)}</span></div></li>`).join('');
  }
  function renderGallery() {
    const wide = new Set([0, 6]), tall = new Set([2]);
    $('#galleryGrid').innerHTML = (CONTENT.gallery || []).map((src, i) =>
      `<a class="${wide.has(i) ? 'wide' : tall.has(i) ? 'tall' : ''}" data-img="${attr(src)}"><img src="${attr(src)}" alt="Заняття ${i + 1}" loading="lazy"></a>`).join('');
  }

  // ── Соцмережі та контакти з контенту ───────────────────────
  function renderSocials() {
    const s = CONTENT.social || {};
    const map = [['facebook', 'bi-facebook', 'Facebook'], ['instagram', 'bi-instagram', 'Instagram'], ['whatsapp', 'bi-whatsapp', 'WhatsApp'], ['telegram', 'bi-telegram', 'Telegram'], ['youtube', 'bi-youtube', 'YouTube']];
    let html = map.filter(([k]) => s[k]).map(([k, ic, l]) => `<a href="${s[k]}" target="_blank" rel="noopener" aria-label="${l}"><i class="bi ${ic}"></i></a>`).join('');
    const email = CONTENT.contact && CONTENT.contact.email;
    if (email) html += `<a href="mailto:${email}" aria-label="Email"><i class="bi bi-envelope"></i></a>`;
    const fs = $('#footerSocials'); if (fs) fs.innerHTML = html;
  }
  function renderContacts() {
    const c = CONTENT.contact || {};
    const addr = (lang === 'uk' ? c.addressUk : c.addressDe) || c.addressUk;
    const sched = (lang === 'uk' ? c.scheduleUk : c.scheduleDe) || c.scheduleUk;
    const line = (icon, inner) => `<div class="contact-line"><i class="bi ${icon}"></i> ${inner}</div>`;
    const cl = $('#contactLines');
    if (cl) cl.innerHTML =
      (addr ? line('bi-geo-alt', `<a href="${c.addressUrl || '#'}" target="_blank" rel="noopener">${addr}</a>`) : '') +
      (c.email ? line('bi-envelope', `<a href="mailto:${c.email}">${c.email}</a>`) : '') +
      (c.phone ? line('bi-telephone', `<a href="tel:${c.phone}">${c.phone}</a>`) : '') +
      (sched ? line('bi-calendar-event', `<span>${sched}</span>`) : '');
    const fcl = $('#footerContactList');
    if (fcl) fcl.innerHTML =
      (addr ? `<li><a href="${c.addressUrl || '#'}" target="_blank" rel="noopener">${addr}</a></li>` : '') +
      (c.email ? `<li><a href="mailto:${c.email}">${c.email}</a></li>` : '') +
      `<li><a href="/admin">${t('footAdmin')}</a></li>`;
    const fcourses = $('#footerCoursesList');
    if (fcourses) fcourses.innerHTML = CONTENT.courses.slice(0, 6).map((cc) => `<li><a href="#courses">${cc[lang].title}</a></li>`).join('');
  }

  // ── Прив'язка подій до згенерованих елементів ──────────────
  function bindDynamic() {
    // FAQ-акордеон
    $$('.faq-item').forEach((item) => {
      const q = $('.faq-q', item), a = $('.faq-a', item);
      q.onclick = () => {
        const open = item.classList.toggle('open');
        a.style.maxHeight = open ? a.scrollHeight + 'px' : 0;
      };
    });
    // кнопки «Записатися» на картках курсів
    $$('.enroll[data-course]').forEach((btn) => {
      btn.onclick = () => {
        const radio = $(`#coursePick input[value="${btn.dataset.course}"]`);
        if (radio) radio.checked = true;
        goToStep(0);
        $('#enroll').scrollIntoView({ behavior: 'smooth' });
        toast(t('toastEnroll'), 'ok');
      };
    });
    // лайтбокс
    $$('#galleryGrid a').forEach((a, i) => { a.dataset.idx = i; a.onclick = () => openLightbox(i); });
  }

  // ── Фільтр курсів ──────────────────────────────────────────
  $('.course-filters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip'); if (!chip) return;
    $$('.course-filters .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    const f = chip.dataset.filter;
    $$('#coursesGrid .course-card').forEach((card) => {
      const show = f === 'all' || card.dataset.cats.includes(f);
      card.style.display = show ? '' : 'none';
    });
  });

  // ── Reveal по скролу ───────────────────────────────────────
  let io;
  function observeReveals() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  }

  // ── Лічильники у hero ──────────────────────────────────────
  function animateCounters() {
    $$('#heroStats .num').forEach((el) => {
      const raw = el.dataset.val || el.textContent;
      const m = String(raw).match(/^(\d+)(.*)$/);
      if (!m) { el.textContent = raw; return; }
      const target = +m[1], suffix = m[2] || ''; let cur = 0;
      const step = Math.max(1, Math.round(target / 50));
      const tick = () => { cur += step; if (cur >= target) { el.textContent = target + suffix; } else { el.textContent = cur; requestAnimationFrame(tick); } };
      tick();
    });
  }

  // ── Навбар: скрол, бургер, прогрес, активні лінки ──────────
  const nav = $('#nav'), progress = $('#scroll-progress'), toTop = $('#to-top');
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 10);
    toTop.classList.toggle('show', y > 600);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (y / h) * 100 + '%';
    let active = '';
    $$('section[id]').forEach((s) => { if (y >= s.offsetTop - 120) active = s.id; });
    $$('.nav-links a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + active));
  }
  addEventListener('scroll', onScroll, { passive: true });
  toTop.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });
  $('#burger').onclick = () => $('#navLinks').classList.toggle('open');
  $$('.nav-links a').forEach((a) => (a.onclick = () => $('#navLinks').classList.remove('open')));

  // ── Лайтбокс ───────────────────────────────────────────────
  const lb = $('#lightbox'), lbImg = $('#lightboxImg');
  let imgs = [], cur = 0;
  function openLightbox(i) { imgs = $$('#galleryGrid a').map((a) => a.dataset.img); cur = i; lbImg.src = imgs[cur]; lb.classList.add('open'); }
  function move(d) { cur = (cur + d + imgs.length) % imgs.length; lbImg.src = imgs[cur]; }
  $('.lightbox .close').onclick = () => lb.classList.remove('open');
  $('.lightbox .prev').onclick = (e) => { e.stopPropagation(); move(-1); };
  $('.lightbox .next').onclick = (e) => { e.stopPropagation(); move(1); };
  lb.onclick = (e) => { if (e.target === lb) lb.classList.remove('open'); };
  addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') lb.classList.remove('open');
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });

  // ── Майстер форми ──────────────────────────────────────────
  const form = $('#enrollForm');
  const steps = $$('.fstep', form);
  const dots = $$('.steps-bar .sdot');
  let step = 0;
  function goToStep(n) {
    step = n;
    steps.forEach((s, i) => s.classList.toggle('active', i === n));
    dots.forEach((d, i) => d.classList.toggle('done', i <= n));
  }
  function validateStep(n) {
    if (n === 0) {
      const ok = !!form.querySelector('input[name="course"]:checked');
      $('#courseErr').style.display = ok ? 'none' : 'block';
      return ok;
    }
    let ok = true;
    steps[n].querySelectorAll('input[required]').forEach((inp) => {
      const field = inp.closest('.field');
      let valid = inp.value.trim().length > 0;
      if (inp.type === 'email') valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value);
      if (inp.type === 'tel') valid = /^[+\d][\d\s()-]{6,}$/.test(inp.value);
      if (inp.name === 'childAge') { const a = +inp.value; valid = a >= 5 && a <= 20; }
      field.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    return ok;
  }
  form.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) { if (validateStep(step)) goToStep(step + 1); }
    if (e.target.closest('[data-prev]')) goToStep(step - 1);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(2)) return toast(t('formErr'), 'err');
    const f = new FormData(form);
    const fd = {
      childName: f.get('childName'), childAge: f.get('childAge'),
      parentName: f.get('parentName'), phone: f.get('phone'), email: f.get('email'),
      experience: f.get('experience'), message: f.get('message'), website: f.get('website'),
      courses: f.getAll('course'),
    };
    const btn = $('#submitBtn'); const old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> ...';
    try {
      const res = await fetch('/api/applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fd),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'error');
      form.style.display = 'none';
      $('#formSuccess').classList.add('show');
    } catch (err) {
      toast(err.message || t('formErr'), 'err');
      btn.disabled = false; btn.innerHTML = old;
    }
  });
  $('#againBtn').onclick = () => {
    form.reset(); form.style.display = ''; $('#formSuccess').classList.remove('show');
    $('#submitBtn').disabled = false; goToStep(0);
  };

  // ── Розсилка ───────────────────────────────────────────────
  $('#nlForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    try {
      const res = await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error();
      toast(t('nlOk'), 'ok'); e.target.reset();
    } catch { toast(t('nlErr'), 'err'); }
  });

  // ── Toast ──────────────────────────────────────────────────
  function toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="bi ${type === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i> ${msg}`;
    $('#toastWrap').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; setTimeout(() => el.remove(), 400); }, 3800);
  }

  // ── Старт ──────────────────────────────────────────────────
  $('#year').textContent = new Date().getFullYear();
  (async () => { await loadContent(); applyI18n(); onScroll(); })();
})();
