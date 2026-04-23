import {
    Briefcase,
    Users,
    TrendingUp,
    Clock,
    Video,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Calendar,
    FileText,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';

const KPIS = [
    {
        label: 'Entretiens ce mois',
        value: '248',
        delta: '+18.2%',
        up: true,
        icon: Video,
        color: 'from-brand-500 to-cyan-500',
    },
    {
        label: 'Candidats actifs',
        value: '1 842',
        delta: '+6.4%',
        up: true,
        icon: Users,
        color: 'from-purple-500 to-pink-500',
    },
    {
        label: 'Postes ouverts',
        value: '34',
        delta: '+2',
        up: true,
        icon: Briefcase,
        color: 'from-amber-500 to-orange-500',
    },
    {
        label: 'Temps moyen',
        value: '22 min',
        delta: '-12%',
        up: false,
        icon: Clock,
        color: 'from-emerald-500 to-teal-500',
    },
];

const ACTIVITY = [
    {
        avatar: 'MD',
        name: 'Marie Dupont',
        role: 'Senior Frontend Engineer',
        time: 'il y a 12 min',
        status: 'completed',
        score: 8.6,
    },
    {
        avatar: 'TR',
        name: 'Thomas Renard',
        role: 'Data Scientist',
        time: 'il y a 35 min',
        status: 'in_progress',
        score: null,
    },
    {
        avatar: 'LC',
        name: 'Léa Chen',
        role: 'Product Designer',
        time: 'il y a 1h',
        status: 'completed',
        score: 9.2,
    },
    {
        avatar: 'KB',
        name: 'Karim Belkacem',
        role: 'Backend Engineer',
        time: 'il y a 2h',
        status: 'pending',
        score: null,
    },
    {
        avatar: 'AF',
        name: 'Amélie Fontaine',
        role: 'Growth Manager',
        time: 'il y a 3h',
        status: 'completed',
        score: 7.8,
    },
];

const UPCOMING = [
    {
        day: '24',
        month: 'AVR',
        title: 'Entretien — Senior DevOps',
        candidate: 'Julien Rousseau',
        time: '14:00',
    },
    {
        day: '24',
        month: 'AVR',
        title: 'Entretien — Tech Lead',
        candidate: 'Emma Laurent',
        time: '16:30',
    },
    {
        day: '25',
        month: 'AVR',
        title: 'Débriefing équipe RH',
        candidate: '5 candidats à revoir',
        time: '10:00',
    },
];

const TRENDS = [42, 55, 48, 62, 58, 70, 75, 68, 82, 78, 90, 85];

const statusStyle = (status) => {
    switch (status) {
        case 'completed':
            return {
                pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                icon: CheckCircle2,
                label: 'Terminé',
            };
        case 'in_progress':
            return {
                pill: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
                icon: Video,
                label: 'En cours',
            };
        default:
            return {
                pill: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                icon: AlertCircle,
                label: 'En attente',
            };
    }
};

const DashboardPage = ({ onNavigate }) => {
    const maxTrend = Math.max(...TRENDS);

    return (
        <div className="section py-10 space-y-6">
            {/* Page header */}
            <div className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <div className="text-sm text-ink-400">Bonjour, Alex 👋</div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1">
                        Tableau de bord
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button className="btn-ghost text-sm">
                        <FileText className="w-4 h-4" />
                        Exporter
                    </button>
                    <button
                        onClick={() => onNavigate('interview')}
                        className="btn-primary text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvel entretien
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {KPIS.map((k) => (
                    <div key={k.label} className="card relative overflow-hidden">
                        <div
                            className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${k.color} opacity-20 blur-2xl`}
                        />
                        <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center mb-3 shadow-lg`}
                        >
                            <k.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl md:text-3xl font-black">{k.value}</div>
                        <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-ink-400">{k.label}</div>
                            <div
                                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                                    k.up ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                                {k.up ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                )}
                                {k.delta}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart + Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Chart */}
                    <div className="card">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-lg font-bold">Performance hebdomadaire</h2>
                                <p className="text-sm text-ink-400 mt-0.5">
                                    Entretiens complétés — 12 dernières semaines
                                </p>
                            </div>
                            <div className="flex items-center gap-2 chip">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">+24%</span>
                            </div>
                        </div>

                        <div className="h-48 flex items-end gap-2 relative">
                            {/* Gridlines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="border-t border-white/5 h-0"
                                    />
                                ))}
                            </div>

                            {TRENDS.map((v, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="w-full relative flex-1 flex items-end">
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400 opacity-80 group-hover:opacity-100 transition-opacity relative"
                                            style={{ height: `${(v / maxTrend) * 100}%` }}
                                        >
                                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {v} entretiens
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-ink-400">
                                        S{i + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Activity */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-5">
                            <div>
                                <h2 className="text-lg font-bold">Activité récente</h2>
                                <p className="text-sm text-ink-400 mt-0.5">
                                    Derniers entretiens et candidats
                                </p>
                            </div>
                            <button className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
                                Voir tout <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {ACTIVITY.map((a, i) => {
                                const s = statusStyle(a.status);
                                return (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {a.avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{a.name}</div>
                                            <div className="text-xs text-ink-400 truncate">
                                                {a.role} · {a.time}
                                            </div>
                                        </div>
                                        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${s.pill}`}>
                                            <s.icon className="w-3 h-3" />
                                            {s.label}
                                        </div>
                                        {a.score !== null && (
                                            <div className="text-right min-w-[50px]">
                                                <div className="text-lg font-bold gradient-text">
                                                    {a.score}
                                                </div>
                                                <div className="text-[10px] text-ink-400 -mt-1">/ 10</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Upcoming */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-bold">À venir</h2>
                            <Calendar className="w-5 h-5 text-ink-400" />
                        </div>
                        <div className="space-y-3">
                            {UPCOMING.map((u, i) => (
                                <div
                                    key={i}
                                    className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
                                >
                                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex-shrink-0">
                                        <div className="text-base font-bold leading-none">
                                            {u.day}
                                        </div>
                                        <div className="text-[9px] text-ink-400 mt-0.5">
                                            {u.month}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                            {u.title}
                                        </div>
                                        <div className="text-xs text-ink-400 truncate">
                                            {u.candidate}
                                        </div>
                                        <div className="text-xs text-brand-400 mt-1">{u.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick action */}
                    <div className="card relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-3">
                                <Video className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold mb-1">Tester l'entretien IA</h3>
                            <p className="text-sm text-ink-300 mb-4">
                                Passez un entretien de démonstration pour découvrir l'expérience
                                candidat.
                            </p>
                            <button
                                onClick={() => onNavigate('interview')}
                                className="btn-primary w-full text-sm"
                            >
                                Démarrer la démo
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
