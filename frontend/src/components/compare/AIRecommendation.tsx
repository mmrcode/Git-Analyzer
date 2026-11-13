import React from 'react';
import {
  Sparkles, Trophy, BookOpen, GraduationCap, Flame,
  Cpu, Wrench, Shield, CheckCircle2, AlertTriangle, ArrowRight, Layers
} from 'lucide-react';
import { AIComparisonRecommendation, RecommendationCategory } from '../../types';

interface AIRecommendationProps {
  recommendation: AIComparisonRecommendation;
  winnerRepoName: string;
}

export const AIRecommendation: React.FC<AIRecommendationProps> = ({
  recommendation,
  winnerRepoName
}) => {
  const {
    summary,
    best_overall,
    best_for_beginners,
    best_for_advanced,
    best_for_learning,
    best_for_academic,
    best_architecture,
    best_maintainability,
    strengths,
    weaknesses,
    key_differences,
    final_verdict,
    is_ai_generated
  } = recommendation;

  const categories: Array<{
    cat: RecommendationCategory;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }> = [
    { cat: best_overall, icon: Trophy, accentColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { cat: best_for_beginners, icon: BookOpen, accentColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
    { cat: best_for_academic, icon: GraduationCap, accentColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { cat: best_for_advanced, icon: Cpu, accentColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
    { cat: best_for_learning, icon: Flame, accentColor: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
    { cat: best_architecture, icon: Layers, accentColor: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' },
    { cat: best_maintainability, icon: Wrench, accentColor: 'border-teal-500/40 text-teal-400 bg-teal-500/10' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white shadow-lg shadow-indigo-600/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Gemini AI Comparative Insights & Evaluation
              </h3>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                is_ai_generated
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {is_ai_generated ? 'Google Gemini Live' : 'Heuristic Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Grounded architectural reasoning, category trade-offs, and final recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Overall Executive Summary */}
      <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
          Executive Comparison Summary
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* 7 Category Winner Cards */}
      <div className="space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Best Repository by Use-Case & Audience
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cItem, idx) => {
            const Icon = cItem.icon;
            const rc = cItem.cat;
            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg border ${cItem.accentColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{rc.title}</span>
                  </div>

                  <div className="text-sm font-extrabold text-white truncate pt-1">
                    🏆 {rc.winner_repo}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {rc.reasoning}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses per Repository */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Individual Strengths & Weaknesses Breakdown
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(strengths).map((repoName) => {
            const repoStrengths = strengths[repoName] || [];
            const repoWeaknesses = weaknesses[repoName] || [];
            return (
              <div
                key={repoName}
                className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <h4 className="text-sm font-bold text-white truncate max-w-[200px]">
                    {repoName}
                  </h4>
                  {repoName === winnerRepoName && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Overall Winner
                    </span>
                  )}
                </div>

                {/* Strengths */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Notable Strengths</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {repoStrengths.map((str, sIdx) => (
                      <li key={sIdx} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Areas for Improvement</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {repoWeaknesses.map((wk, wIdx) => (
                      <li key={wIdx} className="flex items-start space-x-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{wk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Differences */}
      {key_differences?.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Important Differences Between Repositories
          </div>
          <ul className="space-y-2 text-xs text-slate-300">
            {key_differences.map((diff, dIdx) => (
              <li key={dIdx} className="flex items-start space-x-2.5">
                <ArrowRight className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{diff}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final Recommendation Verdict */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-emerald-950/50 border border-indigo-500/30 space-y-3 shadow-lg">
        <div className="flex items-center space-x-2 text-indigo-300">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">
            Final Recommendation & Trade-Off Guidance
          </h4>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          {final_verdict}
        </p>
      </div>
    </div>
  );
};

