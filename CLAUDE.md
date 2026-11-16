# site-benj — Benjamin Paule, sites web pour artisans et commerces (Orange, Vaucluse)

Site en ligne : benjamin-paule.me, hébergé sur Cloudflare Workers.
- `public/` : le site servi tel quel (pages, CSS, images). `public/demos/<métier>/` = démos de maquettes.
- `src/` : API du formulaire de contact (`/api/*`), exécutée par Cloudflare.
- `public/assets/img/work/` : captures des maquettes déjà proposées (versions -d, -m, -t, -hero).

L'argument de vente : **une maquette gratuite de la page d'accueil avant de décider**.
L'offre (prix, délais, contenu) est dans `offre.md` : les agents n'inventent rien qui n'y est pas.

## Agents (installés pour toutes les sessions)
- `prospecteur` : trouve, qualifie et note sur 100 les prospects → `prospection/prospects.csv`, trié par score. Zone par défaut : Orange et alentours (Vaucluse).
- `avis-google` : démo « réponse aux avis » pour un commerce qui ne répond pas à ses avis → `prospection/avis/<slug>/index.html` (imprimable en PDF) ; pour les clients signés, réponses à faire valider.
- `maquettiste` : maquette personnalisée pour un prospect → `prospection/maquettes/<slug>/index.html`, en partant des démos de `public/demos/` (même structure, `demo.css` + un `theme.css` par métier).
- `closer` : messages, relances, script d'appel, objections → `prospection/messages/<slug>.md`.
- `hocs` : vérification GO/NO-GO avant toute annonce « c'est fait ».

Chaîne type : prospecteur → maquettiste (offre site) ou avis-google (offre avis) → hocs → closer → **Benjamin envoie lui-même**.
Les réponses aux avis ne sont jamais publiées par Claude ; les avis négatifs passent par le gérant avant toute réponse.

## Règles
- `prospection/` contient des coordonnées de prospects : il est dans `.gitignore`, ne jamais le commiter (le dépôt GitHub est public).
- Une maquette ne passe dans `public/demos/` ou `public/assets/img/work/` (donc en ligne) que sur demande explicite de Benjamin.
- Aucun message n'est envoyé par Claude : il prépare, Benjamin envoie. Toute personne qui dit STOP passe en `ne plus contacter`.
- Uniquement des coordonnées professionnelles publiques.
- Jamais de `git push` ni de déploiement (`wrangler deploy`) sans accord explicite.
- Avant de dire qu'une maquette ou une modif du site est prête : convoque `hocs`, et n'annonce que sur un GO avec sa preuve.
- Économie de jetons (forfait Pro) : sorties de plus de 50 lignes → fichier + `tail -20`. Réponses finales courtes.
