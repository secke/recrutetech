import { useEffect, useState } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import LandingPage from './components/pages/LandingPage';
import DashboardPage from './components/pages/DashboardPage';
import JobsPage from './components/pages/JobsPage';
import ResultsPage from './components/pages/ResultsPage';
import InterviewInterface from './components/InterviewInterface';

const ROUTES = ['home', 'jobs', 'dashboard', 'results', 'interview'];

const getInitialRoute = () => {
    const hash = window.location.hash.replace('#', '');
    return ROUTES.includes(hash) ? hash : 'home';
};

function App() {
    const [route, setRoute] = useState(getInitialRoute);

    useEffect(() => {
        const onHashChange = () => setRoute(getInitialRoute());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const navigate = (next) => {
        if (!ROUTES.includes(next)) return;
        window.location.hash = next;
        setRoute(next);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // The interview UI takes the full viewport without chrome
    if (route === 'interview') {
        return (
            <div className="min-h-screen bg-ink-950">
                <Navbar route={route} onNavigate={navigate} />
                <InterviewInterface />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar route={route} onNavigate={navigate} />
            <main className="flex-1">
                {route === 'home' && <LandingPage onNavigate={navigate} />}
                {route === 'jobs' && <JobsPage onNavigate={navigate} />}
                {route === 'dashboard' && <DashboardPage onNavigate={navigate} />}
                {route === 'results' && <ResultsPage onNavigate={navigate} />}
            </main>
            <Footer />
        </div>
    );
}

export default App;
