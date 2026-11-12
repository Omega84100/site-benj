/* Benjamin Paule — mise en scène de la page d'accueil
   1. Défilement doux (Lenis) relié à GSAP ScrollTrigger
   2. Hero : séquence lente d'images (transition WebGL), parallaxe et rétrécissement au scroll
   3. Produits : Mac et iPhone épinglés, les écrans défilent et changent de projet
   4. Galerie : piste horizontale épinglée, révélations clip-path, distorsion WebGL au survol
   5. Services : traits qui se tracent, aperçu qui suit la souris
   6. Interlude : image ouverte depuis une fente centrale
   7. À propos : le texte se « remplit » mot à mot au scroll
   Sans JavaScript ou avec « réduire les animations », tout reste lisible et immobile. */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

const heroImgs = $$('[data-hero-stack] img');
const heroName = $('[data-hero-name]');
const heroKind = $('[data-hero-kind]');

function setCaption(i) {
  const img = heroImgs[i];
  if (!img || !heroName) return;
  heroName.textContent = img.dataset.name;
  heroKind.textContent = img.dataset.kind;
}

if (!gsap || !ScrollTrigger || reduce) {
  // Version immobile : on garde seulement la séquence du hero en fondu très lent (sauf mouvement réduit).
  if (!reduce) cssSequence();
} else {
  root.classList.add('js-motion');
  gsap.registerPlugin(ScrollTrigger);
  init();
}

/* Séquence du hero en CSS (secours si WebGL indisponible) */
function cssSequence() {
  let i = 0;
  return setInterval(() => {
    heroImgs[i].classList.remove('is-active');
    i = (i + 1) % heroImgs.length;
    heroImgs[i].classList.add('is-active');
    setCaption(i);
  }, 6000);
}

