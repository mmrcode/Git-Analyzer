import React, { useState } from 'react';
import {
  GitCompare, Plus, Trash2, Sparkles, AlertCircle, RefreshCw,
  Target, GraduationCap, ShieldCheck, Flame, BookOpen, Briefcase, Award
} from 'lucide-react';
import { ComparisonObjective } from '../../types';

interface RepositoryComparisonInputProps {
  onCompare: (repositories: string[], objective: ComparisonObjective) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onClearError?: () => void;
}

const OBJECTIVE_OPTIONS: Array<{
  id: ComparisonObjective;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'best_overall', label: 'Best Overall Project', desc: 'Balanced evaluation across all metrics', icon: Award },
  { id: 'mca_mini_project', label: 'Best for MCA Mini Project', desc: 'Academic viva defense & clear architecture', icon: GraduationCap },
  { id: 'beginners', label: 'Best for Beginners', desc: 'Readability, clean docs & easy onboarding', icon: BookOpen },
  { id: 'final_year_project', label: 'Best for Final Year Project', desc: 'Rigor, comprehensive scope & testing', icon: ShieldCheck },
  { id: 'production', label: 'Best for Production Use', desc: 'High test coverage, security & stability', icon: ShieldCheck },
  { id: 'portfolio', label: 'Best for Portfolio', desc: 'Modern tech, active maintenance & presentation', icon: Briefcase },
  { id: 'learning', label: 'Best for Learning', desc: 'Design patterns, idiomatic code & clarity', icon: Flame },
];

const PRESETS = [
  {
    name: 'FastAPI vs Flask',
    repos: ['tiangolo/fastapi', 'pallets/flask'],
    objective: 'best_overall' as ComparisonObjective
  },
  {
    name: 'React vs Vue vs Svelte',
    repos: ['facebook/react', 'vuejs/core', 'sveltejs/svelte'],
    objective: 'portfolio' as ComparisonObjective
  },
  {
    name: 'Express vs Koa',
    repos: ['expressjs/express', 'koajs/koa'],
    objective: 'mca_mini_project' as ComparisonObjective
  }
];

export const RepositoryComparisonInput: React.FC<RepositoryComparisonInputProps> = ({
  onCompare,
  isLoading,
  error,
  onClearError
}) => {
  const [repos, setRepos] = useState<string[]>(['', '']);
  const [objective, setObjective] = useState<ComparisonObjective>('best_overall');

  const handleAddRepo = () => {
    if (repos.length < 3) {
      setRepos([...repos, '']);
      if (onClearError) onClearError();
    }
  };

  const handleRemoveRepo = (index: number) => {
    if (repos.length > 2) {
      const next = repos.filter((_, i) => i !== index);
      setRepos(next);
      if (onClearError) onClearError();
    }
  };

  const handleRepoChange = (index: number, value: string) => {
    const next = [...repos];
    next[index] = value;
    setRepos(next);
    if (onClearError) onClearError();
  };

  const handleApplyPreset = (presetRepos: string[], presetObj: ComparisonObjective) => {
    setRepos(presetRepos);
    setObjective(presetObj);
    if (onClearError) onClearError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = repos.map(r => r.trim()).filter(Boolean);
    if (cleaned.length < 2) return;
    onCompare(cleaned, objective);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-lg shadow-indigo-600/30">
              <GitCompare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Multi-Repository Comparison</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  AI Powered
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Compare 2 or 3 GitHub repositories side by side with Gemini AI evaluation and transparent weighted scoring.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden lg:inline">Presets:</span>
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p.repos, p.objective)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
                title={`Load ${p.name}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Repository Inputs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <span>GitHub Repositories ({repos.length} of 3)</span>
              <span className="text-slate-500 font-normal lowercase">(enter URLs or owner/repo)</span>
            </label>

            {repos.length < 3 && (
              <button
                type="button"
                onClick={handleAddRepo}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition px-2 py-1 rounded-lg hover:bg-indigo-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add 3rd Repository</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {repos.map((repoUrl, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-500 font-mono">
                    #{idx + 1}
                  </div>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => handleRepoChange(idx, e.target.value)}
                    placeholder={
                      idx === 0
                        ? 'e.g. https://github.com/facebook/react or facebook/react'
                        : idx === 1
                        ? 'e.g. https://github.com/vuejs/core or vuejs/core'
                        : 'e.g. https://github.com/sveltejs/svelte or sveltejs/svelte'
                    }
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition font-mono"
                  />
                </div>

                {repos.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRepo(idx)}
                    disabled={isLoading}
                    className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-slate-800 hover:border-rose-500/30 transition"
                    title="Remove repository"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Objective Preference Selector */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
            <Target className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select Comparison Objective</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {OBJECTIVE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = objective === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setObjective(opt.id)}
                  disabled={isLoading}
                  className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold truncate">{opt.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start space-x-3 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Comparison Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Runs independent AST parsing, metric calculation & Gemini AI recommendation concurrently.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || repos.filter(r => r.trim()).length < 2}
            className={`flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-sm shadow-xl transition min-w-[200px] ${
              isLoading || repos.filter(r => r.trim()).length < 2
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Comparing Repositories...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Compare {repos.filter(r => r.trim()).length || 2} Repositories</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

