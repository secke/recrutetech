import { useMemo, useState } from 'react';
import {
    Search,
    MapPin,
    Clock,
    Briefcase,
    Filter,
    Bookmark,
    Sparkles,
    ArrowRight,
    Building2,
    DollarSign,
    Users,
} from 'lucide-react';

const JOBS = [
    {
        id: 1,
        title: 'Senior Frontend Engineer',
        company: 'Datalive',
        companyColor: 'from-brand-500 to-cyan-500',
        location: 'Paris · Hybride',
        type: 'CDI',
        salary: '65-85k €',
        tags: ['React', 'TypeScript', 'Next.js'],
        posted: '2j',
        applicants: 42,
        featured: true,
    },
    {
        id: 2,
        title: 'Data Scientist — NLP',
        company: 'Northwind',
        companyColor: 'from-purple-500 to-pink-500',
        location: 'Remote',
        type: 'CDI',
        salary: '70-95k €',
        tags: ['Python', 'PyTorch', 'LLM'],
        posted: '1j',
        applicants: 68,
        featured: true,
    },
    {
        id: 3,
        title: 'Product Designer Senior',
        company: 'Axelora',
        companyColor: 'from-amber-500 to-orange-500',
        location: 'Lyon',
        type: 'CDI',
        salary: '55-70k €',
        tags: ['Figma', 'Design System', 'UX Research'],
        posted: '3j',
        applicants: 29,
    },
    {
        id: 4,
        title: 'DevOps Engineer',
        company: 'Helix',
        companyColor: 'from-emerald-500 to-teal-500',
        location: 'Bordeaux · Hybride',
        type: 'CDI',
        salary: '60-80k €',
        tags: ['Kubernetes', 'AWS', 'Terraform'],
        posted: '5j',
        applicants: 17,
    },
    {
        id: 5,
        title: 'Tech Lead Backend',
        company: 'Orbital',
        companyColor: 'from-indigo-500 to-blue-500',
        location: 'Paris',
        type: 'CDI',
        salary: '80-110k €',
        tags: ['Go', 'PostgreSQL', 'Microservices'],
        posted: '1w',
        applicants: 51,
    },
    {
        id: 6,
        title: 'Growth Manager',
        company: 'Nexify',
        companyColor: 'from-rose-500 to-red-500',
        location: 'Remote',
        type: 'CDI',
        salary: '50-65k €',
        tags: ['SEO', 'Analytics', 'A/B Testing'],
        posted: '4j',
        applicants: 23,
    },
];

const FILTERS = [
    { id: 'all', label: 'Toutes' },
    { id: 'tech', label: 'Tech' },
    { id: 'design', label: 'Design' },
    { id: 'data', label: 'Data' },
    { id: 'remote', label: 'Remote' },
    { id: 'featured', label: 'En vedette' },
];

