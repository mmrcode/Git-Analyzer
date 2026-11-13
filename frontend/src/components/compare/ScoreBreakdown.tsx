import React from 'react';
import {
  Award, ShieldAlert, CheckCircle, Info, Sparkles, SlidersHorizontal,
  FileCode, Layers, BookOpen, CheckSquare, Wrench, Cpu, Activity, Shield
} from 'lucide-react';
import { RepoComparisonItem } from '../../types';

interface ScoreBreakdownProps {
  repositories: RepoComparisonItem[];
  objectiveLabel: string;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  code_quality: FileCode,
  architecture: Layers,
  documentation: BookOpen,
  testing: CheckSquare,
  maintainability: Wrench,
  technology: Cpu,
  activity: Activity,
  security: Shield,
};

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ repositories, objectiveLabel }) => {
  const categoriesList = [
    { key: 'code_quality', label: 'Code Quality Indicators', defaultWeight: '20%' },
    { key: 'architecture', label: 'Architecture & Structure', defaultWeight: '15%' },
    { key: 'maintainability', label: 'Maintainability', defaultWeight: '15%' },
    { key: 'documentation', label: 'Documentation Quality', defaultWeight: '10%' },
    { key: 'testing', label: 'Testing & Verification', defaultWeight: '10%' },
    { key: 'technology', label: 'Technology Stack', defaultWeight: '10%' },
    { key: 'activity', label: 'Project Activity & Maintenance', defaultWeight: '10%' },
    { key: 'security', label: 'Security Indicators', defaultWeight: '10%' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <Award className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Intelligent Scoring System & Objective Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Active Objective: <strong className="text-indigo-400">{objectiveLabel}</strong>
            </p>
          </div>
        </div>

        {/* Methodology Pill */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Dynamic Multi-Criteria Weighting</span>
        </div>
      </div>

      {/* Transparency & Disclaimer Box */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Measurement Transparency:</strong> Scores are computed using deterministic static inspection (AST syntax parsing, file category ratios, manifest dependency declarations, and GitHub activity).
          </p>
          <p className="text-slate-400">
            GitHub stars are evaluated on a damped logarithmic curve so large legacy stars do not artificially overshadow clean architecture, modularity, or testing. Missing files are handled with reasonable baseline scores rather than punitive zero-drops.
          </p>
        </div>
      </div>

      {/* Overall Scores Comparison Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {repositories.map((repo, rIdx) => {
          return (
            <div
              key={rIdx}
              className={`p-5 rounded-2xl border transition space-y-4 ${
                repo.is_winner
                  ? 'bg-gradient-to-br from-slate-900 to-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-600/10'
                  : 'bg-slate-950/50 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  repo.is_winner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  Rank #{repo.rank} {repo.is_winner ? '• Winner' : ''}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Base: {repo.base_score}
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white truncate">{repo.full_name}</h4>
                <div className="text-xs text-slate-400 mt-0.5">{repo.technology.primary_language}</div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Weighted Score</span>
                  <span className="text-white font-mono text-sm">{repo.weighted_score} / 100</span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      repo.is_winner
                        ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${repo.weighted_score}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Scores Detail Matrix */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Individual Category Scores & Weight Distribution
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoriesList.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.key] || FileCode;
            return (
              <div
                key={cat.key}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">{cat.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Std Weight: {cat.defaultWeight}
                  </span>
                </div>

                <div className="space-y-2">
                  {repositories.map((repo, idx) => {
                    const scoreObj = (repo.scores as any)[cat.key];
                    const rawScore = scoreObj?.score || 50;
                    const weightApplied = scoreObj?.weight ? Math.round(scoreObj.weight * 100) : 10;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 truncate max-w-[140px]">{repo.metadata.name}</span>
                          <span className="font-mono text-slate-200">
                            <strong>{rawScore}</strong> / 100 <span className="text-slate-500">({weightApplied}% wt)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${rawScore}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

