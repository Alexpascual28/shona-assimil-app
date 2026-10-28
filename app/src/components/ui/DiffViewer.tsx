import React, { useState } from 'react';
import { computeWordDiff } from '../../utils/diff';
import { Check, Edit2, AlertCircle, Sparkles } from 'lucide-react';

interface DiffViewerProps {
  userInput: string;
  referenceShona: string;
  onSaveCorrection?: (correctedText: string) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  userInput,
  referenceShona,
  onSaveCorrection
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [correctedText, setCorrectedText] = useState<string>(userInput);

  const { tokens, matchRate } = computeWordDiff(userInput, referenceShona);

  const handleSave = () => {
    setIsEditing(false);
    onSaveCorrection?.(correctedText);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header and match rate metric */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Linguistic Concordance & Word Comparison
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare your translation with the canonical Central Shona dialogue
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${
            matchRate >= 80
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : matchRate >= 50
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <span>Concordance:</span>
            <span className="text-base font-extrabold">{matchRate}%</span>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-600 transition"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Translation'}</span>
          </button>
        </div>
      </div>

      {/* Side-by-side or stacked view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User translation with diff chips */}
        <div className="space-y-3 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="text-purple-300 uppercase tracking-wider font-bold">Your Shona Translation</span>
            <span>Diff Analysis</span>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-purple-500/50 rounded-xl p-3 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Correct your Shona translation here..."
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save Corrections
              </button>
            </div>
          ) : (
            <div className="min-h-[100px] p-4 bg-slate-900/80 rounded-xl border border-slate-800/80 flex flex-wrap gap-2 text-base leading-relaxed">
              {tokens.map((tok, idx) => {
                if (tok.type === 'correct') {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium"
                      title="Exact Match"
                    >
                      {tok.text}
                    </span>
                  );
                } else if (tok.type === 'extra') {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 line-through decoration-rose-400 border border-slate-700 font-medium"
                      title="Word not in reference"
                    >
                      {tok.text}
                    </span>
                  );
                } else {
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 border-dashed font-medium"
                      title="Missing word from reference"
                    >
                      +{tok.text}
                    </span>
                  );
                }
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-400 inline-block"></span>
              <span>Matched Token</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-400 border-dashed inline-block"></span>
              <span>Missing from your attempt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-700 line-through inline-block"></span>
              <span>Extra / Discrepant</span>
            </div>
          </div>
        </div>

        {/* Canonical Reference Shona */}
        <div className="space-y-3 bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              Canonical Reference (Central Shona - Zezuru)
            </div>
            <div className="p-4 bg-slate-900/80 rounded-xl border border-amber-500/20 text-amber-100 text-base leading-relaxed font-medium">
              {referenceShona}
            </div>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              Zezuru dialects emphasize noun prefix concords (zvivakashure) and honorific plural forms (<code className="text-amber-300 font-mono">va-</code>, <code className="text-amber-300 font-mono">mu-</code>). Ensure your prefix matches the noun class.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
