import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  STRINGS,
  CheckIcon,
  ChevronRight,
  LockIcon,
  PlusIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LayersIcon,
} from '../components/shared';
import { SideNav } from './HRDashboard';
import { api } from '../lib/api';

// ── Templates ──────────────────────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: 'backend_mid',
    label_fr: 'Backend Mid',
    label_en: 'Backend Mid',
    description_fr: 'Python/Node backend intermédiaire. API REST, bases de données, tests.',
    description_en: 'Mid-level Python/Node backend. REST APIs, databases, testing.',
    rubric: {
      language: 'fr',
      tone: 'neutral',
      duration_minutes: 40,
      skills: [
        {
          id: 'backend_core',
          name: 'Backend core',
          weight: 35,
          level_descriptors: {
            junior: 'Écrit des endpoints simples avec aide, connaît les bases HTTP.',
            mid: 'Construit des APIs REST autonomement, gère async et ORM.',
            senior: 'Conçoit des services scalables, debug en prod, connaît les internals du framework.',
            staff: 'Fixe la direction technique, évalue les frameworks, mentor.',
          },
        },
        {
          id: 'databases',
          name: 'Bases de données',
          weight: 25,
          level_descriptors: {
            junior: 'Écrit des requêtes SQL basiques, comprend les relations.',
            mid: 'Optimise les requêtes, comprend les index, choix SQL vs NoSQL.',
            senior: 'Modélise pour la scalabilité, analyse les query plans, maîtrise les migrations.',
            staff: 'Choisit les technologies de stockage à l\'échelle, partitionnement, réplication.',
          },
        },
        {
          id: 'code_quality',
          name: 'Qualité du code',
          weight: 20,
          level_descriptors: {
            junior: 'Code lisible, quelques tests unitaires, respecte les conventions.',
            mid: 'Tests complets, bonne décomposition, gestion d\'erreurs cohérente.',
            senior: 'Code maintenable et testable, revue efficace, considère les edge cases.',
            staff: 'Définit les standards de qualité, systèmes de test robustes.',
          },
        },
        {
          id: 'communication',
          name: 'Communication technique',
          weight: 20,
          level_descriptors: {
            junior: 'Explique son code avec guidance.',
            mid: 'Explique les trade-offs, structure ses réponses.',
            senior: 'Synthèse claire de problèmes complexes, pose les bonnes questions.',
            staff: 'Communique à tous les niveaux, aligne les équipes techniques.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Briser la glace, comprendre le parcours du candidat.',
          duration_minutes: 5,
          skills_evaluated: ['communication'],
        },
        {
          id: 'experience',
          name: 'Expérience',
          objective: 'Explorer les projets passés et les défis techniques rencontrés.',
          duration_minutes: 15,
          skills_evaluated: ['backend_core', 'databases', 'communication'],
        },
        {
          id: 'technical',
          name: 'Questions techniques',
          objective: 'Évaluer les connaissances techniques en profondeur.',
          duration_minutes: 15,
          skills_evaluated: ['backend_core', 'databases', 'code_quality'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: true,
        min_questions: 1,
        max_questions: 3,
      },
    },
  },
  {
    id: 'backend_senior',
    label_fr: 'Backend Senior',
    label_en: 'Backend Senior',
    description_fr: 'Backend senior. Architecture, performance, leadership technique.',
    description_en: 'Senior backend. Architecture, performance, tech leadership.',
    rubric: {
      language: 'fr',
      tone: 'rigorous',
      duration_minutes: 50,
      skills: [
        {
          id: 'system_design',
          name: 'System design',
          weight: 30,
          level_descriptors: {
            junior: 'Comprend les composants de base (load balancer, cache, DB).',
            mid: 'Conçoit des systèmes simples avec trade-offs clairs.',
            senior: 'Conçoit des systèmes distribués complexes, gère les failure modes.',
            staff: 'Pilote les choix d\'architecture à l\'échelle de l\'organisation.',
          },
        },
        {
          id: 'backend_depth',
          name: 'Profondeur backend',
          weight: 30,
          level_descriptors: {
            junior: 'Connaît les bases, peut écrire des APIs simples.',
            mid: 'Maîtrise les patterns avancés (async, pooling, queues).',
            senior: 'Connaît les internals du framework, optimise les performances.',
            staff: 'Peut contribuer aux frameworks open-source, vision long-terme.',
          },
        },
        {
          id: 'leadership',
          name: 'Leadership technique',
          weight: 20,
          level_descriptors: {
            junior: 'Suit les directives, pose des questions.',
            mid: 'Prend en charge des sous-systèmes, mentor les juniors.',
            senior: 'Mène des projets complexes, influence les décisions techniques.',
            staff: 'Définit la vision technique, recrute, fait évoluer les pratiques.',
          },
        },
        {
          id: 'communication',
          name: 'Communication',
          weight: 20,
          level_descriptors: {
            junior: 'Communique clairement avec son équipe directe.',
            mid: 'Explique les décisions techniques aux non-techniques.',
            senior: 'Écrit des ADR clairs, présente à la direction.',
            staff: 'Aligne les parties prenantes, communication de crise.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Contexte et parcours senior.',
          duration_minutes: 5,
          skills_evaluated: ['communication'],
        },
        {
          id: 'past_experience',
          name: 'Projets phares',
          objective: 'Décision architecturale la plus importante.',
          duration_minutes: 15,
          skills_evaluated: ['backend_depth', 'leadership', 'communication'],
        },
        {
          id: 'system_design',
          name: 'System design',
          objective: 'Concevoir un système distribué à la volée.',
          duration_minutes: 20,
          skills_evaluated: ['system_design', 'communication'],
        },
        {
          id: 'leadership_dive',
          name: 'Leadership',
          objective: 'Comment avez-vous influencé une décision technique difficile ?',
          duration_minutes: 5,
          skills_evaluated: ['leadership'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: true,
        min_questions: 2,
        max_questions: 4,
      },
    },
  },
  {
    id: 'frontend_mid',
    label_fr: 'Frontend Mid',
    label_en: 'Frontend Mid',
    description_fr: 'React/Vue frontend intermédiaire. Performance, accessibilité, CSS.',
    description_en: 'Mid-level React/Vue frontend. Performance, a11y, CSS.',
    rubric: {
      language: 'fr',
      tone: 'warm',
      duration_minutes: 40,
      skills: [
        {
          id: 'js_mastery',
          name: 'Maîtrise JavaScript/TypeScript',
          weight: 30,
          level_descriptors: {
            junior: 'ES6+, closures basiques, promesses.',
            mid: 'Closures avancées, event loop, TypeScript, optimisations.',
            senior: 'Moteur V8, micro/macro tasks, design patterns, performance.',
            staff: 'Contribue à des libs open-source, vision long-terme JS.',
          },
        },
        {
          id: 'react_patterns',
          name: 'Patterns React',
          weight: 30,
          level_descriptors: {
            junior: 'Composants fonctionnels, useState, useEffect.',
            mid: 'Hooks custom, Context, memoisation, code splitting.',
            senior: 'Architecture scalable, patterns avancés (compound, render props), perf.',
            staff: 'Définit les patterns de l\'organisation, contribue à l\'écosystème.',
          },
        },
        {
          id: 'css_design',
          name: 'CSS & design systems',
          weight: 20,
          level_descriptors: {
            junior: 'Flexbox, grid basique, responsive basique.',
            mid: 'CSS avancé, animations, design tokens, BEM ou CSS-in-JS.',
            senior: 'Construit des design systems, perf CSS, accessibilité visuelle.',
            staff: 'Pilote le design system de l\'organisation.',
          },
        },
        {
          id: 'accessibility',
          name: 'Accessibilité',
          weight: 20,
          level_descriptors: {
            junior: 'Connaît les bases WCAG, utilise les balises sémantiques.',
            mid: 'WCAG 2.1 AA, aria-labels, navigation clavier, contraste.',
            senior: 'Audite l\'accessibilité, met en place des tests automatisés.',
            staff: 'Définit la politique d\'accessibilité, forma les équipes.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Parcours et projets frontend marquants.',
          duration_minutes: 5,
          skills_evaluated: ['js_mastery'],
        },
        {
          id: 'deep_dive',
          name: 'Deep dive React',
          objective: 'Architecture d\'une SPA complexe.',
          duration_minutes: 15,
          skills_evaluated: ['react_patterns', 'js_mastery'],
        },
        {
          id: 'css_a11y',
          name: 'CSS & accessibilité',
          objective: 'Design system et contraintes d\'accessibilité.',
          duration_minutes: 15,
          skills_evaluated: ['css_design', 'accessibility'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: false,
        min_questions: 1,
        max_questions: 2,
      },
    },
  },
  {
    id: 'fullstack_mid',
    label_fr: 'Fullstack Mid',
    label_en: 'Fullstack Mid',
    description_fr: 'Profil fullstack généraliste. Frontend + backend + DevOps basique.',
    description_en: 'Generalist fullstack. Frontend + backend + basic DevOps.',
    rubric: {
      language: 'fr',
      tone: 'neutral',
      duration_minutes: 45,
      skills: [
        {
          id: 'frontend',
          name: 'Frontend',
          weight: 25,
          level_descriptors: {
            junior: 'HTML/CSS/JS basique, composants simples.',
            mid: 'React ou Vue maîtrisé, state management, perf.',
            senior: 'Architecture frontend scalable, design system.',
            staff: 'Vision frontend à l\'échelle de l\'organisation.',
          },
        },
        {
          id: 'backend',
          name: 'Backend',
          weight: 25,
          level_descriptors: {
            junior: 'APIs REST basiques, ORM simple.',
            mid: 'Services complets, gestion des erreurs, tests.',
            senior: 'Architecture microservices, performance, sécurité.',
            staff: 'Définit l\'architecture backend de l\'organisation.',
          },
        },
        {
          id: 'databases',
          name: 'Bases de données',
          weight: 25,
          level_descriptors: {
            junior: 'SQL basique, schémas simples.',
            mid: 'SQL avancé, index, migrations, NoSQL.',
            senior: 'Performance DB, modélisation avancée, réplication.',
            staff: 'Stratégie de données à grande échelle.',
          },
        },
        {
          id: 'devops_basics',
          name: 'DevOps / CI-CD',
          weight: 25,
          level_descriptors: {
            junior: 'Git, sait déployer avec un guide.',
            mid: 'CI/CD basique, Docker, variables d\'environnement.',
            senior: 'Kubernetes, monitoring, IaC basique.',
            staff: 'Plateforme ingénierie, SRE.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Parcours fullstack et stack favorite.',
          duration_minutes: 5,
          skills_evaluated: ['frontend', 'backend'],
        },
        {
          id: 'frontend_dive',
          name: 'Frontend',
          objective: 'Architecture et patterns frontend.',
          duration_minutes: 15,
          skills_evaluated: ['frontend', 'databases'],
        },
        {
          id: 'backend_dive',
          name: 'Backend & infra',
          objective: 'Services, base de données, déploiement.',
          duration_minutes: 20,
          skills_evaluated: ['backend', 'databases', 'devops_basics'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: true,
        min_questions: 1,
        max_questions: 3,
      },
    },
  },
  {
    id: 'data_engineer_mid',
    label_fr: 'Data Engineer Mid',
    label_en: 'Data Engineer Mid',
    description_fr: 'Ingénieur data intermédiaire. Pipelines, Spark, SQL, orchestration.',
    description_en: 'Mid-level data engineer. Pipelines, Spark, SQL, orchestration.',
    rubric: {
      language: 'fr',
      tone: 'neutral',
      duration_minutes: 45,
      skills: [
        {
          id: 'sql_analytics',
          name: 'SQL analytique',
          weight: 30,
          level_descriptors: {
            junior: 'SELECT, JOIN, GROUP BY, fenêtrage basique.',
            mid: 'Fenêtrage avancé, CTEs, optimisation de requêtes, partitionnement.',
            senior: 'Modélisation analytique, query planning, benchmarking.',
            staff: 'Architecture data warehouse, gouvernance des données.',
          },
        },
        {
          id: 'pipelines',
          name: 'Pipelines & orchestration',
          weight: 30,
          level_descriptors: {
            junior: 'Connaît Airflow ou Prefect en surface, suit les DAGs existants.',
            mid: 'Crée des DAGs/flows complexes, gère les retries, monitoring.',
            senior: 'Architecture des pipelines, gestion des SLAs, incident response.',
            staff: 'Plateforme data, MLOps, évaluation des technologies.',
          },
        },
        {
          id: 'distributed_compute',
          name: 'Calcul distribué',
          weight: 20,
          level_descriptors: {
            junior: 'Pandas pour petits datasets, Spark en surface.',
            mid: 'Spark DataFrames, optimisation jobs, partitionnement.',
            senior: 'Tuning Spark avancé, Delta Lake, streaming.',
            staff: 'Choix de la plateforme de compute, vision long terme.',
          },
        },
        {
          id: 'data_modeling',
          name: 'Modélisation de données',
          weight: 20,
          level_descriptors: {
            junior: 'Schémas 3NF basiques.',
            mid: 'Star schema, Kimball, Data Vault basique.',
            senior: 'Choix du paradigme de modélisation, documentation, tests.',
            staff: 'Gouvernance, data mesh, semantic layer.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Parcours data et stack habituelle.',
          duration_minutes: 5,
          skills_evaluated: ['sql_analytics'],
        },
        {
          id: 'sql_challenge',
          name: 'SQL analytique',
          objective: 'Résoudre un problème analytique SQL.',
          duration_minutes: 15,
          skills_evaluated: ['sql_analytics', 'data_modeling'],
        },
        {
          id: 'pipeline_design',
          name: 'Conception de pipeline',
          objective: 'Concevoir un pipeline batch end-to-end.',
          duration_minutes: 20,
          skills_evaluated: ['pipelines', 'distributed_compute'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: true,
        min_questions: 1,
        max_questions: 2,
      },
    },
  },
  {
    id: 'devops_mid',
    label_fr: 'DevOps Mid',
    label_en: 'DevOps Mid',
    description_fr: 'DevOps intermédiaire. CI/CD, Kubernetes, IaC, observabilité.',
    description_en: 'Mid-level DevOps. CI/CD, Kubernetes, IaC, observability.',
    rubric: {
      language: 'fr',
      tone: 'neutral',
      duration_minutes: 40,
      skills: [
        {
          id: 'kubernetes',
          name: 'Kubernetes & conteneurs',
          weight: 30,
          level_descriptors: {
            junior: 'Docker, sait créer un Deployment simple.',
            mid: 'Services, Ingress, ConfigMaps, débogage de pods.',
            senior: 'Helm, operators, RBAC, mise en prod sécurisée.',
            staff: 'Cluster multi-tenant, Kubernetes at scale, stratégie plateforme.',
          },
        },
        {
          id: 'cicd',
          name: 'CI/CD & automatisation',
          weight: 25,
          level_descriptors: {
            junior: 'Suit un pipeline existant, comprend les étapes.',
            mid: 'Crée des pipelines GitLab/GitHub Actions, tests automatiques.',
            senior: 'GitOps, progressive delivery, canary releases.',
            staff: 'Plateforme engineering, standardisation CI/CD à l\'échelle.',
          },
        },
        {
          id: 'iac',
          name: 'Infrastructure as Code',
          weight: 25,
          level_descriptors: {
            junior: 'Terraform basique, modifie des modules existants.',
            mid: 'Modules custom Terraform, state management, multi-env.',
            senior: 'Architecture multi-compte, drift detection, sécurité IaC.',
            staff: 'Stratégie cloud, FinOps, architecture de la plateforme.',
          },
        },
        {
          id: 'observability',
          name: 'Observabilité',
          weight: 20,
          level_descriptors: {
            junior: 'Lit des dashboards, connaît les métriques de base.',
            mid: 'Crée des alertes et dashboards, SLI/SLO basiques.',
            senior: 'Distributed tracing, on-call mature, post-mortems.',
            staff: 'Stratégie observabilité, vendor evaluation, SRE organization.',
          },
        },
      ],
      stages: [
        {
          id: 'intro',
          name: 'Introduction',
          objective: 'Stack habituelle et projet infra le plus complexe.',
          duration_minutes: 5,
          skills_evaluated: ['cicd'],
        },
        {
          id: 'kubernetes_dive',
          name: 'Kubernetes',
          objective: 'Architecture d\'un cluster de production.',
          duration_minutes: 15,
          skills_evaluated: ['kubernetes', 'iac'],
        },
        {
          id: 'incident',
          name: 'Incident response',
          objective: 'Déroulement d\'un incident de production récent.',
          duration_minutes: 15,
          skills_evaluated: ['observability', 'kubernetes', 'cicd'],
        },
        {
          id: 'questions',
          name: 'Questions du candidat',
          objective: 'Donner la parole au candidat.',
          duration_minutes: 5,
          skills_evaluated: [],
        },
      ],
      exclusions: {
        do_not_ask_about: [],
        do_not_score_on: [],
      },
      defense_questions: {
        enabled: true,
        min_questions: 1,
        max_questions: 2,
      },
    },
  },
];

const BLANK_RUBRIC = {
  language: 'fr',
  tone: 'neutral',
  duration_minutes: 40,
  skills: [],
  stages: [],
  exclusions: {
    do_not_ask_about: [],
    do_not_score_on: [],
  },
  defense_questions: {
    enabled: false,
    min_questions: 1,
    max_questions: 3,
  },
};

// Canonical list MUST stay in sync with backend rubric_service._MANDATORY_DO_NOT_ASK +
// _MANDATORY_DO_NOT_SCORE. Mismatch breaks the locked-exclusions transparency contract
// (security audit HIGH-1, 2026-05-06).
const MANDATORY_EXCLUSIONS = [
  'age', 'marital_status', 'religion', 'country_of_origin', 'race', 'ethnicity',
  'accent', 'facial_expressions', 'physical_appearance', 'gender', 'disability', 'school_name',
];

const MANDATORY_EXCLUSION_LABELS = {
  fr: {
    age: 'Âge', marital_status: 'Situation familiale', religion: 'Religion',
    country_of_origin: 'Pays d’origine', race: 'Race', ethnicity: 'Ethnicité',
    accent: 'Accent', facial_expressions: 'Expressions faciales',
    physical_appearance: 'Apparence physique', gender: 'Genre',
    disability: 'Handicap', school_name: 'École fréquentée',
  },
  en: {
    age: 'Age', marital_status: 'Marital status', religion: 'Religion',
    country_of_origin: 'Country of origin', race: 'Race', ethnicity: 'Ethnicity',
    accent: 'Accent', facial_expressions: 'Facial expressions',
    physical_appearance: 'Physical appearance', gender: 'Gender',
    disability: 'Disability', school_name: 'School attended',
  },
};
const MAX_SKILLS = 8;
const MAX_DURATION = 60;
const WEIGHT_TOLERANCE = 0.5; // ±0.5% tolerance when checking 100%

// ── Main wizard ──────────────────────────────────────────────────────────────

export function RubricWizard({ lang = 'fr', theme = 'light' }) {
  const S = STRINGS[lang];
  const { roleId, rubricId } = useParams();
  const [searchParams] = useSearchParams();
  const isClone = searchParams.get('clone') === 'true';
  const navigate = useNavigate();

  const isEditing = !!rubricId && !isClone;

  const [step, setStep] = React.useState(1);
  const [rubricDraft, setRubricDraft] = React.useState(BLANK_RUBRIC);
  const [rubricName, setRubricName] = React.useState('');

  // Step 5 state
  const [createdRubric, setCreatedRubric] = React.useState(null);
  const [testState, setTestState] = React.useState('idle'); // idle | creating | testing | done | error
  const [testProgress, setTestProgress] = React.useState([]); // array of sim markers
  const [testResults, setTestResults] = React.useState(null);
  const [testError, setTestError] = React.useState(null);
  const [activating, setActivating] = React.useState(false);
  const [activateError, setActivateError] = React.useState(null);
  const [activateSuccess, setActivateSuccess] = React.useState(false);

  // Load existing rubric if editing/cloning
  const [loadError, setLoadError] = React.useState(null);
  const [loadingRubric, setLoadingRubric] = React.useState(false);

  React.useEffect(() => {
    if (rubricId) {
      setLoadingRubric(true);
      api.getRubric(rubricId)
        .then((r) => {
          const j = r.rubric_json || {};
          setRubricDraft({
            language: j.language || 'fr',
            tone: j.tone || 'neutral',
            duration_minutes: j.duration_minutes || 40,
            skills: (j.skills || []).map((sk) => ({
              id: sk.id || genId(),
              name: sk.name || sk.label || '',
              weight: typeof sk.weight === 'number' ? Math.round(sk.weight * 100) : (sk.weight || 0),
              level_descriptors: sk.level_descriptors || { junior: '', mid: '', senior: '', staff: '' },
            })),
            stages: (j.stages || []).map((st) => ({
              id: st.id || genId(),
              name: st.name || st.label || '',
              objective: st.objective || '',
              duration_minutes: st.duration_minutes || 10,
              skills_evaluated: st.skills_evaluated || [],
            })),
            exclusions: {
              do_not_ask_about: (j.exclusions?.do_not_ask_about || []).filter((x) => !MANDATORY_EXCLUSIONS.includes(x)),
              do_not_score_on: (j.exclusions?.do_not_score_on || []).filter((x) => !MANDATORY_EXCLUSIONS.includes(x)),
            },
            defense_questions: {
              enabled: j.defense_questions?.enabled ?? false,
              min_questions: j.defense_questions?.min_per_session ?? j.defense_questions?.min_questions ?? 1,
              max_questions: j.defense_questions?.max_per_session ?? j.defense_questions?.max_questions ?? 3,
            },
          });
          setRubricName(isClone ? `${r.name} (copie)` : (r.name || ''));
          if (r.is_active && !isClone) {
            // readonly — navigate to step 5 display, no edit
          }
        })
        .catch((e) => setLoadError(e.message))
        .finally(() => setLoadingRubric(false));
    }
  }, [rubricId, isClone]);

  const totalWeight = rubricDraft.skills.reduce((s, sk) => s + Number(sk.weight || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) <= WEIGHT_TOLERANCE;
  const allSeniorsHaveDescriptor = rubricDraft.skills.every((sk) => sk.level_descriptors?.senior?.trim());

  const totalDuration = rubricDraft.stages.reduce((s, st) => s + Number(st.duration_minutes || 0), 0);
  const durationOk = totalDuration <= MAX_DURATION && rubricDraft.stages.length > 0;

  const step2Valid = weightOk && allSeniorsHaveDescriptor && rubricDraft.skills.length > 0;
  const step3Valid = durationOk;
  const step4Valid = true; // always valid
  const defenseValid = !rubricDraft.defense_questions.enabled ||
    rubricDraft.defense_questions.max_questions >= rubricDraft.defense_questions.min_questions;

  const canNext = () => {
    if (step === 1) return true; // must have selected a template or blank — we just allow forward
    if (step === 2) return step2Valid;
    if (step === 3) return step3Valid;
    if (step === 4) return step4Valid && defenseValid;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) return;
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => {
    setActivateError(null);
    setActivateSuccess(false);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSaveDraft = () => {
    // No-op in this version — rubrics are immutable on backend. Draft lives only in state.
    // Could persist to localStorage but that's explicitly discouraged for artifact context.
  };

  // ── Step 5: create + test + activate ──

  const buildRubricJson = () => ({
    language: rubricDraft.language,
    tone: rubricDraft.tone,
    duration_minutes: rubricDraft.duration_minutes,
    skills: rubricDraft.skills.map((sk) => ({
      id: sk.id,
      name: sk.name,
      label: sk.name,
      weight: Number(sk.weight) / 100,
      level_descriptors: sk.level_descriptors,
    })),
    stages: rubricDraft.stages.map((st) => ({
      id: st.id,
      name: st.name,
      label: st.name,
      objective: st.objective,
      duration_minutes: Number(st.duration_minutes),
      skills_evaluated: st.skills_evaluated,
    })),
    exclusions: {
      do_not_ask_about: [...MANDATORY_EXCLUSIONS, ...rubricDraft.exclusions.do_not_ask_about],
      do_not_score_on: [...MANDATORY_EXCLUSIONS, ...rubricDraft.exclusions.do_not_score_on],
    },
    defense_questions: {
      enabled: rubricDraft.defense_questions.enabled,
      min_per_session: rubricDraft.defense_questions.min_questions,
      max_per_session: rubricDraft.defense_questions.max_questions,
    },
  });

  const handleRunTest = async () => {
    setTestState('creating');
    setTestError(null);
    setTestResults(null);
    setTestProgress([]);
    setActivateError(null);
    setActivateSuccess(false);

    let rubric = createdRubric;
    try {
      if (!rubric) {
        const name = rubricName.trim() || (lang === 'fr' ? 'Nouvelle rubrique' : 'New rubric');
        rubric = await api.createRubric(roleId, { name, rubric_json: buildRubricJson() });
        setCreatedRubric(rubric);
      }

      setTestState('testing');

      // Cosmetic sequential progress animation
      const sims = ['junior', 'mid', 'senior'];
      for (let i = 0; i < sims.length; i++) {
        await new Promise((res) => setTimeout(res, 500));
        setTestProgress((prev) => [...prev, sims[i]]);
      }

      const results = await api.testRubric(rubric.id);
      setTestResults(results);
      setTestState('done');
    } catch (e) {
      setTestError(e.message);
      setTestState('error');
    }
  };

  const handleActivate = async () => {
    if (!createdRubric) return;
    setActivating(true);
    setActivateError(null);
    try {
      await api.activateRubric(createdRubric.id);
      setActivateSuccess(true);
      setTimeout(() => navigate(`/hr/roles/${roleId}/rubrics`), 1500);
    } catch (e) {
      if (e.message.includes('409') || e.message.toLowerCase().includes('conflict')) {
        setActivateError(S.rubric_activate_error_409);
      } else {
        setActivateError(e.message);
      }
      setActivating(false);
    }
  };

  if (loadingRubric) {
    return (
      <div className="rt-app-page">
        <div data-theme={theme} className="rt-root" style={{ width: 1280, minHeight: 820, background: 'var(--bg)', display: 'grid', gridTemplateColumns: '224px 1fr', fontFamily: 'var(--sans)' }}>
          <SideNav lang={lang} active="rubrics" roleId={roleId} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
            {lang === 'fr' ? 'Chargement...' : 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rt-app-page">
        <div data-theme={theme} className="rt-root" style={{ width: 1280, minHeight: 820, background: 'var(--bg)', display: 'grid', gridTemplateColumns: '224px 1fr', fontFamily: 'var(--sans)' }}>
          <SideNav lang={lang} active="rubrics" roleId={roleId} />
          <div style={{ padding: 32 }}>
            <div style={{ color: 'var(--terracotta-deep)', background: 'var(--terracotta-soft)', padding: '14px 20px', borderRadius: 12, fontSize: 13 }}>{loadError}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rt-app-page">
      <div data-theme={theme} className="rt-root" style={{
        width: 1280, minHeight: 820,
        background: 'var(--bg)',
        display: 'grid', gridTemplateColumns: '224px 1fr',
        fontFamily: 'var(--sans)',
      }}>
        <SideNav lang={lang} active="rubrics" roleId={roleId} />

        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <a href="/hr" style={{ color: 'var(--muted)', textDecoration: 'none' }}>{S.hr_interviews}</a>
              <ChevronRight size={12} />
              <a href={`/hr/roles/${roleId}/rubrics`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{S.rubric_nav}</a>
              <ChevronRight size={12} />
              <span style={{ color: 'var(--ink)' }}>{isEditing ? S.rubric_wizard_edit_title : S.rubric_wizard_title}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h1 className="rt-serif" style={{ fontSize: 30, margin: 0, color: 'var(--ink)' }}>
                {isEditing ? S.rubric_wizard_edit_title : S.rubric_wizard_title}
              </h1>
              {/* Rubric name input */}
              {step > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="rubric-name" style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {lang === 'fr' ? 'Nom :' : 'Name:'}
                  </label>
                  <input
                    id="rubric-name"
                    type="text"
                    value={rubricName}
                    onChange={(e) => setRubricName(e.target.value)}
                    placeholder={lang === 'fr' ? 'Nom de la rubrique' : 'Rubric name'}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '6px 10px',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      width: 220,
                      outline: 'none',
                    }}
                    aria-label={lang === 'fr' ? 'Nom de la rubrique' : 'Rubric name'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <ProgressBar step={step} lang={lang} S={S} />

          {/* Step content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 120px' }} className="rt-scroll">
            {step === 1 && (
              <Step1
                lang={lang}
                S={S}
                rubricDraft={rubricDraft}
                setRubricDraft={setRubricDraft}
                setRubricName={setRubricName}
                onAdvance={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2
                lang={lang}
                S={S}
                skills={rubricDraft.skills}
                totalWeight={totalWeight}
                weightOk={weightOk}
                onChange={(skills) => setRubricDraft((d) => ({ ...d, skills }))}
              />
            )}
            {step === 3 && (
              <Step3
                lang={lang}
                S={S}
                stages={rubricDraft.stages}
                skills={rubricDraft.skills}
                totalDuration={totalDuration}
                durationOk={durationOk}
                onChange={(stages) => setRubricDraft((d) => ({ ...d, stages }))}
              />
            )}
            {step === 4 && (
              <Step4
                lang={lang}
                S={S}
                rubricDraft={rubricDraft}
                defenseValid={defenseValid}
                onChange={(patch) => setRubricDraft((d) => ({ ...d, ...patch }))}
              />
            )}
            {step === 5 && (
              <Step5
                lang={lang}
                S={S}
                testState={testState}
                testProgress={testProgress}
                testResults={testResults}
                testError={testError}
                activating={activating}
                activateError={activateError}
                activateSuccess={activateSuccess}
                createdRubric={createdRubric}
                onRunTest={handleRunTest}
                onActivate={handleActivate}
              />
            )}
          </div>

          {/* Sticky bottom action bar */}
          <ActionBar
            step={step}
            lang={lang}
            S={S}
            canNext={canNext()}
            onBack={handleBack}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            step2Valid={step2Valid}
            totalWeight={totalWeight}
            weightOk={weightOk}
            totalDuration={totalDuration}
            durationOk={durationOk}
            defenseValid={defenseValid}
          />
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, S }) {
  const steps = [
    { n: 1, key: 'rubric_step1_title' },
    { n: 2, key: 'rubric_step2_title' },
    { n: 3, key: 'rubric_step3_title' },
    { n: 4, key: 'rubric_step4_title' },
    { n: 5, key: 'rubric_step5_title' },
  ];

  return (
    <div
      style={{ padding: '14px 32px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}
      role="navigation"
      aria-label="Étapes du wizard"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {steps.map((s, idx) => {
          const isActive = s.n === step;
          const isDone = s.n < step;
          return (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--sage)' : isActive ? 'var(--terracotta)' : 'var(--bg-deep)',
                  border: `2px solid ${isDone ? 'var(--sage)' : isActive ? 'var(--terracotta)' : 'var(--border)'}`,
                  color: isDone || isActive ? '#fff' : 'var(--muted)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 11, fontWeight: 600,
                  transition: 'all 0.2s',
                }}>
                  {isDone ? <CheckIcon size={13} /> : s.n}
                </div>
                <span style={{
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--ink)' : isDone ? 'var(--sage)' : 'var(--muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {S[s.key]}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div style={{ width: 24, height: 2, background: isDone ? 'var(--sage)' : 'var(--border)', flexShrink: 0, margin: '0 4px', transition: 'background 0.2s' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Action bar ───────────────────────────────────────────────────────────────

function ActionBar({ step, lang, S, canNext, onBack, onNext, onSaveDraft, totalWeight, weightOk, totalDuration, durationOk, defenseValid }) {
  const showBacktip = step === 2 && !weightOk;
  const showDurationTip = step === 3 && !durationOk;
  const showDefenseTip = step === 4 && !defenseValid;

  const blockMessage = (() => {
    if (step === 2 && !weightOk) return `${S.rubric_total_weight}: ${totalWeight.toFixed(1)}% — ${S.rubric_weight_error}`;
    if (step === 3 && !durationOk) {
      if (totalDuration === 0) return lang === 'fr' ? 'Ajoutez au moins une étape.' : 'Add at least one stage.';
      return `${S.rubric_total_duration}: ${totalDuration}min — ${S.rubric_duration_error}`;
    }
    if (step === 4 && !defenseValid) return lang === 'fr' ? 'Le maximum doit être ≥ au minimum.' : 'Max must be ≥ min.';
    return null;
  })();

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 224, // align with main content (after sidenav)
      right: 0,
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      padding: '14px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      zIndex: 100,
    }}>
      <div style={{ flex: 1 }}>
        {blockMessage && (
          <div style={{ fontSize: 12, color: 'var(--terracotta-deep)', background: 'var(--terracotta-soft)', padding: '6px 12px', borderRadius: 8, display: 'inline-block' }}>
            {blockMessage}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {step > 1 && step < 5 && (
          <button
            className="rt-btn rt-btn-ghost"
            onClick={onSaveDraft}
            aria-label={S.rubric_save_draft}
            style={{ fontSize: 13 }}
          >
            {S.rubric_save_draft}
          </button>
        )}
        {step > 1 && (
          <button
            className="rt-btn rt-btn-ghost"
            onClick={onBack}
            aria-label={S.rubric_back}
            style={{ fontSize: 13 }}
          >
            {S.rubric_back}
          </button>
        )}
        {step < 5 && (
          <button
            className="rt-btn rt-btn-accent"
            onClick={onNext}
            disabled={!canNext}
            aria-disabled={!canNext}
            aria-label={S.rubric_next}
            style={{
              fontSize: 13,
              opacity: canNext ? 1 : 0.45,
              cursor: canNext ? 'pointer' : 'not-allowed',
            }}
          >
            {S.rubric_next}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Template picker ───────────────────────────────────────────────────

function Step1({ lang, S, rubricDraft, setRubricDraft, setRubricName, onAdvance }) {
  const handleSelect = (tpl) => {
    const r = JSON.parse(JSON.stringify(tpl.rubric)); // deep clone
    // Ensure IDs exist
    r.skills = r.skills.map((sk) => ({ ...sk, id: sk.id || genId() }));
    r.stages = r.stages.map((st) => ({ ...st, id: st.id || genId() }));
    setRubricDraft(r);
    setRubricName(lang === 'fr' ? tpl.label_fr : tpl.label_en);
    onAdvance();
  };

  const handleBlank = () => {
    setRubricDraft(JSON.parse(JSON.stringify(BLANK_RUBRIC)));
    setRubricName('');
    onAdvance();
  };

  return (
    <div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--ink)' }}>{S.rubric_step1_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.6 }}>{S.rubric_step1_sub}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => handleSelect(tpl)}
            aria-label={`${lang === 'fr' ? 'Choisir le template' : 'Choose template'}: ${lang === 'fr' ? tpl.label_fr : tpl.label_en}`}
            style={{
              textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '18px 20px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--terracotta)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(232,115,74,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--terracotta)'; e.currentTarget.style.outlineOffset = '2px'; }}
            onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
          >
            <div className="rt-serif" style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>
              {lang === 'fr' ? tpl.label_fr : tpl.label_en}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              {lang === 'fr' ? tpl.description_fr : tpl.description_en}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tpl.rubric.skills.slice(0, 4).map((sk) => (
                <span key={sk.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-deep)', color: 'var(--ink-2)' }}>
                  {sk.name}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
              {tpl.rubric.duration_minutes}min · {tpl.rubric.stages.length} {lang === 'fr' ? 'étapes' : 'stages'}
            </div>
          </button>
        ))}

        {/* Blank card */}
        <button
          onClick={handleBlank}
          aria-label={S.rubric_template_start_blank}
          style={{
            textAlign: 'left',
            background: 'var(--bg-deep)',
            border: '2px dashed var(--border)',
            borderRadius: 16,
            padding: '18px 20px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            minHeight: 120,
          }}
          onFocus={(e) => { e.currentTarget.style.outline = '2px solid var(--terracotta)'; e.currentTarget.style.outlineOffset = '2px'; }}
          onBlur={(e) => { e.currentTarget.style.outline = 'none'; }}
        >
          <PlusIcon size={24} />
          <span className="rt-serif" style={{ fontSize: 16, color: 'var(--ink)' }}>{S.rubric_template_start_blank}</span>
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Skills & weights ─────────────────────────────────────────────────

function Step2({ lang, S, skills, totalWeight, weightOk, onChange }) {
  const addSkill = () => {
    if (skills.length >= MAX_SKILLS) return;
    onChange([...skills, {
      id: genId(),
      name: '',
      weight: 0,
      level_descriptors: { junior: '', mid: '', senior: '', staff: '' },
    }]);
  };

  const removeSkill = (idx) => {
    onChange(skills.filter((_, i) => i !== idx));
  };

  const updateSkill = (idx, patch) => {
    onChange(skills.map((sk, i) => i === idx ? { ...sk, ...patch } : sk));
  };

  const updateDescriptor = (idx, level, value) => {
    onChange(skills.map((sk, i) => i === idx ? {
      ...sk,
      level_descriptors: { ...sk.level_descriptors, [level]: value },
    } : sk));
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...skills];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    onChange(arr);
  };

  const moveDown = (idx) => {
    if (idx === skills.length - 1) return;
    const arr = [...skills];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    onChange(arr);
  };

  const atMax = skills.length >= MAX_SKILLS;

  return (
    <div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--ink)' }}>{S.rubric_step2_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>{S.rubric_step2_sub}</p>

      {/* Total weight indicator */}
      <div style={{
        marginBottom: 20, padding: '10px 16px', borderRadius: 10,
        background: weightOk ? 'var(--sage-soft)' : 'var(--terracotta-soft)',
        color: weightOk ? 'var(--sage)' : 'var(--terracotta-deep)',
        fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
      }}
        role="status"
        aria-live="polite"
      >
        {weightOk ? <CheckIcon size={14} /> : null}
        {S.rubric_total_weight}: {totalWeight.toFixed(1)}%
        {!weightOk && <span style={{ fontWeight: 400, fontSize: 12 }}>— {S.rubric_weight_error}</span>}
      </div>

      {/* Skill rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {skills.map((sk, idx) => (
          <SkillRow
            key={sk.id}
            idx={idx}
            skill={sk}
            lang={lang}
            S={S}
            isFirst={idx === 0}
            isLast={idx === skills.length - 1}
            onUpdate={(patch) => updateSkill(idx, patch)}
            onDescriptor={(level, val) => updateDescriptor(idx, level, val)}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
            onRemove={() => removeSkill(idx)}
          />
        ))}
      </div>

      {/* Add skill button */}
      <div style={{ marginTop: 16 }}>
        <button
          className="rt-btn rt-btn-ghost"
          onClick={addSkill}
          disabled={atMax}
          aria-disabled={atMax}
          aria-label={atMax ? S.rubric_max_skills : S.rubric_add_skill}
          title={atMax ? S.rubric_max_skills : undefined}
          style={{ fontSize: 13, opacity: atMax ? 0.45 : 1, cursor: atMax ? 'not-allowed' : 'pointer' }}
        >
          <PlusIcon size={14} /> {S.rubric_add_skill}
        </button>
        {atMax && (
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{S.rubric_max_skills}</div>
        )}
      </div>
    </div>
  );
}

function SkillRow({ idx, skill, lang, S, isFirst, isLast, onUpdate, onDescriptor, onMoveUp, onMoveDown, onRemove }) {
  const [expanded, setExpanded] = React.useState(true);
  const levels = ['junior', 'mid', 'senior', 'staff'];
  const labelMap = { junior: S.rubric_level_junior, mid: S.rubric_level_mid, senior: S.rubric_level_senior, staff: S.rubric_level_staff };
  const seniorMissing = !skill.level_descriptors?.senior?.trim();

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${seniorMissing ? 'var(--terracotta)' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* Row header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: expanded ? '1px solid var(--border)' : 'none', background: 'var(--bg)' }}>
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ padding: '3px 5px', fontSize: 11, opacity: isFirst ? 0.3 : 1 }}
            onClick={onMoveUp}
            disabled={isFirst}
            aria-label={S.rubric_move_up}
            tabIndex={isFirst ? -1 : 0}
          >
            <ChevronUpIcon size={12} />
          </button>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ padding: '3px 5px', fontSize: 11, opacity: isLast ? 0.3 : 1 }}
            onClick={onMoveDown}
            disabled={isLast}
            aria-label={S.rubric_move_down}
            tabIndex={isLast ? -1 : 0}
          >
            <ChevronDownIcon size={12} />
          </button>
        </div>

        {/* Name */}
        <div style={{ flex: 1 }}>
          <label htmlFor={`skill-name-${idx}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
            {S.rubric_skill_name}
          </label>
          <input
            id={`skill-name-${idx}`}
            type="text"
            value={skill.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder={S.rubric_skill_name}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', width: '100%', outline: 'none' }}
          />
        </div>

        {/* Weight */}
        <div style={{ width: 100, flexShrink: 0 }}>
          <label htmlFor={`skill-weight-${idx}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
            {S.rubric_skill_weight}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              id={`skill-weight-${idx}`}
              type="number"
              min={0}
              max={100}
              value={skill.weight}
              onChange={(e) => onUpdate({ weight: Math.max(0, Math.min(100, Number(e.target.value))) })}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', width: 64, outline: 'none', textAlign: 'right' }}
              aria-label={`${S.rubric_skill_weight} — ${skill.name || S.rubric_skill_name} ${idx + 1}`}
            />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>%</span>
          </div>
        </div>

        {/* Expand toggle & remove */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 11 }}
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
            aria-controls={`skill-descriptors-${idx}`}
            aria-label={`${expanded ? (lang === 'fr' ? 'Masquer' : 'Collapse') : (lang === 'fr' ? 'Afficher' : 'Expand')} — ${skill.name || S.rubric_skill_name}`}
          >
            {expanded ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
          </button>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ padding: '6px 10px', fontSize: 11, color: 'var(--terracotta-deep)' }}
            onClick={onRemove}
            aria-label={`${S.rubric_remove} — ${skill.name || S.rubric_skill_name}`}
          >
            <XIcon size={13} />
          </button>
        </div>
      </div>

      {/* Descriptors */}
      {expanded && (
        <div id={`skill-descriptors-${idx}`} style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 }}>{S.rubric_skill_descriptors}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {levels.map((level) => {
              const isSenior = level === 'senior';
              const missing = isSenior && !skill.level_descriptors?.[level]?.trim();
              return (
                <div key={level}>
                  <label htmlFor={`skill-${idx}-${level}`} style={{ fontSize: 11, color: isSenior && missing ? 'var(--terracotta-deep)' : 'var(--muted)', display: 'block', marginBottom: 4, fontWeight: isSenior ? 600 : 400 }}>
                    {labelMap[level]}{isSenior && ' *'}
                  </label>
                  <textarea
                    id={`skill-${idx}-${level}`}
                    rows={2}
                    value={skill.level_descriptors?.[level] || ''}
                    onChange={(e) => onDescriptor(level, e.target.value)}
                    placeholder={`${labelMap[level]}...`}
                    style={{
                      width: '100%', border: `1px solid ${missing ? 'var(--terracotta)' : 'var(--border)'}`,
                      borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: 'inherit',
                      background: 'var(--bg)', color: 'var(--ink)', resize: 'vertical', outline: 'none', lineHeight: 1.5,
                    }}
                    aria-required={isSenior}
                    aria-invalid={missing}
                  />
                  {missing && (
                    <div style={{ fontSize: 11, color: 'var(--terracotta-deep)', marginTop: 2 }}>
                      {lang === 'fr' ? 'Requis' : 'Required'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Stages ────────────────────────────────────────────────────────────

function Step3({ lang, S, stages, skills, totalDuration, durationOk, onChange }) {
  const addStage = () => {
    onChange([...stages, {
      id: genId(),
      name: '',
      objective: '',
      duration_minutes: 10,
      skills_evaluated: [],
    }]);
  };

  const removeStage = (idx) => onChange(stages.filter((_, i) => i !== idx));

  const updateStage = (idx, patch) => onChange(stages.map((st, i) => i === idx ? { ...st, ...patch } : st));

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...stages]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; onChange(arr);
  };
  const moveDown = (idx) => {
    if (idx === stages.length - 1) return;
    const arr = [...stages]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; onChange(arr);
  };

  const toggleSkill = (stageIdx, skillId) => {
    const stage = stages[stageIdx];
    const current = stage.skills_evaluated || [];
    const updated = current.includes(skillId) ? current.filter((x) => x !== skillId) : [...current, skillId];
    updateStage(stageIdx, { skills_evaluated: updated });
  };

  return (
    <div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--ink)' }}>{S.rubric_step3_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px', lineHeight: 1.6 }}>{S.rubric_step3_sub}</p>

      {/* Duration indicator */}
      <div style={{
        marginBottom: 20, padding: '10px 16px', borderRadius: 10,
        background: durationOk ? 'var(--sage-soft)' : 'var(--terracotta-soft)',
        color: durationOk ? 'var(--sage)' : 'var(--terracotta-deep)',
        fontSize: 13, fontWeight: 500,
      }}
        role="status"
        aria-live="polite"
      >
        {S.rubric_total_duration}: {totalDuration}min
        {!durationOk && stages.length > 0 && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>— {S.rubric_duration_error} (max {MAX_DURATION}min)</span>}
        {stages.length === 0 && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>— {lang === 'fr' ? 'Ajoutez au moins une étape' : 'Add at least one stage'}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stages.map((st, idx) => (
          <StageRow
            key={st.id}
            idx={idx}
            stage={st}
            skills={skills}
            lang={lang}
            S={S}
            isFirst={idx === 0}
            isLast={idx === stages.length - 1}
            onUpdate={(patch) => updateStage(idx, patch)}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
            onRemove={() => removeStage(idx)}
            onToggleSkill={(skillId) => toggleSkill(idx, skillId)}
          />
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          className="rt-btn rt-btn-ghost"
          onClick={addStage}
          aria-label={S.rubric_add_stage}
          style={{ fontSize: 13 }}
        >
          <PlusIcon size={14} /> {S.rubric_add_stage}
        </button>
      </div>
    </div>
  );
}

function StageRow({ idx, stage, skills, lang, S, isFirst, isLast, onUpdate, onMoveUp, onMoveDown, onRemove, onToggleSkill }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, paddingTop: 22 }}>
          <button className="rt-btn rt-btn-ghost" style={{ padding: '3px 5px', opacity: isFirst ? 0.3 : 1 }} onClick={onMoveUp} disabled={isFirst} aria-label={S.rubric_move_up} tabIndex={isFirst ? -1 : 0}><ChevronUpIcon size={12} /></button>
          <button className="rt-btn rt-btn-ghost" style={{ padding: '3px 5px', opacity: isLast ? 0.3 : 1 }} onClick={onMoveDown} disabled={isLast} aria-label={S.rubric_move_down} tabIndex={isLast ? -1 : 0}><ChevronDownIcon size={12} /></button>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 12, marginBottom: 12 }}>
            {/* Name */}
            <div>
              <label htmlFor={`stage-name-${idx}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{S.rubric_stage_name}</label>
              <input
                id={`stage-name-${idx}`}
                type="text"
                value={stage.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder={S.rubric_stage_name}
                style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', width: '100%', outline: 'none' }}
              />
            </div>

            {/* Objective */}
            <div>
              <label htmlFor={`stage-obj-${idx}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{S.rubric_stage_objective}</label>
              <input
                id={`stage-obj-${idx}`}
                type="text"
                value={stage.objective}
                onChange={(e) => onUpdate({ objective: e.target.value })}
                placeholder={S.rubric_stage_objective}
                style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', width: '100%', outline: 'none' }}
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor={`stage-dur-${idx}`} style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{S.rubric_stage_duration}</label>
              <input
                id={`stage-dur-${idx}`}
                type="number"
                min={1}
                max={60}
                value={stage.duration_minutes}
                onChange={(e) => onUpdate({ duration_minutes: Math.max(1, Number(e.target.value)) })}
                style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--ink)', width: '100%', outline: 'none' }}
                aria-label={`${S.rubric_stage_duration} — ${stage.name || S.rubric_stage_name}`}
              />
            </div>
          </div>

          {/* Skills chips */}
          {skills.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{S.rubric_stage_skills}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label={S.rubric_stage_skills}>
                {skills.map((sk) => {
                  const selected = (stage.skills_evaluated || []).includes(sk.id);
                  return (
                    <button
                      key={sk.id}
                      onClick={() => onToggleSkill(sk.id)}
                      aria-pressed={selected}
                      aria-label={`${selected ? (lang === 'fr' ? 'Désélectionner' : 'Deselect') : (lang === 'fr' ? 'Sélectionner' : 'Select')} — ${sk.name}`}
                      style={{
                        padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                        border: `1px solid ${selected ? 'var(--sage)' : 'var(--border)'}`,
                        background: selected ? 'var(--sage-soft)' : 'var(--bg-deep)',
                        color: selected ? 'var(--sage)' : 'var(--muted)',
                        fontFamily: 'inherit', fontWeight: selected ? 500 : 400,
                        transition: 'all 0.1s',
                      }}
                    >
                      {selected && <CheckIcon size={10} />} {sk.name || lang === 'fr' ? 'Compétence' : 'Skill'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Remove */}
        <button
          className="rt-btn rt-btn-ghost"
          style={{ padding: '6px 10px', color: 'var(--terracotta-deep)', flexShrink: 0 }}
          onClick={onRemove}
          aria-label={`${S.rubric_remove} — ${stage.name || S.rubric_stage_name}`}
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Exclusions & language ─────────────────────────────────────────────

function Step4({ lang, S, rubricDraft, defenseValid, onChange }) {
  const [newExclusion, setNewExclusion] = React.useState('');
  const [exclusionType, setExclusionType] = React.useState('ask');

  const addExclusion = () => {
    const val = newExclusion.trim();
    if (!val) return;
    if (exclusionType === 'ask' || exclusionType === 'both') {
      onChange({
        exclusions: {
          ...rubricDraft.exclusions,
          do_not_ask_about: [...(rubricDraft.exclusions.do_not_ask_about || []), val],
          do_not_score_on: exclusionType === 'both'
            ? [...(rubricDraft.exclusions.do_not_score_on || []), val]
            : rubricDraft.exclusions.do_not_score_on,
        },
      });
    } else {
      onChange({
        exclusions: {
          ...rubricDraft.exclusions,
          do_not_score_on: [...(rubricDraft.exclusions.do_not_score_on || []), val],
        },
      });
    }
    setNewExclusion('');
  };

  const removeExclusion = (list, idx) => {
    const key = list === 'ask' ? 'do_not_ask_about' : 'do_not_score_on';
    onChange({
      exclusions: {
        ...rubricDraft.exclusions,
        [key]: rubricDraft.exclusions[key].filter((_, i) => i !== idx),
      },
    });
  };

  const setLanguage = (v) => onChange({ language: v });
  const setTone = (v) => onChange({ tone: v });
  const setDefense = (patch) => onChange({ defense_questions: { ...rubricDraft.defense_questions, ...patch } });

  return (
    <div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--ink)' }}>{S.rubric_step4_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.6 }}>{S.rubric_step4_sub}</p>

      {/* Mandatory exclusions */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>{S.rubric_mandatory_exclusions}</h3>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.6 }}>{S.rubric_mandatory_exclusions_info}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MANDATORY_EXCLUSIONS.map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-deep)', borderRadius: 10, border: '1px solid var(--border)' }}>
              {/* Visually checked, locked */}
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                background: 'var(--sage)', display: 'grid', placeItems: 'center',
                flexShrink: 0,
              }}
                role="checkbox"
                aria-checked="true"
                aria-disabled="true"
                aria-label={`${item} — ${S.rubric_exclusion_locked_tooltip}`}
                tabIndex={0}
              >
                <CheckIcon size={11} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-2)', flex: 1 }}>{(MANDATORY_EXCLUSION_LABELS[lang] || MANDATORY_EXCLUSION_LABELS.en)[item] || item}</span>
              <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <LockIcon size={12} />
                {S.rubric_exclusion_locked_tooltip}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Custom exclusions */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 14px' }}>{S.rubric_optional_exclusions}</h3>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label htmlFor="new-exclusion" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
              {lang === 'fr' ? 'Nouvelle exclusion' : 'New exclusion'}
            </label>
            <input
              id="new-exclusion"
              type="text"
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExclusion(); } }}
              placeholder={S.rubric_add_exclusion}
              style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--ink)', width: '100%', outline: 'none' }}
            />
          </div>

          {/* Type radio */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{S.rubric_exclusion_type}</legend>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { v: 'ask', label: S.rubric_exclusion_ask },
                { v: 'score', label: S.rubric_exclusion_score },
                { v: 'both', label: S.rubric_exclusion_both },
              ].map((opt) => (
                <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, cursor: 'pointer', color: 'var(--ink)' }}>
                  <input
                    type="radio"
                    name="exclusion-type"
                    value={opt.v}
                    checked={exclusionType === opt.v}
                    onChange={() => setExclusionType(opt.v)}
                    style={{ accentColor: 'var(--terracotta)' }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="rt-btn rt-btn-ghost"
            onClick={addExclusion}
            disabled={!newExclusion.trim()}
            aria-label={S.rubric_add_exclusion}
            style={{ fontSize: 13, opacity: newExclusion.trim() ? 1 : 0.45 }}
          >
            <PlusIcon size={14} /> {lang === 'fr' ? 'Ajouter' : 'Add'}
          </button>
        </div>

        {/* Lists */}
        {rubricDraft.exclusions.do_not_ask_about.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{S.rubric_exclusion_ask}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rubricDraft.exclusions.do_not_ask_about.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'var(--terracotta-soft)', color: 'var(--terracotta-deep)' }}>
                  {item}
                  <button onClick={() => removeExclusion('ask', i)} aria-label={`${lang === 'fr' ? 'Supprimer' : 'Remove'} ${item}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}>
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {rubricDraft.exclusions.do_not_score_on.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{S.rubric_exclusion_score}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {rubricDraft.exclusions.do_not_score_on.map((item, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: 12, background: 'var(--sage-soft)', color: 'var(--sage)' }}>
                  {item}
                  <button onClick={() => removeExclusion('score', i)} aria-label={`${lang === 'fr' ? 'Supprimer' : 'Remove'} ${item}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}>
                    <XIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Language */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{S.rubric_language}</h3>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="sr-only">{S.rubric_language}</legend>
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ v: 'fr', label: 'Français' }, { v: 'en', label: 'English' }].map((opt) => (
              <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, cursor: 'pointer', padding: '9px 16px', borderRadius: 10, border: `1px solid ${rubricDraft.language === opt.v ? 'var(--terracotta)' : 'var(--border)'}`, background: rubricDraft.language === opt.v ? 'var(--terracotta-soft)' : 'var(--surface)', color: rubricDraft.language === opt.v ? 'var(--terracotta-deep)' : 'var(--ink)' }}>
                <input type="radio" name="rubric-lang" value={opt.v} checked={rubricDraft.language === opt.v} onChange={() => setLanguage(opt.v)} style={{ accentColor: 'var(--terracotta)' }} />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* Tone */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{S.rubric_tone}</h3>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="sr-only">{S.rubric_tone}</legend>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { v: 'warm', label: S.rubric_tone_warm },
              { v: 'neutral', label: S.rubric_tone_neutral },
              { v: 'rigorous', label: S.rubric_tone_rigorous },
            ].map((opt) => (
              <label key={opt.v} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, cursor: 'pointer', padding: '9px 16px', borderRadius: 10, border: `1px solid ${rubricDraft.tone === opt.v ? 'var(--terracotta)' : 'var(--border)'}`, background: rubricDraft.tone === opt.v ? 'var(--terracotta-soft)' : 'var(--surface)', color: rubricDraft.tone === opt.v ? 'var(--terracotta-deep)' : 'var(--ink)' }}>
                <input type="radio" name="rubric-tone" value={opt.v} checked={rubricDraft.tone === opt.v} onChange={() => setTone(opt.v)} style={{ accentColor: 'var(--terracotta)' }} />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* Defense questions */}
      <section>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{S.rubric_defense_questions}</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={rubricDraft.defense_questions.enabled}
            onChange={(e) => setDefense({ enabled: e.target.checked })}
            style={{ accentColor: 'var(--terracotta)', width: 16, height: 16 }}
            aria-label={S.rubric_defense_enabled}
          />
          {S.rubric_defense_enabled}
        </label>

        {rubricDraft.defense_questions.enabled && (
          <div style={{ display: 'flex', gap: 32, padding: '16px 0', flexWrap: 'wrap' }}>
            <div>
              <label htmlFor="defense-min" style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                {S.rubric_defense_min}: <strong style={{ color: 'var(--ink)' }}>{rubricDraft.defense_questions.min_questions}</strong>
              </label>
              <input
                id="defense-min"
                type="range"
                min={0}
                max={3}
                value={rubricDraft.defense_questions.min_questions}
                onChange={(e) => setDefense({ min_questions: Number(e.target.value) })}
                style={{ width: 160, accentColor: 'var(--terracotta)' }}
                aria-label={S.rubric_defense_min}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', width: 160, marginTop: 2 }}>
                <span>0</span><span>1</span><span>2</span><span>3</span>
              </div>
            </div>
            <div>
              <label htmlFor="defense-max" style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                {S.rubric_defense_max}: <strong style={{ color: 'var(--ink)' }}>{rubricDraft.defense_questions.max_questions}</strong>
              </label>
              <input
                id="defense-max"
                type="range"
                min={1}
                max={5}
                value={rubricDraft.defense_questions.max_questions}
                onChange={(e) => setDefense({ max_questions: Number(e.target.value) })}
                style={{ width: 160, accentColor: 'var(--terracotta)' }}
                aria-label={S.rubric_defense_max}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', width: 160, marginTop: 2 }}>
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
            {!defenseValid && (
              <div style={{ fontSize: 12, color: 'var(--terracotta-deep)', alignSelf: 'center' }}>
                {lang === 'fr' ? 'Le maximum doit être supérieur ou égal au minimum.' : 'Max must be greater than or equal to min.'}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Step 5: Test & publish ────────────────────────────────────────────────────

function Step5({ lang, S, testState, testProgress, testResults, testError, activating, activateError, activateSuccess, createdRubric, onRunTest, onActivate }) {
  const simLabels = {
    junior: S.rubric_test_sim_junior,
    mid: S.rubric_test_sim_mid,
    senior: S.rubric_test_sim_senior,
  };

  // Compute per-level scores from test results
  const scores = testResults ? {
    junior: testResults.junior_score ?? testResults.scores?.junior ?? null,
    mid: testResults.mid_score ?? testResults.scores?.mid ?? null,
    senior: testResults.senior_score ?? testResults.scores?.senior ?? null,
  } : {};

  const diffOk = testResults?.differentiation_ok;
  const spread = testResults?.spread;
  const perSkill = testResults?.per_skill_scores || testResults?.skill_scores || null;

  return (
    <div>
      <h2 className="rt-serif" style={{ fontSize: 26, margin: '0 0 4px', color: 'var(--ink)' }}>{S.rubric_step5_title}</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px', lineHeight: 1.6 }}>{S.rubric_step5_sub}</p>

      {/* Sub-step 1: Creation */}
      <SubStepIndicator
        number={1}
        total={3}
        label={lang === 'fr' ? 'Création de la rubrique' : 'Rubric creation'}
        status={createdRubric ? 'done' : testState === 'creating' ? 'active' : 'pending'}
        lang={lang}
      />
      {createdRubric && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, marginBottom: 16, marginLeft: 40 }}>
          ID: {createdRubric.id} — {lang === 'fr' ? 'Créée avec succès' : 'Created successfully'}
        </div>
      )}

      {/* Sub-step 2: Testing */}
      <SubStepIndicator
        number={2}
        total={3}
        label={lang === 'fr' ? 'Test synthétique' : 'Synthetic test'}
        status={testState === 'done' ? 'done' : testState === 'testing' ? 'active' : 'pending'}
        lang={lang}
      />

      {/* Progress markers */}
      {(testState === 'testing' || testState === 'done' || testState === 'error') && (
        <div style={{ marginLeft: 40, marginTop: 12, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['junior', 'mid', 'senior']).map((level) => {
            const done = testProgress.includes(level);
            const isActive = testState === 'testing' && testProgress[testProgress.length - 1] === level;
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: done ? 'var(--sage)' : 'var(--bg-deep)',
                  border: `2px solid ${done ? 'var(--sage)' : 'var(--border)'}`,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  transition: 'all 0.3s',
                }}>
                  {done && <CheckIcon size={11} />}
                </div>
                <span style={{ color: done ? 'var(--ink)' : 'var(--muted)' }}>{simLabels[level]}</span>
                {done && testState === 'done' && scores[level] != null && (
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                    {lang === 'fr' ? 'Score' : 'Score'}: <strong style={{ color: 'var(--ink)' }}>{Number(scores[level]).toFixed(1)}</strong>/10
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-step 3: Results */}
      <SubStepIndicator
        number={3}
        total={3}
        label={lang === 'fr' ? 'Résultats & publication' : 'Results & publish'}
        status={testState === 'done' ? 'active' : 'pending'}
        lang={lang}
      />

      {/* Run test button */}
      {(testState === 'idle' || testState === 'error') && (
        <div style={{ marginTop: 24 }}>
          <button
            className="rt-btn rt-btn-accent"
            onClick={onRunTest}
            aria-label={S.rubric_run_test}
            style={{ fontSize: 14 }}
          >
            {S.rubric_run_test}
          </button>
          {testError && (
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--terracotta-deep)', background: 'var(--terracotta-soft)', padding: '10px 14px', borderRadius: 10 }}>
              {testError}
              <button
                className="rt-btn rt-btn-ghost"
                style={{ marginLeft: 12, fontSize: 12 }}
                onClick={onRunTest}
                aria-label={lang === 'fr' ? 'Réessayer' : 'Retry'}
              >
                {lang === 'fr' ? 'Réessayer' : 'Retry'}
              </button>
            </div>
          )}
        </div>
      )}

      {testState === 'creating' && (
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner />
          {lang === 'fr' ? 'Création de la rubrique...' : 'Creating rubric...'}
        </div>
      )}

      {testState === 'testing' && (
        <div style={{ marginTop: 24, fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner />
          {S.rubric_testing}
        </div>
      )}

      {/* Results panel */}
      {testState === 'done' && testResults && (
        <TestResultsPanel
          lang={lang}
          S={S}
          scores={scores}
          diffOk={diffOk}
          spread={spread}
          perSkill={perSkill}
          activating={activating}
          activateError={activateError}
          activateSuccess={activateSuccess}
          onActivate={onActivate}
        />
      )}
    </div>
  );
}

function SubStepIndicator({ number, total, label, status, lang }) {
  const isDone = status === 'done';
  const isActive = status === 'active';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isDone ? 'var(--sage)' : isActive ? 'var(--terracotta)' : 'var(--bg-deep)',
        border: `2px solid ${isDone ? 'var(--sage)' : isActive ? 'var(--terracotta)' : 'var(--border)'}`,
        color: isDone || isActive ? '#fff' : 'var(--muted)',
        display: 'grid', placeItems: 'center',
        fontSize: 11, fontWeight: 600,
        transition: 'all 0.2s',
      }}>
        {isDone ? <CheckIcon size={13} /> : number}
      </div>
      <span style={{ fontSize: 13, fontWeight: isActive || isDone ? 600 : 400, color: isDone ? 'var(--sage)' : isActive ? 'var(--ink)' : 'var(--muted)' }}>
        {number} / {total} — {label}
      </span>
    </div>
  );
}

function TestResultsPanel({ lang, S, scores, diffOk, spread, perSkill, activating, activateError, activateSuccess, onActivate }) {
  const [perSkillOpen, setPerSkillOpen] = React.useState(false);

  const levelOrder = ['junior', 'mid', 'senior'];
  const barColor = (v) => {
    if (v >= 6) return 'var(--sage)';
    if (v >= 3) return 'var(--warning)';
    return 'var(--terracotta-deep)';
  };

  return (
    <div style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px' }}>
      {/* Differentiation badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        padding: '12px 16px', borderRadius: 10,
        background: diffOk ? 'var(--sage-soft)' : 'var(--terracotta-soft)',
        color: diffOk ? 'var(--sage)' : 'var(--terracotta-deep)',
        fontSize: 14, fontWeight: 600,
      }}>
        {diffOk ? <CheckIcon size={16} /> : <span style={{ fontSize: 16 }}>✗</span>}
        {diffOk
          ? `${S.rubric_test_pass} — ${S.rubric_test_spread} = ${spread != null ? Number(spread).toFixed(1) : '?'}`
          : S.rubric_test_fail
        }
      </div>

      {/* Score bars */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          {S.rubric_overall_score}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {levelOrder.map((level) => {
            const v = scores[level];
            if (v == null) return null;
            const pct = Math.min(100, Math.max(0, (Number(v) / 10) * 100));
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>
                  {level === 'junior' ? S.rubric_level_junior : level === 'mid' ? S.rubric_level_mid : S.rubric_level_senior}
                </div>
                <div style={{ flex: 1, height: 10, background: 'var(--bg-deep)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor(Number(v)), borderRadius: 999, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ width: 36, fontSize: 12, fontWeight: 500, color: 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Number(v).toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-skill breakdown */}
      {perSkill && Object.keys(perSkill).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <button
            className="rt-btn rt-btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => setPerSkillOpen((x) => !x)}
            aria-expanded={perSkillOpen}
            aria-controls="per-skill-panel"
            aria-label={S.rubric_per_skill}
          >
            {perSkillOpen ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
            {S.rubric_per_skill}
          </button>
          {perSkillOpen && (
            <div id="per-skill-panel" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(perSkill).map(([skillId, val]) => {
                const v = typeof val === 'object' ? (val.score ?? val.senior ?? Object.values(val)[0]) : val;
                const pct = Math.min(100, Math.max(0, (Number(v) / 10) * 100));
                return (
                  <div key={skillId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 140, fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skillId}</div>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-deep)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor(Number(v)), borderRadius: 999 }} />
                    </div>
                    <div style={{ width: 36, fontSize: 12, fontWeight: 500, color: 'var(--ink)', textAlign: 'right' }}>{Number(v).toFixed(1)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activate CTA — only visible if diff ok */}
      {diffOk && !activateSuccess && (
        <div>
          {activateError && (
            <div style={{ fontSize: 13, color: 'var(--terracotta-deep)', background: 'var(--terracotta-soft)', padding: '10px 14px', borderRadius: 10, marginBottom: 12 }}>
              {activateError}
            </div>
          )}
          <button
            className="rt-btn rt-btn-accent"
            onClick={onActivate}
            disabled={activating}
            aria-label={S.rubric_activate}
            aria-busy={activating}
            style={{ fontSize: 14, opacity: activating ? 0.7 : 1, cursor: activating ? 'not-allowed' : 'pointer' }}
          >
            {activating ? <><Spinner /> {S.rubric_activating}</> : S.rubric_activate}
          </button>
        </div>
      )}

      {activateSuccess && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--sage)', fontSize: 14, fontWeight: 600 }}>
          <CheckIcon size={16} /> {S.rubric_activate_success}
        </div>
      )}
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--terracotta)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

let _uid = 0;
function genId() {
  return `skill_${Date.now()}_${_uid++}`;
}
