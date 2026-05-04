import {
    ArrowRight,
    Bot,
    Brain,
    ShieldCheck,
    LineChart,
    Clock,
    Globe,
    Sparkles,
    Play,
    CheckCircle2,
    Users,
    Star,
    Quote,
    Zap,
} from 'lucide-react';

const STATS = [
    { value: '1 200+', label: 'Entreprises' },
    { value: '85K+', label: 'Entretiens menés' },
    { value: '95%', label: 'Satisfaction RH' },
    { value: '4x', label: 'Plus rapide' },
];

const FEATURES = [
    {
        icon: Bot,
        title: 'Entretiens IA naturels',
        text: 'Des conversations fluides en temps réel avec un recruteur IA qui s\'adapte au profil du candidat.',
        color: 'from-blue-500 to-cyan-500',
    },
    {
        icon: Brain,
        title: 'Analyse comportementale',
        text: 'Détection d\'engagement, contact visuel, ton de voix et confiance grâce à la vision par ordinateur.',
        color: 'from-purple-500 to-pink-500',
    },
    {
        icon: LineChart,
        title: 'Rapports détaillés',
        text: 'Scores multi-critères, forces et axes d\'amélioration avec transcription complète.',
        color: 'from-amber-500 to-orange-500',
    },
    {
        icon: ShieldCheck,
        title: 'Évaluation équitable',
        text: 'Modèles audités pour réduire les biais. Conforme RGPD avec données chiffrées.',
        color: 'from-emerald-500 to-teal-500',
    },
    {
        icon: Globe,
        title: 'Multi-langue',
        text: 'Plus de 20 langues supportées. Entretiens identiques partout dans le monde.',
        color: 'from-indigo-500 to-blue-500',
    },
    {
        icon: Zap,
        title: 'Intégration rapide',
        text: 'Connectez votre ATS en minutes. Workday, Greenhouse, Lever, Teamtailor.',
        color: 'from-rose-500 to-red-500',
    },
];

const STEPS = [
    {
        num: '01',
        title: 'Publiez votre poste',
        text: 'Décrivez le rôle, les compétences requises et les questions. L\'IA génère le script d\'entretien.',
    },
    {
        num: '02',
        title: 'Le candidat passe l\'entretien',
        text: 'Interview vidéo 15-30 min avec l\'agent IA. Disponible 24/7, depuis n\'importe quel appareil.',
    },
    {
        num: '03',
        title: 'Analyse automatique',
        text: 'Transcription, scoring et analyse comportementale livrés en quelques secondes.',
    },
    {
        num: '04',
        title: 'Recevez le rapport',
        text: 'Classement, points clés et recommandations. Focalisez-vous sur les meilleurs talents.',
    },
];

const TESTIMONIALS = [
    {
        quote: 'On a divisé par 4 notre temps de présélection. Les rapports sont d\'une précision bluffante.',
        author: 'Claire Dubois',
        role: 'Head of Talent — Datalive',
        rating: 5,
    },
    {
        quote: 'Nos candidats adorent l\'expérience. Fini les entretiens qui se chevauchent, tout est fluide.',
        author: 'Marc Lefevre',
        role: 'CTO — Northwind',
        rating: 5,
    },
    {
        quote: 'Enfin un outil qui fait vraiment gagner du temps sans sacrifier la qualité d\'évaluation.',
        author: 'Sarah Nguyen',
        role: 'VP People — Axelora',
        rating: 5,
    },
];

const LOGOS = ['Datalive', 'Northwind', 'Axelora', 'Helix', 'Orbital', 'Nexify'];

