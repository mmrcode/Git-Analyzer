import React from 'react';
import { Cpu, Layers, Check, Minus } from 'lucide-react';
import { RepoComparisonItem } from '../../types';

interface TechnologyComparisonProps {
  repositories: RepoComparisonItem[];
}

export const TechnologyComparison: React.FC<TechnologyComparisonProps> = ({ repositories }) => {
  // Collect all unique technologies detected across all repositories
  const allTechMap = new Map<string, { category: string; description?: string }>();

  repositories.forEach(r => {
    r.technology.technologies.forEach(t => {
      if (!allTechMap.has(t.name.toLowerCase())) {
        allTechMap.set(t.name.toLowerCase(), {
          category: t.category,
          description: t.description
        });
      }
    });
  });

  // Group by category
  const categoriesMap: Record<string, string[]> = {};
  allTechMap.forEach((meta, techLower) => {
    const cat = meta.category || 'Other';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(techLower);
  });

  const categoryNames = Object.keys(categoriesMap).sort();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">
            Technology Stack & Framework Breakdown
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {allTechMap.size} distinct libraries & frameworks detected
        </span>
      </div>

      {allTechMap.size === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
          No external framework or dependency manifests detected in these repositories.
        </div>
      ) : (
        <div className="space-y-4">
          {categoryNames.map(cat => {
            const techs = categoriesMap[cat];
            return (
              <div key={cat} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{cat}</span>
                </div>

                <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800/80 text-slate-400">
                        <th className="py-2.5 px-4 font-semibold w-1/3 min-w-[160px]">Technology</th>
                        {repositories.map((r, i) => (
                          <th key={i} className="py-2.5 px-4 font-semibold text-center min-w-[140px]">
                            {r.full_name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {techs.map(techLower => {
                        const originalName = repositories
                          .flatMap(r => r.technology.technologies)
                          .find(t => t.name.toLowerCase() === techLower)?.name || techLower;

                        return (
                          <tr key={techLower} className="hover:bg-slate-800/20 transition">
                            <td className="py-2.5 px-4 font-medium text-slate-200">
                              <span>{originalName}</span>
                            </td>
                            {repositories.map((repo, rIdx) => {
                              const match = repo.technology.technologies.find(
                                t => t.name.toLowerCase() === techLower
                              );
                              return (
                                <td key={rIdx} className="py-2.5 px-4 text-center">
                                  {match ? (
                                    <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium">
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span>{match.version ? `v${match.version}` : 'Used'}</span>
                                    </div>
                                  ) : (
                                    <Minus className="w-4 h-4 text-slate-600 mx-auto" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

