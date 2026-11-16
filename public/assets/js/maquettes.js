/* Réalisations : chaque maquette s'ouvre en grand, en version ordinateur (défilable) ou téléphone.
   Le lien #nom-de-la-maquette ouvre directement la bonne maquette. */
(function () {
  const dlg = document.getElementById('viewer');
  const raw = document.getElementById('maquettes-data');
  if (!dlg || !raw || typeof dlg.showModal !== 'function') return;
  const data = JSON.parse(raw.textContent);
  const q = (s) => dlg.querySelector(s);
  const img = q('[data-v-img]');
  const screen = q('[data-v-screen]');
  const tabs = Array.from(dlg.querySelectorAll('[data-v-mode]'));
  let current = null;
  let lastFocus = null;

  function setMode(mode) {
    const m = data[current];
    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.vMode === mode)));
    dlg.dataset.mode = mode;
    if (mode === 'mobile') {
      img.src = '/assets/img/work/' + current + '-m.webp';
      img.width = 390; img.height = 824;
    } else {
      img.src = '/assets/img/work/' + current + '-d.webp';
      img.width = m.w; img.height = m.h;
    }
    img.alt = 'Maquette du site ' + m.name + ', version ' + (mode === 'mobile' ? 'téléphone' : 'ordinateur') + '.';
    screen.scrollTop = 0;
  }

  function open(slug, fromHash) {
    const m = data[slug];
    if (!m) return;
    current = slug;
    lastFocus = document.activeElement;
    q('[data-v-name]').textContent = m.name;
    q('[data-v-kind]').textContent = m.kind;
    q('[data-v-desc]').textContent = m.desc;
    const ul = q('[data-v-points]');
    ul.textContent = '';
    m.points.forEach((p) => { const li = document.createElement('li'); li.textContent = p; ul.appendChild(li); });
    setMode(window.matchMedia('(max-width: 700px)').matches ? 'mobile' : 'desktop');
    if (!dlg.open) dlg.showModal();
    document.documentElement.classList.add('viewer-open');
    if (!fromHash) history.replaceState(null, '', '#' + slug);
  }

  function close() { if (dlg.open) dlg.close(); }

  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('viewer-open');
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  q('[data-v-close]').addEventListener('click', close);
  tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.vMode)));

  document.querySelectorAll('[data-open]').forEach((el) => {
    if (el.tagName !== 'BUTTON') {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'Voir la maquette ' + (data[el.dataset.open] || {}).name + ' en entier');
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.dataset.open); } });
    }
    el.addEventListener('click', () => open(el.dataset.open));
  });

  const fromUrl = decodeURIComponent(location.hash.slice(1));
  if (data[fromUrl]) open(fromUrl, true);
})();
