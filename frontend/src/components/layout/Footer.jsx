import { Sparkles, Github, Linkedin, Twitter, Mail } from 'lucide-react';

const COLUMNS = [
    {
        title: 'Produit',
        links: ['Entretiens IA', 'Analyse comportementale', 'Rapports', 'Intégrations'],
    },
    {
        title: 'Entreprise',
        links: ['À propos', 'Carrières', 'Presse', 'Contact'],
    },
    {
        title: 'Ressources',
        links: ['Documentation', 'Guides', 'API', 'Status'],
    },
    {
        title: 'Légal',
        links: ['Confidentialité', 'Conditions', 'RGPD', 'Sécurité'],
    },
];

const Footer = () => (
    <footer className="mt-24 border-t border-white/5 bg-ink-950/80 backdrop-blur-xl">
        <div className="section py-14">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
                <div className="col-span-2">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="font-bold text-lg">
                            Recrute<span className="gradient-text">Tech</span>
                        </div>
                    </div>
                    <p className="text-sm text-ink-400 max-w-xs leading-relaxed">
                        La plateforme de recrutement propulsée par l'IA qui évalue les candidats
                        de façon juste, rapide et précise.
                    </p>
                    <div className="flex gap-2 mt-5">
                        {[Github, Linkedin, Twitter, Mail].map((Icon, i) => (
                            <a
                                key={i}
                                href="#"
                                className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-ink-300 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <Icon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>
                </div>

                {COLUMNS.map((col) => (
                    <div key={col.title}>
                        <div className="text-sm font-semibold text-white mb-4">{col.title}</div>
                        <ul className="space-y-2.5">
                            {col.links.map((link) => (
                                <li key={link}>
                                    <a
                                        href="#"
                                        className="text-sm text-ink-400 hover:text-white transition-colors"
                                    >
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-sm text-ink-400">
                    © 2026 RecruteTech. Tous droits réservés.
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-400">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Tous les systèmes opérationnels
                </div>
            </div>
        </div>
    </footer>
);

export default Footer;
