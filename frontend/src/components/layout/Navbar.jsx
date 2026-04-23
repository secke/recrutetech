import { useState } from 'react';
import { Sparkles, Menu, X, LayoutDashboard, Briefcase, BarChart3, Video, Home } from 'lucide-react';

const NAV_ITEMS = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'jobs', label: 'Offres', icon: Briefcase },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'results', label: 'Résultats', icon: BarChart3 },
];

const Navbar = ({ route, onNavigate }) => {
    const [open, setOpen] = useState(false);

    const go = (id) => {
        onNavigate(id);
        setOpen(false);
    };

    return (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-ink-950/70 border-b border-white/5">
            <div className="section flex items-center justify-between h-16">
                <button
                    onClick={() => go('home')}
                    className="flex items-center gap-2.5 group"
                >
                    <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-shadow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 blur-lg opacity-40 -z-10" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-lg leading-tight">
                            Recrute<span className="gradient-text">Tech</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-ink-400 leading-tight">
                            AI Recruiting
                        </div>
                    </div>
                </button>

                <nav className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => {
                        const active = route === item.id;
                        const ItemIcon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => go(item.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-white/10 text-white border border-white/15'
                                        : 'text-ink-300 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <ItemIcon className="w-4 h-4" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={() => go('interview')}
                        className="btn-primary text-sm px-5 py-2.5"
                    >
                        <Video className="w-4 h-4" />
                        Démarrer un entretien
                    </button>
                </div>

                <button
                    onClick={() => setOpen(!open)}
                    className="md:hidden p-2 rounded-lg hover:bg-white/5"
                    aria-label="Menu"
                >
                    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {open && (
                <div className="md:hidden border-t border-white/5 bg-ink-950/95 backdrop-blur-xl">
                    <div className="section py-4 space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => go(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                        route === item.id
                                            ? 'bg-white/10 text-white'
                                            : 'text-ink-300 hover:bg-white/5'
                                    }`}
                                >
                                    <ItemIcon className="w-5 h-5" />
                                    {item.label}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => go('interview')}
                            className="btn-primary w-full mt-3"
                        >
                            <Video className="w-4 h-4" />
                            Démarrer un entretien
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
