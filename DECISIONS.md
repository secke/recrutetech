# DECISIONS — journal des arbitrages

Chaque entrée consigne un écart entre les instructions reçues et ce que le code impose,
la décision retenue, et sa justification. Format append-only : on ne réécrit pas une
décision passée, on en ajoute une nouvelle qui la supersède.

---

## D-001 — `LandingPage.jsx` n'est pas la landing

**Date** : 2026-08-04 · **Statut** : proposé, en attente de validation · **Lot** : 0

**Instruction** (brief §3.3) : réécrire `frontend/src/components/pages/LandingPage.jsx`, qui affiche
« 1 200+ entreprises », « 85K+ entretiens », « 95 % satisfaction », des témoignages et des logos clients.

**Constat** : ces mensonges sont bien dans ce fichier, mais **il n'est importé nulle part**.
`App.jsx:5` route `/` vers `screens/Landing.jsx`, qui ne contient aucun chiffre inventé,
aucun témoignage et aucun logo. Vérifié par analyse du graphe d'imports.

**Décision** : supprimer `components/pages/LandingPage.jsx` au lieu de le réécrire, et appliquer
les corrections du §3.3 à `screens/Landing.jsx` :
- remplacer le stat `∞ entretiens / jour` (qui devient faux dès que les quotas du LOT 6 existent) ;
- ajouter une mention de statut « alpha privée » ;
- vérifier l'absence de « analyse comportementale » / « détection de confiance ».

**Pourquoi** : réécrire un fichier mort ne change rien à ce que voit un visiteur. L'objectif du §3.3
est que la page publiée soit honnête — c'est `screens/Landing.jsx` qu'il faut viser.

---

## D-002 — Le SDK `elevenlabs` n'est pas mis à jour, il est retiré

**Date** : 2026-08-04 · **Statut** : proposé, en attente de validation · **Lot** : 0

**Instruction** (brief, LOT 0 point 4) : mettre à jour `elevenlabs` vers la version courante et adapter
les appels si l'API a bougé.

**Constat** : `elevenlabs==1.9.0` est épinglé dans `requirements.txt` **et** `pyproject.toml`, mais
`grep -rn "import elevenlabs" app/ tests/` ne retourne rien. `app/services/elevenlabs_service.py`
fait tous ses appels en `httpx` brut contre `https://api.elevenlabs.io/v1`, avec sa propre
vérification HMAC des webhooks.

**Décision** : retirer la dépendance des deux manifestes plutôt que la mettre à jour. Aucun appel
n'est à adapter puisqu'aucun n'utilise le SDK.

**Pourquoi** : mettre à jour une dépendance morte ajoute une surface d'attaque et un poids d'image
sans bénéfice. Si un besoin réel de SDK apparaît (streaming, gestion d'agents), on l'introduira à
ce moment-là, sur la version courante et avec une raison.

**Conséquence à ne pas perdre de vue** : le contrat REST ElevenLabs reste non testé contre une
version d'API. À couvrir par des tests de contrat au LOT 8.

---

## D-003 — L'arabe reste hors périmètre malgré `CLAUDE.md`

**Date** : 2026-08-04 · **Statut** : proposé, en attente de validation · **Lot** : 0

**Conflit** : `CLAUDE.md` (conventions frontend) impose « i18n always : strings dans `STRINGS.fr`,
`STRINGS.en`, `STRINGS.ar` ». Le brief §4 met explicitement le wolof et l'arabe hors périmètre,
en attente de la validation FR/EN.

**Constat** : `components/shared.jsx` ne porte que `fr` et `en`. La convention n'est déjà pas respectée.

**Décision** : le brief gagne (sa règle §2 : « si une spec contredit ce prompt, ce prompt gagne »).
Pas d'arabe. Corriger `CLAUDE.md` pour retirer `STRINGS.ar` et noter la réintroduction conditionnelle
dans `ROADMAP.md`.

---

## D-004 — La convention TailwindCSS de `CLAUDE.md` ne décrit pas le code

**Date** : 2026-08-04 · **Statut** : proposé, en attente de validation · **Lot** : 0

**Conflit** : `CLAUDE.md` impose « TailwindCSS core utilities (no custom config additions) ».
Le frontend réel est écrit en **styles inline** (`style={{ ... }}`) avec des variables CSS
(`var(--ink)`, `var(--terracotta)`) définies dans `index.css`. Tailwind est installé mais
quasiment inutilisé.

**Décision** : ne pas migrer. Corriger `CLAUDE.md` pour décrire la convention réelle
(styles inline + variables CSS du design system).

**Pourquoi** : une réécriture de tous les écrans en Tailwind est un coût pur, sans gain fonctionnel,
au moment précis où il faut livrer de la conformité et de la facturation. Une convention qui ment
sur le code est pire qu'une convention modeste et vraie.

---

## D-005 — Le mode practice est une table fantôme

**Date** : 2026-08-04 · **Statut** : **question ouverte — arbitrage demandé** · **Lot** : hors périmètre

**Constat** : le commit `1c573ce` (« skill-practice-mode ») a livré le modèle `PracticeSession`,
la migration `0005`, `prompts/practice_aria.py` et `scripts/purge_expired_practice_sessions.py`.
Il **n'a pas livré** `services/practice_service.py` ni `api/practice.py`. `models.py:423` référence
pourtant `PRACTICE_ROLE_PRESETS in practice_service.py` — un fichier qui n'existe pas.

Résultat : une table en base, jamais écrite, jamais lue, aucun endpoint, aucun écran.

**Options** :
- **(a)** Retirer la table (migration `down`), les prompts et le script de purge. Consigner l'intention
  dans `ROADMAP.md`. Cohérent avec la règle « pas de code mort ».
- **(b)** Compléter le mode practice (service + API + UI). Coût estimé 4–6 j, **hors des 10 lots**.
- **(c)** Laisser en l'état et documenter comme dette assumée.

**Recommandation** : **(a)**. Le mode practice est un levier d'acquisition, pas un prérequis de
livraison ; les segments prioritaires révisés (BPO Maroc/Sénégal, pipeline remote international)
n'en dépendent pas. Le garder à moitié fait, c'est porter une table PII avec une politique de
rétention à maintenir pour zéro usage.

**Bloquant** : non — je peux avancer sur le LOT 0 sans trancher. Mais à trancher avant le LOT 1,
qui touchera au schéma.

---

## D-006 — `_ensure_columns()` disparaît, Alembic reste seul maître du schéma

**Date** : 2026-08-04 · **Statut** : proposé · **Lot** : 1

**Constat** : contrairement à ce qu'annonce le brief §2, Alembic est présent et fonctionnel
(`alembic upgrade head` sur base vierge produit les 6 tables). Mais `db.py:15` `_ensure_columns()`
tourne **aussi** au démarrage de l'app et ajoute des colonnes en `ALTER TABLE` sur SQLite.

**Décision** : conserver les 5 migrations existantes (ne pas repartir d'une migration initiale
comme le suggère le brief), supprimer `_ensure_columns()`, et retirer l'appel à `init_db()` du
`lifespan` de `main.py` — les migrations s'appliquent au déploiement, pas au démarrage (brief §LOT 9.3).

**Pourquoi** : deux mécanismes de schéma dont un silencieux, c'est la garantie d'une divergence
entre dev et prod. Les migrations existantes sont correctes et testées ; les refaire ferait perdre
l'historique sans rien gagner.
