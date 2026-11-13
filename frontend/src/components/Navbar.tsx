import React from 'react';
import { Sparkles, Key, Download, Cpu, BookOpen, FolderGit2, GitCompare } from 'lucide-react';
import { FullRepoAnalysis, UserConfig } from '../types';

interface NavbarProps {
  config: UserConfig;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenCompareExport?: () => void;
  analysis: FullRepoAnalysis | null;
  hasCompareData?: boolean;
  viewMode: 'single' | 'compare';
  onChangeViewMode: (mode: 'single' | 'compare') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  onOpenSettings,
  onOpenExport,
  onOpenCompareExport,
  analysis,
  hasCompareData,
  viewMode,
  onChangeViewMode,
}) => {
  const hasGeminiKey = Boolean(config.geminiApiKey?.trim());

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Git Analyzer
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline">
                MCA Mini Project
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              AI-Powered Source Code Analysis & Repository Understanding
            </p>
          </div>
        </div>

        {/* Navigation Mode Switcher */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            onClick={() => onChangeViewMode('single')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'single'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Single Repo</span>
            <span className="sm:hidden">Single</span>
          </button>

          <button
            onClick={() => onChangeViewMode('compare')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition relative ${
              viewMode === 'compare'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare</span>
            <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-sans tracking-wide">
              New
            </span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Gemini AI Status Badge */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              hasGeminiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Configure Google Free Gemini API Key"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {hasGeminiKey ? 'Gemini AI Active' : 'Add Free Gemini Key'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border border-slate-800"
            title="API Keys & Settings"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Export Report Buttons */}
          {viewMode === 'single' && analysis && (
            <button
              onClick={onOpenExport}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          )}

          {viewMode === 'compare' && hasCompareData && onOpenCompareExport && (
            <button
              onClick={onOpenCompareExport}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Comparison</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

