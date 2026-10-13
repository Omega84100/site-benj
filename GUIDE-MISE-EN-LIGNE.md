# Site benjamin-paule.me : guide de mise en ligne

Ce dossier contient ton portfolio, prêt à être publié sur **Cloudflare Workers** (c'est ce que tu as utilisé pour `site-benj.benjamin-paule84.workers.dev`). Il n'y a rien à installer ni à compiler : ce sont des pages HTML, une feuille de style et une petite API pour le formulaire.

## Ce qu'il y a dans le dossier

```
site-benjamin-paule/
├── wrangler.jsonc           ← les réglages pour Cloudflare (nom du Worker, dossier du site, page 404…)
├── public/                  ← le site (ce que voient les visiteurs)
│   ├── index.html           accueil + formulaire de contact
│   ├── mentions-legales.html, confidentialite.html (RGPD), cgu.html, 404.html
│   ├── assets/              ⚠️ indispensable : mise en forme (css), scripts (js), images (img)
│   ├── demos/               3 sites de démonstration (garage, coiffure, plombier)
│   ├── favicon.*, apple-touch-icon.png, icon-*.png, og-image.jpg (image de partage)
│   ├── sitemap.xml, robots.txt, site.webmanifest
│   ├── _headers             sécurité : HTTPS forcé, anti-clickjacking, CSP…
│   └── _redirects           anciennes adresses → accueil
├── src/                     ← l'API du formulaire, exécutée sur les serveurs de Cloudflare (jamais dans le navigateur)
│   ├── worker.js            aiguillage : /api/contact → l'API, tout le reste → le dossier public
│   └── contact.js           vérifications, anti-spam et envoi de l'e-mail
└── tests/contact.test.mjs   tests de l'API (lancer : node tests/contact.test.mjs)
```

## Tes règles, et où elles sont appliquées

| Règle | Comment c'est fait |
|---|---|
| Page RGPD | `/confidentialite` : données, durée, sous-traitants, droits, CNIL |
| Page CGU | `/cgu`. J'ai ajouté `/mentions-legales`, qui est **obligatoire par la loi** pour un pro |
| API hors du front | `src/contact.js` tourne sur les serveurs Cloudflare. Les clés secrètes n'apparaissent jamais dans le code du site |
| HTTPS forcé | En-tête HSTS dans `_headers` + réglage « Always Use HTTPS » (étape 6) |
| Bandeau cookies | Accepter / Refuser avec le même poids (exigence CNIL), choix gardé 6 mois, lien « Gérer les cookies » en bas de page |
| Meta title et description | Sur chaque page, uniques |
| Image de partage réseaux sociaux | `og-image.jpg` 1200×630 + balises Open Graph et Twitter |
| Favicon | `.ico`, `.svg`, icône Apple et icônes Android |
| Sitemap et robots.txt | `sitemap.xml`, `robots.txt` (les démos et l'API sont exclues) |
| Texte alternatif | Toutes les images ont un `alt` descriptif |
| Vitesse de chargement | Lighthouse mobile : **98 à 100/100** en performance, affichage en ~1 s, 0 décalage de mise en page |
| Contraste des couleurs | Toutes les couleurs sont au niveau AA ou mieux. Lighthouse accessibilité : **100/100** |
| Responsive | Testé de 320 px à 1280 px de large, aucun débordement |
| Page 404 personnalisée | `404.html`, activée par `"not_found_handling": "404-page"` dans `wrangler.jsonc` |
| Liens cassés | Vérifiés avec linkinator : 0 lien cassé |
| Validation des formulaires | Dans le navigateur (messages clairs en français) **et** sur le serveur (on ne fait jamais confiance au navigateur) |
| Anti-spam | Cloudflare Turnstile (sans puzzle agaçant) + champ piège invisible + contrôle de l'origine et de la taille des messages |
| Analytics | Umami : pages vues, provenance, appareils, et clics sur le bouton « maquette gratuite » (par position), envois réussis du formulaire. Chargé seulement après « Accepter » |
| Un seul CTA | Partout le même : « Recevoir ma maquette gratuite », qui mène au formulaire |

---

## Mise en ligne, étape par étape

Tout est gratuit. Compte environ 1 heure la première fois.

### Étape 1 : mettre le code sur GitHub
Ton dépôt est `Omega84100/site-benj`.
1. Télécharge **uniquement le fichier `site-benjamin-paule.zip`**, jamais les fichiers un par un : le téléchargement fichier par fichier range tout en vrac, sans dossiers, et le site ne trouve plus sa mise en forme.
2. Dans ton dossier **Téléchargements**, fais un clic droit sur le zip → **Extraire tout…** → **Extraire**. Windows ouvre un dossier `site-benjamin-paule` qui contient `public`, `src`, `tests`, `wrangler.jsonc` et ce guide.
3. Sur github.com, ouvre ton dépôt `site-benj` → **Add file** → **Upload files**.
4. Dans le dossier extrait, fais **Ctrl+A** pour tout sélectionner, puis **glisse** la sélection dans la page GitHub.
   ⚠️ Ne passe pas par le lien « choose your files » : il ne prend que les fichiers, **pas les dossiers**.
5. Attends que GitHub affiche la liste des fichiers. Tu dois y voir des lignes comme `public/assets/css/style.css` ou `src/worker.js`. Clique ensuite sur **Commit changes**.
6. Vérifie sur GitHub : à la racine du dépôt tu dois voir les dossiers `public`, `src` et `tests` et le fichier `wrangler.jsonc`. En ouvrant `public`, tu dois voir les dossiers `assets` et `demos`.
7. Les anciens fichiers posés en vrac à la racine (`index.html`, `style.css`, `main.js`, `index (1).html`…) ne gênent pas : seuls ceux du dossier `public` sont mis en ligne. Tu pourras les supprimer plus tard pour y voir plus clair. Seule exception : s'il y a un fichier `wrangler.json` ou `wrangler.toml`, supprime-le, sinon Cloudflare l'utiliserait à la place de `wrangler.jsonc`.

### Étape 2 : relier GitHub à ton Worker Cloudflare
Ton Worker s'appelle `site-benj` (c'est aussi le nom écrit dans `wrangler.jsonc`).

- **S'il est déjà relié à ce dépôt GitHub** (c'est ton cas : la page Overview du Worker affiche ton dépôt `site-benj`) : il n'y a rien à faire. Chaque « Commit » sur GitHub relance la mise en ligne toute seule. Tu peux suivre l'avancement dans ton Worker, onglet **Deployments**.
- **S'il n'est pas relié** (par exemple si tu avais déposé les fichiers directement sur Cloudflare) :
  1. dash.cloudflare.com → **Workers & Pages** → clique sur `site-benj`.
  2. **Settings** → **Builds** → **Connect** → choisis ton compte GitHub puis ton dépôt.
  3. Réglages : branche **main**, Build command **(laisser vide)**, Deploy command **`npx wrangler deploy`**, Root directory **`/`**. Valide.
  4. Si aucun déploiement ne démarre, fais une petite modification sur GitHub (par exemple une ligne de ce guide) puis **Commit** : ça le déclenche.

