---
name: ats-integration-hub
description: |
  Connecter RecruteTech aux principaux ATS du marché pour synchroniser candidats, statuts et
  rapports automatiquement, sans saisie manuelle. Couvre Greenhouse, Lever, Workday, Teamtailor,
  Recruitee, Ashby, et fournit aussi un mécanisme générique webhook + API pour les ATS custom.
  Déclencher quand un recruteur dit "intégrer avec Greenhouse", "synchroniser avec notre ATS",
  "Workday", "Lever", "Recruitee", "API ATS", "webhook", "envoyer le rapport dans notre HRIS",
  "candidate sync", ou pendant l'onboarding d'une entreprise mid-market/enterprise. Sans ce skill,
  RecruteTech reste un outil "à part" et perd les deals B2B qui exigent des intégrations natives.
---

# ATS Integration Hub

## 1. Objectif

HireVue a gagné le mid/large market précisément parce que ses intégrations ATS sont matures (Workday, Greenhouse, Lever, SAP SuccessFactors, etc.). Crosschq a misé spécifiquement sur Workday Marketplace. Mercor reste isolé et est moins adopté côté grandes entreprises pour cette raison.

Pour casser le plafond de verre B2B, RecruteTech doit livrer **6 connecteurs natifs** + **1 webhook générique** dans les 3 prochains mois.

## 2. Connecteurs prioritaires

Classement par parts de marché global et adoption francophone :

1. **Greenhouse** (leader scale-ups) — API REST mature, OAuth 2.0
2. **Lever** (mid-market) — API REST, webhooks
3. **Teamtailor** (très présent en Europe + Afrique francophone) — API REST
4. **Recruitee** (PME francophones) — API REST
5. **Workday** (enterprise) — Workday Cloud Connect, plus complexe (XML/SOAP)
6. **Ashby** (next-gen scale-ups, croissance rapide) — API REST moderne, GraphQL

Plus :
7. **Generic webhook + REST API** — pour les ATS custom ou non listés (LinkedIn Talent Hub, Personio, etc.)

## 3. Cas d'usage couverts

### 3.1 Sync candidat (entrée)

Quand un candidat est créé dans l'ATS pour un poste lié à RecruteTech :
- Webhook ATS → endpoint RecruteTech `/integrations/{ats}/candidate-created`
- RecruteTech crée automatiquement une `Interview` en statut `pending_invitation`
- Email d'invitation au candidat (via SMTP existant) avec lien personnalisé

### 3.2 Sync statut (sortie)

Quand le statut d'un entretien change dans RecruteTech :
- `pending` → `in_progress` → `completed` → `report_ready` → `shortlisted`/`declined`
- Push vers l'ATS via API (mise à jour du statut candidat)
- Si l'ATS supporte les notes : push de la note RH du recruteur

### 3.3 Sync rapport (sortie)

Quand le rapport est généré par Claude Opus 4.7 :
- Push automatique du rapport (PDF + JSON) dans la fiche candidat ATS
- Lien direct vers le dashboard RecruteTech pour consultation détaillée
- Si l'ATS supporte les scorecards : mapping `skill_assessments` → champs de scorecard ATS

### 3.4 Sync rejet/acceptation (entrée)

Quand un candidat est marqué "Rejected" ou "Hired" dans l'ATS :
- Mise à jour côté RecruteTech pour les analytics (`time_to_hire`, `predict_vs_actual_accuracy`)
- Si rejeté : déclencher (avec consentement recruteur) l'envoi de la lettre formative au candidat

## 4. Architecture

### 4.1 Module `integrations/`

```
backend/app/integrations/
├── __init__.py
├── base.py            # Interface ATSConnector (abstract)
├── greenhouse.py      # GreenhouseConnector
├── lever.py
├── teamtailor.py
├── recruitee.py
├── workday.py
├── ashby.py
└── generic_webhook.py
```

Interface de base :

```python
class ATSConnector(ABC):
    @abstractmethod
    def authenticate(self, credentials: dict) -> bool: ...
    @abstractmethod
    def sync_candidate_in(self, candidate_data: dict) -> str:  # returns interview_token
    @abstractmethod
    def push_status(self, interview_token: str, status: str) -> bool: ...
    @abstractmethod
    def push_report(self, interview_token: str, report_json: dict, pdf: bytes) -> bool: ...
    @abstractmethod
    def handle_webhook(self, payload: dict) -> Optional[Action]: ...
    @abstractmethod
    def health_check(self) -> bool: ...
```

### 4.2 OAuth & gestion des credentials

