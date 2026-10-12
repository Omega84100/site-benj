import { onRequest } from '../functions/api/contact.js';
const env = { TURNSTILE_SECRET: 's', RESEND_API_KEY: 'k', CONTACT_TO: 'moi@exemple.fr' };
let sent = [];
globalThis.fetch = async (url, opts) => {
  if (url.includes('turnstile')) { const tok = opts.body.get('response'); return new Response(JSON.stringify({ success: tok === 'bon-jeton' })); }
  if (url.includes('resend')) { sent.push(JSON.parse(opts.body)); return new Response('{}', { status: 200 }); }
  throw new Error('url inattendue ' + url);
};
const good = { name: 'Jean Dupont', company: 'Garage Test', email: 'jean@exemple.fr', phone: '06 12 34 56 78', current_site: 'https://exemple.fr', message: 'Bonjour, je voudrais un site pour mon garage svp.', consent: true, fax: '', turnstileToken: 'bon-jeton' };
const call = (body, { origin = 'https://benjamin-paule.me', method = 'POST', ct = 'application/json', raw } = {}) =>
  onRequest({ env, request: new Request('https://benjamin-paule.me/api/contact', { method, headers: { Origin: origin, 'Content-Type': ct }, body: method === 'GET' ? undefined : (raw ?? JSON.stringify(body)) }) });
const cases = [
  ['demande valide', () => call(good), 200],
  ['GET refusé', () => call(null, { method: 'GET' }), 405],
  ['autre site (origine)', () => call(good, { origin: 'https://pirate.example' }), 403],
  ['sans origine', () => call(good, { origin: '' }), 403],
  ['mauvais format', () => call(good, { ct: 'text/plain' }), 415],
  ['JSON cassé', () => call(null, { raw: '{oops' }), 400],
  ['trop gros', () => call({ ...good, message: 'a'.repeat(20000) }), 413],
  ['robot (champ piège)', () => call({ ...good, fax: 'spam' }), 200],
  ['e-mail invalide', () => call({ ...good, email: 'pas-un-mail' }), 422],
  ['message trop court', () => call({ ...good, message: 'court' }), 422],
  ['sans consentement', () => call({ ...good, consent: false }), 422],
  ['site en javascript:', () => call({ ...good, current_site: 'javascript:alert(1)' }), 422],
  ['jeton anti-spam faux', () => call({ ...good, turnstileToken: 'faux' }), 400],
  ['injection sujet (retour ligne)', () => call({ ...good, company: 'X\r\nBcc: victime@x.fr' }), 200],
];
let fails = 0;
for (const [label, fn, expected] of cases) {
  sent = [];
  const res = await fn();
  const ok = res.status === expected;
  if (!ok) fails++;
  console.log(ok ? '✓' : '✗', label.padEnd(32), res.status, ok ? '' : '(attendu ' + expected + ')', label.startsWith('robot') ? `emails envoyés: ${sent.length}` : '', label.startsWith('injection') ? `sujet: ${JSON.stringify(sent[0]?.subject)}` : '');
}
const noEnv = await onRequest({ env: {}, request: new Request('https://benjamin-paule.me/api/contact', { method: 'POST', headers: { Origin: 'https://benjamin-paule.me', 'Content-Type': 'application/json' }, body: JSON.stringify(good) }) });
console.log(noEnv.status === 500 ? '✓' : '✗', 'config manquante'.padEnd(32), noEnv.status);
console.log(fails ? fails + ' échec(s)' : 'Tous les tests passent');
