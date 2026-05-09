# Guide RH — Constructeur de rubriques

Ce guide s'adresse aux RH, hiring managers et talent partners. Aucune compétence technique n'est requise.

---

## Qu'est-ce qu'une rubrique ?

Avant les rubriques, chaque poste RecruteTech était piloté par un texte libre (le `system_prompt`) que seul un administrateur pouvait modifier. Ce texte n'était pas visible des RH, impossible à versionner, et produisait des entretiens inconsistants d'un candidat à l'autre.

Une **rubrique structurée** remplace ce texte par un contrat formel en trois parties : ce qu'Aria (l'IA vocale) doit demander pendant l'entretien, ce que Claude doit évaluer dans le rapport, et ce que le candidat peut lire dans son retour explicable. Chaque rubrique définit les compétences évaluées, leur poids, les niveaux attendus selon la séniorité, et les sujets obligatoires à couvrir. Résultat : deux candidats passant le même poste sont évalués sur exactement les mêmes critères, dans le même ordre, avec la même pondération. L'équité devient vérifiable, et les décisions deviennent auditables.

---

## Les 5 étapes du wizard

Accédez au wizard via **Postes → [nom du poste] → Rubriques → Nouvelle rubrique**.

### Étape 1 — Démarrage rapide

Choisissez un template de départ parmi les six modèles proposés (voir section suivante) ou commencez avec une fiche vierge. Le template est cloné dans votre session : toutes les modifications sont locales jusqu'à la publication.

**Piège courant :** si aucun template ne correspond exactement à votre poste, choisissez le plus proche et modifiez-le plutôt que de repartir de zéro. Cela vous évite de devoir remplir tous les descripteurs de niveaux manuellement.

![placeholder: step 1 wizard](./_assets/rubric-step-1.png)

### Étape 2 — Compétences et poids

Ajoutez, supprimez ou réordonnez les compétences par glisser-déposer. Pour chaque compétence :

- **Poids (%)** : importance relative dans le score final. La somme de tous les poids doit être égale à 100 %. Le wizard affiche une alerte en temps réel si ce n'est pas le cas.
- **Descripteurs de niveau** : texte court décrivant ce que le candidat fait à chaque niveau (junior, mid, senior, staff). Le niveau `senior` est obligatoire. Les niveaux `junior` et `mid` sont fortement recommandés. Ces descripteurs ancrent les scores d'Aria et de Claude : plus ils sont précis, plus la notation est cohérente.
- **Sujets à couvrir (must_probe)** : liste de thèmes qu'Aria doit impérativement aborder lors de l'entretien pour cette compétence.

**Limites :** maximum 8 compétences par rubrique. Au-delà, la qualité d'évaluation de Claude se dégrade.

**Piège courant :** des descripteurs trop génériques ("bonne communication", "connaît les bases") ne permettent pas de distinguer un junior d'un senior. Utilisez des verbes d'action concrets et citez des outils/situations réels.

![placeholder: step 2 wizard](./_assets/rubric-step-2.png)

### Étape 3 — Étapes de l'entretien

Organisez les étapes de l'entretien par glisser-déposer. Chaque étape a :

- **Nom et objectif** : visibles dans le rapport final.
- **Durée (minutes)** : la somme de toutes les étapes ne doit pas dépasser la durée du poste (définie dans les paramètres du poste). Le wizard affiche la durée totale en temps réel.
- **Compétences évaluées** : cochez les compétences que cette étape permet d'observer.

**Piège courant :** ne pas associer de compétences à une étape. Aria couvrira quand même cette étape, mais Claude ne pourra pas l'utiliser pour scorer.

![placeholder: step 3 wizard](./_assets/rubric-step-3.png)

### Étape 4 — Exclusions et paramètres

Cette étape contient deux sections.

**Exclusions obligatoires** : huit items sont pré-cochés et verrouillés (voir la section dédiée ci-dessous). Vous pouvez ajouter vos propres exclusions complémentaires.

**Paramètres généraux** :
- **Langue par défaut** : `fr` ou `en`. Peut être changée par le candidat si l'option "Le candidat peut changer de langue" est activée.
- **Ton** : `warm` (chaleureux), `neutral` (neutre), `rigorous` (rigoureux). Influence le registre d'Aria.
- **Questions de défense** : si activées, Aria pose entre N et M questions de vérification d'intégrité (liées au skill `anti-cheating-integrity-layer`).