Quand c'est fini, ouvre https://site-benj.benjamin-paule84.workers.dev : le site doit apparaître avec sa mise en forme, le bandeau cookies en bas et les images des réalisations.

### Étape 3 : l'anti-spam (Turnstile)
Turnstile n'est pas dans la page de ton Worker : c'est une rubrique à part de Cloudflare.
1. Ouvre ce lien, qui y mène directement : https://dash.cloudflare.com/?to=/:account/turnstile
   Sinon, dans le menu de gauche, descends jusqu'à **Application security** → **Turnstile**, ou tape « Turnstile » dans la recherche en haut à gauche (Ctrl+K).
2. Clique sur **Add widget** et remplis :
   - **Widget name** : `benjamin-paule.me`
   - **Hostname management** : ajoute `benjamin-paule.me` **et** `site-benj.benjamin-paule84.workers.dev`
   - **Widget mode** : **Managed**
   - **Pre-clearance** : laisse **No**
3. Clique sur **Create**. Cloudflare affiche ta **Site Key** (publique) et ta **Secret Key** (secrète) : copie-les tout de suite toutes les deux.
4. Dans `public/index.html` (sur GitHub, bouton ✏️), cherche `data-turnstile-sitekey="1x00000000000000000000AA"`, remplace cette clé de test par ta **Site Key**, puis **Commit**.
   ⚠️ Tant que la clé de test est là, l'anti-spam laisse tout passer.