- Page côté HR `/hr/integrations` — interface "App Store" : carrousel des connecteurs disponibles avec status (Connected / Not connected / Error)
- Pour chaque connecteur cliqué : lance le flow OAuth standard (sauf Workday qui demande un setup SOAP custom)
- Tokens stockés chiffrés (Fernet ou KMS) dans la DB
- Auto-refresh des tokens OAuth, monitoring d'expiration

```python
class ATSCredential(SQLModel, table=True):
    company_id: int = Field(foreign_key="company.id")
    ats_name: str  # "greenhouse" | "lever" | ...
    encrypted_token: str
    encrypted_refresh_token: Optional[str]
    expires_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    last_error: Optional[str]
```

### 4.3 Job runner

Un worker (Celery / RQ / Arq) traite :
- Les webhooks entrants (file de queue)
- Les pushs sortants (au moment où une `Interview` change de statut)
- Les retries en cas d'échec (exponential backoff, max 5 tentatives)
- Les health checks (ping toutes les 6h pour détecter tokens expirés)

### 4.4 Mapping des champs

Chaque ATS a son propre vocabulaire. Créer une table de mapping par connecteur :

```python
GREENHOUSE_STATUS_MAP = {
    "pending_invitation": "active",
    "in_progress": "in_progress",
    "completed": "completed",
    "shortlisted": "advanced",
    "declined": "rejected",
}
```

Mapping configurable en UI pour que les RH puissent ajuster.

## 5. Webhook générique (fallback)

Pour les ATS non listés, exposer 2 endpoints :

```
POST /api/integrations/webhook/inbound
  Headers: X-Webhook-Secret
  Body: {"event": "candidate_created", "candidate": {...}, "role": {...}}
```

et l'inverse — RecruteTech peut envoyer des webhooks vers une URL configurée par l'entreprise :

```
Outbound:
POST {company.webhook_url}
  Headers: X-RecruteTech-Signature: HMAC
  Body: {"event": "report_ready", "interview_token": "...", "report": {...}}
```

Documentation publique de l'API REST + webhook (Swagger / Redoc) sur `/api/docs`.

## 6. Roadmap prioritaire

| Sprint | Connecteurs livrés |
|---|---|
| Sprint 1 (2 sem) | **Greenhouse** + **Lever** + Webhook générique |
| Sprint 2 (2 sem) | **Teamtailor** + **Recruitee** (orientation francophone Afrique/Europe) |
| Sprint 3 (3 sem) | **Ashby** + amélioration Webhook (signature, retries, idempotency) |
| Sprint 4 (4 sem) | **Workday** (le plus complexe, dernière étape) |

## 7. Garde-fous

- **Idempotency** : tout webhook entrant doit pouvoir être rejoué sans dupliquer une Interview. Utiliser un `idempotency_key` dans le payload.
- **Validation HMAC** : tous les webhooks (entrants ET sortants) signés HMAC-SHA256 avec secret par entreprise.
- **Rate limiting** : protection contre le DDoS via webhook (max 100 req/min par entreprise).
- **Audit log** : chaque sync (entrée/sortie) loggé avec timestamp, payload, résultat. Conservation 1 an.
- **RGPD** : avant tout push de rapport vers l'ATS, vérifier que le candidat a consenti au partage avec l'entreprise. Champ `Interview.consent_share_with_company` (déjà implicite dans le flow actuel mais à formaliser).
- **Pas de fuite cross-entreprise** : un connecteur de l'entreprise A ne doit jamais accéder aux données de l'entreprise B (cloisonnement strict).

## 8. Critères d'acceptation

- ✅ Un connecteur (Greenhouse en pilote) peut être branché par un RH non-technique en moins de 10 min via OAuth.
- ✅ La sync candidat entrant est déclenchée en moins de 5 secondes après création dans l'ATS.
- ✅ Le push du rapport sortant est livré en moins de 30 secondes après génération Claude.
- ✅ Sur 1000 webhooks de test : 99.9 % traités avec succès, 100 % idempotents (rejoués sans duplication).
- ✅ Documentation API publique testée avec un partenaire externe (livraison d'un exemple d'intégration custom en < 1h).
- ✅ Aucune fuite cross-entreprise dans les tests de pénétration (audit sécu obligatoire avant prod).

## 9. Dépendances

- Aucune dépendance dure sur d'autres skills.
- Synergie avec `transparent-scoring-explainability` (le rapport poussé contient les evidence pointers).
- Synergie avec `structured-rubric-builder` (mapping rubric skills → ATS scorecard fields).

## 10. Pourquoi P1 et pas P0

C'est haute valeur business mais coût d'intégration élevé (chaque ATS demande 1-2 semaines de dev + tests + sécurité). À démarrer dès que la valeur core (P0) est livrée. Sans ATS, on signe SMB ; avec ATS, on accède au mid-market et enterprise — c'est le saut de croissance principal.