![placeholder: step 4 wizard](./_assets/rubric-step-4.png)

### Étape 5 — Test et publication

Avant de pouvoir activer une rubrique, vous devez lancer un test de calibration. Cliquez sur **Lancer le test**. Le système simule trois entretiens fictifs (un candidat junior, un mid, un senior) et produit des scores pour chacun.

Le test est réussi si le score senior est supérieur d'au moins **1,5 point** au score junior (sur une échelle de 0 à 10). Cette condition s'appelle `differentiation_ok`.

Une fois le test passé, le bouton **Activer** devient disponible. L'activation rend cette version active pour tous les nouveaux entretiens du poste.

Si le test échoue (différentiation insuffisante), revisitez les **descripteurs de niveau** à l'étape 2 : assurez-vous que les attendus junior et senior sont clairement distincts.

![placeholder: step 5 wizard](./_assets/rubric-step-5.png)

---

## Les 6 templates de départ

| Template | Usage recommandé |
|---|---|
| **Backend Mid** | Développeur backend Python/Node intermédiaire. Axé APIs REST, bases de données et tests. Durée 40 min. |
| **Backend Senior** | Développeur backend senior. Couvre architecture, performance, leadership technique et system design. Durée 50 min. |
| **Frontend Mid** | Développeur frontend React/Vue intermédiaire. Axé JavaScript/TypeScript, patterns React, CSS et accessibilité. Durée 40 min. |
| **Fullstack Mid** | Profil fullstack généraliste couvrant frontend, backend, bases de données et DevOps basique à parts égales. Durée 45 min. |
| **Data Engineer Mid** | Ingénieur data intermédiaire. Couvre SQL analytique, pipelines/orchestration, calcul distribué et modélisation. Durée 45 min. |
| **DevOps Mid** | Ingénieur DevOps intermédiaire. Axé Kubernetes, CI/CD, Infrastructure as Code et observabilité. Durée 40 min. |

Si aucun template ne correspond, utilisez la fiche vierge (option "Partir de zéro" à l'étape 1).

---

## Exclusions obligatoires

Les exclusions suivantes sont **toujours actives** dans chaque rubrique et ne peuvent pas être désactivées :

**Ne pas demander :** âge (`age`), statut marital (`marital_status`), religion (`religion`), pays d'origine (`country_of_origin`), race (`race`), ethnicité (`ethnicity`).

**Ne pas scorer :** accent (`accent`), expressions faciales (`facial_expressions`), apparence physique (`physical_appearance`), genre (`gender`), handicap (`disability`), nom de l'école (`school_name`).

Ces huit catégories correspondent aux attributs protégés par le RGPD (article 9), les règles anti-discrimination françaises, et la hard rule #3 de la plateforme RecruteTech. Le système les applique côté serveur : même si une case était décochée dans l'interface, le backend les réinjecte automatiquement dans la rubrique avant de la persister. Il n'existe aucun contournement, y compris pour les administrateurs.

Pourquoi ce verrouillage ? Évaluer ou demander ces attributs expose l'entreprise à des risques légaux majeurs (CNIL, EEOC) et introduit des biais systémiques dans le recrutement. La plateforme prend en charge ce garde-fou pour que votre équipe n'ait pas à y penser.

---

## Versionnage et immuabilité

Chaque rubrique publiée est **immuable**. Une fois créée en base de données, elle ne peut plus être modifiée. Modifier une rubrique crée une nouvelle version (v2, v3, etc.). Les entretiens passés restent liés à la version exacte utilisée lors de leur création. Cela garantit que les rapports sont reproductibles et auditables dans le temps.

La liste des rubriques d'un poste affiche une **timeline verticale** : chaque version est un nœud, la version active est mise en évidence. Le bouton **Comparer** (disponible lorsqu'il y a au moins deux versions) ouvre un diff visuel côte à côte, section par section : compétences ajoutées/supprimées/modifiées, changements de pondération, modifications des étapes.

