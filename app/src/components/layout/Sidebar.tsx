import React, { useState } from 'react';
import { useLesson } from '../../context/LessonContext';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Search,
  RotateCcw,
  Trophy,
  Zap,
  Clock,
  Lock,
  PlusCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  WifiOff,
  X
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const {
    courseData,
    currentLesson,
    progress,
    jumpToLesson,
    resetProgress,
    allLessonsCompleted,
    isGeneratingLessons,
    generateNextFiftyLessons,
    isDevMode,
    unlockDevMode,
    completeAllLessons,
    expansionProgress,
    offlineNoticeDialog,
    dismissOfflineNotice
  } = useLesson();

  const [filter, setFilter] = useState<'all' | 'standard' | 'reviews' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const [devPasswordInput, setDevPasswordInput] = useState<string>('');
  const [devError, setDevError] = useState<string>('');

  if (!courseData) return null;

  const totalLessons = courseData.total_lessons;
  const activeWaveStart = courseData.active_wave_start_lesson || 51;
  const totalActiveWaveLessons = Math.max(1, totalLessons - (activeWaveStart - 1));
  const completedPassiveCount = progress.completed_passive.filter((n) => n >= 1 && n <= totalLessons).length;
  const completedActiveCount = progress.completed_active.filter((n) => n >= 1 && n <= totalActiveWaveLessons).length;
  const passivePercent = Math.round((completedPassiveCount / totalLessons) * 100);

  // Filter lessons (only by lesson number so transcripts/translations are never exposed)
  const filteredLessons = courseData.lessons.filter((l) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().replace(/^lesson\s*/i, '');
      const matchesSearch = l.num.toString().includes(q);
      if (!matchesSearch) return false;
    }

    if (filter === 'standard') {
      return l.type !== 'review' && l.num % 7 !== 0;
    }
    if (filter === 'reviews') {
      return l.type === 'review' || l.num % 7 === 0;
    }
    if (filter === 'active') {
      return l.num >= courseData.active_wave_start_lesson;
    }
    return true;
  });

  const formatDuration = (secs: number | null) => {
    if (secs === null || isNaN(secs)) return 'Review';
    return `${secs.toFixed(1)}s`;
  };

  return (
    <aside
      className={`relative bg-slate-950 border-r border-slate-800 flex flex-col h-screen transition-all duration-300 z-30 ${
        collapsed ? 'w-16' : 'w-80 lg:w-96'
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
              🇿🇼
            </div>
            <div className="truncate">
              <h1 className="text-sm font-bold text-white tracking-wide truncate">
                Shona Assimil
              </h1>
              <p className="text-[11px] text-amber-400 font-medium truncate">
                Shona With Ease
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition mx-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Content */}
      {!collapsed ? (
        <>
          {/* Progress Overview Card */}
          <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Course Mastery
              </span>
              <span className="font-bold text-amber-400">{passivePercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${passivePercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="text-slate-400">Passive Wave</div>
                  <div className="font-bold text-slate-200">{completedPassiveCount} / {totalLessons}</div>
                </div>
              </div>

              <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <div className="text-slate-400">Active Wave</div>
                  <div className="font-bold text-slate-200">{completedActiveCount} / {totalActiveWaveLessons}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Tabs */}
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Jump to lesson number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                All ({totalLessons})
              </button>
              <button
                onClick={() => setFilter('standard')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filter === 'standard'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setFilter('reviews')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filter === 'reviews'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                7th Reviews
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  filter === 'active'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Active Wave ({activeWaveStart}+)
              </button>
            </div>
          </div>

          {/* Lessons List — ONLY Lesson Number and Audio Duration */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredLessons.map((l) => {
              const isSelected = currentLesson?.num === l.num;
              const isPassiveCompleted = progress.completed_passive.includes(l.num);
              const isActiveCompleted = progress.completed_active.includes(l.num);
              const isReview = l.type === 'review' || l.num % 7 === 0;
              const isWaveTrigger = l.num >= activeWaveStart;
              const activeTargetForThis = isWaveTrigger ? (l.active_wave_target || l.num - (activeWaveStart - 1)) : null;

              return (
                <button
                  key={l.num}
                  onClick={() => jumpToLesson(l.num)}
                  className={`w-full text-left p-3 rounded-xl border transition group relative flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : isReview
                      ? 'bg-blue-950/20 hover:bg-blue-950/40 border-blue-900/30 hover:border-blue-700/50'
                      : 'bg-slate-950/40 hover:bg-slate-900/70 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950'
                          : isReview
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {l.num}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition">
                        Lesson {l.num}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                        {l.duration_seconds !== null && <Clock className="w-3 h-3 text-amber-400/80" />}
                        {formatDuration(l.duration_seconds)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isWaveTrigger && (
                      <span className="text-[10px] text-purple-300 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60">
                        ⚡ L{activeTargetForThis}
                      </span>
                    )}
                    {isPassiveCompleted && (
                      <span
                        className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center"
                        title="Passive Wave Completed"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                    {isActiveCompleted && (
                      <span
                        className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center"
                        title="Active Wave Completed"
                      >
                        <Zap className="w-3 h-3 fill-current" />
                      </span>
                    )}
                    {isReview && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Review
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* +50 New Lessons Expansion & Reset Progress Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950 space-y-2">
            {/* Dev Mode Banner & Complete All Lessons Button */}
            {isDevMode && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    DEV MODE ACTIVE
                  </span>
                  <span className="text-[10px] text-amber-300/90 bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-700/50">
                    Unlocked
                  </span>
                </div>
                <button
                  onClick={completeAllLessons}
                  className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Immediately complete all passive and active lessons to test the +50 New Lessons button"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Complete All Lessons (Dev Unlock)</span>
                </button>
              </div>
            )}

            {/* +50 New Lessons Button or Real-Time Progress Bar */}
            <div className="space-y-1">
              {isGeneratingLessons || expansionProgress ? (
                <div className="space-y-1.5 bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/50 shadow-lg shadow-amber-500/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5 truncate max-w-[210px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                      <span className="truncate">{expansionProgress?.statusText || 'Expanding lessons...'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400 shrink-0">
                      {expansionProgress?.percent ?? 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(8, expansionProgress?.percent ?? 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={generateNextFiftyLessons}
                  disabled={!allLessonsCompleted || isGeneratingLessons}
                  title={
                    allLessonsCompleted
                      ? `Generate 50 brand-new lessons (Lessons ${totalLessons + 1}–${totalLessons + 50}) in Active Phase (reviewing Lessons ${totalLessons - 49}–${totalLessons})`
                      : `Complete all ${totalLessons} Passive (${completedPassiveCount}/${totalLessons}) and ${totalActiveWaveLessons} Active (${completedActiveCount}/${totalActiveWaveLessons}) lessons to unlock +50 New Lessons`
                  }
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                    allLessonsCompleted && !isGeneratingLessons
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white border-amber-400/50 shadow-lg shadow-amber-500/20 cursor-pointer'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800/80 opacity-55 cursor-not-allowed'
                  }`}
                >
                  {allLessonsCompleted ? (
                    <>
                      <PlusCircle className="w-4 h-4 text-white" />
                      <span>+50 New Lessons (L{totalLessons + 1}–L{totalLessons + 50})</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>+50 New Lessons (L{totalLessons + 1}–L{totalLessons + 50})</span>
                    </>
                  )}
                </button>
              )}

              {!allLessonsCompleted && !isGeneratingLessons && !expansionProgress && (
                <div className="text-[10px] text-slate-500 text-center leading-tight px-1">
                  Complete all {totalLessons} Passive ({completedPassiveCount}/{totalLessons}) &amp; {totalActiveWaveLessons} Active ({completedActiveCount}/{totalActiveWaveLessons}) lessons to unlock
                </div>
              )}
            </div>

            {showResetConfirm ? (
              <div className="space-y-2 p-2 bg-rose-950/40 rounded-xl border border-rose-500/30 text-xs">
                <p className="text-rose-200 font-medium">Reset all lesson progress and active notes?</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      resetProgress();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition border border-slate-800/60"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Local Progress</span>
              </button>
            )}

            {/* Footer metadata & Dev Mode toggle */}
            <div className="flex items-center justify-between pt-1 px-1 text-[10px] text-slate-500">
              <button
                onClick={() => {
                  setDevError('');
                  setShowDevModal(true);
                }}
                className="flex items-center gap-1 hover:text-amber-400 transition"
                title="Developer Mode: Unlock rapid completion testing"
              >
                <KeyRound className="w-3 h-3" />
                <span>{isDevMode ? 'Dev Mode (Active)' : 'Dev Mode'}</span>
              </button>
              <span className="font-mono text-slate-600">v2.0.0</span>
            </div>
          </div>
        </>
      ) : (
        /* Collapsed Sidebar View (Icons Only) */
        <div className="flex-1 py-4 flex flex-col items-center gap-3 overflow-y-auto">
          {courseData.lessons.slice(0, 20).map((l) => {
            const isSelected = currentLesson?.num === l.num;
            const isDone = progress.completed_passive.includes(l.num);
            const isReview = l.type === 'review' || l.num % 7 === 0;

            return (
              <button
                key={l.num}
                onClick={() => jumpToLesson(l.num)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition relative ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400'
                    : isDone
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40'
                    : isReview
                    ? 'bg-blue-950 text-blue-300 border border-blue-600/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={`Lesson ${l.num} (${formatDuration(l.duration_seconds)})`}
              >
                {l.num}
                {isDone && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5"></span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Dev Mode Password Modal */}
      {showDevModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Developer Authentication</span>
              </div>
              <button
                onClick={() => {
                  setShowDevModal(false);
                  setDevPasswordInput('');
                  setDevError('');
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Enter the developer password configured in <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono">.env</code> to enable instant completion testing for course expansion.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setDevError('');
                const success = await unlockDevMode(devPasswordInput);
                if (success) {
                  setShowDevModal(false);
                  setDevPasswordInput('');
                } else {
                  setDevError('Incorrect password. Please verify DEV_MODE_PASSWORD in .env.');
                }
              }}
              className="space-y-3"
            >
              <input
                type="password"
                placeholder="Enter DEV_MODE_PASSWORD..."
                value={devPasswordInput}
                onChange={(e) => setDevPasswordInput(e.target.value)}
                autoFocus
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />

              {devError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{devError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                >
                  Unlock Dev Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevModal(false);
                    setDevPasswordInput('');
                    setDevError('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Polite Audio Reserve Pool Notice Modal */}
      {offlineNoticeDialog?.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <WifiOff className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">Audio Reserve Pool Notice</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {offlineNoticeDialog.message}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Clips Remaining in Local Pool:</span>
                <span className="font-bold text-amber-400 font-mono">{offlineNoticeDialog.remaining}</span>
              </div>
              <div className="flex justify-between">
                <span>Required for Batch Expansion:</span>
                <span className="font-bold text-slate-200 font-mono">{offlineNoticeDialog.required}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={dismissOfflineNotice}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
