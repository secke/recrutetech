import React, { useMemo } from 'react';

export const STRINGS = {
  fr: {
    brand: "RecruteTech",
    ariaBy: "Aria · par RecruteTech",
    pre_title: "Prêt à rencontrer Aria ?",
    pre_sub: "Aria est votre interviewer IA. Quelques vérifications avant de commencer.",
    pre_role: "Poste",
    pre_company: "Entreprise",
    pre_duration: "Durée estimée",
    pre_minutes: "min",
    pre_camera: "Caméra",
    pre_mic: "Micro",
    pre_speaker: "Haut-parleurs",
    pre_connection: "Connexion",
    pre_ready: "Tout est prêt",
    pre_start: "Commencer l'entretien",
    pre_tips_title: "Avant de commencer",
    pre_tip_1: "Trouvez un endroit calme et bien éclairé",
    pre_tip_2: "Parlez naturellement — Aria comprend les pauses",
    pre_tip_3: "Vous pouvez demander à Aria de reformuler à tout moment",
    pre_consent: "J'accepte l'enregistrement de l'entretien",
    live_stage: "Étape",
    live_stages: ["Présentation", "Expérience", "Technique", "Code Review", "Questions"],
    live_remaining: "Temps restant",
    live_aria_speaking: "Aria parle",
    live_aria_listening: "Aria écoute",
    live_aria_thinking: "Aria réfléchit",
    live_you: "Vous",
    live_transcript: "Transcription",
    live_end: "Terminer l'entretien",
    live_mute: "Couper le micro",
    live_unmute: "Activer le micro",
    live_camera_off: "Désactiver la caméra",
    code_title: "Défi de code",
    code_challenge: "Défi",
    code_hint: "Indice",
    code_run: "Exécuter",
    code_submit: "Soumettre",
    code_stuck: "Je suis bloqué",
    code_output: "Sortie",
    sum_title: "Merci !",
    sum_sub: "Votre entretien est terminé. Aria est en train d'analyser vos réponses.",
    sum_duration: "Durée",
    sum_questions: "Questions",
    sum_highlights: "Points forts détectés",
    sum_next: "Prochaines étapes",
    sum_feedback_in: "Retour détaillé sous 24h",
    hr_interviews: "Entretiens",
    hr_candidates: "Candidats",
    hr_new: "Nouvel entretien",
    hr_status_new: "Nouveau",
    hr_status_review: "À revoir",
    hr_status_shortlist: "Présélectionné",
    hr_status_declined: "Refusé",
    hr_score: "Score Aria",
    hr_filter_all: "Tous",
    hr_filter_role: "Poste",
    hr_search: "Rechercher un candidat...",
    det_transcript: "Transcription",
    det_evaluation: "Évaluation",
    det_moments: "Moments clés",
    det_download: "Télécharger le rapport",
    det_shortlist: "Présélectionner",
    cfg_title: "Configurer un entretien",
    cfg_role: "Intitulé du poste",
    cfg_seniority: "Séniorité",
    cfg_duration: "Durée totale",
    cfg_stages: "Étapes",
    cfg_skills: "Compétences évaluées",
    cfg_tone: "Ton d'Aria",
    cfg_language: "Langue",
    cfg_preview: "Prévisualiser",
    cfg_publish: "Publier le lien",

    // Rubric builder
    rubric_nav: "Rubriques",
    rubric_list_title: "Rubriques d'évaluation",
    rubric_list_sub: "Gérez les versions de rubrique pour ce poste.",
    rubric_new: "Nouvelle rubrique",
    rubric_clone: "Cloner",
    rubric_compare: "Comparer",
    rubric_empty_title: "Aucune rubrique structurée",
    rubric_empty_sub: "Ce poste utilise actuellement le prompt libre. Créez une rubrique structurée pour un scoring cohérent.",
    rubric_create_first: "Créer une rubrique",
    rubric_active: "Active",
    rubric_inactive: "Inactive",
    rubric_tested: "Testé",
    rubric_not_tested: "Non testé",
    rubric_diff_ok: "Différenciation OK",
    rubric_diff_fail: "Différenciation insuffisante",
    rubric_version: "Version",
    rubric_created_by: "Créé par",
    rubric_compare_mode: "Mode comparaison",
    rubric_compare_select: "Sélectionnez 2 versions",
    rubric_compare_cancel: "Annuler",
    rubric_compare_view: "Comparer",

    // Wizard
    rubric_wizard_title: "Créer une rubrique",
    rubric_wizard_edit_title: "Modifier la rubrique",
    rubric_step_of: "Étape",
    rubric_step_of_total: "de 5",
    rubric_back: "Retour",
    rubric_next: "Suivant",
    rubric_save_draft: "Sauvegarder le brouillon",
    rubric_step1_title: "Démarrage rapide",
    rubric_step1_sub: "Choisissez un template ou repartez de zéro.",
    rubric_template_start_blank: "Repartir de zéro",
    rubric_step2_title: "Compétences & pondérations",
    rubric_step2_sub: "Définissez les compétences évaluées et leurs poids.",
    rubric_add_skill: "Ajouter une compétence",
    rubric_skill_name: "Nom de la compétence",
    rubric_skill_weight: "Poids (%)",
    rubric_skill_descriptors: "Descripteurs par niveau",
    rubric_level_junior: "Junior",
    rubric_level_mid: "Mid",
    rubric_level_senior: "Senior",
    rubric_level_staff: "Staff",
    rubric_total_weight: "Total",
    rubric_weight_error: "La somme des poids doit être égale à 100%",
    rubric_max_skills: "Maximum 8 compétences (pour préserver la qualité de l'évaluation)",
    rubric_move_up: "Déplacer vers le haut",
    rubric_move_down: "Déplacer vers le bas",
    rubric_remove: "Supprimer",
    rubric_step3_title: "Étapes de l'entretien",
    rubric_step3_sub: "Définissez la timeline de l'entretien.",
    rubric_add_stage: "Ajouter une étape",
    rubric_stage_name: "Nom de l'étape",
    rubric_stage_objective: "Objectif",
    rubric_stage_duration: "Durée (min)",
    rubric_stage_skills: "Compétences évaluées",
    rubric_total_duration: "Durée totale",
    rubric_duration_error: "La durée totale dépasse la durée cible du poste",
    rubric_step4_title: "Exclusions & langue",
    rubric_step4_sub: "Configurez les protections légales et les paramètres de langue.",
    rubric_mandatory_exclusions: "Exclusions obligatoires",
    rubric_mandatory_exclusions_info: "Ces exclusions sont requises par la réglementation (RGPD Art. 9) et ne peuvent pas être désactivées.",
    rubric_optional_exclusions: "Exclusions supplémentaires",
    rubric_add_exclusion: "Ajouter une exclusion",
    rubric_exclusion_type: "Type",
    rubric_exclusion_ask: "Ne pas demander",
    rubric_exclusion_score: "Ne pas scorer",
    rubric_exclusion_both: "Les deux",
    rubric_language: "Langue de l'entretien",
    rubric_tone: "Ton d'Aria",
    rubric_tone_warm: "Chaleureux",
    rubric_tone_neutral: "Neutre",
    rubric_tone_rigorous: "Rigoureux",
    rubric_defense_questions: "Questions de défense",
    rubric_defense_enabled: "Activer les questions de défense (anti-triche)",
    rubric_defense_min: "Questions minimum",
    rubric_defense_max: "Questions maximum",
    rubric_step5_title: "Test & publication",
    rubric_step5_sub: "Testez la rubrique avec des candidats simulés avant de publier.",
    rubric_run_test: "Lancer le test synthétique",
    rubric_testing: "Test en cours...",
    rubric_test_sim_junior: "Simulation candidat junior",
    rubric_test_sim_mid: "Simulation candidat mid",
    rubric_test_sim_senior: "Simulation candidat senior",
    rubric_test_results: "Résultats du test",
    rubric_test_spread: "Écart",
    rubric_test_pass: "Test passé",
    rubric_test_fail: "Différenciation insuffisante — revisez les level_descriptors",
    rubric_per_skill: "Détail par compétence",
    rubric_activate: "Publier (Activer)",
    rubric_activating: "Activation...",
    rubric_activate_success: "Rubrique publiée avec succès.",
    rubric_activate_error_409: "Impossible d'activer : la rubrique n'a pas encore été testée ou la différenciation est insuffisante.",
    rubric_readonly_notice: "Cette version est publiée et ne peut plus être modifiée. Clonez-la pour créer une nouvelle version.",
    rubric_overall_score: "Score global simulé",
    rubric_lock_tooltip: "Exclusion obligatoire — ne peut pas être désactivée",
    rubric_exclusion_locked_tooltip: "Exclusion obligatoire — ne peut pas être désactivée",

    // CV Adaptive Personalization
    cv_step_title: "Personnaliser votre entretien",
    cv_step_subtitle: "Téléversez votre CV pour qu'Aria pose des questions adaptées à votre parcours. Cette étape est entièrement optionnelle.",
    cv_optional_label: "Optionnel",
    cv_input_file: "Fichier",
    cv_input_paste: "Coller du texte",
    cv_input_skip: "Passer cette étape",
    cv_drop_zone_label: "Déposez votre CV ici, ou cliquez pour parcourir",
    cv_drop_zone_active: "Déposez le fichier ici",
    cv_browse_button: "Parcourir",
    cv_file_selected: "Fichier sélectionné",
    cv_paste_placeholder: "Collez le contenu de votre CV ici…",
    cv_paste_counter: "caractères",
    cv_consent_label: "J'autorise RecruteTech à analyser mon CV avec une IA pour personnaliser cet entretien.",
    cv_consent_why: "Pourquoi ce consentement séparé ?",
    cv_consent_explanation: "Votre CV peut contenir des données sensibles (santé, origine, etc.). Le RGPD Art. 9 exige un consentement explicite et distinct pour ce type de traitement.",
    cv_rgpd_policy_link: "Politique de confidentialité",
    cv_submit: "Analyser mon CV",
    cv_loading: "Analyse de votre CV…",
    cv_loading_long: "L'analyse prend plus de temps que prévu. Vous pouvez continuer sans personnalisation.",
    cv_continue_without: "Continuer sans CV",
    cv_received: "CV pris en compte",
    cv_processing_failed: "L'analyse n'a pas pu être complétée. Vous pouvez continuer — l'entretien fonctionnera normalement.",
    cv_file_too_large: "Le fichier dépasse 5 Mo. Veuillez choisir un fichier plus petit.",
    cv_file_wrong_type: "Format non accepté. Utilisez un fichier .pdf, .docx ou .txt.",
    cv_text_too_short: "Le texte est trop court (50 caractères minimum).",
    cv_error_422: "Le consentement est requis pour analyser le CV.",
    cv_error_404: "Ce lien d'entretien est introuvable ou expiré.",
    cv_error_server: "Une erreur s'est produite. Vous pouvez réessayer ou continuer sans CV.",
    cv_retry: "Réessayer",
    cv_accepted_formats: "Formats acceptés : PDF, DOCX, TXT · Max 5 Mo",

    // Transparent Scoring & Explainability — HR panel
    transparency_why_panel_title: "Pourquoi ce score ?",
    transparency_evidence_timeline: "Chronologie des preuves",
    transparency_evidence_unverified_warning: "Certaines citations n'ont pas pu être retrouvées mot pour mot dans la transcription. Vérifiez avant de partager.",
    transparency_counterfactuals_title: "Pour progresser d'un niveau",
    transparency_override_button: "Modifier le score",
    transparency_override_modal_title: "Modifier l'évaluation",
    transparency_override_skill_label: "Compétence",
    transparency_override_score_label: "Nouveau score (0 – 5)",
    transparency_override_justification_label: "Justification",
    transparency_override_justification_min_chars: "30 caractères minimum",
    transparency_override_submit: "Enregistrer la modification",
    transparency_override_success: "Modification enregistrée avec succès.",
    transparency_share_toggle: "Partager avec le candidat",
    transparency_share_on: "Activé",
    transparency_share_off: "Désactivé",
    transparency_candidate_url: "Lien pour le candidat",
    transparency_evidence_type_transcript: "Transcription",
    transparency_evidence_type_code: "Code",
    transparency_evidence_type_visual: "Indicateur visuel",
    transparency_previous_overrides: "Modifications précédentes",
    transparency_no_overrides: "Aucune modification enregistrée.",
    transparency_model_version: "Version du modèle d'évaluation",

    // Transparent Scoring — Candidate page
    candidate_explanation_title: "Vos retours d'entretien",
    candidate_explanation_strengths: "Vos points forts",
    candidate_explanation_growth: "Axes de progression",
    candidate_explanation_actionable: "Pour aller plus loin",
    candidate_explanation_letter: "Lettre de feedback",
    candidate_explanation_contest: "Contester cette évaluation",
    candidate_explanation_contest_modal_title: "Contester l'évaluation",
    candidate_explanation_contest_placeholder: "Décrivez votre contestation (ex. : une information incorrecte, un contexte manquant)…",
    candidate_explanation_contest_submit: "Envoyer ma contestation",
    candidate_explanation_contest_success: "Votre retour a bien été reçu. Un recruteur pourra en tenir compte.",
    candidate_explanation_not_shared: "Les retours d'entretien ne sont pas encore disponibles.",
    candidate_explanation_not_shared_help: "Le recruteur n'a pas encore activé le partage pour cet entretien. Vous pouvez contacter l'entreprise si vous avez des questions.",
    candidate_explanation_loading: "Chargement de vos retours…",
    candidate_explanation_error: "Impossible de charger vos retours. Veuillez réessayer.",
    candidate_explanation_retry: "Réessayer",
  },
  en: {
    brand: "RecruteTech",
    ariaBy: "Aria · by RecruteTech",
    pre_title: "Ready to meet Aria?",
    pre_sub: "Aria is your AI interviewer. A few checks before we start.",
    pre_role: "Role",
    pre_company: "Company",
    pre_duration: "Estimated duration",
    pre_minutes: "min",
    pre_camera: "Camera",
    pre_mic: "Microphone",
    pre_speaker: "Speakers",
    pre_connection: "Connection",
    pre_ready: "All set",
    pre_start: "Start the interview",
    pre_tips_title: "Before we begin",
    pre_tip_1: "Find a quiet, well-lit spot",
    pre_tip_2: "Speak naturally — Aria understands pauses",
    pre_tip_3: "Ask Aria to rephrase anytime",
    pre_consent: "I consent to the interview being recorded",
    live_stage: "Stage",
    live_stages: ["Introduction", "Experience", "Technical", "Code Review", "Questions"],
    live_remaining: "Time remaining",
    live_aria_speaking: "Aria is speaking",
    live_aria_listening: "Aria is listening",
    live_aria_thinking: "Aria is thinking",
    live_you: "You",
    live_transcript: "Transcript",
    live_end: "End interview",
    live_mute: "Mute",
    live_unmute: "Unmute",
    live_camera_off: "Turn camera off",
    code_title: "Coding challenge",
    code_challenge: "Challenge",
    code_hint: "Hint",
    code_run: "Run",
    code_submit: "Submit",
    code_stuck: "I'm stuck",
    code_output: "Output",
    sum_title: "Thank you!",
    sum_sub: "Your interview is complete. Aria is analyzing your answers.",
    sum_duration: "Duration",
    sum_questions: "Questions",
    sum_highlights: "Strengths detected",
    sum_next: "Next steps",
    sum_feedback_in: "Detailed feedback in 24h",
    hr_interviews: "Interviews",
    hr_candidates: "Candidates",
    hr_new: "New interview",
    hr_status_new: "New",
    hr_status_review: "Review",
    hr_status_shortlist: "Shortlist",
    hr_status_declined: "Declined",
    hr_score: "Aria score",
    hr_filter_all: "All",
    hr_filter_role: "Role",
    hr_search: "Search candidates...",
    det_transcript: "Transcript",
    det_evaluation: "Evaluation",
    det_moments: "Key moments",
    det_download: "Download report",
    det_shortlist: "Shortlist",
    cfg_title: "Configure an interview",
    cfg_role: "Role title",
    cfg_seniority: "Seniority",
    cfg_duration: "Total duration",
    cfg_stages: "Stages",
    cfg_skills: "Skills assessed",
    cfg_tone: "Aria's tone",
    cfg_language: "Language",
    cfg_preview: "Preview",
    cfg_publish: "Publish link",

    // Rubric builder
    rubric_nav: "Rubrics",
    rubric_list_title: "Evaluation rubrics",
    rubric_list_sub: "Manage rubric versions for this role.",
    rubric_new: "New rubric",
    rubric_clone: "Clone",
    rubric_compare: "Compare",
    rubric_empty_title: "No structured rubric",
    rubric_empty_sub: "This role currently uses a free-form prompt. Create a structured rubric for consistent scoring.",
    rubric_create_first: "Create a rubric",
    rubric_active: "Active",
    rubric_inactive: "Inactive",
    rubric_tested: "Tested",
    rubric_not_tested: "Not tested",
    rubric_diff_ok: "Differentiation OK",
    rubric_diff_fail: "Poor differentiation",
    rubric_version: "Version",
    rubric_created_by: "Created by",
    rubric_compare_mode: "Compare mode",
    rubric_compare_select: "Select 2 versions",
    rubric_compare_cancel: "Cancel",
    rubric_compare_view: "Compare",

    // Wizard
    rubric_wizard_title: "Create rubric",
    rubric_wizard_edit_title: "Edit rubric",
    rubric_step_of: "Step",
    rubric_step_of_total: "of 5",
    rubric_back: "Back",
    rubric_next: "Next",
    rubric_save_draft: "Save draft",
    rubric_step1_title: "Quick start",
    rubric_step1_sub: "Choose a template or start from scratch.",
    rubric_template_start_blank: "Start blank",
    rubric_step2_title: "Skills & weights",
    rubric_step2_sub: "Define the skills to evaluate and their weights.",
    rubric_add_skill: "Add skill",
    rubric_skill_name: "Skill name",
    rubric_skill_weight: "Weight (%)",
    rubric_skill_descriptors: "Level descriptors",
    rubric_level_junior: "Junior",
    rubric_level_mid: "Mid",
    rubric_level_senior: "Senior",
    rubric_level_staff: "Staff",
    rubric_total_weight: "Total",
    rubric_weight_error: "Weights must sum to 100%",
    rubric_max_skills: "Maximum 8 skills (to maintain evaluation quality)",
    rubric_move_up: "Move up",
    rubric_move_down: "Move down",
    rubric_remove: "Remove",
    rubric_step3_title: "Interview stages",
    rubric_step3_sub: "Define the interview timeline.",
    rubric_add_stage: "Add stage",
    rubric_stage_name: "Stage name",
    rubric_stage_objective: "Objective",
    rubric_stage_duration: "Duration (min)",
    rubric_stage_skills: "Skills evaluated",
    rubric_total_duration: "Total duration",
    rubric_duration_error: "Total duration exceeds the role's target duration",
    rubric_step4_title: "Exclusions & language",
    rubric_step4_sub: "Configure legal protections and language settings.",
    rubric_mandatory_exclusions: "Mandatory exclusions",
    rubric_mandatory_exclusions_info: "These exclusions are required by regulation (GDPR Art. 9) and cannot be disabled.",
    rubric_optional_exclusions: "Additional exclusions",
    rubric_add_exclusion: "Add an exclusion",
    rubric_exclusion_type: "Type",
    rubric_exclusion_ask: "Do not ask",
    rubric_exclusion_score: "Do not score",
    rubric_exclusion_both: "Both",
    rubric_language: "Interview language",
    rubric_tone: "Aria's tone",
    rubric_tone_warm: "Warm",
    rubric_tone_neutral: "Neutral",
    rubric_tone_rigorous: "Rigorous",
    rubric_defense_questions: "Defense questions",
    rubric_defense_enabled: "Enable defense questions (anti-cheating)",
    rubric_defense_min: "Minimum questions",
    rubric_defense_max: "Maximum questions",
    rubric_step5_title: "Test & publish",
    rubric_step5_sub: "Test the rubric with simulated candidates before publishing.",
    rubric_run_test: "Run synthetic test",
    rubric_testing: "Testing...",
    rubric_test_sim_junior: "Junior candidate simulation",
    rubric_test_sim_mid: "Mid-level candidate simulation",
    rubric_test_sim_senior: "Senior candidate simulation",
    rubric_test_results: "Test results",
    rubric_test_spread: "Spread",
    rubric_test_pass: "Test passed",
    rubric_test_fail: "Poor differentiation — revisit level_descriptors",
    rubric_per_skill: "Per-skill breakdown",
    rubric_activate: "Publish (Activate)",
    rubric_activating: "Activating...",
    rubric_activate_success: "Rubric published successfully.",
    rubric_activate_error_409: "Cannot activate: rubric has not been tested yet or differentiation is insufficient.",
    rubric_readonly_notice: "This version is published and can no longer be edited. Clone it to create a new version.",
    rubric_overall_score: "Simulated overall score",
    rubric_lock_tooltip: "Mandatory exclusion — cannot be disabled",
    rubric_exclusion_locked_tooltip: "Mandatory exclusion — cannot be disabled",

    // CV Adaptive Personalization
    cv_step_title: "Personalize your interview",
    cv_step_subtitle: "Upload your CV so Aria can ask questions tailored to your background. This step is entirely optional.",
    cv_optional_label: "Optional",
    cv_input_file: "File",
    cv_input_paste: "Paste text",
    cv_input_skip: "Skip this step",
    cv_drop_zone_label: "Drop your CV here, or click to browse",
    cv_drop_zone_active: "Drop the file here",
    cv_browse_button: "Browse",
    cv_file_selected: "File selected",
    cv_paste_placeholder: "Paste the content of your CV here…",
    cv_paste_counter: "characters",
    cv_consent_label: "I authorize RecruteTech to analyze my CV with AI to personalize this interview.",
    cv_consent_why: "Why is this consent separate?",
    cv_consent_explanation: "Your CV may contain sensitive data (health, origin, etc.). GDPR Art. 9 requires an explicit and separate consent for this type of processing.",
    cv_rgpd_policy_link: "Privacy policy",
    cv_submit: "Analyze my CV",
    cv_loading: "Analyzing your CV…",
    cv_loading_long: "Analysis is taking longer than expected. You can continue without personalization.",
    cv_continue_without: "Continue without CV",
    cv_received: "CV received",
    cv_processing_failed: "Analysis could not be completed. You can continue — the interview will work normally.",
    cv_file_too_large: "File exceeds 5 MB. Please choose a smaller file.",
    cv_file_wrong_type: "Format not accepted. Please use a .pdf, .docx, or .txt file.",
    cv_text_too_short: "Text is too short (minimum 50 characters).",
    cv_error_422: "Consent is required to analyze the CV.",
    cv_error_404: "This interview link was not found or has expired.",
    cv_error_server: "An error occurred. You can retry or continue without a CV.",
    cv_retry: "Retry",
    cv_accepted_formats: "Accepted formats: PDF, DOCX, TXT · Max 5 MB",

    // Transparent Scoring & Explainability — HR panel
    transparency_why_panel_title: "Why this score?",
    transparency_evidence_timeline: "Evidence timeline",
    transparency_evidence_unverified_warning: "Some quotes could not be matched to the transcript verbatim. Investigate before publishing.",
    transparency_counterfactuals_title: "To reach the next level",
    transparency_override_button: "Override score",
    transparency_override_modal_title: "Override evaluation",
    transparency_override_skill_label: "Skill",
    transparency_override_score_label: "New score (0 – 5)",
    transparency_override_justification_label: "Justification",
    transparency_override_justification_min_chars: "30 characters minimum",
    transparency_override_submit: "Save override",
    transparency_override_success: "Override saved successfully.",
    transparency_share_toggle: "Share with candidate",
    transparency_share_on: "On",
    transparency_share_off: "Off",
    transparency_candidate_url: "Candidate explanation URL",
    transparency_evidence_type_transcript: "Transcript",
    transparency_evidence_type_code: "Code",
    transparency_evidence_type_visual: "Visual metric",
    transparency_previous_overrides: "Previous overrides",
    transparency_no_overrides: "No overrides recorded.",
    transparency_model_version: "Evaluation model version",

    // Transparent Scoring — Candidate page
    candidate_explanation_title: "Your interview feedback",
    candidate_explanation_strengths: "Your strengths",
    candidate_explanation_growth: "Growth areas",
    candidate_explanation_actionable: "To grow further",
    candidate_explanation_letter: "Feedback letter",
    candidate_explanation_contest: "Contest this evaluation",
    candidate_explanation_contest_modal_title: "Contest the evaluation",
    candidate_explanation_contest_placeholder: "Describe your concern (e.g. incorrect information, missing context)…",
    candidate_explanation_contest_submit: "Submit contest",
    candidate_explanation_contest_success: "Your feedback has been received. A recruiter may take it into account.",
    candidate_explanation_not_shared: "Interview feedback is not available yet.",
    candidate_explanation_not_shared_help: "The recruiter has not yet enabled sharing for this interview. Contact the company if you have questions.",
    candidate_explanation_loading: "Loading your feedback…",
    candidate_explanation_error: "Could not load your feedback. Please try again.",
    candidate_explanation_retry: "Retry",
  },
};