Pour modifier une rubrique active : cliquez sur **Cloner** depuis la liste, modifiez la copie, testez-la, puis activez-la. L'ancienne version passe automatiquement en inactive.

---

## Le test de calibration synthétique

Le test simule trois entretiens fictifs en appelant Claude avec des profils de candidats standardisés (junior, mid, senior). Chaque simulation produit des scores par compétence et un score global.

Le test est automatiquement considéré comme réussi si `score_senior - score_junior >= 1.5` (sur 10). Un résultat typique ressemble à : "Junior simulé → 3,5 ; Mid simulé → 5,5 ; Senior simulé → 7,5. Différentiation OK."

Le test peut prendre entre 30 et 120 secondes selon la charge du modèle. Ne fermez pas l'onglet pendant le test.

Les résultats du test sont stockés dans la rubrique et visibles à tout moment depuis la liste (badge vert "Différentiation OK" ou rouge "Différentiation insuffisante").

---

## Portes d'activation

Une rubrique ne peut être activée que si :
1. Elle a été testée au moins une fois (`last_tested_at` est renseigné).
2. Le dernier test a passé la différentiation (`differentiation_ok = true`).

Si vous tentez d'activer sans avoir testé, ou après un test échoué, vous recevrez une erreur 409. Le message précise la cause et indique quoi faire.

---

## Ce qui se passe lors d'un entretien

Quand un candidat commence un entretien sur un poste avec une rubrique active, le backend construit automatiquement le prompt d'Aria à partir de la rubrique (compétences, étapes, exclusions, langue) et du CV parsé si disponible. À la fin de l'entretien, Claude évalue la transcription en utilisant exactement les mêmes critères, pondérations et descripteurs. Le rapport est ainsi directement lié aux choix faits dans la rubrique.

Pour plus de détails techniques, consultez le [guide API rubrics](../api/rubrics.md).

---

## FAQ

**Je veux modifier une rubrique déjà publiée.**
Une rubrique activée ne peut pas être éditée directement (les rubriques sont immuables). Cliquez sur "Cloner" depuis la liste des versions, modifiez la copie, lancez le test de calibration, puis activez la nouvelle version. L'ancienne version est automatiquement désactivée.

**Pourquoi ne puis-je pas décocher "age" dans les exclusions ?**
L'âge est un attribut protégé par le RGPD article 9 et la règle non-négociable #3 de la plateforme. Le backend réinjecte cette exclusion automatiquement même si elle est absente de votre payload. Il n'existe aucun contournement par design.

**Mon poste ne correspond à aucun template. Comment démarrer ?**
Choisissez "Partir de zéro" à l'étape 1. Vous arriverez sur une rubrique vierge avec les exclusions obligatoires pré-remplies. Ajoutez vos compétences manuellement à l'étape 2.

**Que se passe-t-il si aucune rubrique n'est active pour un poste ?**
L'entretien utilise le chemin legacy (`Role.system_prompt`). Ce chemin reste fonctionnel pendant la phase de coexistence (voir le [guide de migration](../migration-guides/role-system-prompt-to-rubric.md)), mais il est moins structuré et ne produit pas de rapports aussi précis. Il est recommandé de créer et d'activer une rubrique pour tous les postes.

**Quelle durée est recommandée pour un entretien ?**
Cela dépend du poste et du nombre d'étapes. En pratique : 40 min pour un rôle mid, 50 min pour un senior. La somme des durées des étapes ne doit pas dépasser la durée configurée sur le poste. Le wizard l'indique en temps réel à l'étape 3.

**Qui peut créer ou modifier une rubrique ?**
Seuls les utilisateurs avec le rôle `Admin` ou `Hiring Manager` peuvent créer, tester et activer des rubriques. Le rôle `Reviewer` peut uniquement consulter.

**Puis-je avoir deux rubriques actives simultanément pour le même poste ?**
Non, dans la version actuelle. Une seule rubrique peut être active par poste à la fois. Un A/B testing sur deux versions est prévu pour une phase ultérieure.

**Combien de temps les rubriques sont-elles conservées ?**
Les rubriques sont conservées pendant toute la durée de vie du poste. Les logs de modification sont conservés 5 ans (obligation d'audit). Une rubrique désactivée reste accessible en lecture depuis la liste des versions.
