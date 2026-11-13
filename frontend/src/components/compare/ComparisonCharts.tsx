import React, { useState } from 'react';
import { BarChart3, PieChart, Activity, Sparkles } from 'lucide-react';
import { RepoComparisonItem } from '../../types';

interface ComparisonChartsProps {
  repositories: RepoComparisonItem[];
}

const REPO_COLORS = [
  { stroke: '#6366f1', fill: 'rgba(99, 102, 241, 0.25)', text: 'text-indigo-400', border: 'border-indigo-500' },
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', text: 'text-emerald-400', border: 'border-emerald-500' },
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', text: 'text-amber-400', border: 'border-amber-500' },
];

const LANGUAGE_PALETTE: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  'TypeScript (React)': '#2b7489',
  JavaScript: '#f1e05a',
  'JavaScript (React)': '#f1e05a',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Go: '#00ADD8',
  Rust: '#dea584',
};

export const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ repositories }) => {
  const [activeChart, setActiveChart] = useState<'radar' | 'stats' | 'languages'>('radar');

  // Categories for the 8-axis Radar Chart
  const radarCategories = [
    { key: 'code_quality', label: 'Code Quality' },
    { key: 'architecture', label: 'Architecture' },
    { key: 'documentation', label: 'Documentation' },
    { key: 'testing', label: 'Testing' },
    { key: 'maintainability', label: 'Maintainability' },
    { key: 'technology', label: 'Technology' },
    { key: 'activity', label: 'Activity' },
    { key: 'security', label: 'Security' },
  ];

  // Radar geometry
  const radarRadius = 110;
  const radarCenter = 160;
  const numAxes = radarCategories.length;

  const getCoordinates = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radarRadius;
    const x = radarCenter + r * Math.cos(angle);
    const y = radarCenter + r * Math.sin(angle);
    return { x, y };
  };

  // Concentric radar background rings (25%, 50%, 75%, 100%)
  const rings = [25, 50, 75, 100];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Visual Comparative Analytics
            </h3>
            <p className="text-xs text-slate-400">
              Interactive Radar evaluation, GitHub telemetry & Language distribution
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveChart('radar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeChart === 'radar'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Radar Evaluation
          </button>
          <button
            onClick={() => setActiveChart('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeChart === 'stats'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            GitHub Metrics
          </button>
          <button
            onClick={() => setActiveChart('languages')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeChart === 'languages'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Languages
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 flex-wrap gap-y-2">
        {repositories.map((r, i) => (
          <div key={i} className="flex items-center space-x-2 text-xs">
            <span
              className="w-3.5 h-3.5 rounded-full border-2"
              style={{
                borderColor: REPO_COLORS[i % REPO_COLORS.length].stroke,
                backgroundColor: REPO_COLORS[i % REPO_COLORS.length].fill,
              }}
            />
            <span className="font-bold text-white">
              #{r.rank} {r.full_name}
            </span>
            <span className="text-slate-400 font-mono">({r.weighted_score}/100)</span>
          </div>
        ))}
      </div>

      {/* View 1: 8-Axis Radar Chart */}
      {activeChart === 'radar' && (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-2">
          {/* SVG Radar */}
          <div className="relative flex justify-center items-center">
            <svg width={320} height={320} className="overflow-visible">
              {/* Background Concentric Polygon Rings */}
              {rings.map((ringVal) => {
                const points = radarCategories
                  .map((_, idx) => {
                    const { x, y } = getCoordinates(idx, ringVal);
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={ringVal}
                    points={points}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray={ringVal === 100 ? 'none' : '2,2'}
                  />
                );
              })}

              {/* Axis lines and labels */}
              {radarCategories.map((cat, idx) => {
                const { x, y } = getCoordinates(idx, 100);
                const labelRadius = radarRadius + 24;
                const angle = (idx * 2 * Math.PI) / numAxes - Math.PI / 2;
                const lx = radarCenter + labelRadius * Math.cos(angle);
                const ly = radarCenter + labelRadius * Math.sin(angle);

                return (
                  <g key={cat.key}>
                    <line
                      x1={radarCenter}
                      y1={radarCenter}
                      x2={x}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] fill-slate-400 font-semibold select-none"
                    >
                      {cat.label}
                    </text>
                  </g>
                );
              })}

              {/* Data Polygons for each repository */}
              {repositories.map((repo, rIdx) => {
                const color = REPO_COLORS[rIdx % REPO_COLORS.length];
                const points = radarCategories
                  .map((cat, cIdx) => {
                    const val = getattrScore(repo.scores, cat.key);
                    const { x, y } = getCoordinates(cIdx, val);
                    return `${x},${y}`;
                  })
                  .join(' ');

                return (
                  <g key={repo.full_name}>
                    <polygon
                      points={points}
                      fill={color.fill}
                      stroke={color.stroke}
                      strokeWidth="2.5"
                      className="transition-all duration-300"
                    />
                    {radarCategories.map((cat, cIdx) => {
                      const val = getattrScore(repo.scores, cat.key);
                      const { x, y } = getCoordinates(cIdx, val);
                      return (
                        <circle
                          key={cIdx}
                          cx={x}
                          cy={y}
                          r="3.5"
                          fill={color.stroke}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Radar Key Scores Breakdown Table */}
          <div className="w-full lg:w-80 space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
              Dimensional Category Breakdown
            </div>
            {radarCategories.map((cat) => (
              <div key={cat.key} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="flex justify-between font-semibold text-slate-300">
                  <span>{cat.label}</span>
                  <div className="flex space-x-3">
                    {repositories.map((repo, idx) => (
                      <span key={idx} className={REPO_COLORS[idx % REPO_COLORS.length].text}>
                        {getattrScore(repo.scores, cat.key)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 2: GitHub Statistics Bar Charts */}
      {activeChart === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2">
          {[
            { label: 'GitHub Stars', getValue: (r: RepoComparisonItem) => r.measured_metrics.stars, suffix: '' },
            { label: 'GitHub Forks', getValue: (r: RepoComparisonItem) => r.measured_metrics.forks, suffix: '' },
            { label: 'Total Files', getValue: (r: RepoComparisonItem) => r.measured_metrics.total_files, suffix: ' files' },
            { label: 'Test Files', getValue: (r: RepoComparisonItem) => r.measured_metrics.test_files_count, suffix: ' tests' },
          ].map((stat, sIdx) => {
            const maxVal = Math.max(1, ...repositories.map(r => stat.getValue(r)));
            return (
              <div key={sIdx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-300">{stat.label}</div>
                <div className="space-y-2.5">
                  {repositories.map((repo, rIdx) => {
                    const val = stat.getValue(repo);
                    const pct = Math.max(8, (val / maxVal) * 100);
                    const color = REPO_COLORS[rIdx % REPO_COLORS.length];
                    return (
                      <div key={rIdx} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400 truncate max-w-[120px]">{repo.metadata.name}</span>
                          <span className="font-bold text-white font-mono">{val.toLocaleString()}{stat.suffix}</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color.stroke,
                            }}
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
      )}

      {/* View 3: Language Distributions Side by Side */}
      {activeChart === 'languages' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
          {repositories.map((repo, rIdx) => (
            <div key={rIdx} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white truncate">{repo.full_name}</h4>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {repo.technology.primary_language}
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                {repo.technology.languages.map((lang, lIdx) => (
                  <div
                    key={lIdx}
                    style={{
                      width: `${lang.percentage}%`,
                      backgroundColor: LANGUAGE_PALETTE[lang.name] || '#6366f1',
                    }}
                    title={`${lang.name}: ${lang.percentage}%`}
                  />
                ))}
              </div>

              {/* Language List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {repo.technology.languages.map((lang, lIdx) => (
                  <div key={lIdx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: LANGUAGE_PALETTE[lang.name] || '#6366f1' }}
                      />
                      <span className="text-slate-300 font-medium">{lang.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-slate-400">
                      <span>{lang.file_count} files</span>
                      <span className="text-white font-bold">{lang.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper to safely extract score from ScoreBreakdown
function getattrScore(scores: any, key: string): number {
  if (scores && scores[key] && typeof scores[key].score === 'number') {
    return scores[key].score;
  }
  return 50;
}

