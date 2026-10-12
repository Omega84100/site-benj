/* Benjamin Paule — scripts du site
   1. Bandeau de consentement + chargement de la mesure d'audience (Umami)
   2. Validation et envoi du formulaire de contact (anti-spam Turnstile)   */
(function () {
  'use strict';

  /* ---------- 1. Consentement et mesure d'audience ---------- */
  var CONSENT_KEY = 'bp-consent';
  var CONSENT_MAX_AGE = 1000 * 60 * 60 * 24 * 182; // 6 mois, durée recommandée par la CNIL
  var UMAMI_SRC = 'https://cloud.umami.is/script.js';
  var UMAMI_WEBSITE_ID = 'REMPLACER-PAR-TON-ID-UMAMI'; // ← à remplacer par l'identifiant donné par Umami (voir le guide)

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

  /* ---------- 2. Formulaire de contact ---------- */
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
      widgetId = window.turnstile.render(turnstileBox, { sitekey: sitekey, language: 'fr', theme: 'light' });
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
