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
  Wrench,
  RefreshCw,
  Trash2,
  MinusCircle,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type PendingLessonAction = {
  type: 'fix' | 'regenerate' | 'delete_progress';
  lessonNum: number;
} | null;

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const {
    courseData,
    currentLesson,
    progress,
    jumpToLesson,
    resetProgress,
    allLessonsCompleted,
    isGeneratingLessons,
    generationProgress,
    insufficientReserveNotice,
    dismissInsufficientReserveNotice,
    generateNextFiftyLessons,
    isDevMode,
    unlockDevMode,
    lockDevMode,
    completeAllLessons,
    removeLastFiftyLessons,
    deleteSingleLessonProgress,
    fixSingleLesson,
    regenerateSingleLesson,
    isDevActionRunning,
    devActionStatus
  } = useLesson();

  const [filter, setFilter] = useState<'all' | 'standard' | 'reviews' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Dev Mode Password Modal state
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Per-Lesson Dev Action Confirmation Modal state
  const [pendingLessonAction, setPendingLessonAction] = useState<PendingLessonAction>(null);

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

  const handleKeyButtonClick = () => {
    if (isDevMode) {
      // Immediately lock back into normal mode; requires password next time
      lockDevMode();
      setShowResetConfirm(false);
    } else {
      setPasswordInput('');
      setPasswordError('');
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await unlockDevMode(passwordInput);
    if (ok) {
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect Dev Mode password.');
    }
  };

  const handleConfirmLessonAction = async () => {
    if (!pendingLessonAction) return;
    const { type, lessonNum } = pendingLessonAction;
    setPendingLessonAction(null);
    if (type === 'fix') {
      await fixSingleLesson(lessonNum);
    } else if (type === 'regenerate') {
      await regenerateSingleLesson(lessonNum);
    } else if (type === 'delete_progress') {
      deleteSingleLessonProgress(lessonNum);
    }
  };

  return (
    <>
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
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-white tracking-wide truncate">
                    Shona Assimil
                  </h1>
                  {isDevMode && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      DEV
                    </span>
                  )}
                </div>
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

            {/* Dev Action Live Banner */}
            {isDevActionRunning && devActionStatus && (
              <div className="mx-2 mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span className="truncate font-medium">{devActionStatus}</span>
              </div>
            )}

            {/* Lessons List — ONLY Lesson Number and Audio Duration */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredLessons.map((l) => {
                const isSelected = currentLesson?.num === l.num;
                const isPassiveCompleted = progress.completed_passive.includes(l.num);
                const isActiveCompleted = progress.completed_active.includes(l.num);
                const isReview = l.type === 'review' || l.num % 7 === 0;
                const isWaveTrigger = l.num >= activeWaveStart;
                const activeTargetForThis = isWaveTrigger
                  ? l.active_wave_target || l.num - (activeWaveStart - 1)
                  : null;

                return (
                  <div
                    key={l.num}
                    onClick={() => jumpToLesson(l.num)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        jumpToLesson(l.num);
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition group relative flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                        : isReview
                        ? 'bg-blue-950/20 hover:bg-blue-950/40 border-blue-900/30 hover:border-blue-700/50'
                        : 'bg-slate-950/40 hover:bg-slate-900/70 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2.5 min-w-0">
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

                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition">
                            Lesson {l.num}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                            {l.duration_seconds !== null && (
                              <Clock className="w-3 h-3 text-amber-400/80" />
                            )}
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
                    </div>

                    {/* 3 Per-Lesson Dev Mode Action Buttons */}
                    {isDevMode && (
                      <div
                        className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-800/70"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={isDevActionRunning}
                          onClick={() =>
                            setPendingLessonAction({ type: 'fix', lessonNum: l.num })
                          }
                          title={`Fix Lesson ${l.num}: Keep audio & transcription, regenerate translation, grammar, cultural notes & exercises`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition disabled:opacity-50"
                        >
                          <Wrench className="w-2.5 h-2.5" />
                          <span>Fix</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDevActionRunning}
                          onClick={() =>
                            setPendingLessonAction({ type: 'regenerate', lessonNum: l.num })
                          }
                          title={`Fully Regenerate Lesson ${l.num}: Delete audio & data and replace with brand-new audio & enriched data`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition disabled:opacity-50"
                        >
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>Regen</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDevActionRunning}
                          onClick={() =>
                            setPendingLessonAction({ type: 'delete_progress', lessonNum: l.num })
                          }
                          title={`Delete Progress for Lesson ${l.num} only`}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition disabled:opacity-50"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Clear</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* +50 New Lessons Expansion & Dev Mode Footer */}
            <div className="p-3 border-t border-slate-800/80 bg-slate-950 space-y-2">
              {/* +50 New Lessons Button (Greyed out until all current Passive & Active lessons are completed) */}
              <div className="space-y-1.5">
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
                  {isGeneratingLessons ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Generating +50 Lessons ({generationProgress.percent}%)...</span>
                    </>
                  ) : allLessonsCompleted ? (
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

                {/* Interactive Progress Bar (0% -> 100%) & Step-by-Step Status Tracker */}
                {isGeneratingLessons && (
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-semibold truncate pr-2">
                        {generationProgress.message || 'Generating & enriching lessons...'}
                      </span>
                      <span className="text-amber-400 font-mono font-bold shrink-0">
                        {generationProgress.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-amber-400 to-purple-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, generationProgress.percent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {!allLessonsCompleted && !isGeneratingLessons && (
                  <div className="text-[10px] text-slate-500 text-center leading-tight px-1">
                    Complete all {totalLessons} Passive ({completedPassiveCount}/{totalLessons}) &amp; {totalActiveWaveLessons} Active ({completedActiveCount}/{totalActiveWaveLessons}) lessons to unlock
                  </div>
                )}
              </div>

              {/* Dev Mode Suite Controls (Complete All, Remove 50 Block, Reset Local Progress) */}
              {isDevMode && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={completeAllLessons}
                      disabled={isDevActionRunning}
                      title="Dev Mode: Mark all currently loaded Passive & Active lessons complete simultaneously"
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Complete All</span>
                    </button>

                    <button
                      onClick={removeLastFiftyLessons}
                      disabled={totalLessons <= 100 || isDevActionRunning}
                      title={
                        totalLessons > 100
                          ? `Remove newest block of 50 lessons (L${Math.max(101, totalLessons - 49)}–L${totalLessons})`
                          : 'Base 100 lessons cannot be removed'
                      }
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-purple-300 border border-purple-500/30 text-[11px] font-semibold transition"
                    >
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>-50 Lessons</span>
                    </button>
                  </div>

                  {showResetConfirm ? (
                    <div className="space-y-2 p-2 bg-rose-950/40 rounded-xl border border-rose-500/30 text-xs">
                      <p className="text-rose-200 font-medium">
                        Reset all lesson progress and active notes?
                      </p>
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
                      className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition border border-slate-800/60"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Local Progress</span>
                    </button>
                  )}
                </div>
              )}

              {/* Bottom-Left Unassuming Dev Mode Key Button */}
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleKeyButtonClick}
                  title={isDevMode ? 'Lock Dev Mode' : 'Developer Mode'}
                  className={`p-1.5 rounded-lg border transition flex items-center gap-1.5 text-[10px] ${
                    isDevMode
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-slate-950 border-slate-900 text-slate-600 hover:text-slate-400 hover:border-slate-800'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  {isDevMode && <span className="font-bold">Lock Dev Mode</span>}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed Sidebar View (All Lessons Scrollable + Bottom-Left Key Button) */
          <>
            <div className="flex-1 py-4 flex flex-col items-center gap-3 overflow-y-auto custom-scrollbar">
              {courseData.lessons.map((l) => {
                const isSelected = currentLesson?.num === l.num;
                const isDone = progress.completed_passive.includes(l.num);
                const isReview = l.type === 'review' || l.num % 7 === 0;

                return (
                  <button
                    key={l.num}
                    onClick={() => jumpToLesson(l.num)}
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold transition relative ${
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

            <div className="p-2 border-t border-slate-800/80 flex justify-center">
              <button
                type="button"
                onClick={handleKeyButtonClick}
                title={isDevMode ? 'Lock Dev Mode' : 'Developer Mode'}
                className={`p-1.5 rounded-lg border transition ${
                  isDevMode
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-900 text-slate-600 hover:text-slate-400'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Polite Offline Audio Reserve Pool Notice Dialog */}
      {insufficientReserveNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Audio Reserve Pool Notice</h3>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              There are currently only{' '}
              <span className="font-bold text-amber-300">
                {insufficientReserveNotice.remaining}
              </span>{' '}
              reserve lessons remaining in the offline pool (
              {insufficientReserveNotice.required} required for a new batch). Please connect to
              the internet to download additional audio clips or update your course pack.
            </p>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div>
                <div className="text-slate-400">Clips Remaining in Local Pool:</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {insufficientReserveNotice.remaining}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Required for Batch Expansion:</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {insufficientReserveNotice.required}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={dismissInsufficientReserveNotice}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dev Mode Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePasswordSubmit}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Unlock Developer Mode</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enter the Developer Mode password configured in your project <code className="text-amber-300">.env</code> file to enable course debugging &amp; regeneration tools.
            </p>

            <div className="space-y-1.5">
              <input
                type="password"
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {passwordError && (
                <p className="text-xs text-rose-400 font-medium">{passwordError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Per-Lesson Dev Action Confirmation Modal ("Continue?") */}
      {pendingLessonAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              {pendingLessonAction.type === 'fix' &&
                `Fix Lesson ${pendingLessonAction.lessonNum}?`}
              {pendingLessonAction.type === 'regenerate' &&
                `Fully Regenerate Lesson ${pendingLessonAction.lessonNum}?`}
              {pendingLessonAction.type === 'delete_progress' &&
                `Delete Progress for Lesson ${pendingLessonAction.lessonNum}?`}
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              {pendingLessonAction.type === 'fix' &&
                `This will keep the existing audio file and Shona transcription for Lesson ${pendingLessonAction.lessonNum}, and regenerate its idiomatic English translation, sentence breakdown, grammar notes, cultural notes, and exercises, overwriting the data in the files. Continue?`}
              {pendingLessonAction.type === 'regenerate' &&
                `This will permanently remove the audio file and all lesson data for Lesson ${pendingLessonAction.lessonNum} from the files, and replace it with a brand-new audio clip and newly enriched translation, grammar notes, cultural notes, and exercises. Continue?`}
              {pendingLessonAction.type === 'delete_progress' &&
                `This will reset passive completion, active wave completion, saved translations, and exercise scores for Lesson ${pendingLessonAction.lessonNum} only. Continue?`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingLessonAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLessonAction}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
