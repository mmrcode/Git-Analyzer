import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, FolderTree, FileCode2, Network, MessageSquareCode,
  GraduationCap, Sparkles, Key, AlertCircle, RefreshCw, GitCompare,
  Layers, ArrowLeft
} from 'lucide-react';
import { FullRepoAnalysis, UserConfig, RepoComparisonResponse, ComparisonObjective } from './types';
import { analyzeRepository, compareRepositories } from './services/api';
import { Navbar } from './components/Navbar';
import { RepoInput } from './components/RepoInput';
import { OverviewTab } from './components/OverviewTab';
import { FileExplorerTab } from './components/FileExplorerTab';
import { CodeAnalysisTab } from './components/CodeAnalysisTab';
import { DependencyGraphTab } from './components/DependencyGraphTab';
import { AIChatTab } from './components/AIChatTab';
import { VivaPrepTab } from './components/VivaPrepTab';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExportModal } from './components/ExportModal';

// Comparison Components
import { RepositoryComparisonInput } from './components/compare/RepositoryComparisonInput';
import { RepositoryComparisonCard } from './components/compare/RepositoryComparisonCard';
import { ComparisonTable } from './components/compare/ComparisonTable';
import { TechnologyComparison } from './components/compare/TechnologyComparison';
import { ComparisonCharts } from './components/compare/ComparisonCharts';
import { ScoreBreakdown } from './components/compare/ScoreBreakdown';
import { AIRecommendation } from './components/compare/AIRecommendation';
import { ComparisonReportExport } from './components/compare/ComparisonReportExport';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  // Single Repository Analysis State
  const [analysis, setAnalysis] = useState<FullRepoAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Multi-Repository Comparison State
  const [comparisonData, setComparisonData] = useState<RepoComparisonResponse | null>(null);
  const [isCompareLoading, setIsCompareLoading] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [isCompareExportOpen, setIsCompareExportOpen] = useState<boolean>(false);

  // User credentials
  const [config, setConfig] = useState<UserConfig>(() => {
    return {
      geminiApiKey: localStorage.getItem('git_analyzer_gemini_key') || '',
      githubToken: localStorage.getItem('git_analyzer_github_token') || '',
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const handleSaveConfig = (newConfig: UserConfig) => {
    setConfig(newConfig);
    localStorage.setItem('git_analyzer_gemini_key', newConfig.geminiApiKey);
    localStorage.setItem('git_analyzer_github_token', newConfig.githubToken);
  };

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await analyzeRepository(url, config.githubToken, config.geminiApiKey);
      setAnalysis(data);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while analyzing repository.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async (repos: string[], objective: ComparisonObjective) => {
    setIsCompareLoading(true);
    setCompareError(null);
    try {
      const data = await compareRepositories(
        repos,
        objective,
        config.githubToken,
        config.geminiApiKey
      );
      setComparisonData(data);
    } catch (err: any) {
      setCompareError(err.message || 'An unexpected error occurred while comparing repositories.');
    } finally {
      setIsCompareLoading(false);
    }
  };

  const handleInspectComparisonRepo = (selectedAnalysis: FullRepoAnalysis) => {
    setAnalysis(selectedAnalysis);
    setViewMode('single');
    setActiveTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenCompareExport={() => setIsCompareExportOpen(true)}
        analysis={analysis}
        hasCompareData={Boolean(comparisonData)}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      {/* Free Gemini API Key Reminder Banner (if not set) */}
      {!config.geminiApiKey && (
        <div className="bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-amber-200 gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Enhance your analysis & multi-repository comparisons with real-time <strong>Google Gemini AI</strong> evaluation!
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold border border-amber-500/30 transition flex-shrink-0"
            >
              Set Free Gemini Key
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: SINGLE REPOSITORY ANALYZER */}
        {viewMode === 'single' && (
          <div className="space-y-6">
            {/* Repo Input Form */}
            <RepoInput
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              error={error}
            />

            {/* Dashboard Tabs (Visible when analysis data is available) */}
            {analysis && (
              <div className="mt-8 space-y-6 animate-fadeIn">
                {/* Tab Navigation Buttons */}
                <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
                  {[
                    { id: 'overview', label: 'Overview & Metrics', icon: LayoutDashboard },
                    { id: 'explorer', label: 'File Explorer', icon: FolderTree },
                    { id: 'code', label: 'Static Code & AST', icon: FileCode2 },
                    { id: 'graph', label: 'Module Graph', icon: Network },
                    { id: 'chat', label: 'AI Assistant', icon: MessageSquareCode },
                    { id: 'viva', label: 'Viva Prep & Setup', icon: GraduationCap },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-emerald-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Tab View */}
                <div className="pt-2">
                  {activeTab === 'overview' && (
                    <OverviewTab analysis={analysis} onSelectTab={setActiveTab} />
                  )}
                  {activeTab === 'explorer' && (
                    <FileExplorerTab
                      analysis={analysis}
                      geminiApiKey={config.geminiApiKey}
                      githubToken={config.githubToken}
                    />
                  )}
                  {activeTab === 'code' && (
                    <CodeAnalysisTab
                      analysis={analysis}
                      geminiApiKey={config.geminiApiKey}
                      githubToken={config.githubToken}
                    />
                  )}
                  {activeTab === 'graph' && (
                    <DependencyGraphTab analysis={analysis} />
                  )}
                  {activeTab === 'chat' && (
                    <AIChatTab
                      analysis={analysis}
                      geminiApiKey={config.geminiApiKey}
                      onSelectFile={() => setActiveTab('explorer')}
                    />
                  )}
                  {activeTab === 'viva' && (
                    <VivaPrepTab analysis={analysis} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MULTI-REPOSITORY COMPARISON DASHBOARD */}
        {viewMode === 'compare' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Comparison Input Form */}
            <RepositoryComparisonInput
              onCompare={handleCompare}
              isLoading={isCompareLoading}
              error={compareError}
              onClearError={() => setCompareError(null)}
            />

            {/* Comparison Results */}
            {comparisonData && (
              <div className="space-y-8">
                {/* 1. Side-by-Side Summary Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                      <span>Compared Repositories</span>
                      <span className="text-xs font-normal text-slate-400">
                        (Ranked for {comparisonData.objective_label})
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Evaluated on {comparisonData.comparison_date}
                    </span>
                  </div>

                  <div className={`grid grid-cols-1 ${
                    comparisonData.repositories.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
                  } gap-4`}>
                    {comparisonData.repositories.map((repo) => (
                      <RepositoryComparisonCard
                        key={repo.full_name}
                        item={repo}
                        onInspect={handleInspectComparisonRepo}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Gemini AI-Powered Recommendations & Comparative Verdict */}
                <AIRecommendation
                  recommendation={comparisonData.ai_recommendation}
                  winnerRepoName={comparisonData.winner_repo_name}
                />

                {/* 3. Intelligent Scoring System & Objective Breakdown */}
                <ScoreBreakdown
                  repositories={comparisonData.repositories}
                  objectiveLabel={comparisonData.objective_label}
                />

                {/* 4. Visual Charts: Radar & Telemetry Charts */}
                <ComparisonCharts
                  repositories={comparisonData.repositories}
                />

                {/* 5. 12-Category Side-by-Side Comparison Matrix */}
                <ComparisonTable
                  repositories={comparisonData.repositories}
                />

                {/* 6. Technology Stack & Framework Breakdown */}
                <TechnologyComparison
                  repositories={comparisonData.repositories}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      {analysis && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          analysis={analysis}
        />
      )}

      {comparisonData && (
        <ComparisonReportExport
          isOpen={isCompareExportOpen}
          onClose={() => setIsCompareExportOpen(false)}
          comparison={comparisonData}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>
          GitHub Project Analyzer • Multi-Repository Comparison Engine • Built with FastAPI, React 19, TypeScript, and Google Gemini AI
        </p>
      </footer>
    </div>
  );
};
export default App;
