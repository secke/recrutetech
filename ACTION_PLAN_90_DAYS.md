# ⚡ PLAN D'ACTION IMMÉDIAT - 12 SEMAINES POUR LANCER

## 🎯 OBJECTIF: PRODUIT LIVE + 20 CLIENTS EN 90 JOURS

**Date de Début:** Aujourd'hui
**Date de Fin:** 90 jours plus tard
**Objectif Final:** 20 clients payants, 120K FCFA MRR

---

## 📅 SEMAINE PAR SEMAINE

### 🔥 SEMAINE 1: FONDATIONS

**Lundi - Mercredi (Jours 1-3): Setup Business**

**Matin:**
- [ ] Créer structure juridique (SARL ou SUARL)
  - Rendez-vous APIX (Agence de Promotion des Investissements)
  - Coût: ~100K FCFA
  - Délai: 48h
  
- [ ] Ouvrir compte bancaire entreprise
  - Bank of Africa ou Ecobank
  - Documents: NINEA, Statuts

- [ ] Setup outils essentiels:
  - [ ] Google Workspace (email pro@recrutetech.sn)
  - [ ] Notion (project management)
  - [ ] Slack (team communication - future)

**Après-midi:**
- [ ] Finir développement backend:
  - [ ] Database PostgreSQL setup
  - [ ] Auth système complet
  - [ ] Email service (SendGrid)
  - [ ] Tests end-to-end

**Soir:**
- [ ] Créer pitch deck (15 slides):
  1. Problem
  2. Solution
  3. Product demo
  4. Market size
  5. Business model
  6. Competition
  7. Traction (beta)
  8. Team
  9. Financials
  10. Roadmap
  11. Investment ask
  12-15. Appendix

**Jeudi - Vendredi (Jours 4-5): Branding**

**Matin:**
- [ ] Finaliser nom + acheter domaine
  - recrutetech.sn (si dispo)
  - recrutetech.ai (alternatif)
  - Coût: ~$15/an

- [ ] Logo professionnel:
  - Option 1: Fiverr ($50-100, livraison 3 jours)
  - Option 2: Canva + designer local
  - Format: SVG + PNG (couleur + blanc)

**Après-midi:**
- [ ] Créer brand guidelines:
  - Palette couleurs (3-4 couleurs)
  - Typographie (2 fonts)
  - Tone of voice (document)
  - Visual style

- [ ] Assets marketing:
  - [ ] Templates social media (Canva)
  - [ ] Email signature
  - [ ] Slide deck template

**DELIVERABLE SEMAINE 1:**
✅ Entreprise créée
✅ Backend opérationnel
✅ Brand identity prête

---

### 🎨 SEMAINE 2: LANDING PAGE + FRONTEND

**Lundi - Mardi (Jours 8-9): Landing Page**

**Outil:** Webflow, Framer, ou WordPress (Elementor)

**Structure landing page:**

1. **Hero Section**
   ```
   H1: Recrutez vos meilleurs talents avec l'IA
   Subtitle: Notre agent IA conduit des entretiens techniques 
             24/7 pour 95% moins cher qu'un recruteur humain
   CTA: [Demander une démo]
   Visual: Animation ou vidéo
   ```

2. **Problem Section**
   ```
   "Le recrutement technique vous prend trop de temps"
   - 20h par candidat embauché
   - 95% des candidats éliminés au screening
   - Coûts élevés ($60 par screening)
   ```

3. **Solution Section**
   ```
   "RecruteTech automatise vos premiers entretiens"
   - IA conversationnelle qui parle avec candidats
   - Évaluation automatique en temps réel
   - Rapports détaillés avec recommandations
   ```

4. **How It Works (3 étapes)**
   ```
   1. Créez votre interview en 5 min
   2. Invitez les candidats (ils passent l'entretien 24/7)
   3. Recevez les rapports détaillés
   ```

5. **Features**
   - Entretiens conversationnels IA
   - Multi-types (technique, comportemental)
   - Rapports automatiques
   - Disponible 24/7
   - Support français

