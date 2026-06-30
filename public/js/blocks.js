// ═══════════════════════════════════════════════════════════════
//  IT Kinderschule — спільний рендерер атомарних блоків.
//  Використовується і публічним сайтом (main.js), і конструктором
//  в адмінці. Один блок → один DOM-елемент (section), тож порядок і
//  довжина сторінки задаються масивом layout у контенті.
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const esc = (s) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const attr = (s) => esc(s).replace(/"/g, '&quot;');
  // *слово* → кольорове виділення; переноси рядків → <br>
  const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="gradient-text">$1</span>').replace(/\n/g, '<br>');
  const imgSrc = (s) => (/^https?:\/\//i.test(s) ? s : '/' + String(s).replace(/^\/+/, ''));

  // Каталог атомарних блоків для палітри конструктора
  const PALETTE = [
    { type: 'heading', label: 'Заголовок', icon: 'bi-type-h2' },
    { type: 'text', label: 'Текст', icon: 'bi-text-left' },
    { type: 'image', label: 'Фото', icon: 'bi-image' },
    { type: 'button', label: 'Кнопка', icon: 'bi-hand-index' },
    { type: 'spacer', label: 'Відступ', icon: 'bi-distribute-vertical' },
    { type: 'divider', label: 'Лінія', icon: 'bi-dash-lg' },
  ];

  // Дефолтні дані для нового блоку (двомовність — текст копіюється у DE)
  function blankBlock(type) {
    const d = {
      heading: { level: 2, align: 'center', uk: { text: 'Новий заголовок' }, de: { text: 'Neue Überschrift' } },
      text: { align: 'left', uk: { text: 'Текст абзацу. Натисніть, щоб редагувати.' }, de: { text: 'Absatztext. Zum Bearbeiten klicken.' } },
      image: { src: '', alt: '', width: 'normal', align: 'center' },
      button: { align: 'center', variant: 'primary', href: '#enroll', uk: { label: 'Кнопка' }, de: { label: 'Schaltfläche' } },
      spacer: { size: 'm' },
      divider: {},
    }[type] || {};
    return { kind: 'block', type, id: 'blk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), data: JSON.parse(JSON.stringify(d)) };
  }

  // HTML вмісту блоку (без зовнішньої обгортки-section)
  function innerHtml(block, lang) {
    const d = block.data || {};
    const L = d[lang] || d.uk || {};
    switch (block.type) {
      case 'heading': {
        const tag = +d.level === 3 ? 'h3' : 'h2';
        return `<div class="container"><${tag} class="itk-h" style="text-align:${d.align || 'center'}">${rich(L.text || '')}</${tag}></div>`;
      }
      case 'text':
        return `<div class="container"><div class="itk-text" style="text-align:${d.align || 'left'}">${rich(L.text || '')}</div></div>`;
      case 'image': {
        if (!d.src) return `<div class="container"><div class="itk-img-empty"><i class="bi bi-image"></i> Фото не вибрано</div></div>`;
        return `<div class="container"><figure class="itk-img w-${d.width || 'normal'} a-${d.align || 'center'}"><img src="${attr(imgSrc(d.src))}" alt="${attr(d.alt)}" loading="lazy"></figure></div>`;
      }
      case 'button': {
        const cls = d.variant === 'ghost' ? 'btn btn--ghost btn--lg' : 'btn btn--lg';
        return `<div class="container"><div class="itk-btn-wrap" style="text-align:${d.align || 'center'}"><a class="${cls}" href="${attr(d.href || '#enroll')}">${esc(L.label || '')}</a></div></div>`;
      }
      case 'spacer':
        return `<div class="itk-spacer s-${d.size || 'm'}"></div>`;
      case 'divider':
        return `<div class="container"><hr class="itk-divider"></div>`;
      default:
        return '';
    }
  }

  // Готовий DOM-елемент блоку
  function renderAtomic(block, lang) {
    const sec = document.createElement('section');
    sec.className = 'section itk-atomic itk-atomic--' + block.type;
    sec.dataset.itkId = block.id;
    sec.innerHTML = innerHtml(block, lang);
    return sec;
  }

  window.ITKBlocks = { renderAtomic, innerHtml, blankBlock, PALETTE, esc, attr, rich, imgSrc };
})();
