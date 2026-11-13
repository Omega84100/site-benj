/* Benjamin Paule — effets des pages intérieures (offres, réalisations, à propos, contact, pages légales)
   Léger et sans bibliothèque : titres qui se « décodent », anneau qui suit la souris, filtres des réalisations.
   Sans JavaScript ou avec « réduire les animations », tout reste lisible et immobile. */

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';

/* Un nœud texte se « décode » caractère par caractère */
function scrambleText(node, finalText, dur) {
  return new Promise((resolve) => {
    const start = performance.now();
    const total = dur * 1000;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / total);
      const shown = Math.floor(p * finalText.length);
      let out = finalText.slice(0, shown);
      for (let i = shown; i < finalText.length; i++) {
        const ch = finalText[i];
        out += /\s/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.nodeValue = out;
      if (p < 1) requestAnimationFrame(tick); else { node.nodeValue = finalText; resolve(); }
    };
    requestAnimationFrame(tick);
  });
}

function decode(el, dur) {
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  nodes.forEach((n) => scrambleText(n, n.nodeValue, dur));
}

if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { decode(e.target, 1.1); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-decode]').forEach((el) => io.observe(el));
}

/* Anneau cyan qui suit la souris */
const cur = document.querySelector('[data-cursor]');
if (cur && finePointer && !reduce) {
  let x = -100, y = -100, cx = x, cy = y;
  window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cur.style.opacity = 1; }, { passive: true });
  document.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    cur.classList.toggle('is-view', !!t.closest('[data-cursor-view]'));
    cur.classList.toggle('is-link', !t.closest('[data-cursor-view]') && !!t.closest('a, button, label, summary'));
  });
  const loop = () => {
    cx += (x - cx) * 0.2; cy += (y - cy) * 0.2;
    cur.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* Réalisations : filtres par métier */
const chips = $$('[data-filter]');
if (chips.length) {
  chips[0].parentElement.hidden = false;
  const items = $$('[data-cat]');
  const status = document.querySelector('[data-filter-status]');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    let n = 0;
    items.forEach((it) => { const on = f === 'tous' || it.dataset.cat === f; it.hidden = !on; if (on) n++; });
    if (status) status.textContent = n + (n > 1 ? ' maquettes affichées' : ' maquette affichée');
  }));
}
