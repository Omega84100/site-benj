/**
 * Point d'entrée du site sur Cloudflare Workers.
 * - Les pages, styles, scripts et images du dossier public/ sont servis directement par Cloudflare,
 *   avec les en-têtes de sécurité de public/_headers. Ils ne passent pas par ce code.
 * - Seules les adresses /api/... arrivent ici (voir "run_worker_first" dans wrangler.jsonc).
 */
import { handleContact } from './contact.js';

// public/_headers ne s'applique pas aux réponses fabriquées ici : on ajoute les protections à la main.
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

function secure(response) {
  const res = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.headers.set(name, value);
  return res;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') {
      try {
        return secure(await handleContact(request, env));
      } catch (error) {
        console.error('Erreur dans l\'API contact :', error); // visible dans Cloudflare, onglet Logs
        return secure(Response.json({ error: 'L\'envoi a échoué. Réessayez dans un instant.' }, { status: 500 }));
      }
    }
    if (pathname.startsWith('/api/')) return secure(new Response('Adresse inconnue', { status: 404 }));
    return env.ASSETS.fetch(request); // tout le reste : les fichiers du dossier public/
  },
};