5. Dans ton Worker `site-benj` → **Settings** → **Variables and Secrets** → **Add** :
   - Type : **Secret**
   - Nom : `TURNSTILE_SECRET`
   - Valeur : ta Secret Key
   - puis **Deploy**.

   ⚠️ C'est bien la rubrique **Variables and Secrets** du Worker, pas les variables de la rubrique **Builds**.

### Étape 4 : recevoir les demandes par e-mail (Resend)
1. Crée un compte gratuit sur **resend.com** avec l'adresse mail sur laquelle tu veux recevoir les demandes.
2. Menu **API Keys** → **Create API Key** : nom `site-benj`, permission **Sending access**, puis **Add**. Copie tout de suite la clé, qui commence par `re_` : Resend ne l'affiche qu'une seule fois.
3. Dans ton Worker → **Settings** → **Variables and Secrets**, ajoute ces deux variables, toujours en type **Secret** (elles sont alors conservées à chaque mise à jour du site) :
   - `RESEND_API_KEY` = la clé
   - `CONTACT_TO` = **la même adresse que ton compte Resend** (obligatoire tant que ton domaine n'est pas vérifié chez Resend)
4. Plus tard (facultatif) : vérifie ton domaine dans Resend (**Domains**), puis ajoute `CONTACT_FROM` = `Site <contact@benjamin-paule.me>`.
5. Teste : envoie-toi une demande depuis le formulaire en bas de la page d'accueil de https://site-benj.benjamin-paule84.workers.dev. Tu dois la recevoir par e-mail.
   Ouvrir `/api/contact` directement dans le navigateur affiche toujours une erreur (« Méthode non autorisée ») : c'est normal, cette adresse n'accepte que les envois du formulaire.

### Étape 5 : les statistiques (Umami)
1. Crée un compte gratuit sur **cloud.umami.is**. Si on te propose une région de stockage, choisis l'Europe.
2. **Add website** → nom `benjamin-paule.me`, domaine `benjamin-paule.me`.
3. Copie le **Website ID**.
4. Dans `public/assets/js/main.js`, remplace `REMPLACER-PAR-TON-ID-UMAMI` par cet identifiant, puis **Commit**.
5. Dans Umami, tu verras les visites, les pages vues, d'où viennent les visiteurs, et les événements `cta-maquette` (avec l'endroit du clic) et `formulaire-succes`.
   Les visites ne sont comptées que sur `benjamin-paule.me` : c'est normal de ne rien voir tant que le site est sur l'adresse `workers.dev`.

