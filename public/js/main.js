// ═══════════════════════════════════════════════════════════════
//  IT Kinderschule — клієнтська логіка головної сторінки
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  // Мова: пріоритет — параметр ?lang= в URL (для hreflang/SEO), далі вибір користувача, далі UA.
  const _qsLang = new URLSearchParams(location.search).get('lang');
  let lang = (_qsLang === 'uk' || _qsLang === 'de') ? _qsLang : (localStorage.getItem('lang') || 'uk');

  // Режим конструктора (сторінка відкрита в iframe адмінки як ?builder=1)
  const BUILDER = new URLSearchParams(location.search).has('builder');
  // GSAP-анімації: лише на «живому» сайті, з повагою до reduced-motion.
  // Якщо CDN недоступний — тихо відкочуємось на IntersectionObserver-reveal.
  const GSAP_ON = !BUILDER && !!(window.gsap && window.ScrollTrigger)
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (GSAP_ON) gsap.registerPlugin(ScrollTrigger);
  const SECTION_REFS = ['hero', 'marquee', 'about', 'courses', 'how', 'teachers', 'gallery', 'reviews', 'faq', 'enroll', 'newsletter'];
  // ref секції → id відповідного елемента в DOM
  const SECTION_DOM = { hero: 'hero', marquee: 'marquee', about: 'about', courses: 'courses', how: 'how', teachers: 'team', gallery: 'gallery', reviews: 'reviews', faq: 'faq', enroll: 'enroll', newsletter: 'newsletter' };
  const SECTION_LABELS = { hero: 'Головна', marquee: 'Рядок', about: 'Про нас', courses: 'Курси', how: 'Як навчаємо', teachers: 'Викладачі', gallery: 'Галерея', reviews: 'Відгуки', faq: 'FAQ', enroll: 'Форма заявки', newsletter: 'Розсилка' };
  const BLOCK_LABELS = { heading: 'Заголовок', text: 'Текст', image: 'Фото', button: 'Кнопка', spacer: 'Відступ', divider: 'Лінія' };
  // Секції зі структурованим вмістом (фото/картки) → відкривають інспектор
  const EDITABLE_REFS = ['hero', 'about', 'courses', 'teachers', 'gallery', 'reviews', 'faq'];

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
    layout: ['hero', 'marquee', 'about', 'courses', 'how', 'teachers', 'gallery', 'reviews', 'faq', 'enroll', 'newsletter'].map((ref) => ({ kind: 'section', ref })),
    texts: { uk: {}, de: {} },
    palette: 'aurora',
  };
  // Кольорові палітри дизайн-системи (мають збігатися зі style.css і сервером)
  const PALETTES = ['aurora', 'sunset', 'ocean', 'forest', 'candy'];
  const escHtml = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const attr = (s) => escHtml(s).replace(/"/g, '&quot;');
  const richify = (s) => escHtml(s).replace(/\*([^*]+)\*/g, '<span class="gradient-text">$1</span>');
  // У режимі конструктора додає атрибути для інлайн-редагування поля контенту
  const editAttr = (path, rich) => (BUILDER ? ` data-itk-edit="${path}"${rich ? ' data-itk-rich="1"' : ''}` : '');
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
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
    const ov = (CONTENT.texts && CONTENT.texts[lang]) || {};
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const val = (key in ov) ? ov[key] : I18N[lang][key];
      if (val == null) return;
      if (key === 'pageTitle') document.title = val;
      else if (key === 'metaDesc') el.setAttribute('content', val);
      else el.textContent = val;
    });
    $$('#lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    updateSeoMeta();
    renderDynamic();
  }

  // Синхронізує canonical / Open Graph / og:locale з поточною мовою (для шерингу та SEO).
  function updateSeoMeta() {
    if (BUILDER) return;
    const ORIGIN = location.origin && location.origin.startsWith('http') ? location.origin : 'https://www.it-kinderschule.com';
    const url = `${ORIGIN}/?lang=${lang}`;
    const set = (sel, attr, val) => { const el = $(sel); if (el) el.setAttribute(attr, val); };
    set('#canonical', 'href', url);
    set('#ogUrl', 'content', url);
    set('#ogTitle', 'content', document.title);
    set('#ogDesc', 'content', $('meta[name="description"]')?.getAttribute('content') || '');
    set('#ogLocale', 'content', lang === 'uk' ? 'uk_UA' : 'de_DE');
  }

  // ── Тема ───────────────────────────────────────────────────
  const themeBtn = $('#themeToggle');
  function setTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
    themeBtn.innerHTML = mode === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
  }
  // Світла тема за замовчуванням лише при першому заході; далі — вибір користувача (зберігається).
  setTheme(localStorage.getItem('theme') || 'light');
  themeBtn.addEventListener('click', () =>
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark')
  );

  // ── Перемикач мови ─────────────────────────────────────────
  $('#lang').addEventListener('click', (e) => {
    if (BUILDER) return; // на полотні мову задає адмінка, а клік = редагування підпису
    const b = e.target.closest('button'); if (!b) return;
    lang = b.dataset.lang; localStorage.setItem('lang', lang);
    // Відобразити мову в URL без перезавантаження (синхронно з hreflang).
    if (!BUILDER) { try { const u = new URL(location.href); u.searchParams.set('lang', lang); history.replaceState(null, '', u); } catch {} }
    applyI18n();
  });

  // ── Палітра сайту (обирається в адмінці, живе в контенті) ──
  function applyPalette() {
    const p = PALETTES.includes(CONTENT.palette) ? CONTENT.palette : 'aurora';
    document.documentElement.setAttribute('data-palette', p);
    // на «живому» сайті запам'ятовуємо, щоб наступне відкриття було без блимання
    if (!BUILDER) try { localStorage.setItem('palette', p); } catch { /* приватний режим */ }
    const meta = $('meta[name="theme-color"]');
    if (meta) {
      const c = getComputedStyle(document.documentElement).getPropertyValue('--p1').trim();
      if (c) meta.setAttribute('content', c);
    }
  }

  // ── Рендер динамічних блоків ───────────────────────────────
  function renderDynamic() {
    applyPalette();
    renderHero();
    renderAbout();
    renderGallery();
    // курси
    const grid = $('#coursesGrid');
    grid.innerHTML = CONTENT.courses.map((c, i) => `
      <article class="course-card reveal" data-cats="${c.cats.join(' ')}">
        <div class="course-icon ${c.cls}"><i class="bi ${c.icon}"></i></div>
        <h3${editAttr(`courses.${i}.${lang}.title`)}>${escHtml(c[lang].title)}</h3>
        <div class="course-meta">
          <span class="tag age"><i class="bi bi-person"></i> <span${editAttr(`courses.${i}.age`)}>${escHtml(c.age)}</span> ${lang === 'uk' ? 'р.' : 'J.'}</span>
          <span class="tag">${c.cats.includes('robotics') ? (lang === 'uk' ? 'Робототехніка' : 'Robotik') : (lang === 'uk' ? 'Програмування' : 'Coding')}</span>
        </div>
        <p class="desc"${editAttr(`courses.${i}.${lang}.desc`)}>${escHtml(c[lang].desc)}</p>
        <div class="course-foot">
          <span class="sched"><i class="bi bi-calendar3"></i> <span${editAttr(`courses.${i}.schedule`)}>${escHtml(c.schedule)}</span></span>
          <button class="enroll" data-course="${c.id}">${t('enrollNow')} <i class="bi bi-arrow-right"></i></button>
        </div>
      </article>`).join('');

    // викладачі
    $('#teamGrid').innerHTML = CONTENT.teachers.map((tt, i) => `
      <div class="teacher reveal">
        <div class="ph">${tt.photo ? `<img src="${attr(tt.photo)}" alt="${attr(tt[lang].name)}">` : `<span${editAttr(`teachers.${i}.initials`)}>${escHtml(tt.initials)}</span>`}</div>
        <div class="info"><h4${editAttr(`teachers.${i}.${lang}.name`)}>${escHtml(tt[lang].name)}</h4><div class="role"${editAttr(`teachers.${i}.${lang}.role`)}>${escHtml(tt[lang].role)}</div><p${editAttr(`teachers.${i}.${lang}.bio`)}>${escHtml(tt[lang].bio)}</p></div>
      </div>`).join('');

    // відгуки
    $('#reviewsTrack').innerHTML = CONTENT.reviews.map((r, i) => `
      <div class="review reveal">
        <div class="stars">${'<i class="bi bi-star-fill"></i>'.repeat(5)}</div>
        <div class="quote">“</div>
        <p${editAttr(`reviews.${i}.${lang}.text`)}>${escHtml(r[lang].text)}</p>
        <div class="who"><div class="av"><span${editAttr(`reviews.${i}.initials`)}>${escHtml(r.initials)}</span></div><div><b${editAttr(`reviews.${i}.${lang}.name`)}>${escHtml(r[lang].name)}</b><span${editAttr(`reviews.${i}.${lang}.role`)}>${escHtml(r[lang].role)}</span></div></div>
      </div>`).join('');

    // FAQ
    $('#faqList').innerHTML = CONTENT.faq.map((f, i) => `
      <div class="faq-item reveal">
        <button class="faq-q" type="button"><span${editAttr(`faq.${i}.${lang}.q`)}>${escHtml(f[lang].q)}</span><i class="bi bi-plus-lg"></i></button>
        <div class="faq-a"><div${editAttr(`faq.${i}.${lang}.a`)}>${escHtml(f[lang].a)}</div></div>
      </div>`).join('');

    // майстер форми — варіанти курсу (чекбокси: можна обрати кілька)
    const opts = CONTENT.courses.map((c) => ({ value: c.id, icon: c.icon, label: c[lang].title }));
    opts.push({ value: 'unsure', icon: 'bi-question-circle', label: lang === 'uk' ? 'Допоможіть обрати' : 'Beim Auswählen helfen' });
    $('#coursePick').innerHTML = opts.map((o) => `
      <label><input type="checkbox" name="course" value="${o.value}">
        <span class="opt"><i class="bi bi-check2 chk"></i><i class="bi ${o.icon}"></i> ${o.label}</span></label>`).join('');

    renderSocials();
    renderContacts();
    injectStructuredData();
    bindDynamic();
    composePage();
    observeReveals();
  }

  // Динамічні структуровані дані (курси + FAQ) — будуються з того ж контенту,
  // що й видима розмітка, тож завжди збігаються з нею (вимога Google).
  function injectStructuredData() {
    if (BUILDER) return;
    const ORIGIN = location.origin && location.origin.startsWith('http') ? location.origin : 'https://www.it-kinderschule.com';
    const blocks = [];

    if (Array.isArray(CONTENT.courses) && CONTENT.courses.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: lang === 'uk' ? 'Курси IT Kinderschule' : 'Kurse der IT Kinderschule',
        itemListElement: CONTENT.courses.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Course',
            name: c[lang]?.title || '',
            description: c[lang]?.desc || '',
            inLanguage: lang === 'uk' ? 'uk' : 'de',
            provider: { '@id': `${ORIGIN}/#organization` },
            url: `${ORIGIN}/?lang=${lang}#courses`,
          },
        })),
      });
    }

    if (Array.isArray(CONTENT.faq) && CONTENT.faq.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: CONTENT.faq.map((f) => ({
          '@type': 'Question',
          name: f[lang]?.q || '',
          acceptedAnswer: { '@type': 'Answer', text: f[lang]?.a || '' },
        })),
      });
    }

    document.querySelectorAll('script[data-itk-jsonld]').forEach((s) => s.remove());
    for (const data of blocks) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.setAttribute('data-itk-jsonld', '1');
      s.textContent = JSON.stringify(data);
      document.head.appendChild(s);
    }
  }

  // ── Композиція сторінки за layout ──────────────────────────
  // Переставляє наявні секції у заданому порядку та вставляє між
  // ними атомарні блоки. Довжина сторінки = наповнення layout.
  function sectionEl(ref) { return document.getElementById(SECTION_DOM[ref] || ref); }
  function stashEl() {
    let st = document.getElementById('itk-stash');
    if (!st) { st = document.createElement('div'); st.id = 'itk-stash'; st.style.display = 'none'; document.body.appendChild(st); }
    return st;
  }
  function composePage() {
    const page = $('#page'); if (!page) return;
    const layout = (CONTENT.layout && CONTENT.layout.length) ? CONTENT.layout : FALLBACK.layout;
    $$('.itk-atomic', page).forEach((el) => el.remove());
    const used = new Set();
    // Переміщуємо вузол лише коли він НЕ на своєму місці: зайвий appendChild
    // рестартує CSS-анімації (нескінченна стрічка технологій обривалась би
    // на кожному перерендері — зміна мови/теми, правки в конструкторі).
    let cursor = null;
    const place = (el) => {
      const next = cursor ? cursor.nextSibling : page.firstChild;
      if (next !== el) page.insertBefore(el, next);
      cursor = el;
    };
    layout.forEach((item) => {
      if (item.kind === 'section') {
        const el = sectionEl(item.ref);
        if (el) { el.style.display = ''; el.dataset.itkKey = 'section:' + item.ref; place(el); used.add(item.ref); }
      } else if (item.kind === 'block' && window.ITKBlocks) {
        const el = ITKBlocks.renderAtomic(item, lang);
        el.dataset.itkKey = 'block:' + item.id;
        place(el);
      }
    });
    // секції, яких немає в layout, виносимо у прихований сховок (поза #page),
    // щоб вони не потрапляли у перевпорядкування й не показувались на сайті
    SECTION_REFS.forEach((ref) => { if (!used.has(ref)) { const el = sectionEl(ref); if (el && el.parentNode !== stashEl()) stashEl().appendChild(el); } });
    if (BUILDER) decorateBuilder();
  }

  // ── Hero / Про нас / Галерея з контенту ────────────────────
  function renderHero() {
    const h = CONTENT.hero; if (!h) return;
    const L = h[lang] || h.uk;
    const pill = $('#heroPill'); pill.textContent = L.pill || '';
    const pillChip = pill.closest('.pill'); if (pillChip) pillChip.style.display = (L.pill || '').trim() ? '' : 'none';
    // *слово* → виділення градієнтом
    const title = $('#heroTitle'); title.innerHTML = richify(L.title);
    const sub = $('#heroSub'); sub.textContent = L.subtitle || '';
    if (BUILDER) { pill.dataset.itkEdit = `hero.${lang}.pill`; title.dataset.itkEdit = `hero.${lang}.title`; title.dataset.itkRich = '1'; sub.dataset.itkEdit = `hero.${lang}.subtitle`; }
    if (h.image) $('#heroPhoto').src = h.image;
    // Декоративний фоновий шар банера (розмите фото; редагується в адмінці)
    const bgEl = $('#heroBg');
    if (bgEl) {
      const bg = String(h.bg || '').replace(/["\\]/g, '');
      if (bg) { bgEl.style.backgroundImage = `url("${bg}")`; bgEl.classList.add('on'); }
      else { bgEl.classList.remove('on'); bgEl.style.backgroundImage = ''; }
    }
    $('#heroStats').innerHTML = (h.stats || []).map((s, i) =>
      `<div><div class="num"${editAttr(`hero.stats.${i}.value`)} data-val="${attr(s.value)}">${escHtml(s.value)}</div><div class="lbl"${editAttr(`hero.stats.${i}.${lang}`)}>${escHtml(s[lang] || s.uk)}</div></div>`).join('');
    animateCounters();
  }
  function renderAbout() {
    const a = CONTENT.about; if (!a) return;
    const L = a[lang] || a.uk;
    const at = $('#aboutTitle'); at.textContent = L.title || '';
    const ax = $('#aboutText'); ax.textContent = L.text || '';
    if (BUILDER) { at.dataset.itkEdit = `about.${lang}.title`; ax.dataset.itkEdit = `about.${lang}.text`; }
    if (a.image) $('#aboutPhoto').src = a.image;
    $('#featureList').innerHTML = (a.features || []).map((f, i) => `
      <li><span class="ic"><i class="bi ${f.icon || 'bi-check-circle'}"></i></span>
        <div><b${editAttr(`about.features.${i}.${lang}.title`)}>${escHtml(f[lang].title)}</b><span class="d"${editAttr(`about.features.${i}.${lang}.desc`)}>${escHtml(f[lang].desc)}</span></div></li>`).join('');
  }
  function renderGallery() {
    const wide = new Set([0, 6]), tall = new Set([2]);
    $('#galleryGrid').innerHTML = (CONTENT.gallery || []).map((src, i) =>
      `<a class="reveal ${wide.has(i) ? 'wide' : tall.has(i) ? 'tall' : ''}" data-img="${attr(src)}"><img src="${attr(src)}" alt="Заняття ${i + 1}" loading="lazy"></a>`).join('');
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
      (c.email ? `<li><a href="mailto:${c.email}">${c.email}</a></li>` : '');
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
    if (GSAP_ON) { gsapReveals(); return; }
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  }

  // ── GSAP: поява карток зі stagger + паралакс (ScrollTrigger) ──
  // Викликається після кожного рендеру (зміна мови перебудовує сітки):
  // тригери «мертвих» елементів прибираються, нові — анімуються.
  let gsapStaticDone = false;
  function gsapReveals() {
    document.documentElement.classList.add('gsap-on'); // вимкнути CSS-reveal
    ScrollTrigger.getAll().forEach((t) => { if (t.trigger && !document.contains(t.trigger)) t.kill(); });
    const fresh = $$('.reveal').filter((el) => !el.dataset.gsapDone);
    fresh.forEach((el) => { el.dataset.gsapDone = '1'; el.classList.add('in'); });
    if (fresh.length) {
      gsap.set(fresh, { autoAlpha: 0, y: 42 });
      ScrollTrigger.batch(fresh, {
        start: 'top 88%',
        once: true,
        onEnter: (els) => gsap.to(els, {
          autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.09,
          overwrite: true,
          clearProps: 'transform', // повернути CSS hover-трансформи карткам
        }),
      });
    }
    if (!gsapStaticDone) { gsapStaticDone = true; gsapParallax(); }
    ScrollTrigger.refresh();
  }

  // Паралакс для «постійних» елементів (не перерендерюються).
  // Блоби/floaties мають власні CSS-анімації transform — їх не чіпаємо.
  function gsapParallax() {
    gsap.to('#hero .hero-visual .photo', {
      yPercent: 9, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
    });
    gsap.to('#heroBg', {
      yPercent: 16, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('#aboutPhoto', { y: 36 }, {
      y: -26, ease: 'none',
      scrollTrigger: { trigger: '#about', start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
    // Стрічку технологій НЕ анімуємо GSAP'ом: gsap.from тут ламався після
    // перерендеру (зміна мови) — трек лишався з inline opacity:0 назавжди.
    // Її нескінченний рух — чиста CSS-анімація, стійка до перерендерів.
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

  // ═══════════════ Режим редагування (полотно) ══════════════
  // Полотно живе в iframe адмінки. Стан (CONTENT) надсилає батьківське
  // вікно; назад летять лише ПРАВКИ вмісту (без додавання/видалення/
  // переміщення). Один рендерер — тож полотно = реальний сайт.
  let selectedKey = null;
  function post(msg) { try { parent.postMessage(Object.assign({ itk: true }, msg), '*'); } catch (e) { /* поза iframe */ } }
  function findBlock(id) { return (CONTENT.layout || []).find((it) => it.kind === 'block' && it.id === id); }

  function initBuilder() {
    document.documentElement.classList.add('itk-builder');
    window.addEventListener('message', onBuilderMessage);
    // блокуємо навігацію/сабміти всередині полотна (крім редагування тексту)
    document.addEventListener('click', (e) => {
      if (e.target.closest('[contenteditable]')) return;
      const t = e.target.closest('a, button, .enroll');
      if (t) e.preventDefault();
    }, true);
    document.addEventListener('submit', (e) => e.preventDefault(), true);
    post({ type: 'ready' });
  }

  function onBuilderMessage(e) {
    const m = e.data || {};
    if (m.itk !== true) return;
    if (m.type === 'render') {
      // зберігаємо позицію прокрутки полотна, щоб перерендер не «стрибав» угору
      const sx = scrollX, sy = scrollY;
      CONTENT = m.content || CONTENT;
      if (m.lang) { lang = m.lang; localStorage.setItem('lang', lang); }
      applyI18n();
      if (m.selected !== undefined) setBuilderSelection(m.selected);
      requestAnimationFrame(() => scrollTo(sx, sy));
    } else if (m.type === 'select') {
      setBuilderSelection(m.key);
    }
  }

  function decorateBuilder() {
    const page = $('#page'); if (!page) return;
    $$('.reveal').forEach((el) => el.classList.add('in')); // показати все (без скрол-анімацій)
    [...page.children].forEach((child) => {
      const key = child.dataset.itkKey || '';
      if (key.startsWith('section:') && EDITABLE_REFS.includes(key.slice(8))) {
        child.classList.add('itk-node', 'itk-selectable');
        if (!child.dataset.itkSel) {
          child.dataset.itkSel = '1';
          child.addEventListener('mousedown', (e) => {
            if (e.target.closest('[contenteditable]')) return;
            post({ type: 'select', key });
            setBuilderSelection(key);
          });
        }
      }
      wireInline(child); // атомарні блоки (якщо є)
    });
    wireDynamicInline(); // динамічний текст (курси, викладачі, відгуки, FAQ, hero, про нас)
    wireI18nInline();    // статичні тексти data-i18n (навбар, заголовки, форма, розсилка, футер)
    setBuilderSelection(selectedKey);
  }

  // Інлайн-редагування поля контенту за шляхом (data-itk-edit="courses.0.uk.title")
  function wireDynamicInline() {
    $$('[data-itk-edit]').forEach((el) => {
      if (el.dataset.itkDyn) return;
      el.dataset.itkDyn = '1';
      el.setAttribute('contenteditable', 'plaintext-only');
      el.classList.add('itk-editable');
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.addEventListener('click', (e) => e.stopPropagation()); // не тригерити фільтр/акордеон
      el.addEventListener('focus', () => {
        const raw = getPath(CONTENT, el.dataset.itkEdit);
        if (raw != null) el.textContent = raw;
        el.classList.add('itk-editing');
      });
      el.addEventListener('blur', () => {
        el.classList.remove('itk-editing');
        const v = el.textContent.trim(); // textContent — без CSS text-transform
        const cur = getPath(CONTENT, el.dataset.itkEdit);
        if (el.dataset.itkRich) el.innerHTML = richify(v);
        if (v !== String(cur == null ? '' : cur)) post({ type: 'editPath', path: el.dataset.itkEdit, value: v });
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') el.blur();
      });
    });
  }

  function wireInline(child) {
    const key = child.dataset.itkKey;
    if (!key.startsWith('block:')) return;
    const id = key.slice(6);
    const isBtn = child.classList.contains('itk-atomic--button');
    const isText = child.classList.contains('itk-atomic--text');
    const target = child.querySelector('.itk-h, .itk-text, .itk-btn-wrap a');
    if (!target || target.dataset.itkInline) return;
    target.dataset.itkInline = '1';
    target.setAttribute('contenteditable', 'plaintext-only');
    target.classList.add('itk-editable');
    target.addEventListener('mousedown', (e) => e.stopPropagation());
    target.addEventListener('focus', () => {
      const b = findBlock(id); if (!b) return;
      const L = b.data[lang] || b.data.uk || {};
      target.textContent = (isBtn ? L.label : L.text) || '';
      child.classList.add('itk-editing');
    });
    target.addEventListener('blur', () => {
      child.classList.remove('itk-editing');
      post({ type: 'editBlock', id, field: isBtn ? 'label' : 'text', value: target.innerText.replace(/ /g, ' ').trim() });
    });
    target.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !isText) { e.preventDefault(); target.blur(); }
      if (e.key === 'Escape') target.blur();
    });
  }

  // Інлайн-редагування будь-якого статичного тексту (data-i18n):
  // навбар, заголовки секцій, кроки «як навчаємо», форма, розсилка, футер.
  function wireI18nInline() {
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key === 'pageTitle' || key === 'metaDesc') return;
      if (el.tagName === 'OPTION' || el.closest('select')) return;
      if (el.dataset.itkI18n) return;
      el.dataset.itkI18n = '1';
      el.setAttribute('contenteditable', 'plaintext-only');
      el.classList.add('itk-editable');
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.addEventListener('focus', () => el.classList.add('itk-editing'));
      el.addEventListener('blur', () => {
        el.classList.remove('itk-editing');
        const v = el.textContent.trim(); // textContent — без CSS text-transform (eyebrow uppercase)
        const ov = CONTENT.texts && CONTENT.texts[lang] && CONTENT.texts[lang][key];
        const cur = (ov != null ? ov : (I18N[lang] && I18N[lang][key])) || '';
        if (v === String(cur)) return; // нічого не змінилось
        // назва розділу дублюється (навбар + футер) — оновлюємо всі копії одразу
        $$(`[data-i18n="${key}"]`).forEach((o) => { if (o !== el && o.tagName !== 'OPTION') o.textContent = v; });
        post({ type: 'editText', key, lang, value: v });
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
        if (e.key === 'Escape') el.blur();
      });
    });
  }

  function setBuilderSelection(key) {
    selectedKey = key || null;
    $$('#page > .itk-selectable').forEach((c) => c.classList.toggle('itk-selected', c.dataset.itkKey === selectedKey));
  }

  // ── Паралакс декору hero (лише сайт, не полотно конструктора) ──
  if (!BUILDER && matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const heroEl = $('#hero'), fl = $('#hero .floaties');
    if (heroEl && fl) heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      fl.style.transform = `translate(${dx * -18}px, ${dy * -14}px)`;
    }, { passive: true });
  }

  // ── Старт ──────────────────────────────────────────────────
  $('#year').textContent = new Date().getFullYear();
  if (BUILDER) {
    initBuilder();
  } else {
    (async () => { await loadContent(); applyI18n(); onScroll(); })();
  }
})();
