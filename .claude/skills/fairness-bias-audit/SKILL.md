---
name: fairness-bias-audit
description: |
  Auditer en continu les évaluations produites par RecruteTech pour détecter et corriger les
  biais algorithmiques (genre, origine, accent, neurodiversité, handicap, séniorité, langue).
  Produire un rapport de biais publiable annuellement (conformité NYC AEDT, EU AI Act, futurs
  règlements RGPD article 22). Déclencher quand on parle de "audit de biais", "equité",
  "fairness", "discrimination IA", "AEDT compliance", "EU AI Act", "NYC bias audit",
  "disparate impact", "ACLU", "EPIC", "biais algorithmique", "test 4/5 rule", ou avant tout
  déploiement majeur d'une nouvelle rubrique ou d'un nouveau modèle. C'est le bouclier légal
  qui évite à RecruteTech le sort de HireVue (plaintes ACLU 2024 + EPIC 2019).
---

# Fairness & Bias Audit

## 1. Objectif

HireVue a perdu sa réputation à cause d'audits de biais externes (EPIC 2019, ACLU 2024). En 2026, le marché refuse les boîtes noires. RecruteTech doit faire l'inverse : **audit de biais publié, automatique, transparent** comme un avantage commercial.

Conformité visée :
- **NYC AEDT (Local Law 144)** : audit annuel de biais publié, consentement candidat, notification
- **EU AI Act** (high-risk classification) : transparence + supervision humaine + journal d'événements
- **RGPD article 22** : droit à l'explication + supervision humaine pour décisions automatisées
- **EEOC USA** : test des "4/5 rule" (Disparate Impact)

## 2. Trois mécanismes d'audit

### 2.1 Audit synthétique (continu, automatique)

Générer 500 candidats fictifs avec Claude Opus 4.7, en faisant varier UN attribut à la fois (genre du nom, origine inférée, accent simulé, niveau de français, syntaxe locuteur non-natif), tout le reste identique (même CV, même réponses).

Faire passer chacun à travers le pipeline RecruteTech complet → comparer les scores → mesurer le `disparate_impact_ratio`.

```
disparate_impact_ratio = score_moyen_groupe_minoritaire / score_moyen_groupe_majoritaire
```

Si `< 0.80` (la "4/5 rule") → **alerte critique**, blocage du déploiement de la rubrique/modèle, ticket ouvert automatiquement.

À exécuter :
- À chaque modification de rubrique
- À chaque mise à jour du modèle (Claude Opus 4.7 → 4.8)
- À chaque changement du prompt de `report_service.py`
- En CI : un test automatique fait tourner 50 cas avant tout merge en prod

### 2.2 Audit réel (mensuel, après collecte de données)

À partir du 200e entretien réel, lancer un audit sur les données réelles :

- Si l'attribut protégé est connu (consenti, anonymisé) → comparer les distributions de scores entre groupes
- Sinon → utiliser des proxies inférés statistiquement, en respectant la vie privée

Métriques calculées :
- `mean_score_by_group`
- `pass_rate_by_group` (% passant le seuil de hiring_recommendation `yes` ou `strong_yes`)
- `four_fifths_test` (passage / non-passage)
- `equal_opportunity_difference` (TPR par groupe)

Stocké dans une table `BiasAuditRun` avec horodatage et version du modèle.

### 2.3 Audit candidat individuel (sur demande)

Le candidat (via le mécanisme de `transparent-scoring-explainability`) peut demander un audit personnel : *"Mon évaluation a-t-elle été affectée par des biais ?"*

Réponse automatique :
- Compare le score reçu vs distribution des candidats similaires (mêmes skills, même séniorité)
- Liste les `evidence_pointers` et vérifie l'absence de mention d'attributs protégés
- Délivre un rapport personnalisé en moins de 7 jours (obligation RGPD : 30 jours max)

## 3. Liste des biais traqués

| Catégorie | Biais à tester | Méthode |
|---|---|---|
| **Genre** | Pénalisation des prénoms féminins | Audit synthétique avec swap prénoms |
| **Origine** | Pénalisation accents non-natifs (AR/Wolof/africain) | Audit avec TTS multi-accents |
| **Neurodiversité** | Hésitations / pauses pénalisées à tort | Cas synthétiques avec patterns autistiques/TDAH |
| **Handicap auditif** | Reconnaissance vocale dégradée → score baissé | Cas synthétiques avec articulation différente |
| **Handicap visuel** | Eye contact ratio bas pénalisé | **Désactiver** ce signal pour candidats ayant déclaré un handicap visuel (voir `accessibility-accommodations`) |
| **Séniorité** | Devine-t-on l'âge à partir de patterns linguistiques ? | Audit synthétique âges 22 / 35 / 55 |
| **Langue maternelle** | Score baissé pour syntaxe non-native ? | Audit avec textes traduits depuis l'AR/Wolof |
| **Origine sociale** | Établissements scolaires d'élite vs autres | **Exclusion totale** : Claude ne reçoit JAMAIS le nom d'école |

