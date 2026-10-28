import React, { useState, useEffect } from 'react';
import { LessonProvider, useLesson } from './context/LessonContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { NavigationBar } from './components/layout/NavigationBar';
import { PassiveSteps } from './components/steps/PassiveSteps';
import { ReviewSteps } from './components/steps/ReviewSteps';
import { ActiveSteps } from './components/steps/ActiveSteps';
import { Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    loading,
    stepMetadata,
    currentLesson,
    replayAudio,
    goToNextStep,
    goToPrevStep
  } = useLesson();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      // Space: Replay audio (only when not typing in text field)
      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        replayAudio();
        return;
      }

      // Enter or Right Arrow: Next Step
      if ((e.code === 'ArrowRight' && !isInput) || (e.code === 'Enter' && e.ctrlKey)) {
        e.preventDefault();
        goToNextStep();
        return;
      }

      // Left Arrow: Prev Step
      if (e.code === 'ArrowLeft' && !isInput) {
        e.preventDefault();
        goToPrevStep();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replayAudio, goToNextStep, goToPrevStep]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <h2 className="text-lg font-bold">Loading Shona Assimil Syllabus...</h2>
        <p className="text-xs text-slate-400">Loading Central Shona Course Data & Audio Registry</p>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md">
          <h2 className="text-lg font-bold text-rose-400">Course Data Error</h2>
          <p className="text-xs text-slate-400 mt-2">Could not find lesson syllabus. Please verify public/course_data.json exists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-slate-900/30">
          {stepMetadata.phase === 'active' && <ActiveSteps />}
          {stepMetadata.phase === 'review' && <ReviewSteps />}
          {stepMetadata.phase === 'passive' && <PassiveSteps />}
        </main>

        <NavigationBar />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LessonProvider>
      <MainContent />
    </LessonProvider>
  );
};

export default App;