const LandingPage = ({ onNavigate }) => {
    return (
        <div className="pb-12">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.15] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/20 rounded-full blur-[120px] -z-10" />
                <div className="absolute top-40 right-10 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] -z-10" />

                <div className="section pt-20 pb-24 relative">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 chip mb-8 animate-fade-up">
                            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                            <span>Nouveau : analyse comportementale en direct</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </div>

                        <h1
                            className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6 animate-fade-up"
                            style={{ animationDelay: '80ms' }}
                        >
                            Recrutez les <span className="gradient-text">meilleurs talents</span>
                            <br />
                            en 4x moins de temps.
                        </h1>

                        <p
                            className="text-lg md:text-xl text-ink-300 max-w-2xl mx-auto mb-10 animate-fade-up"
                            style={{ animationDelay: '160ms' }}
                        >
                            Notre IA mène des entretiens vidéo naturels, analyse le comportement en
                            temps réel et vous livre des rapports précis pour décider plus vite.
                        </p>

                        <div
                            className="flex flex-wrap justify-center gap-3 animate-fade-up"
                            style={{ animationDelay: '240ms' }}
                        >
                            <button
                                onClick={() => onNavigate('interview')}
                                className="btn-primary text-base"
                            >
                                <Play className="w-4 h-4" fill="currentColor" />
                                Essayer une démo
                            </button>
                            <button
                                onClick={() => onNavigate('jobs')}
                                className="btn-ghost text-base"
                            >
                                Voir les offres
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div
                            className="mt-10 flex items-center justify-center gap-6 text-xs text-ink-400 animate-fade-up"
                            style={{ animationDelay: '320ms' }}
                        >
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Sans carte bancaire
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Conforme RGPD
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Déployé en 10 min
                            </div>
                        </div>
                    </div>

                    {/* Hero product preview */}
                    <div
                        className="mt-16 max-w-5xl mx-auto animate-fade-up"
                        style={{ animationDelay: '400ms' }}
                    >
                        <div className="relative rounded-3xl glass p-3 shadow-2xl">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500/40 via-purple-500/40 to-pink-500/40 rounded-3xl blur opacity-50 -z-10" />
                            <div className="rounded-2xl bg-ink-900/60 overflow-hidden aspect-[16/9] relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-900" />
                                <div className="absolute inset-0 grid grid-cols-3 gap-3 p-6">
                                    <div className="col-span-2 rounded-xl bg-black/40 border border-white/10 p-4 flex flex-col">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="ml-auto text-[10px] text-ink-400">Live</span>
                                        </div>
                                        <div className="flex-1 rounded-lg bg-gradient-to-br from-purple-600/20 to-brand-600/20 flex items-center justify-center relative">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow animate-float-slow">
                                                <Bot className="w-12 h-12 text-white" />
                                            </div>
                                            <div className="absolute bottom-3 left-3 right-3 flex gap-1">
                                                {[40, 70, 50, 90, 60, 80, 55, 75, 65, 85, 45, 70].map(
                                                    (h, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex-1 bg-brand-400/70 rounded-full animate-pulse"
                                                            style={{
                                                                height: `${h / 4}px`,
                                                                animationDelay: `${i * 100}ms`,
                                                            }}
                                                        />
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Confiance', val: 87, color: 'bg-emerald-500' },
                                            { label: 'Engagement', val: 92, color: 'bg-brand-500' },
                                            { label: 'Contact visuel', val: 78, color: 'bg-purple-500' },
                                        ].map((m) => (
                                            <div
                                                key={m.label}
                                                className="rounded-xl bg-black/40 border border-white/10 p-3"
                                            >
                                                <div className="flex justify-between text-[10px] text-ink-300 mb-1.5">
                                                    <span>{m.label}</span>
                                                    <span className="font-bold text-white">{m.val}%</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                    <div
                                                        className={`h-full ${m.color} rounded-full`}
                                                        style={{ width: `${m.val}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Logos */}
            <section className="section py-10">
                <p className="text-center text-xs uppercase tracking-widest text-ink-400 mb-8">
                    Ils recrutent avec RecruteTech
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4 opacity-70">
                    {LOGOS.map((l) => (
                        <span key={l} className="text-xl font-bold text-ink-300/60 tracking-tight">
                            {l}
                        </span>
                    ))}
                </div>
            </section>

            {/* Stats */}
            <section className="section py-16">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STATS.map((s) => (
                        <div key={s.label} className="card text-center">
                            <div className="text-3xl md:text-4xl font-black gradient-text">
                                {s.value}
                            </div>
                            <div className="text-sm text-ink-400 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="section py-20">
                <div className="max-w-2xl mb-12">
                    <div className="chip mb-4">
                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                        Fonctionnalités
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        Tout ce qu'il faut pour recruter <span className="gradient-text">mieux</span>.
                    </h2>
                    <p className="text-ink-300 text-lg">
                        Une plateforme complète qui automatise l'évaluation sans jamais sacrifier la
                        qualité humaine.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {FEATURES.map((f) => (
                        <div
                            key={f.title}
                            className="card glass-hover group cursor-pointer"
                        >
                            <div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                            >
                                <f.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                            <p className="text-sm text-ink-300 leading-relaxed">{f.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="section py-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <div className="chip mb-4 mx-auto">
                        <Clock className="w-3.5 h-3.5 text-brand-400" />
                        Comment ça marche
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        De l'annonce au rapport en <span className="gradient-text">4 étapes</span>.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {STEPS.map((s, i) => (
                        <div key={s.num} className="relative card">
                            {i < STEPS.length - 1 && (
                                <div className="hidden lg:block absolute top-10 -right-3 w-6 h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                            )}
                            <div className="text-5xl font-black gradient-text mb-4 leading-none">
                                {s.num}
                            </div>
                            <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                            <p className="text-sm text-ink-300 leading-relaxed">{s.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials */}
            <section className="section py-20">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <div className="chip mb-4 mx-auto">
                        <Users className="w-3.5 h-3.5 text-brand-400" />
                        Témoignages
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        Des équipes RH qui <span className="gradient-text">recrutent mieux</span>.
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {TESTIMONIALS.map((t) => (
                        <div key={t.author} className="card flex flex-col">
                            <Quote className="w-8 h-8 text-brand-400/60 mb-4" />
                            <p className="text-ink-100 flex-1 leading-relaxed mb-5">"{t.quote}"</p>
                            <div className="flex items-center gap-1 mb-3">
                                {Array.from({ length: t.rating }).map((_, i) => (
                                    <Star
                                        key={i}
                                        className="w-4 h-4 text-amber-400"
                                        fill="currentColor"
                                    />
                                ))}
                            </div>
                            <div>
                                <div className="font-semibold text-white">{t.author}</div>
                                <div className="text-xs text-ink-400">{t.role}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="section py-20">
                <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-purple-600 to-pink-600" />
                    <div className="absolute inset-0 bg-grid-pattern bg-[size:30px_30px] opacity-20" />
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/20 rounded-full blur-3xl" />

                    <div className="relative">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                            Prêt à transformer votre recrutement ?
                        </h2>
                        <p className="text-lg text-white/80 max-w-xl mx-auto mb-8">
                            Lancez votre premier entretien IA en moins de 5 minutes. Sans carte
                            bancaire.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <button
                                onClick={() => onNavigate('interview')}
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold bg-white text-ink-900 hover:bg-ink-100 transition-all transform hover:-translate-y-0.5 shadow-xl"
                            >
                                <Play className="w-4 h-4" fill="currentColor" />
                                Lancer une démo
                            </button>
                            <button
                                onClick={() => onNavigate('dashboard')}
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-all"
                            >
                                Voir le dashboard
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
