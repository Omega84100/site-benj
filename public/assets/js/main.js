/* Benjamin Paule — scripts du site
   1. Bandeau de consentement + chargement de la mesure d'audience (Umami)
   2. Menu latéral (bouton « Menu »)
   3. En-tête qui devient opaque au défilement
   4. Apparitions au défilement
   5. Validation et envoi du formulaire de contact (anti-spam Turnstile)
   Sans JavaScript, tout le contenu reste visible et le menu est un simple lien vers la navigation. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js'); // active les styles qui demandent JavaScript (panneau de menu, en-tête fixe)
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- 1. Consentement et mesure d'audience ---------- */
  var CONSENT_KEY = 'bp-consent';
  var CONSENT_MAX_AGE = 1000 * 60 * 60 * 24 * 182; // 6 mois, durée recommandée par la CNIL
  var UMAMI_SRC = 'https://cloud.umami.is/script.js';
  var UMAMI_WEBSITE_ID = 'cbb18ef8-00e1-4b82-8dda-2b79a4e69491'; // ← à remplacer par l'identifiant donné par Umami (voir le guide)

  function readConsent() {
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || Date.now() - data.date > CONSENT_MAX_AGE) return null;
      return data.value;
    } catch (e) { return null; }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ value: value, date: Date.now() })); } catch (e) { /* stockage indisponible */ }
  }

  function loadAnalytics() {
    var id = UMAMI_WEBSITE_ID;
    if (!id || id.indexOf('REMPLACER') === 0 || document.getElementById('umami-script')) return;
    var s = document.createElement('script');
    s.id = 'umami-script';
    s.defer = true;
    s.src = UMAMI_SRC;
    s.setAttribute('data-website-id', id);
    s.setAttribute('data-domains', 'benjamin-paule.me');
    s.setAttribute('data-do-not-track', 'true');
    document.head.appendChild(s);
  }

  function track(eventName, data) {
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(eventName, data);
  }

  var banner = document.getElementById('consent');

  function showBanner() { if (banner) banner.hidden = false; }
  function hideBanner() { if (banner) banner.hidden = true; }

  var consent = readConsent();
  if (consent === 'granted') loadAnalytics();
  else if (consent === null) showBanner();

  document.addEventListener('click', function (event) {
    var choice = event.target.closest('[data-consent]');
    if (choice) {
      var value = choice.getAttribute('data-consent');
      saveConsent(value);
      hideBanner();
      if (value === 'granted') loadAnalytics();
      else if (document.getElementById('umami-script')) window.location.reload(); // coupe la mesure immédiatement
      return;
    }
    if (event.target.closest('[data-open-consent]')) showBanner();
  });

  /* ---------- 2. Menu latéral ---------- */
  var menuLink = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('menu');
  if (menuLink && menu) {
    // Le lien « Menu » (qui mène à la navigation en bas de page) est remplacé par un vrai bouton.
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = menuLink.className;
    while (menuLink.firstChild) toggle.appendChild(menuLink.firstChild);
    toggle.setAttribute('aria-controls', 'menu');
    toggle.setAttribute('aria-expanded', 'false');
    menuLink.parentNode.replaceChild(toggle, menuLink);

    var closeBtn = menu.querySelector('[data-menu-close]');
    if (closeBtn) closeBtn.hidden = false;

    // Voile sombre derrière le panneau : un clic dessus ferme le menu.
    var overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.hidden = true;
    menu.parentNode.insertBefore(overlay, menu);

    // Panneau fermé : retiré de l'affichage et du parcours au clavier.
    menu.hidden = true;
    menu.setAttribute('inert', '');

    var menuOpen = false;
    var hideTimer = null;

    var focusables = function () {
      return Array.prototype.filter.call(menu.querySelectorAll('a[href], button:not([hidden])'), function (el) { return !el.disabled; });
    };

    var openMenu = function () {
      if (menuOpen) return;
      menuOpen = true;
      clearTimeout(hideTimer);
      menu.hidden = false;
      overlay.hidden = false;
      menu.removeAttribute('inert');
      toggle.setAttribute('aria-expanded', 'true');
      // On attend une image pour que la transition d'ouverture se joue.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          menu.classList.add('is-open');
          overlay.classList.add('is-open');
        });
      });
      var first = focusables()[0];
      if (first) first.focus();
    };

    var closeMenu = function (returnFocus) {
      if (!menuOpen) return;
      menuOpen = false;
      menu.classList.remove('is-open');
      overlay.classList.remove('is-open');
      menu.setAttribute('inert', '');
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!menuOpen) { menu.hidden = true; overlay.hidden = true; }
      }, reduceMotion ? 0 : 420); // laisse la transition de fermeture se terminer
    };

    toggle.addEventListener('click', function () { if (menuOpen) closeMenu(true); else openMenu(); });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });
    overlay.addEventListener('click', function () { closeMenu(true); });

    // Un clic sur un lien ferme le panneau ; le navigateur emmène ensuite à la section choisie.
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a[href]')) closeMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (!menuOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return; }
      // Tabulation : le focus reste dans le panneau tant qu'il est ouvert.
      if (event.key === 'Tab') {
        var items = focusables();
        if (!items.length) return;
        var firstItem = items[0];
        var lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
        else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
        else if (!menu.contains(document.activeElement)) { event.preventDefault(); firstItem.focus(); }
      }
    });
  }

  /* ---------- 3. En-tête opaque au défilement ---------- */
  var overlayHeader = document.querySelector('.site-header--overlay');
  if (overlayHeader) {
    var ticking = false;
    var updateHeader = function () {
      overlayHeader.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
    }, { passive: true });
    updateHeader();
  }

  /* ---------- 4. Apparitions au défilement ---------- */
  // Seuls les éléments sous la ligne de flottaison sont masqués puis révélés ;
  // ceux déjà à l'écran (ou au-dessus) sont affichés tout de suite.
  var revealItems = document.querySelectorAll('[data-reveal]');
  if (revealItems.length && 'IntersectionObserver' in window && !reduceMotion) {
    var viewportH = window.innerHeight || document.documentElement.clientHeight;
    // Adresse avec ancre (ex. /#contact) : le navigateur va descendre jusqu'à la section visée,
    // on calcule donc ce qui sera à l'écran à partir de cette section.
    var offset = 0;
    if (window.location.hash.length > 1) {
      var anchorTarget = null;
      try { anchorTarget = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); } catch (e) { /* ancre mal formée */ }
      if (anchorTarget) offset = Math.max(0, anchorTarget.getBoundingClientRect().top);
    }
    var pendingItems = [];
    Array.prototype.forEach.call(revealItems, function (el) {
      if (el.getBoundingClientRect().top - offset < viewportH) el.classList.add('is-visible');
      else pendingItems.push(el);
    });
    if (pendingItems.length) {
      var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealer.unobserve(entry.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      pendingItems.forEach(function (el) { revealer.observe(el); });
      root.classList.add('reveal-on');
    }
  }

  /* ---------- 5. Formulaire de contact ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return;

  var statusBox = document.getElementById('form-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var turnstileBox = document.getElementById('turnstile');
  var sitekey = form.getAttribute('data-turnstile-sitekey');
  var widgetId = null;
  var turnstileRequested = false;

  // Le script anti-spam n'est chargé que lorsque le visiteur approche du formulaire (page plus rapide).
  function loadTurnstile() {
    if (turnstileRequested || !sitekey) return;
    turnstileRequested = true;
    window.onTurnstileLoad = function () {
      widgetId = window.turnstile.render(turnstileBox, { sitekey: sitekey, language: 'fr', theme: 'dark' });
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { loadTurnstile(); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(form);
  } else {
    loadTurnstile();
  }
  form.addEventListener('focusin', loadTurnstile, { once: true });

  var EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
  var PHONE_RE = /^[0-9+().\s-]{6,20}$/;

  var messages = {
    name: { valueMissing: 'Indiquez votre nom.', tooShort: 'Votre nom doit contenir au moins 2 caractères.' },
    email: { valueMissing: 'Indiquez votre adresse e-mail.', typeMismatch: 'Cette adresse e-mail ne semble pas valide (exemple : nom@domaine.fr).' },
    phone: { patternMismatch: 'Ce numéro ne semble pas valide (chiffres, espaces, +, . ou - uniquement).' },
    current_site: { typeMismatch: 'Indiquez une adresse complète, qui commence par https://' },
    message: { valueMissing: 'Décrivez votre besoin en quelques mots.', tooShort: 'Merci d\'écrire au moins 20 caractères pour que je comprenne votre besoin.' },
    consent: { valueMissing: 'Merci de cocher cette case pour que je puisse vous répondre.' }
  };

  function errorFor(field) {
    var v = field.validity;
    var m = messages[field.name] || {};
    if (v.valid) return '';
    for (var key in m) { if (v[key]) return m[key]; }
    if (v.tooLong) return 'Ce champ est trop long.';
    return 'Ce champ n\'est pas valide.';
  }

  function checkField(field) {
    if (!field.name || field.name === 'fax' || field.type === 'hidden') return true;
    // Le « texte trop court » n'est pas détecté par le navigateur si le champ a été rempli par script : on vérifie à la main.
    var value = field.value.trim();
    var min = parseInt(field.getAttribute('minlength'), 10);
    var custom = '';
    if (min && value.length > 0 && value.length < min) {
      custom = messages[field.name] && messages[field.name].tooShort || 'Ce champ est trop court.';
    } else if (field.name === 'email' && value && !EMAIL_RE.test(value)) {
      custom = messages.email.typeMismatch; // mêmes règles que le serveur (domaine avec extension)
    } else if (field.name === 'phone' && value && !PHONE_RE.test(value)) {
      custom = messages.phone.patternMismatch;
    }
    field.setCustomValidity(custom);
    var msg = field.validity.customError ? field.validationMessage : errorFor(field);
    var box = document.getElementById(field.getAttribute('aria-describedby'));
    if (box) box.textContent = msg;
    if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    return !msg;
  }

  Array.prototype.forEach.call(form.elements, function (field) {
    field.addEventListener('blur', function () { if (field.value || field.type === 'checkbox') checkField(field); });
    field.addEventListener('input', function () { if (field.getAttribute('aria-invalid')) checkField(field); });
  });

  function setStatus(text, ok) {
    statusBox.textContent = text;
    statusBox.className = 'form-status ' + (ok ? 'is-ok' : 'is-error');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    statusBox.textContent = '';
    statusBox.className = 'form-status';

    var firstInvalid = null;
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!checkField(field) && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    var token = window.turnstile && widgetId !== null ? window.turnstile.getResponse(widgetId) : '';
    if (!token) {
      loadTurnstile();
      setStatus('Merci de patienter une seconde : la vérification anti-spam se termine, puis renvoyez le formulaire.', false);
      return;
    }

    var payload = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      current_site: form.elements.current_site.value.trim(),
      message: form.elements.message.value.trim(),
      consent: form.elements.consent.checked,
      fax: form.elements.fax.value,
      turnstileToken: token
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          setStatus('Merci ! Votre demande est bien partie. Je vous réponds très vite par e-mail.', true);
          track('formulaire-succes');
        } else {
          setStatus(result.data.error || 'L\'envoi a échoué. Réessayez dans un instant.', false);
        }
      })
      .catch(function () {
        setStatus('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.', false);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Envoyer ma demande';
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
      });
  });
})();