export function Logo({ size = 22, showText = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <defs>
          <radialGradient id="rtlogo" cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#F4A781" />
            <stop offset="55%" stopColor="#E8734A" />
            <stop offset="100%" stopColor="#C85A34" />
          </radialGradient>
        </defs>
        <path
          d="M16 2 C22 2 28 7 28 14 C28 19 26 22 22 25 C20 26 18 28 16 31 C14 28 12 26 10 25 C6 22 4 19 4 14 C4 7 10 2 16 2 Z"
          fill="url(#rtlogo)"
        />
        <circle cx="16" cy="14" r="3.5" fill="#FBF7F2" opacity="0.95" />
      </svg>
      {showText && (
        <span style={{ fontFamily: "var(--serif)", fontSize: size * 0.9, color: "var(--ink)", letterSpacing: "-0.01em" }}>
          RecruteTech
        </span>
      )}
    </div>
  );
}

export function AriaOrb({ size = 120, state = "idle", palette = "warm" }) {
  const palettes = {
    warm: { a: "#F4A781", b: "#E8734A", c: "#C85A34", glow: "rgba(232,115,74,0.35)" },
    sage: { a: "#A8C7B8", b: "#2E5D4F", c: "#1F4236", glow: "rgba(46,93,79,0.35)" },
    plum: { a: "#C999A8", b: "#6B4A5C", c: "#4A3341", glow: "rgba(107,74,92,0.35)" },
  };
  const p = palettes[palette] || palettes.warm;
  const intensity = state === "speaking" ? 1 : state === "listening" ? 0.5 : state === "thinking" ? 0.7 : 0.3;
  const speed = state === "speaking" ? "2.2s" : state === "thinking" ? "3s" : "5s";

  return (
    <div style={{ position: "relative", width: size, height: size, display: "grid", placeItems: "center" }}>
      <div style={{
        position: "absolute",
        inset: -size * 0.15,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${p.glow} 0%, transparent 65%)`,
        opacity: intensity,
        animation: `aria-breathe ${speed} ease-in-out infinite`,
      }} />
      <div className="aria-orb-core" style={{
        width: size * 0.82,
        height: size * 0.82,
        background: `radial-gradient(circle at 30% 30%, ${p.a}, ${p.b} 55%, ${p.c} 100%)`,
        boxShadow: `inset -${size * 0.08}px -${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.25), inset ${size * 0.06}px ${size * 0.06}px ${size * 0.15}px rgba(255,255,255,0.35)`,
        animationDuration: `7s, ${speed}`,
      }} />
      {state === "speaking" && (
        <div style={{
          position: "absolute", bottom: size * 0.22, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "flex-end", gap: 3, height: size * 0.2,
        }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              width: size * 0.03, height: "100%",
              background: "rgba(255,255,255,0.85)",
              borderRadius: 999, transformOrigin: "bottom",
              animation: `wave-bar 0.9s ease-in-out ${i * 0.12}s infinite`,
            }} />
          ))}
        </div>
      )}
      {state === "thinking" && (
        <div style={{
          position: "absolute", bottom: size * 0.28, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 4,
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: size * 0.05, height: size * 0.05,
              borderRadius: "50%", background: "rgba(255,255,255,0.8)",
              animation: `wave-bar 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CandidateWebcam({ width = 220, height = 160, name = "Vous", muted = false, cameraOff = false }) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  return (
    <div style={{
      position: "relative", width, height,
      borderRadius: 18, overflow: "hidden",
      background: cameraOff
        ? "linear-gradient(135deg, #2A241E, #1A1612)"
        : "linear-gradient(135deg, #E8C9B4 0%, #C89A7A 55%, #8B6349 100%)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.06)",
    }}>
      {!cameraOff && (
        <>
          <svg viewBox="0 0 200 160" preserveAspectRatio="xMidYMid slice"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <ellipse cx="100" cy="180" rx="90" ry="60" fill="#6B4A35" opacity="0.7" />
            <ellipse cx="100" cy="80" rx="34" ry="40" fill="#C89A7A" />
            <path d="M 66 70 Q 68 42 100 40 Q 132 42 134 70 Q 130 52 100 52 Q 70 52 66 70 Z" fill="#3E2A1C" />
            <path d="M 40 160 Q 60 130 100 130 Q 140 130 160 160 L 160 160 L 40 160 Z" fill="#2E5D4F" />
          </svg>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.25) 100%)" }} />
        </>
      )}
      {cameraOff && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#F5EEE3", fontFamily: "var(--serif)", fontSize: 48 }}>
          {initial}
        </div>
      )}
      <div style={{
        position: "absolute", bottom: 8, left: 8,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        color: "#FFF", fontSize: 11, fontWeight: 500, padding: "4px 10px",
        borderRadius: 999, display: "flex", alignItems: "center", gap: 6,
      }}>
        {muted ? <MicOffIcon size={11} /> : <LiveDot />}
        {name}
      </div>
    </div>
  );
}

