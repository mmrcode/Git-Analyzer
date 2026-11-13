import React, { useState } from 'react';
import {
  Table, ChevronDown, ChevronUp, Check, X, Shield, Star,
  GitFork, FileCode, Layers, BookOpen, AlertCircle, Wrench
} from 'lucide-react';
import { RepoComparisonItem } from '../../types';

interface ComparisonTableProps {
  repositories: RepoComparisonItem[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ repositories }) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const categories = [
    {
      id: 'repo_info',
      name: 'A. Repository Information',
      rows: [
        { label: 'Full Repository Name', render: (r: RepoComparisonItem) => <span className="font-bold text-white">{r.full_name}</span> },
        { label: 'Owner / Organization', render: (r: RepoComparisonItem) => <span>{r.metadata.owner}</span> },
        { label: 'Description', render: (r: RepoComparisonItem) => <span className="line-clamp-2 text-xs">{r.metadata.description || 'None provided'}</span> },
        { label: 'Default Branch', render: (r: RepoComparisonItem) => <code className="text-xs">{r.metadata.default_branch}</code> },
        { label: 'License Information', render: (r: RepoComparisonItem) => r.metadata.license ? <span className="text-emerald-400 font-semibold">{r.metadata.license}</span> : <span className="text-slate-500">None detected</span> },
        { label: 'Repository Size', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.size_kb.toLocaleString()} KB</span> },
        { label: 'Creation Date', render: (r: RepoComparisonItem) => <span>{r.metadata.created_at ? r.metadata.created_at.slice(0, 10) : 'N/A'}</span> },
        { label: 'Last Updated Date', render: (r: RepoComparisonItem) => <span>{r.metadata.updated_at ? r.metadata.updated_at.slice(0, 10) : 'N/A'}</span> },
      ]
    },
    {
      id: 'languages',
      name: 'B. Programming Languages',
      rows: [
        { label: 'Primary Language', render: (r: RepoComparisonItem) => <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{r.technology.primary_language}</span> },
        {
          label: 'Languages Detected',
          render: (r: RepoComparisonItem) => (
            <div className="flex flex-wrap gap-1">
              {r.technology.languages.slice(0, 4).map((l, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {l.name} ({l.percentage}%)
                </span>
              ))}
            </div>
          )
        },
      ]
    },
    {
      id: 'frameworks',
      name: 'C. Frameworks & Technologies',
      rows: [
        { label: 'Declared Tech Count', render: (r: RepoComparisonItem) => <span className="font-bold text-white">{r.technology.technologies.length} components</span> },
        {
          label: 'Key Frameworks & Tools',
          render: (r: RepoComparisonItem) => (
            <div className="flex flex-wrap gap-1">
              {r.technology.technologies.slice(0, 6).map((t, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                  {t.name}
                </span>
              )) || <span className="text-slate-500">None in manifests</span>}
            </div>
          )
        },
      ]
    },
    {
      id: 'github_stats',
      name: 'D. GitHub Statistics',
      rows: [
        { label: 'GitHub Stars', render: (r: RepoComparisonItem) => <span className="text-amber-400 font-bold">⭐ {r.measured_metrics.stars.toLocaleString()}</span> },
        { label: 'GitHub Forks', render: (r: RepoComparisonItem) => <span className="text-blue-400 font-bold">🍴 {r.measured_metrics.forks.toLocaleString()}</span> },
        { label: 'Open Issues', render: (r: RepoComparisonItem) => <span className="text-slate-300">⚠️ {r.measured_metrics.open_issues} issues</span> },
        {
          label: 'Star to Fork Ratio',
          render: (r: RepoComparisonItem) => {
            const ratio = r.measured_metrics.forks > 0 ? (r.measured_metrics.stars / r.measured_metrics.forks).toFixed(1) : 'N/A';
            return <span>{ratio} : 1</span>;
          }
        },
      ]
    },
    {
      id: 'code_quality',
      name: 'E. Code Quality Indicators',
      rows: [
        { label: 'Code Quality Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.code_quality.score} / 100</span> },
        { label: 'AST Parsed Modules', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.parsed_modules_count} files</span> },
        { label: 'Total Classes Defined', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.total_classes}</span> },
        { label: 'Total Functions Defined', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.total_functions}</span> },
        { label: 'In-Code Docstring Coverage', render: (r: RepoComparisonItem) => <span className={r.measured_metrics.docstring_coverage_pct > 20 ? 'text-emerald-400' : 'text-slate-400'}>{r.measured_metrics.docstring_coverage_pct}%</span> },
        { label: 'Quality Rationale', render: (r: RepoComparisonItem) => <span className="text-[11px] text-slate-400 line-clamp-2">{r.scores.code_quality.rationale}</span> },
      ]
    },
    {
      id: 'architecture',
      name: 'F. Project Architecture',
      rows: [
        { label: 'Architecture Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.architecture.score} / 100</span> },
        {
          label: 'Entry Point Detected',
          render: (r: RepoComparisonItem) => {
            const ep = r.analysis.parsed_code.find(p => p.is_entry_point);
            return ep ? <code className="text-emerald-400 text-xs">{ep.path}</code> : <span className="text-slate-400">Implicit module</span>;
          }
        },
        { label: 'Dependency Graph Nodes', render: (r: RepoComparisonItem) => <span>{r.analysis.dependency_graph.nodes.length} nodes</span> },
        { label: 'Module Inter-relationships', render: (r: RepoComparisonItem) => <span>{r.analysis.dependency_graph.edges.length} import connections</span> },
        { label: 'Architecture Rationale', render: (r: RepoComparisonItem) => <span className="text-[11px] text-slate-400 line-clamp-2">{r.scores.architecture.rationale}</span> },
      ]
    },
    {
      id: 'documentation',
      name: 'G. Documentation Quality',
      rows: [
        { label: 'Documentation Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.documentation.score} / 100</span> },
        {
          label: 'README.md Available',
          render: (r: RepoComparisonItem) => r.metadata.has_readme ? <span className="text-emerald-400 flex items-center space-x-1"><Check className="w-3.5 h-3.5" /> <span>Yes ({(r.metadata.readme_content || '').length} chars)</span></span> : <span className="text-rose-400 flex items-center space-x-1"><X className="w-3.5 h-3.5" /> <span>Missing</span></span>
        },
        { label: 'Setup Guide Steps', render: (r: RepoComparisonItem) => <span>{r.analysis.setup_guide.install_steps.length + r.analysis.setup_guide.run_steps.length} steps</span> },
        { label: 'Academic Viva Questions', render: (r: RepoComparisonItem) => <span>{r.analysis.viva_questions.length} questions prepared</span> },
      ]
    },
    {
      id: 'testing',
      name: 'H. Testing & Verification',
      rows: [
        { label: 'Testing Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.testing.score} / 100</span> },
        { label: 'Dedicated Test Files', render: (r: RepoComparisonItem) => r.measured_metrics.test_files_count > 0 ? <span className="text-emerald-400 font-bold">{r.measured_metrics.test_files_count} test files</span> : <span className="text-slate-500">0 test files</span> },
        {
          label: 'Test-to-Source File Ratio',
          render: (r: RepoComparisonItem) => {
            const ratio = ((r.measured_metrics.test_files_count / Math.max(1, r.measured_metrics.source_files_count)) * 100).toFixed(1);
            return <span>{ratio}%</span>;
          }
        },
        { label: 'Testing Rationale', render: (r: RepoComparisonItem) => <span className="text-[11px] text-slate-400 line-clamp-2">{r.scores.testing.rationale}</span> },
      ]
    },
    {
      id: 'dependencies',
      name: 'I. Dependencies & Package Manifests',
      rows: [
        {
          label: 'Manifest Files',
          render: (r: RepoComparisonItem) => {
            const files = Array.from(new Set(r.technology.technologies.map(t => t.source_file)));
            return (
              <div className="flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <code key={i} className="text-[11px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{f}</code>
                )) || <span className="text-slate-500">None detected</span>}
              </div>
            );
          }
        },
        { label: 'Total Dependencies', render: (r: RepoComparisonItem) => <span>{r.technology.technologies.length} libraries</span> },
      ]
    },
    {
      id: 'maintainability',
      name: 'J. Maintainability',
      rows: [
        { label: 'Maintainability Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.maintainability.score} / 100</span> },
        { label: 'Total Files in Repository', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.total_files} files</span> },
        { label: 'Total Directories', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.total_directories} directories</span> },
        { label: 'Average File Size', render: (r: RepoComparisonItem) => <span>{Math.round(r.measured_metrics.size_kb / Math.max(1, r.measured_metrics.total_files))} KB/file</span> },
      ]
    },
    {
      id: 'complexity',
      name: 'K. Project Complexity',
      rows: [
        {
          label: 'Structural Complexity',
          render: (r: RepoComparisonItem) => {
            const total = r.measured_metrics.total_files + r.analysis.dependency_graph.nodes.length;
            if (total > 80) return <span className="text-amber-400 font-semibold">High Complexity ({total} points)</span>;
            if (total > 20) return <span className="text-indigo-400 font-semibold">Moderate ({total} points)</span>;
            return <span className="text-emerald-400 font-semibold">Compact ({total} points)</span>;
          }
        },
        { label: 'Source Files Count', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.source_files_count} files</span> },
        { label: 'Doc Files Count', render: (r: RepoComparisonItem) => <span>{r.measured_metrics.doc_files_count} files</span> },
      ]
    },
    {
      id: 'security',
      name: 'L. Security Indicators',
      rows: [
        { label: 'Security Score', render: (r: RepoComparisonItem) => <span className="font-bold text-indigo-400">{r.scores.security.score} / 100</span> },
        { label: 'Open Source License', render: (r: RepoComparisonItem) => r.metadata.license ? <span className="text-emerald-400 font-semibold">{r.metadata.license}</span> : <span className="text-amber-400">Unspecified License</span> },
        {
          label: 'Environment Template (.env.example)',
          render: (r: RepoComparisonItem) => {
            const hasEnv = r.analysis.files.some(f => f.name.toLowerCase().includes('.env'));
            return hasEnv ? <span className="text-emerald-400 flex items-center space-x-1"><Check className="w-3.5 h-3.5" /> <span>Present</span></span> : <span className="text-slate-500">Not present</span>;
          }
        },
      ]
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Table className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            Side-by-Side Category Comparison Matrix
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Comparing {repositories.length} repositories across 12 criteria
        </span>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800">
              <th className="py-4 px-4 font-bold text-slate-300 w-1/4 min-w-[220px]">
                Comparison Category
              </th>
              {repositories.map((r, idx) => (
                <th key={idx} className="py-4 px-4 font-bold text-white min-w-[240px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      r.is_winner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{r.rank} {r.is_winner ? 'Winner' : ''}
                    </span>
                    <span className="truncate">{r.full_name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const isCollapsed = collapsedCategories[cat.id];
              return (
                <React.Fragment key={cat.id}>
                  {/* Category Header Row */}
                  <tr
                    onClick={() => toggleCategory(cat.id)}
                    className="bg-slate-950/50 hover:bg-slate-800/40 cursor-pointer border-t border-b border-slate-800/90 transition select-none"
                  >
                    <td
                      colSpan={repositories.length + 1}
                      className="py-2.5 px-4 font-bold text-indigo-300 text-xs uppercase tracking-wider flex items-center justify-between"
                    >
                      <span>{cat.name}</span>
                      <span className="text-slate-400">
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </span>
                    </td>
                  </tr>

                  {/* Category Content Rows */}
                  {!isCollapsed && cat.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b border-slate-800/40 hover:bg-slate-800/20 transition text-slate-300"
                    >
                      <td className="py-2.5 px-4 font-medium text-slate-400 bg-slate-950/20">
                        {row.label}
                      </td>
                      {repositories.map((repo, repoIdx) => (
                        <td key={repoIdx} className="py-2.5 px-4">
                          {row.render(repo)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

