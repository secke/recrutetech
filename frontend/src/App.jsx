import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio } from './components/TweaksPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CandidateProvider } from './context/CandidateContext';
import { Landing } from './screens/Landing';
import { ScreeningEntry } from './screens/ScreeningEntry';
import { PreInterview } from './screens/PreInterview';
import { CVUpload } from './screens/CVUpload';
import { LiveInterview } from './screens/LiveInterview';
import { Summary } from './screens/Summary';
import { HRDashboard } from './screens/HRDashboard';
import { HRDetail } from './screens/HRDetail';
import { InterviewConfig } from './screens/InterviewConfig';
import { RubricList } from './screens/RubricList';
import { RubricWizard } from './screens/RubricWizard';
import { CandidateExplanation } from './screens/CandidateExplanation';

const DEFAULTS = { language: 'fr', theme: 'light' };

function App() {
  const { values, set } = useTweaks(DEFAULTS);
  const lang = values.language;
  const theme = values.theme;

  return (
    <ErrorBoundary>
    <CandidateProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing lang={lang} theme={theme} />} />

          {/* Candidate screening flow */}
          <Route path="/screening/:roleToken" element={<ScreeningEntry lang={lang} theme={theme} />} />
          <Route path="/interviews/:interviewToken/setup" element={<PreInterview lang={lang} theme={theme} />} />
          <Route path="/interviews/:interviewToken/cv" element={<CVUpload lang={lang} theme={theme} />} />
          <Route path="/interviews/:interviewToken/live" element={<LiveInterview lang={lang} theme={theme} />} />
          <Route path="/interviews/:interviewToken/done" element={<Summary lang={lang} theme={theme} />} />

          {/* Candidate explanation (public-token, no auth) */}
          <Route path="/candidate/explanation/:interviewToken" element={<CandidateExplanation lang={lang} theme={theme} />} />

          {/* HR */}
          <Route path="/hr" element={<HRDashboard lang={lang} theme={theme} />} />
          <Route path="/hr/candidates/:interviewToken" element={<HRDetail lang={lang} theme={theme} />} />
          <Route path="/hr/templates/new" element={<InterviewConfig lang={lang} theme={theme} />} />
          <Route path="/hr/roles/:roleId/rubrics" element={<RubricList lang={lang} theme={theme} />} />
          <Route path="/hr/roles/:roleId/rubrics/new" element={<RubricWizard lang={lang} theme={theme} />} />
          <Route path="/hr/roles/:roleId/rubrics/:rubricId" element={<RubricWizard lang={lang} theme={theme} />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <TweaksPanel title="Tweaks">
        <TweakSection title={lang === 'fr' ? 'Langue & thème' : 'Language & theme'}>
          <TweakRadio
            label={lang === 'fr' ? 'Langue' : 'Language'}
            value={lang}
            onChange={(v) => set({ language: v })}
            options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]}
          />
          <TweakRadio
            label={lang === 'fr' ? 'Thème' : 'Theme'}
            value={theme}
            onChange={(v) => set({ theme: v })}
            options={[
              { value: 'light', label: lang === 'fr' ? 'Clair' : 'Light' },
              { value: 'dark', label: lang === 'fr' ? 'Sombre' : 'Dark' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </CandidateProvider>
    </ErrorBoundary>
  );
}

export default App;