### Étape 6 : brancher ton nom de domaine
Ton domaine pointe aujourd'hui vers GitHub Pages. On le passe chez Cloudflare :
1. Dans Cloudflare : **Add a domain** → `benjamin-paule.me` → offre **Free**.
2. Cloudflare importe tes anciens réglages DNS. **Supprime les 4 enregistrements A** qui commencent par `185.199.` et l'éventuel CNAME `www` qui pointe vers `github.io` : ce sont ceux de GitHub Pages.
3. Cloudflare te donne **2 serveurs de noms**. Va là où tu as acheté le domaine (souvent Namecheap si c'était avec le GitHub Student Pack), et remplace les serveurs de noms par ceux de Cloudflare. L'activation peut prendre de quelques minutes à 24 h.
4. Quand le domaine est actif : ton Worker `site-benj` → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → `benjamin-paule.me`. Recommence avec `www.benjamin-paule.me`.
5. **SSL/TLS** → **Edge Certificates** → active **Always Use HTTPS**.
6. **Rules** → **Redirect Rules** → modèle **« Redirect from WWW to root »**, pour que www renvoie vers l'adresse principale.
7. Dans ton ancien dépôt GitHub Pages : **Settings** → **Pages** → retire le domaine personnalisé, pour éviter les conflits.

### Étape 7 : ton adresse contact@benjamin-paule.me
- **Pour recevoir** (le plus simple) : Cloudflare → **Email** → **Email Routing** → crée `contact@benjamin-paule.me` qui transfère vers ta boîte Gmail. C'est gratuit et prend 2 minutes.
- **Pour aussi envoyer depuis cette adresse** : prends une vraie boîte mail sur ton domaine, par exemple Zoho Mail si son offre gratuite existe toujours. Dans ce cas, n'active pas l'Email Routing : les deux se gênent.

### Étape 8 : compléter les infos légales
Dans `public/mentions-legales.html` et `public/confidentialite.html`, cherche **« À compléter »** et remplis :
- ton **adresse** (celle déclarée pour la micro-entreprise ; si tu ne veux pas afficher ton domicile, il existe des sociétés de domiciliation) ;
- ton **SIRET**, dès que tu le reçois.

### Étape 9 : vérifier que tout marche
- [ ] Le site s'ouvre sur https://benjamin-paule.me avec le cadenas, sa mise en forme et ses images
- [ ] http://benjamin-paule.me et www.benjamin-paule.me renvoient bien vers https://benjamin-paule.me
- [ ] Une adresse qui n'existe pas (par exemple https://benjamin-paule.me/test) affiche la page 404 du site
- [ ] Envoie-toi une demande via le formulaire : tu dois recevoir l'e-mail
- [ ] Clique sur « Accepter » dans le bandeau, puis vérifie qu'une visite apparaît dans Umami
- [ ] Colle ton adresse dans https://www.opengraph.xyz pour voir l'aperçu sur les réseaux sociaux
- [ ] Déclare ton `sitemap.xml` dans **Google Search Console**, pour que Google trouve ton site plus vite

---

## En cas de souci

| Ce que tu vois | La cause | Que faire |
|---|---|---|
| Le site s'affiche en texte brut, avec des logos ou icônes géants | Le dossier `public/assets` n'est pas sur GitHub | Étape 1 : glisse le dossier `public` en entier, puis vérifie qu'`assets` apparaît |
| Une page blanche ou « introuvable » sur l'accueil | Les pages ne sont pas dans `public`, ou `wrangler.jsonc` manque | Étape 1, point 5 |
| Le déploiement échoue dans l'onglet **Deployments** | Souvent un `wrangler.json`/`wrangler.toml` en trop, ou `wrangler.jsonc` absent | Ouvre le déploiement en échec, lis la dernière ligne rouge, et vérifie l'étape 1 |
| Le formulaire répond « momentanément indisponible » | Il manque une variable (`TURNSTILE_SECRET`, `RESEND_API_KEY` ou `CONTACT_TO`) | Étapes 3 et 4 |
| Le formulaire répond « La vérification anti-spam a échoué » | La Site Key ne correspond pas à la Secret Key, ou l'adresse du site manque dans les domaines du widget | Étape 3 |
| Tu veux voir les erreurs du serveur | Ton Worker → onglet **Logs** | |

---

## Modifier le site plus tard
- **Changer un texte** : modifie le fichier `.html` du dossier `public` directement sur GitHub (bouton ✏️), puis **Commit**. Cloudflare remet le site à jour tout seul en une minute.
- **Ajouter une vraie réalisation** : copie un bloc `<article class="card project">` dans `public/index.html`, change l'image, le texte alternatif et le lien.
- **Ajouter une page** : mets-la dans `public`, et pense à l'ajouter dans `sitemap.xml`.
