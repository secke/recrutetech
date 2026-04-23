import { useState } from 'react';
import {
    Trophy,
    Star,
    Download,
    Share2,
    Eye,
    MessageSquare,
    Gauge,
    Target,
    Mic,
    Smile,
    Brain,
    TrendingUp,
    ChevronRight,
    Award,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

const CANDIDATES = [
    {
        id: 1,
        rank: 1,
        avatar: 'LC',
        name: 'Léa Chen',
        role: 'Product Designer',
        overall: 9.2,
        confidence: 94,
        communication: 92,
        expertise: 90,
        engagement: 88,
        status: 'top',
    },
    {
        id: 2,
        rank: 2,
        avatar: 'MD',
        name: 'Marie Dupont',
        role: 'Senior Frontend',
        overall: 8.6,
        confidence: 88,
        communication: 85,
        expertise: 86,
        engagement: 82,
        status: 'top',
    },
    {
        id: 3,
        rank: 3,
        avatar: 'AF',
        name: 'Amélie Fontaine',
        role: 'Growth Manager',
        overall: 7.8,
        confidence: 76,
        communication: 82,
        expertise: 78,
        engagement: 72,
        status: 'good',
    },
    {
        id: 4,
        rank: 4,
        avatar: 'KB',
        name: 'Karim Belkacem',
        role: 'Backend Engineer',
        overall: 7.4,
        confidence: 72,
        communication: 70,
        expertise: 78,
        engagement: 70,
        status: 'good',
    },
    {
        id: 5,
        rank: 5,
        avatar: 'TR',
        name: 'Thomas Renard',
        role: 'Data Scientist',
        overall: 6.9,
        confidence: 68,
        communication: 66,
        expertise: 72,
        engagement: 66,
        status: 'average',
    },
];

const METRICS = [
    { icon: Gauge, label: 'Confiance', value: 84, color: 'from-emerald-500 to-teal-500' },
    { icon: Mic, label: 'Clarté vocale', value: 91, color: 'from-brand-500 to-cyan-500' },
    { icon: Eye, label: 'Contact visuel', value: 78, color: 'from-purple-500 to-pink-500' },
    { icon: Brain, label: 'Expertise', value: 87, color: 'from-amber-500 to-orange-500' },
    { icon: Smile, label: 'Engagement', value: 82, color: 'from-rose-500 to-red-500' },
    { icon: Target, label: 'Pertinence', value: 89, color: 'from-indigo-500 to-blue-500' },
];

const STRENGTHS = [
    'Excellente articulation des idées techniques',
    'Exemples concrets et pertinents',
    'Très bon contact visuel tout au long',
    'Maîtrise avancée des patterns React',
];

const WEAKNESSES = [
    'Pourrait développer davantage sur l\'architecture',
    'Quelques hésitations sur les questions système',
];

const rankBg = (rank) => {
    if (rank === 1) return 'from-amber-400 to-orange-500';
    if (rank === 2) return 'from-slate-300 to-slate-500';
    if (rank === 3) return 'from-orange-600 to-amber-700';
    return 'from-ink-600 to-ink-700';
};

const ResultsPage = () => {
    const [selectedId, setSelectedId] = useState(1);
    const selected = CANDIDATES.find((c) => c.id === selectedId);

    return (
        <div className="section py-10 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <div className="chip mb-3">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        Senior Frontend Engineer · Datalive
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        Résultats des entretiens
                    </h1>
                    <p className="text-ink-400 mt-1">
                        42 candidats · 38 entretiens terminés · Cycle clos il y a 2 jours
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="btn-ghost text-sm">
                        <Share2 className="w-4 h-4" />
                        Partager
                    </button>
                    <button className="btn-primary text-sm">
                        <Download className="w-4 h-4" />
                        Exporter rapport
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Leaderboard */}
                <div className="lg:col-span-2 card">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h2 className="text-lg font-bold">Classement</h2>
                            <p className="text-sm text-ink-400 mt-0.5">Top candidats</p>
                        </div>
                        <div className="chip">
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            Score global
                        </div>
                    </div>

                    <div className="space-y-2">
                        {CANDIDATES.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSelectedId(c.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                                    selectedId === c.id
                                        ? 'bg-white/10 border border-white/15'
                                        : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${rankBg(
                                        c.rank
                                    )} flex items-center justify-center font-black text-sm flex-shrink-0`}
                                >
                                    {c.rank}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {c.avatar}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{c.name}</div>
                                    <div className="text-xs text-ink-400 truncate">{c.role}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-black gradient-text">
                                        {c.overall}
                                    </div>
                                    <div className="text-[10px] text-ink-400 -mt-1">/ 10</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Candidate header */}
                    <div className="card relative overflow-hidden">
                        <div className="absolute -top-20 -right-20 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl" />
                        <div className="relative flex flex-wrap items-center gap-5">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-2xl font-black shadow-glow">
                                    {selected.avatar}
                                </div>
                                {selected.rank === 1 && (
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                        <Award className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-2xl font-bold">{selected.name}</h3>
                                    {selected.status === 'top' && (
                                        <div className="chip bg-amber-500/15 border-amber-500/30 text-amber-300">
                                            <Star className="w-3 h-3" fill="currentColor" />
                                            Top candidat
                                        </div>
                                    )}
                                </div>
                                <p className="text-ink-400">{selected.role}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-5xl font-black gradient-text">
                                    {selected.overall}
                                </div>
                                <div className="text-sm text-ink-400 -mt-1">Score global / 10</div>
                            </div>
                        </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="card">
                        <h3 className="text-lg font-bold mb-5">Analyse détaillée</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {METRICS.map((m) => (
                                <div
                                    key={m.label}
                                    className="p-4 rounded-xl bg-white/5 border border-white/5"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div
                                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center`}
                                        >
                                            <m.icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs text-ink-300">{m.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-2xl font-black">{m.value}</span>
                                        <span className="text-xs text-ink-400">%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${m.color} rounded-full`}
                                            style={{ width: `${m.value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Strengths / Weaknesses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                </div>
                                <h3 className="font-bold">Points forts</h3>
                            </div>
                            <ul className="space-y-2.5">
                                {STRENGTHS.map((s, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-ink-200">
                                        <span className="text-emerald-400 mt-0.5">✓</span>
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="card">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <XCircle className="w-4 h-4 text-amber-400" />
                                </div>
                                <h3 className="font-bold">Axes d'amélioration</h3>
                            </div>
                            <ul className="space-y-2.5">
                                {WEAKNESSES.map((w, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-ink-200">
                                        <span className="text-amber-400 mt-0.5">!</span>
                                        <span>{w}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Transcript preview */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-brand-400" />
                                <h3 className="font-bold">Extrait de transcription</h3>
                            </div>
                            <button className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                                Voir tout <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                    IA
                                </div>
                                <div className="flex-1 p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-ink-200">
                                    Pouvez-vous nous parler d'un projet React sur lequel vous êtes
                                    particulièrement fier ?
                                </div>
                            </div>
                            <div className="flex gap-3 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                    {selected.avatar}
                                </div>
                                <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/10 text-sm text-ink-100">
                                    Récemment, j'ai mené la refonte d'une interface critique avec un
                                    design system custom. On a réduit le temps de chargement de 60%
                                    et amélioré l'accessibilité WCAG AA...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