const JobsPage = ({ onNavigate }) => {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [bookmarks, setBookmarks] = useState(new Set([2]));

    const filtered = useMemo(() => {
        return JOBS.filter((j) => {
            const matchesQuery =
                !query ||
                j.title.toLowerCase().includes(query.toLowerCase()) ||
                j.company.toLowerCase().includes(query.toLowerCase()) ||
                j.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
            const matchesFilter =
                filter === 'all' ||
                (filter === 'featured' && j.featured) ||
                (filter === 'remote' && j.location.toLowerCase().includes('remote')) ||
                (filter === 'tech' &&
                    ['Engineer', 'Lead', 'DevOps'].some((k) => j.title.includes(k))) ||
                (filter === 'design' && j.title.toLowerCase().includes('design')) ||
                (filter === 'data' && j.title.toLowerCase().includes('data'));
            return matchesQuery && matchesFilter;
        });
    }, [query, filter]);

    const toggleBookmark = (id) => {
        setBookmarks((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="section py-10">
            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-purple-600/15 to-pink-600/20" />
                <div className="absolute inset-0 bg-grid-pattern bg-[size:30px_30px] opacity-[0.15]" />
                <div className="relative p-8 md:p-12">
                    <div className="chip mb-4">
                        <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                        {JOBS.length} offres actives
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight max-w-2xl">
                        Trouvez votre <span className="gradient-text">prochaine mission</span>.
                    </h1>
                    <p className="text-ink-300 mt-3 max-w-xl">
                        Postulez en un clic et passez un entretien IA quand vous êtes prêt.
                    </p>

                    {/* Search */}
                    <div className="mt-8 flex flex-col md:flex-row gap-3 max-w-3xl">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Titre, entreprise, technologie..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder-ink-400 text-white"
                            />
                        </div>
                        <button className="btn-ghost py-3.5 px-5 bg-white/5">
                            <MapPin className="w-4 h-4" />
                            Lieu
                        </button>
                        <button className="btn-primary py-3.5">
                            <Filter className="w-4 h-4" />
                            Filtrer
                        </button>
                    </div>

                    {/* Filter chips */}
                    <div className="mt-5 flex flex-wrap gap-2">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                    filter === f.id
                                        ? 'bg-white text-ink-900'
                                        : 'bg-white/5 border border-white/10 text-ink-200 hover:bg-white/10'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results count */}
            <div className="flex justify-between items-center mb-5">
                <div className="text-sm text-ink-400">
                    <span className="text-white font-semibold">{filtered.length}</span>{' '}
                    offre{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
                </div>
                <select className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-ink-200 focus:outline-none focus:border-white/20">
                    <option>Plus récentes</option>
                    <option>Salaire décroissant</option>
                    <option>Plus populaires</option>
                </select>
            </div>

            {/* Jobs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((job) => (
                    <div
                        key={job.id}
                        className="group card glass-hover relative"
                    >
                        {job.featured && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles className="w-3 h-3" />
                                Vedette
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <div
                                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${job.companyColor} flex items-center justify-center shadow-lg flex-shrink-0`}
                            >
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-ink-400">{job.company}</div>
                                <h3 className="text-lg font-bold leading-tight group-hover:gradient-text transition-all">
                                    {job.title}
                                </h3>
                            </div>
                            <button
                                onClick={() => toggleBookmark(job.id)}
                                className={`p-2 rounded-lg transition-colors ${
                                    bookmarks.has(job.id)
                                        ? 'bg-brand-500/20 text-brand-300'
                                        : 'bg-white/5 text-ink-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Bookmark
                                    className="w-4 h-4"
                                    fill={bookmarks.has(job.id) ? 'currentColor' : 'none'}
                                />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-5 text-sm">
                            <div className="flex items-center gap-2 text-ink-300">
                                <MapPin className="w-4 h-4 text-ink-400 flex-shrink-0" />
                                <span className="truncate">{job.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-300">
                                <Briefcase className="w-4 h-4 text-ink-400 flex-shrink-0" />
                                <span>{job.type}</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-300">
                                <DollarSign className="w-4 h-4 text-ink-400 flex-shrink-0" />
                                <span>{job.salary}</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-300">
                                <Clock className="w-4 h-4 text-ink-400 flex-shrink-0" />
                                <span>{job.posted}</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-5">
                            {job.tags.map((t) => (
                                <span key={t} className="chip">
                                    {t}
                                </span>
                            ))}
                        </div>

                        <div className="mt-5 pt-5 border-t border-white/5 flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-xs text-ink-400">
                                <Users className="w-3.5 h-3.5" />
                                {job.applicants} candidats
                            </div>
                            <button
                                onClick={() => onNavigate('interview')}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                            >
                                Postuler
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="card text-center py-16">
                    <Briefcase className="w-12 h-12 mx-auto text-ink-400 opacity-50 mb-3" />
                    <p className="text-ink-300">Aucune offre ne correspond à votre recherche.</p>
                </div>
            )}
        </div>
    );
};

export default JobsPage;