function init() {
  /* ---------- 1. Défilement doux ---------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2 || a.hasAttribute('data-menu-toggle')) return;
      const target = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (!target || target.id === 'menu') return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      history.replaceState(null, '', '#' + target.id);
    });
  }

  /* ---------- 2. Intro d'ouverture puis hero ---------- */
  const titleSpans = $$('.hero-title .line > span');
  const heroBits = '.hero-kicker, .hero-lead, .hero-ctas > *, .hero-caption';
  gsap.set(titleSpans, { yPercent: 110 });
  gsap.set(heroBits, { opacity: 0, y: 18 });
  if (lenis) lenis.stop();
  runIntro().then(() => {
    if (lenis) lenis.start();
    gsap.to(titleSpans, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.1 });
    gsap.to(heroBits, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.07, delay: 0.35 });
    cycleWords();
  });

  const heroMedia = $('[data-hero-media]');
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to(heroMedia, { clipPath: 'inset(0% 4% 12% 4% round 28px)', scale: 0.96, ease: 'none' }, 0)
    .to('[data-hero-copy]', { yPercent: -60, opacity: 0, ease: 'none' }, 0);

  heroSequence();

  /* ---------- 3. Produits : Mac + iPhone ---------- */
  const mac = $('[data-mac]');
  const iphone = $('[data-iphone]');
  const macLayers = $$('.mac-screen [data-layer]');
  const phoneLayers = $$('.iphone-screen [data-layer]');
  const caps = $$('[data-cap]');
  const n = macLayers.length;

  gsap.set(macLayers.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(phoneLayers.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
  gsap.set(caps[0], { opacity: 1 });

  // Apparition des appareils en entrant dans la section
  gsap.timeline({ scrollTrigger: { trigger: '[data-stage]', start: 'top 85%', end: 'top 10%', scrub: 1 } })
    .from(mac, { yPercent: 18, scale: 0.86, opacity: 0.2, ease: 'none' }, 0)
    .from(iphone, { yPercent: 60, opacity: 0, ease: 'none' }, 0.15);

  // Section épinglée : chaque projet fait défiler ses écrans, puis le suivant se dévoile
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '[data-stage]', start: 'top top', end: () => '+=' + window.innerHeight * n * 1.1, pin: true, scrub: 1, anticipatePin: 1 },
  });
  for (let i = 0; i < n; i++) {
    const mImg = $('img', macLayers[i]);
    const pImg = $('img', phoneLayers[i]);
    const scrollMac = () => -Math.max(0, mImg.offsetHeight - macLayers[i].offsetHeight);
    const scrollPhone = () => -Math.max(0, pImg.offsetHeight - phoneLayers[i].offsetHeight);
    tl.to(mImg, { y: scrollMac, duration: 1 }, i * 1.4)
      .to(pImg, { y: scrollPhone, duration: 1 }, i * 1.4 + 0.05)
      .to(iphone, { y: -14, duration: 0.5, yoyo: true, repeat: 1 }, i * 1.4);
    if (i < n - 1) {
      const at = i * 1.4 + 1;
      tl.to(macLayers[i + 1], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.inOut' }, at)
        .to(phoneLayers[i + 1], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.inOut' }, at + 0.06)
        .to(caps[i], { opacity: 0, y: -16, duration: 0.2 }, at)
        .fromTo(caps[i + 1], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.2 }, at + 0.2);
    }
  }

  /* ---------- 4. Galerie ---------- */
  const track = $('[data-gallery-track]');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 960px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '[data-gallery-pin]', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    // Effet original : les vignettes s'inclinent légèrement selon la vitesse du défilement
    const items = $$('.g-item', track);
    const skew = gsap.quickTo(items, 'skewX', { duration: 0.6, ease: 'power3' });
    const st = tween.scrollTrigger;
    const tick = () => skew(gsap.utils.clamp(-6, 6, st.getVelocity() / -400));
    gsap.ticker.add(tick);
    $$('.g-media img', track).forEach((img) => {
      gsap.fromTo(img, { xPercent: -6, scale: 1.14 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.g-item'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => gsap.ticker.remove(tick);
  });
  mm.add('(max-width: 959px)', () => {
    $$('[data-clip]').forEach((el) => {
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 45%', scrub: 1 } })
        .fromTo(el, { clipPath: 'inset(18% 10% 18% 10% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none' }, 0)
        .fromTo($('img', el), { scale: 1.25 }, { scale: 1, ease: 'none' }, 0);
    });
  });

  /* ---------- 5. Services ---------- */
  $$('[data-svc]').forEach((row) => {
    gsap.fromTo(row, { '--draw': 0 }, { '--draw': 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 90%' } });
    gsap.fromTo(row.querySelector('.svc-title'), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 88%' } });
    gsap.fromTo(row.querySelector('.svc-text'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.12, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 88%' } });
  });
  servicePreview();

  /* ---------- 6. Interlude ---------- */
  const inter = $('[data-interlude]');
  gsap.timeline({ scrollTrigger: { trigger: inter, start: 'top 95%', end: 'center center', scrub: 1 } })
    .fromTo(inter, { clipPath: 'inset(0% 42% 0% 42% round 999px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0);
  gsap.fromTo($('img', inter), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: inter, start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- 7. À propos : remplissage mot à mot ---------- */
  const about = $('[data-words]');
  const words = about.textContent.trim().split(/\s+/);
  about.setAttribute('aria-label', about.textContent.trim());
  about.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
  gsap.fromTo($$('.w', about), { opacity: 0.14 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: about, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  gsap.from('.facts > div', { opacity: 0, y: 24, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.facts', start: 'top 85%' } });

  /* ---------- Témoignages et CTA ---------- */
  if ($('.review-list')) gsap.from('.review', { opacity: 0, y: 40, duration: 1.3, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.review-list', start: 'top 82%' } });
  gsap.fromTo('.cta-title', { yPercent: 30, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 30%', scrub: true } });

  if (finePointer) { galleryHover(); cursorAndMagnets(); }

  // Titres de section : ils se « décodent » en arrivant à l'écran
  $$('[data-decode]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => scrambleNodes(el, 1.1) });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

/* Hero : WebGL si possible, sinon fondu CSS */
async function heroSequence() {
  const stack = $('[data-hero-stack]');
  let THREE;
  try {
    if (!webglOK()) throw new Error('no webgl');
    THREE = await import('/assets/vendor/three.module.min.js');
  } catch (e) { cssSequence(); return; }

  const media = $('[data-hero-media]');
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.className = 'hero-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const loader = new THREE.TextureLoader();
  const load = (src) => new Promise((res, rej) => loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej));

  let textures;
  try { textures = await Promise.all(heroImgs.map((img) => load(img.currentSrc || img.src))); }
  catch (e) { cssSequence(); return; }

  const uniforms = {
    uA: { value: textures[0] }, uB: { value: textures[1] },
    uP: { value: 0 }, uTime: { value: 0 }, uZoomA: { value: 0 }, uZoomB: { value: 0 },
    uMouse: { value: new THREE.Vector2(-1, -1) }, uVel: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uImg: { value: new THREE.Vector2(textures[0].image.width, textures[0].image.height) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uA, uB; uniform float uP, uTime, uZoomA, uZoomB, uVel; uniform vec2 uRes, uImg, uMouse;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
      vec2 cover(vec2 uv, float zoom){
        float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
        // écran plus large que l'image : on recadre le bas ; écran plus étroit (mobile) : pleine largeur, ancrée en haut
        vec2 c = rs > ri ? vec2(uv.x, 1.0 - (1.0 - uv.y) * (ri / rs)) : vec2(uv.x, 1.0 - (1.0 - uv.y) * (ri / rs));
        return (c - vec2(0.5, 0.75)) * (1.0 - zoom) + vec2(0.5, 0.75);
      }
      vec3 rgb(sampler2D t, vec2 c, float s){
        return vec3(texture2D(t, c + vec2(s, 0.0)).r, texture2D(t, c).g, texture2D(t, c - vec2(s, 0.0)).b);
      }
      void main(){
        vec2 uv = vUv;
        // Lentille « liquide » qui suit la souris
        vec2 asp = vec2(uRes.x / uRes.y, 1.0);
        vec2 d = (uv - uMouse) * asp;
        float r = length(d);
        float lens = smoothstep(0.32, 0.0, r);
        uv -= d / asp * lens * 0.07;
        uv.x += sin(uv.y * 22.0 + uTime * 2.0) * 0.0025 * lens;
        // Glitch par bandes, seulement pendant la transition
        float g = sin(uP * 3.14159);
        float row = floor(uv.y * 28.0);
        uv.x += step(0.72, hash(vec2(row, floor(uTime * 14.0)))) * (hash(vec2(row, 3.0)) - 0.5) * 0.09 * g;
        float n = noise(vUv * 3.0 + uTime * 0.05) * 0.6 + noise(vUv * 9.0) * 0.4;
        float edge = smoothstep(uP * 1.3 - 0.3, uP * 1.3, n * 0.7 + (1.0 - vUv.y) * 0.3);
        float m = 1.0 - edge;
        vec2 disp = vec2(0.0, (1.0 - m) * m * 0.06);
        float split = 0.0012 + 0.009 * g + uVel * 0.012 + lens * 0.004;
        vec3 col = mix(rgb(uA, cover(uv, uZoomA) + disp, split), rgb(uB, cover(uv, uZoomB) - disp, split), m);
        // Liseré cyan très fin au bord de la lentille
        col += vec3(0.39, 0.82, 1.0) * smoothstep(0.012, 0.0, abs(r - 0.3)) * 0.18 * step(0.0, uMouse.x);
        col += (hash(vUv * uRes + fract(uTime)) - 0.5) * 0.045; // grain
        col *= 1.0 - 0.4 * length((vUv - 0.5) * vec2(1.0, 0.8)); // vignette
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  media.insertBefore(renderer.domElement, stack.nextSibling);

  const resize = () => {
    const w = media.clientWidth, h = media.clientHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  resize();
  window.addEventListener('resize', resize);
  root.classList.add('gl-on');

  let cur = 0, visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(media);
  const zoom = { a: 0 };
  // Souris (ordinateur) ou dérive lente automatique (mobile)
  const target = { x: -1, y: -1 }, last = { x: 0, y: 0 };
  let vel = 0;
  if (finePointer) {
    media.parentElement.addEventListener('pointermove', (e) => {
      const r = media.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      vel = Math.min(1, vel + Math.hypot(x - last.x, y - last.y) * 6);
      last.x = x; last.y = y; target.x = x; target.y = y;
      if (uniforms.uMouse.value.x < 0) uniforms.uMouse.value.set(x, y);
    });
    media.parentElement.addEventListener('pointerleave', () => { target.x = -1; target.y = -1; uniforms.uMouse.value.set(-1, -1); });
  }
  gsap.ticker.add((t) => {
    if (!visible) return;
    if (!finePointer) { target.x = 0.5 + 0.3 * Math.sin(t * 0.35); target.y = 0.62 + 0.14 * Math.cos(t * 0.27); if (uniforms.uMouse.value.x < 0) uniforms.uMouse.value.set(target.x, target.y); }
    if (target.x >= 0) uniforms.uMouse.value.lerp({ x: target.x, y: target.y }, 0.08);
    vel *= 0.92; uniforms.uVel.value = vel;
    uniforms.uTime.value = t;
    uniforms.uZoomA.value = zoom.a;
    renderer.render(scene, camera);
  });
  const next = () => {
    const nxt = (cur + 1) % textures.length;
    uniforms.uA.value = textures[cur];
    uniforms.uB.value = textures[nxt];
    uniforms.uZoomB.value = 0;
    gsap.fromTo(uniforms.uP, { value: 0 }, {
      value: 1, duration: 2.2, ease: 'power2.inOut',
      onStart: () => setCaption(nxt),
      onComplete: () => { cur = nxt; uniforms.uA.value = textures[cur]; uniforms.uP.value = 0; zoom.a = 0; kenBurns(); },
    });
  };
  // Zoom très lent sur l'image affichée (effet « Ken Burns »)
  const kenBurns = () => gsap.fromTo(zoom, { a: 0 }, { a: 0.05, duration: 6.5, ease: 'none', onComplete: next });
  kenBurns();
}

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

/* Services : petite vignette qui suit la souris */
function servicePreview() {
  const box = $('[data-svc-preview]');
  if (!box || !finePointer) return;
  const img = $('img', box);
  const xTo = gsap.quickTo(box, 'x', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(box, 'y', { duration: 0.6, ease: 'power3' });
  gsap.set(box, { xPercent: -50, yPercent: -50 });
  window.addEventListener('pointermove', (e) => { xTo(e.clientX + 120); yTo(e.clientY); }, { passive: true });
  $$('[data-svc]').forEach((row) => {
    row.addEventListener('pointerenter', () => {
      img.src = row.dataset.preview;
      gsap.to(box, { opacity: 1, scale: 1, rotate: -3, duration: 0.6, ease: 'expo.out' });
    });
    row.addEventListener('pointerleave', () => gsap.to(box, { opacity: 0, scale: 0.6, rotate: 0, duration: 0.4, ease: 'power2.in' }));
  });
}

/* Galerie : un seul rendu WebGL, déplacé dans la vignette survolée (légère distorsion + aberration) */
async function galleryHover() {
  if (!webglOK()) return;
  let THREE;
  try { THREE = await import('/assets/vendor/three.module.min.js'); } catch (e) { return; }
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = { uTex: { value: null }, uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uHover: { value: 0 }, uTime: { value: 0 }, uScale: { value: 1.0 }, uOff: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      precision highp float;
      varying vec2 vUv; uniform sampler2D uTex; uniform vec2 uMouse; uniform float uHover, uTime, uScale, uOff;
      void main(){
        vec2 c = vec2(0.5 + uOff, 0.7);
        vec2 uv = (vUv - c) / uScale + vec2(0.5, 0.7);
        vec2 d = uv - uMouse;
        float r = length(d);
        float bulge = smoothstep(0.45, 0.0, r) * uHover;
        uv -= d * bulge * 0.12;
        uv.y += sin(uv.x * 10.0 + uTime * 1.6) * 0.004 * uHover;
        float s = 0.0035 * uHover * (0.4 + bulge);
        float cr = texture2D(uTex, uv + vec2(s, 0.0)).r;
        vec4 cg = texture2D(uTex, uv);
        float cb = texture2D(uTex, uv - vec2(s, 0.0)).b;
        gl_FragColor = vec4(cr, cg.g, cb, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  let active = null, running = false;

  const render = (t) => { uniforms.uTime.value = t; renderer.render(scene, camera); };
  const start = () => { if (!running) { running = true; gsap.ticker.add(render); } };
  const stop = () => { running = false; gsap.ticker.remove(render); };

  $$('.g-media').forEach((media) => {
    const img = $('img', media);
    media.addEventListener('pointerenter', () => {
      const src = img.currentSrc || img.src;
      const go = (tex) => {
        if (active !== media) return;
        uniforms.uTex.value = tex;
        const r = media.getBoundingClientRect();
        renderer.setSize(r.width, r.height, false);
        media.appendChild(renderer.domElement);
        // reprend le léger zoom de parallaxe appliqué à l'image
        uniforms.uScale.value = Number(gsap.getProperty(img, 'scale')) || 1;
        uniforms.uOff.value = (Number(gsap.getProperty(img, 'xPercent')) || 0) / 100;
        start();
        gsap.to(uniforms.uHover, { value: 1, duration: 0.9, ease: 'expo.out' });
      };
      active = media;
      if (cache.has(src)) go(cache.get(src));
      else loader.load(src, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; cache.set(src, tex); go(tex); });
    });
    media.addEventListener('pointermove', (e) => {
      const r = media.getBoundingClientRect();
      gsap.to(uniforms.uMouse.value, { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height, duration: 0.5, ease: 'power3' });
    });
    media.addEventListener('pointerleave', () => {
      if (active !== media) return;
      active = null;
      gsap.to(uniforms.uHover, { value: 0, duration: 0.6, ease: 'power2.out', onComplete: () => {
        if (active) return;
        stop();
        renderer.domElement.remove();
      } });
    });
  });
}

/* ---------- Décodage de texte (effet « cyber ») ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/_';
function scrambleText(node, finalText, dur) {
  return new Promise((res) => {
    const t0 = performance.now();
    const len = finalText.length;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / (dur * 1000));
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = finalText[i];
        if (ch === ' ' || p >= 1 || p > (i / len) * 0.7 + 0.3) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.nodeValue = out;
      if (p < 1) requestAnimationFrame(step); else res();
    };
    requestAnimationFrame(step);
  });
}
function scrambleNodes(el, dur) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
  return Promise.all(nodes.map((n) => scrambleText(n, n.nodeValue, dur)));
}

/* Mot du titre qui change toutes les quelques secondes */
function cycleWords() {
  const el = $('[data-words-cycle]');
  if (!el) return;
  const words = el.dataset.wordsCycle.split('|');
  let i = words.indexOf(el.textContent.trim());
  if (i < 0) i = 0;
  if (!el.firstChild) el.textContent = words[i];
  setInterval(() => {
    if (document.hidden || window.scrollY > window.innerHeight) return;
    i = (i + 1) % words.length;
    el.firstChild.nodeValue = words[i];
    scrambleText(el.firstChild, words[i], 0.9);
  }, 3800);
}

/* Intro : compteur, nom qui se décode, puis l'écran s'ouvre en bandes */
function runIntro() {
  const intro = $('[data-intro]');
  if (!intro) return Promise.resolve();
  const bars = $$('.intro-bars span', intro);
  const count = $('[data-intro-count]', intro);
  const nameEl = $('[data-intro-name]', intro);
  const line = $('[data-intro-line]', intro);
  let seen = false;
  try { seen = sessionStorage.getItem('bp-intro') === '1'; sessionStorage.setItem('bp-intro', '1'); } catch (e) { /* stockage indisponible */ }
  return new Promise((resolve) => {
    const tl = gsap.timeline({ onComplete: () => { intro.remove(); resolve(); } });
    if (!seen) {
      const c = { v: 0 };
      tl.to(c, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(c.v)).padStart(3, '0'); } }, 0)
        .to(line, { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
        .call(() => scrambleNodes(nameEl, 1.2), null, 0.1)
        .from('.intro-tag', { opacity: 0, y: 8, duration: 0.8, ease: 'expo.out' }, 0.5)
        .to('.intro-center, .intro-count, .intro-skip', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 1.9)
        .to(line, { opacity: 0, duration: 0.3 }, 1.9);
    } else {
      tl.set('.intro-center, .intro-count, .intro-skip, .intro-line', { opacity: 0 });
    }
    tl.to(bars, { xPercent: (i) => (i % 2 ? 101 : -101), duration: 1.1, ease: 'expo.inOut', stagger: 0.05 }, seen ? 0.05 : 2.15);
    intro.addEventListener('click', () => tl.progress(1), { once: true });
  });
}

/* Curseur cyan + boutons « aimantés » */
function cursorAndMagnets() {
  const cur = $('[data-cursor]');
  if (cur) {
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.45, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { cur.style.opacity = 1; xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      cur.classList.toggle('is-view', !!t.closest('[data-cursor-view]'));
      cur.classList.toggle('is-link', !t.closest('[data-cursor-view]') && !!t.closest('a, button, label, [data-magnetic]'));
    });
  }
  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}
