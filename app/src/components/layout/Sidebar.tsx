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
  Zap
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
    resetProgress
  } = useLesson();

  const [filter, setFilter] = useState<'all' | 'standard' | 'reviews' | 'active'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  if (!courseData) return null;

  const totalLessons = courseData.total_lessons;
  const completedPassiveCount = progress.completed_passive.length;
  const completedActiveCount = progress.completed_active.length;
  const passivePercent = Math.round((completedPassiveCount / totalLessons) * 100);

  // Filter lessons
  const filteredLessons = courseData.lessons.filter((l) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        l.num.toString().includes(q) ||
        l.title_shona.toLowerCase().includes(q) ||
        l.title_english.toLowerCase().includes(q);
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
                ChiZezuru (Harare Standard)
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
                  <div className="font-bold text-slate-200">{completedActiveCount} / {Math.max(1, totalLessons - 49)}</div>
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
                placeholder="Search lessons or topics..."
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
                Active Wave (50+)
              </button>
            </div>
          </div>

          {/* Lessons List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredLessons.map((l) => {
              const isSelected = currentLesson?.num === l.num;
              const isPassiveCompleted = progress.completed_passive.includes(l.num);
              const isActiveCompleted = progress.completed_active.includes(l.num);
              const isReview = l.type === 'review' || l.num % 7 === 0;
              const isWaveTrigger = l.num >= courseData.active_wave_start_lesson;
              const activeTargetForThis = isWaveTrigger ? l.num - 49 : null;

              return (
                <button
                  key={l.num}
                  onClick={() => jumpToLesson(l.num)}
                  className={`w-full text-left p-3 rounded-xl border transition group relative flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                      : isReview
                      ? 'bg-blue-950/20 hover:bg-blue-950/40 border-blue-900/30 hover:border-blue-700/50'
                      : 'bg-slate-950/40 hover:bg-slate-900/70 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : isReview
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {l.num}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-amber-300 transition truncate max-w-[170px]">
                        {l.title_shona}
                      </span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1 shrink-0">
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

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pl-8">
                    <span className="truncate max-w-[180px]">{l.title_english}</span>
                    {isWaveTrigger && (
                      <span className="text-[10px] text-purple-300 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/60 shrink-0">
                        ⚡ Active: L{activeTargetForThis}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Reset Progress Confirmation Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950">
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
                title={`Lesson ${l.num}: ${l.title_shona}`}
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
    </aside>
  );
};