6. **Pricing**
   - 3 plans (Starter, Pro, Enterprise)
   - Prix en FCFA
   - CTA sur chaque plan

7. **Social Proof** (après beta)
   - Logos clients
   - Testimonials
   - Stats (X candidats évalués)

8. **FAQ**
   - 8-10 questions fréquentes

9. **CTA Final**
   ```
   "Prêt à révolutionner votre recrutement ?"
   [Demander une démo]
   ```

**Setup technique:**
- [ ] Google Analytics
- [ ] Mixpanel events
- [ ] HubSpot form (demo requests)
- [ ] Calendly integration (auto-booking démos)

**Mercredi - Vendredi (Jours 10-12): Frontend Candidat**

**Priorité:** Interface minimaliste mais fonctionnelle

**Pages essentielles:**
1. **Welcome page** (`/interview/{token}`)
   - Infos interview
   - Durée, nombre questions
   - Test micro/caméra
   - [Commencer l'entretien]

2. **Interview page** (`/interview/{token}/live`)
   - Vidéo candidat (WebRTC)
   - Affichage texte IA
   - Player audio IA
   - Indicateur progression
   - Timer

3. **Completion page** (`/interview/{token}/complete`)
   - Merci
   - Prochaines étapes
   - Formulaire feedback (optionnel)

**Tech Stack:**
- React + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- WebRTC API
- Socket.io client

**Composants clés:**
- VideoCapture (WebRTC getUserMedia)
- AudioPlayer (pour réponses IA)
- TranscriptDisplay (affichage conversation)
- ProgressBar

**DELIVERABLE SEMAINE 2:**
✅ Landing page live
✅ Frontend candidat fonctionnel

---

### 🧪 SEMAINE 3-4: BETA TESTING

**Objectif:** 10 clients beta actifs

**Lundi (Jour 15): Préparation Beta**

- [ ] Créer liste 50 prospects beta:
  - 20 contacts warm (réseau personnel)
  - 30 cold (LinkedIn research)
  
- [ ] Template outreach:
  ```
  Subject: Aide-moi à tester mon IA de recrutement ?
  
  Salut [Nom],
  
  Je lance RecruteTech, une IA qui fait les entretiens 
  techniques à ta place. Je cherche 10 entreprises pour 
  tester gratuitement.
  
  Intéressé ? Je te fais une démo rapide ?
  
  Mbabba
  ```

- [ ] Setup dashboard entreprise basique:
  - Login/signup
  - Créer interview
  - Inviter candidat
  - Voir résultats

**Mardi - Vendredi (Jours 16-19): Outreach**

**Daily routine:**
- Matin (9h-12h): 10 outreach messages
- Après-midi (14h-17h): 3 demo calls
- Soir (18h-20h): Follow-ups

**Demo call structure (30 min):**
1. Small talk (2 min)
2. Understand their process (5 min)
3. Product demo (15 min)
4. Q&A (5 min)
5. Signup + setup (3 min)

**Semaine 4 (Jours 22-26): Onboarding Beta**

- [ ] 10 clients beta signés
- [ ] Onboarding call avec chacun (1h)
- [ ] Première interview ensemble
- [ ] Setup support (WhatsApp group)

**Collecte feedback:**
- Check-in hebdomadaire
- Formulaire après chaque interview
- Note les bugs et suggestions

**DELIVERABLE SEMAINE 3-4:**
✅ 10 beta clients
✅ 50+ interviews réalisées
✅ Feedback documenté

---

### 📝 SEMAINE 5-6: CONTENT MARKETING

**Objectif:** Établir présence online + thought leadership

**Semaine 5: Articles LinkedIn**

**Lundi (Jour 29): Article 1**
```
Title: "Pourquoi j'ai quitté mon job pour créer une IA de recrutement"

Outline:
- Mon parcours (AI Engineer)
- Le problème que j'ai vécu
- Comment l'idée est née
- Ce qu'on a construit
- Nos premiers résultats
- Vision pour l'Afrique

Longueur: 1000 mots
CTA: Rejoindre beta / Commenter
```

**Mercredi (Jour 31): Article 2**
```
Title: "L'IA va-t-elle remplacer les recruteurs ? (Spoiler: Non)"

Outline:
- Débat actuel IA et emploi
- Ce que l'IA fait MIEUX (screening, speed, standardisation)
- Ce que l'IA fait MAL (empathie, culture fit, décision finale)
- Notre vision: IA = assistant, pas replacement
- Use cases où IA excelle

CTA: Discussion dans comments
```

**Vendredi (Jour 33): Article 3**
```
Title: "Nous avons évalué 50 candidats en 2 jours avec l'IA"

Outline:
- Case study client beta
- Leur processus avant/après
- Chiffres concrets (temps, coût, qualité)
- Challenges rencontrés
- Résultats
- Leur testimonial

CTA: Tester gratuitement
```

**Semaine 6: Blog SEO + Social**

**Mardi-Jeudi (Jours 36-38): 3 Blog Posts SEO**

Blog 1: "Comment recruter un développeur au Sénégal [Guide 2025]"
- Keyword: "recruter développeur Sénégal"
- 2000 mots
- Sections: Où chercher, Salaires, Questions, Processus
- Internal links, Images, CTA

Blog 2: "30 Questions d'Entretien Technique [Template Gratuit]"
- Keyword: "questions entretien technique"
- Liste questions Python, JS, React, etc.
- Lead magnet: PDF téléchargeable (email required)

Blog 3: "Coût Réel d'un Recrutement Raté (+ Calcul ROI)"
- Keyword: "coût recrutement"
- ROI calculator embed
- CTA: Économisez avec RecruteTech

**Vendredi (Jour 40): Setup Social**

- [ ] 10 posts LinkedIn programmés (Buffer/Hootsuite)
- [ ] 5 threads Twitter préparés
- [ ] Visuels créés (Canva)

**DELIVERABLE SEMAINE 5-6:**
✅ 3 articles LinkedIn publiés
✅ 3 blog posts SEO live
✅ Social media calendar 1 mois

---

### 🚀 SEMAINE 7-8: PREPARATION LANCEMENT

**Objectif:** Tout prêt pour lancement commercial

**Semaine 7: Pricing & Facturation**

**Lundi-Mardi (Jours 43-44): Setup Paiements**

- [ ] Intégrer Stripe:
  - Compte Stripe créé
  - Webhooks setup
  - 3 subscription plans
  - Checkout flows

- [ ] Alternative locale: Wave
  - Pour Mobile Money (Orange/Free)
  - API integration

- [ ] Facturation automatique:
  - Templates factures
  - Email confirmation paiement
  - Récap mensuel

**Mercredi (Jour 45): Pricing Finalisé**

Lancement pricing (50% discount 3 mois):
- **Starter**: 25,000 FCFA/mois (au lieu de 50K)
- **Professional**: 75,000 FCFA/mois (au lieu de 150K)
- **Enterprise**: 200,000 FCFA/mois (au lieu de 400K)

**Jeudi-Vendredi (Jours 46-47): Sales Assets**

- [ ] One-pager PDF (prospect handout)
- [ ] Sales deck (20 slides)
- [ ] Case studies (2-3 beta clients)
- [ ] ROI calculator (Excel + Web)
- [ ] Demo video (3 min)
- [ ] Email templates (cold, follow-up)

**Semaine 8: Outreach Préparation**

**Lundi-Mardi (Jours 50-51): Prospect List**

- [ ] Scraper LinkedIn: 200 RH/Founders
  - Dakar: 100
  - Côte d'Ivoire: 50
  - Cameroun: 50

- [ ] Enrichir data (Hunter.io):
  - Emails
  - Phone numbers
  - Company size
  - Recent hiring posts

- [ ] Setup CRM (HubSpot free):
  - Import contacts
  - Séquences emails
  - Pipeline setup

**Mercredi-Vendredi (Jours 52-54): Campaigns Setup**

- [ ] LinkedIn Ads:
  - 5 ad creatives
  - 3 audiences
  - Budgets alloués
  - Tracking pixels

- [ ] Email sequences:
  - Cold outreach (5 emails)
  - Trial nurture (7 emails)
  - Onboarding (5 emails)

- [ ] Calendar:
  - Calendly setup
  - Time slots pour demos
  - Auto-reminders

**DELIVERABLE SEMAINE 7-8:**
✅ Paiements opérationnels
✅ Sales assets complets
✅ 200 prospects qualifiés
✅ Campaigns prêtes à lancer

---

### 💰 SEMAINE 9-12: LANCEMENT & ACQUISITION

**Objectif:** 20 clients payants

**Semaine 9: Launch Week**

**Lundi (Jour 57): LAUNCH DAY 🚀**

**Morning:**
- [ ] Envoyer email beta users:
  ```
  "RecruteTech est maintenant ouvert à tous !
  
  En tant que beta user, voici votre offre exclusive:
  - 75% de réduction an 1
  - Support prioritaire à vie
  - Ambassador badge
  
  Upgrade maintenant (1 clic)"
  ```
  
  **Objectif:** 5 beta → paid

- [ ] Post LinkedIn announcement:
  ```
  "Aujourd'hui, on lance RecruteTech 🚀
  
  La première IA qui conduit des entretiens techniques 
  en Afrique francophone.
  
  Après 3 mois de beta avec 10 entreprises, on ouvre 
  au public.
  
  50% de réduction pour les 50 premiers clients.
  
  Lien en commentaire 👇"
  ```

- [ ] Launch LinkedIn Ads (500K budget/mois)
- [ ] Activate Google Ads (200K budget/mois)

**Afternoon:**
- [ ] Cold outreach batch 1: 50 emails
- [ ] LinkedIn DMs batch 1: 20 messages
- [ ] Calls: 10 warm leads

**Mardi-Vendredi (Jours 58-61): Aggressive Outreach**

**Daily Routine:**
```
9h-10h:   Check leads / Respond inquiries
10h-12h:  Demos (3-4 calls)
12h-14h:  Lunch + prospecting (LinkedIn)
14h-16h:  Cold calls (20 appels)
16h-17h:  Email outreach (30 emails)
17h-18h:  Follow-ups
18h-19h:  Social media engagement
19h-20h:  Prep demain
```

**Targets semaine 9:**
- 20 demos réalisées
- 10 trials lancés
- 5 clients signés

**Semaine 10-11: Intensification**

**Même routine mais intensifiée:**
- 30 demos/semaine (6/jour)
- 50 calls/semaine
- 100 emails/semaine

**Nouveaux canaux:**

**Partnerships:**
- [ ] Deal Jokkolabs: 3 mois gratuit pour startups
- [ ] Deal CTIC: Présentation devant incubés
- [ ] Deal écoles tech: Discount alumni

**Events:**
- [ ] Sponsoring Startup Weekend (500K)
- [ ] Pitch devant investisseurs DakarVentures
- [ ] Networking RH Meetup

**Targets semaine 10-11:**
- +10 clients (total: 15)
- MRR: 1.8M FCFA

**Semaine 12: Sprint Final**

**Objectif:** Atteindre 20 clients

**Tactics:**
- Urgency: "Dernière semaine 50% discount"
- Personal touch: Appels personnels tous prospects chauds
- Overdeliver: Setup calls gratuits avec tous trials
- Referrals: Demander références à clients actuels

**Daily push:**
- 40 cold calls
- 50 emails
- 8 demos
- All-in effort

**DELIVERABLE SEMAINE 9-12:**
✅ 20 clients payants
✅ 2.4M FCFA MRR
✅ Pipeline de 50 prospects

---

## 📊 TRACKING & METRICS

### Dashboard Hebdomadaire

**Acquisition Funnel:**
```
Landing page visitors: _____
Demo requests: _____
Demos done: _____
Trials started: _____
Clients signed: _____

Conversion rates:
Visitor → Demo request: ____%
Demo → Trial: ____%
Trial → Paid: ____%
```

**Financial:**
```
MRR: _____ FCFA
New MRR: _____ FCFA
Churned MRR: _____ FCFA
ARPU: _____ FCFA
```

**Activity:**
```
Emails sent: _____
Calls made: _____
LinkedIn connections: _____
Content published: _____
```

### Weekly Review (Vendredi 17h)

Questions:
1. Avons-nous atteint nos objectifs hebdo ?
2. Quels blocages avons-nous rencontrés ?
3. Qu'est-ce qui a bien marché ?
4. Qu'est-ce qui n'a pas marché ?
5. Quelle est notre priorité #1 semaine prochaine ?

---

## 🎯 SEMAINE PAR SEMAINE SUMMARY

| Semaine | Focus | Deliverable | Goal |
|---------|-------|-------------|------|
| **1** | Fondations | Entreprise + Backend | Setup complet |
| **2** | Product | Landing + Frontend | Produit prêt |
| **3-4** | Beta | 10 clients beta | Validation |
| **5-6** | Content | 6 articles + 3 blogs | Awareness |
| **7-8** | Prep | Sales assets | Ready to sell |
| **9-12** | Launch | Acquisition | 20 clients |

---

## ⚡ QUICK WINS (Priorités Absolues)

Si tu manques de temps, FOCUS sur ces 5 choses:

**1. Landing Page** (Jour 8-9)
- Webflow template
- Copier bon copy existant
- Form démo → Calendly

**2. Frontend Candidat** (Jour 10-12)
- React basique qui marche
- WebRTC fonctionnel
- Pas besoin d'être parfait

**3. 10 Beta Clients** (Semaine 3-4)
- Network personnel
- Offre généreuse (6 mois gratuit)
- Collect testimonials

**4. 3 Articles LinkedIn** (Semaine 5)
- Thought leadership
- Authentique, personnel
- Share ton journey

**5. Outreach Massif** (Semaine 9-12)
- 200 prospects contactés
- 50 demos faites
- 20 clients signés

---

## 💪 MINDSET & MOTIVATION

### Rules for Success

**1. Bias for Action**
- Ship > Perfect
- Done > Perfect
- Fast > Slow

**2. Focus**
- 1 priorité par jour
- Deep work 4h/jour
- No multitasking

**3. Persistence**
- 100 "non" avant d'arrêter
- Chaque refus = apprentissage
- Resilience > Talent

**4. Customer Obsession**
- Talk to users every day
- Solve their problems
- Overdeliver always

**5. Speed**
- Launch in 90 days or fail
- Momentum > Perfection
- Iterate weekly

---

## 🆘 SI TU ES BLOQUÉ

### Common Blockers & Solutions

**"Je ne sais pas coder le frontend"**
→ Hire freelance sur Upwork ($500-1000)
→ Ou utilise no-code (Bubble, Softr)

**"Je n'ai pas assez d'argent"**
→ Bootstrap (consultancy en parallèle)
→ Pre-sell (10 clients × 100K = 1M)
→ Apply accelerators (DER/FJ)

**"Personne ne répond à mes emails"**
→ Change ton approach (plus personnel)
→ Call direct (plus efficace)
→ Warm intros via réseau

**"Le produit n'est pas parfait"**
→ Ship quand même
→ Perfect is the enemy of done
→ Iterate based on feedback

**"J'ai peur d'échouer"**
→ Normal, everyone does
→ 90% of startups fail
→ But 100% of those who don't start fail

---

## 🚀 START NOW

**Prochaine action (dans les 2h):**

1. [ ] Read ce document complètement
2. [ ] Choose semaine 1 tasks
3. [ ] Block calendar pour développement
4. [ ] Start coding database

**Aujourd'hui:**
- [ ] Finish backend database
- [ ] Register business (APIX)
- [ ] Buy domain name

**Cette semaine:**
- [ ] Backend 100% done
- [ ] Landing page live
- [ ] First 5 beta prospects contacted

---

**TU AS 90 JOURS. GO! ⚡**

Le clock démarre MAINTENANT. Pas demain. Pas lundi prochain.

**AUJOURD'HUI.**

Bonne chance ! 💪🚀