## 4. Implémentation

### 4.1 Service `BiasAuditService`

Module Python séparé : `backend/app/services/bias_audit_service.py`

```python
class BiasAuditService:
    def run_synthetic_audit(self, rubric_version: int, n: int = 500) -> AuditReport: ...
    def run_real_audit(self, since: datetime) -> AuditReport: ...
    def run_individual_audit(self, interview_token: str) -> IndividualAuditReport: ...
    def four_fifths_test(self, group_a_scores, group_b_scores) -> bool: ...
```

### 4.2 Stockage

```python
class BiasAuditRun(SQLModel, table=True):
    id: int = Field(primary_key=True)
    type: str  # "synthetic" | "real" | "individual"
    triggered_at: datetime
    model_version: str
    rubric_version: Optional[int]
    n_candidates: int
    metrics_json: dict = Field(sa_column=Column(JSON))
    flags: List[str] = Field(sa_column=Column(JSON))
    is_blocking: bool  # True si déclenche un blocage déploiement
    public_report_url: Optional[str]  # URL du rapport publiable (si applicable)
```

### 4.3 Endpoint public

```
GET /public/bias-audit
```

Affiche le **dernier rapport d'audit annuel** dans une page publique. Conformité NYC AEDT + transparence stratégique.

Format du rapport public :
- Période couverte
- Nb de candidats audités
- Résultats des 4/5 tests par catégorie
- Actions correctives prises (le cas échéant)
- Signature du DPO + date

## 5. Réponse aux flags

Niveau d'alerte gradué :

- **Vert** : tous les ratios > 0.95 → tout va bien
- **Jaune** : un ratio entre 0.80 et 0.95 → ticket ouvert pour investigation, pas de blocage
- **Orange** : un ratio entre 0.70 et 0.80 → review humaine obligatoire dans les 7 jours
- **Rouge** : ratio < 0.70 → **gel automatique** de la rubrique/modèle, retour version précédente, comm interne

## 6. Garde-fous

- **Anonymisation** : aucun audit ne stocke d'attribut protégé identifiable. Les scores agrégés sont par groupe ; aucun candidat individuel n'est identifié dans les rapports publics.
- **Pas de "fairness washing"** : les rapports doivent inclure les **vrais** chiffres, même mauvais. Mensonger = perte de confiance massive.
- **Indépendance** : prévoir un audit externe annuel par un cabinet tiers (cabinet d'audit IA spécialisé). Coût ~5-15 K€/an, mais marketing inestimable.
- **Communication des limites** : tout rapport indique clairement les limites méthodologiques (taille échantillon, proxies utilisés, attributs non testables).

## 7. Critères d'acceptation

- ✅ L'audit synthétique tourne en CI à chaque PR touchant `report_service.py` ou les rubriques.
- ✅ Aucune rubrique ne peut être publiée si elle échoue le test des 4/5.
- ✅ Le rapport public est généré automatiquement chaque année, signé, accessible sans login.
- ✅ Sur 100 cas synthétiques minoritaires : ratio > 0.85 (cible interne plus stricte que la 4/5 rule).
- ✅ Délai de réponse aux audits individuels candidats : médiane < 7 jours, max < 30 jours.

## 8. Dépendances

- **Forte** sur `transparent-scoring-explainability` (les evidence pointers sont la base de l'audit individuel)
- **Forte** sur `structured-rubric-builder` (audit déclenché à chaque nouvelle version)
- **Moyenne** sur `accessibility-accommodations` (désactivation des signaux pour PMR fait partie du fairness)
- **Moyenne** sur `anti-cheating-integrity-layer` (les flags d'intégrité ne doivent pas être biaisés)

## 9. Différenciation marketing

Pendant que HireVue gère ses procès, RecruteTech publie volontairement son audit annuel et le met en avant en page d'accueil. Page type : *"En 2026, nos évaluations ont passé le test des 4/5 sur 8 catégories d'attributs protégés. Voir le rapport."*

C'est l'inverse complet de HireVue qui est *réactif* sur les biais. RecruteTech est *proactif*. Argument de vente puissant pour les enterprises avec exigences ESG/DEI fortes.