export function LiveDot() {
  return (
    <span style={{ width: 6, height: 6, borderRadius: 999, background: "#E8734A", boxShadow: "0 0 0 4px rgba(232,115,74,0.25)", display: "inline-block" }} />
  );
}

function Icon({ children, size = 16, stroke = "currentColor", fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const MicIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Icon>
);
export const MicOffIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.12 2.12M15 9V6a3 3 0 0 0-5.94-.6M5 11a7 7 0 0 0 11.9 5M19 11a7 7 0 0 0-.4-2.3M12 18v3" /></Icon>
);
export const CamIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="2" y="6" width="14" height="12" rx="3" /><path d="M16 10l6-3v10l-6-3z" /></Icon>
);
export const CamOffIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M3 3l18 18M16 10l6-3v10M2 6h12l2 2v6a2 2 0 0 1-2 2H6" /></Icon>
);
export const CodeIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16" /></Icon>
);
export const ClockIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
);
export const CheckIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M20 6L9 17l-5-5" /></Icon>
);
export const ChevronRight = ({ size = 16 }) => (
  <Icon size={size}><path d="M9 6l6 6-6 6" /></Icon>
);
export const SearchIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>
);
export const PlusIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M12 5v14M5 12h14" /></Icon>
);
export const DownloadIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></Icon>
);
export const SparkleIcon = ({ size = 16, fill = "none" }) => (
  <Icon size={size} fill={fill}><path d="M12 3l1.8 4.8L18 10l-4.2 2.2L12 17l-1.8-4.8L6 10l4.2-2.2z" /></Icon>
);
export const ArrowRight = ({ size = 16 }) => (
  <Icon size={size}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>
);
export const MoreIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></Icon>
);
export const PauseIcon = ({ size = 16 }) => (
  <Icon size={size}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></Icon>
);
export const PhoneIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M22 16.9v2.8a2 2 0 0 1-2.2 2A20 20 0 0 1 2.3 4.2 2 2 0 0 1 4.3 2h2.8a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z" /></Icon>
);
export const LockIcon = ({ size = 14 }) => (
  <Icon size={size}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>
);
export const ChevronUpIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M18 15l-6-6-6 6" /></Icon>
);
export const ChevronDownIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M6 9l6 6 6-6" /></Icon>
);
export const XIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M18 6L6 18M6 6l12 12" /></Icon>
);
export const GitCompareIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7M11 18H8a2 2 0 0 1-2-2V9" /><polyline points="11 15 8 18 11 21" /><polyline points="13 9 16 6 13 3" /></Icon>
);
export const LayersIcon = ({ size = 16 }) => (
  <Icon size={size}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Icon>
);
export const AlertTriangleIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M10.3 3.6L1.7 18a1 1 0 0 0 .9 1.5h18.8a1 1 0 0 0 .9-1.5L13.7 3.6a2 2 0 0 0-3.4 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>
);
export const SlidersIcon = ({ size = 16 }) => (
  <Icon size={size}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></Icon>
);
export const ShareIcon = ({ size = 16 }) => (
  <Icon size={size}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></Icon>
);
export const ClipboardIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></Icon>
);
export const MessageSquareIcon = ({ size = 16 }) => (
  <Icon size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>
);
export const ArrowUpIcon = ({ size = 16 }) => (
  <Icon size={size}><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></Icon>
);
