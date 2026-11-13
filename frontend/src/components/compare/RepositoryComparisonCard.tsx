import React from 'react';
import {
  Trophy, Medal, Star, GitFork, AlertCircle, FileCode,
  Layers, Shield, ExternalLink, ArrowRight, CheckCircle2
} from 'lucide-react';
import { RepoComparisonItem, FullRepoAnalysis } from '../../types';

interface RepositoryComparisonCardProps {
  item: RepoComparisonItem;
  onInspect: (analysis: FullRepoAnalysis) => void;
}

export const RepositoryComparisonCard: React.FC<RepositoryComparisonCardProps> = ({
  item,
  onInspect
}) => {
  const { metadata, technology, measured_metrics, weighted_score, base_score, rank, is_winner } = item;

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-emerald-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-md shadow-amber-500/10">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Rank #1 • Recommended Winner</span>
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
          <Medal className="w-3.5 h-3.5 text-slate-400" />
          <span>Rank #2 • Runner Up</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-800/80 text-amber-500/80 border border-amber-800/40 text-xs font-bold">
        <Medal className="w-3.5 h-3.5 text-amber-600" />
        <span>Rank #3</span>
      </div>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 65) return 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <div
      className={`rounded-2xl border transition relative flex flex-col justify-between overflow-hidden shadow-xl ${
        is_winner
          ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-indigo-600/10'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header */}
      <div className="p-5 sm:p-6 space-y-4">
        {/* Rank & Winner Pill */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {getRankBadge()}
          <span className="text-[11px] font-semibold text-slate-400 font-mono">
            Base: {base_score} / 100
          </span>
        </div>

        {/* Repo Identity */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            {metadata.avatar_url ? (
              <img
                src={metadata.avatar_url}
                alt={metadata.owner}
                className="w-11 h-11 rounded-xl border border-slate-700 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                {metadata.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-1.5 flex-wrap">
                <span>{metadata.name}</span>
                <a
                  href={metadata.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-indigo-300 transition"
                  title="Open GitHub"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </h3>
              <p className="text-xs text-slate-400">{metadata.owner}</p>
            </div>
          </div>

          {/* Overall Weighted Score Circle */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center font-black ${getScoreColor(
                weighted_score
              )}`}
            >
              <span className="text-base leading-none">{Math.round(weighted_score)}</span>
              <span className="text-[9px] uppercase font-bold text-slate-400">score</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 line-clamp-2 min-h-[32px]">
          {metadata.description || 'No description provided by repository owner.'}
        </p>

        {/* Primary Language & License */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {technology.primary_language}
          </span>
          {metadata.license && (
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1">
              <Shield className="w-3 h-3 text-slate-400" />
              <span>{metadata.license}</span>
            </span>
          )}
          {measured_metrics.test_files_count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{measured_metrics.test_files_count} Tests</span>
            </span>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-amber-400 text-xs">
              <Star className="w-3.5 h-3.5" />
              <span className="font-bold text-white">{metadata.stars.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Stars</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-400 text-xs">
              <GitFork className="w-3.5 h-3.5" />
              <span className="font-bold text-white">{metadata.forks.toLocaleString()}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Forks</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-emerald-400 text-xs">
              <FileCode className="w-3.5 h-3.5" />
              <span className="font-bold text-white">{measured_metrics.total_files}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Files</div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {measured_metrics.size_kb} KB • {technology.technologies.length} components
        </span>

        <button
          onClick={() => onInspect(item.analysis)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition"
          title="Drill into detailed single repository analysis"
        >
          <span>Inspect Deeply</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

