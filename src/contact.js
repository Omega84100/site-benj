/**
 * API du formulaire de contact : s'exécute sur les serveurs de Cloudflare (dans le Worker),
 * jamais dans le navigateur. Les clés secrètes restent dans les variables du Worker.
 * Elle est appelée par src/worker.js pour l'adresse /api/contact.
 *
 * Variables à définir dans Cloudflare (ton Worker > Settings > Variables and Secrets, type « Secret ») :
 *   TURNSTILE_SECRET  clé secrète Turnstile (anti-spam)
 *   RESEND_API_KEY    clé API Resend (envoi de l'e-mail)
 *   CONTACT_TO        adresse qui reçoit les demandes
 *   CONTACT_FROM      (facultatif) expéditeur, ex. "Site <contact@benjamin-paule.me>"
 *   ALLOWED_ORIGINS   (facultatif) origines autorisées, séparées par des virgules
 */

const MAX_BODY_BYTES = 10_000;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const PHONE_RE = /^[0-9+().\s-]{6,20}$/;
const DEFAULT_ORIGINS = ['https://benjamin-paule.me', 'https://www.benjamin-paule.me'];

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Nettoie une chaîne : type, espaces, caractères de contrôle, longueur maximale. */
function clean(value, max, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  let v = value.replace(/\r\n?/g, '\n');
  v = multiline ? v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '') : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
  v = v.trim();
  return v.length > max ? v.slice(0, max) : v;
}

export function validate(input) {
  const data = {
    name: clean(input.name, 80),
    company: clean(input.company, 120),
    email: clean(input.email, 254),
    phone: clean(input.phone, 20),
    current_site: clean(input.current_site, 200),
    message: clean(input.message, 3000, { multiline: true }),
    consent: input.consent === true,
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Nom manquant ou trop court.';
  if (!EMAIL_RE.test(data.email)) errors.email = 'Adresse e-mail invalide.';
  if (data.phone && !PHONE_RE.test(data.phone)) errors.phone = 'Numéro de téléphone invalide.';
  if (data.current_site) {
    try {
      const url = new URL(data.current_site);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    } catch {
      errors.current_site = 'Adresse du site invalide.';
    }
  }
  if (data.message.length < 20) errors.message = 'Message trop court (20 caractères minimum).';
  if (!data.consent) errors.consent = 'Consentement requis.';
  return { data, errors };
}

async function verifyTurnstile(token, secret, ip) {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!res.ok) return false;
  const outcome = await res.json();
  return outcome.success === true;
}

async function sendEmail(env, d) {
  const lines = [
    `Nouvelle demande depuis benjamin-paule.me`,
    ``,
    `Nom : ${d.name}`,
    `Entreprise : ${d.company || '-'}`,
    `E-mail : ${d.email}`,
    `Téléphone : ${d.phone || '-'}`,
    `Site actuel : ${d.current_site || '-'}`,
    ``,
    `Message :`,
    d.message,
  ];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'Site benjamin-paule.me <onboarding@resend.dev>',
      to: [env.CONTACT_TO],
      reply_to: d.email,
      subject: `Demande de maquette : ${d.company || d.name}`.slice(0, 150),
      text: lines.join('\n'),
    }),
  });
  return res.ok;
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return new Response('Méthode non autorisée', { status: 405, headers: { Allow: 'POST' } });
  }

  // 1. Origine : seules les pages du site peuvent appeler l'API
  const allowed = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : DEFAULT_ORIGINS;
  const origin = request.headers.get('Origin');
  const selfOrigin = new URL(request.url).origin;
  if (!origin || (origin !== selfOrigin && !allowed.includes(origin))) {
    return json(403, { error: 'Origine non autorisée.' });
  }

  // 2. Format et taille de la requête
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    return json(415, { error: 'Format non pris en charge.' });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'Message trop long.' });
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }
  if (!input || typeof input !== 'object') return json(400, { error: 'Requête invalide.' });

  // 3. Piège à robots : si le champ caché est rempli, on fait semblant d'accepter
  if (typeof input.fax === 'string' && input.fax.trim() !== '') return json(200, { ok: true });

  // 4. Validation côté serveur (on ne fait jamais confiance au navigateur)
  const { data, errors } = validate(input);
  if (Object.keys(errors).length) {
    return json(422, { error: 'Certains champs sont invalides : ' + Object.values(errors).join(' '), fields: errors });
  }

  if (!env.TURNSTILE_SECRET || !env.RESEND_API_KEY || !env.CONTACT_TO) {
    console.error('Configuration incomplète : TURNSTILE_SECRET, RESEND_API_KEY et CONTACT_TO sont requis.');
    return json(500, { error: 'Le formulaire est momentanément indisponible. Écrivez-moi directement par e-mail.' });
  }

  // 5. Anti-spam Turnstile vérifié côté serveur
  const human = await verifyTurnstile(input.turnstileToken, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP'));
  if (!human) return json(400, { error: 'La vérification anti-spam a échoué. Rechargez la page et réessayez.' });

  // 6. Envoi de l'e-mail
  const sent = await sendEmail(env, data);
  if (!sent) return json(502, { error: 'L\'envoi a échoué. Réessayez dans un instant.' });

  return json(200, { ok: true });
}
