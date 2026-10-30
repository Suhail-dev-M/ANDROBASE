import React, { useState, useEffect } from 'react';
import {
  Terminal, GitBranch, GitPullRequest, FileCode, CheckCircle2,
  AlertCircle, RefreshCw, Save, Code, HardDrive
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { GitRepositoryStatus } from '../types.ts';

export const DevToolsTab: React.FC = () => {
  const [gitStatus, setGitStatus] = useState<GitRepositoryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullOutput, setPullOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Config editor state
  const [selectedConfig, setSelectedConfig] = useState('package.json');
  const [configContent, setConfigContent] = useState('');
  const [configLoading, setConfigLoading] = useState(false);

  const fetchGit = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await ApiClient.getGitStatus();
      setGitStatus(s);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadConfigFile = async (filename: string) => {
    setConfigLoading(true);
    setError(null);
    try {
      const res = await ApiClient.readConfigFile(filename);
      setConfigContent(res.content);
      setSelectedConfig(filename);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchGit();
    loadConfigFile(selectedConfig);
  }, []);

  const handleGitPull = async () => {
    setPulling(true);
    setPullOutput(null);
    setError(null);
    try {
      const res = await ApiClient.gitPull();
      setPullOutput(res.output || 'Git pull completed.');
      fetchGit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPulling(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setConfigLoading(true);
      await ApiClient.writeConfigFile(selectedConfig, configContent);
      setSuccessMsg(`${selectedConfig} saved successfully`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfigLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Developer Tools</h1>
              <p className="text-xs text-slate-400">
                Git version control status, repository pulls, and workspace configuration editor
              </p>
            </div>
          </div>

          <button
            onClick={fetchGit}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors self-start sm:self-auto"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {successMsg && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Git Status Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {gitStatus?.isRepo ? 'Git Repository Active' : 'No Git Repository Initialized'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Branch: <span className="text-indigo-400 font-bold">{gitStatus?.currentBranch || 'none'}</span>
              </p>
            </div>
          </div>

          {gitStatus?.isRepo && (
            <button
              onClick={handleGitPull}
              disabled={pulling}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <GitPullRequest className="w-4 h-4" />
              <span>{pulling ? 'Pulling changes...' : 'Git Pull'}</span>
            </button>
          )}
        </div>

        {gitStatus?.isRepo && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Working Tree</span>
              <div className="font-semibold text-slate-200 mt-1">
                {gitStatus.isClean ? (
                  <span className="text-emerald-400 font-bold">Clean</span>
                ) : (
                  <span className="text-amber-400 font-bold">
                    {gitStatus.uncommittedCount} uncommitted changes
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Last Commit</span>
              <div className="font-mono text-slate-300 mt-1 truncate">
                {gitStatus.lastCommit ? `${gitStatus.lastCommit.hash} - ${gitStatus.lastCommit.message}` : 'None'}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Remote URL</span>
              <div className="font-mono text-slate-400 mt-1 truncate">
                {gitStatus.remoteUrl || 'Local only (no origin set)'}
              </div>
            </div>
          </div>
        )}

        {pullOutput && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
            {pullOutput}
          </div>
        )}
      </div>

      {/* Workspace Config File Editor */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Workspace Configuration Editor</h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedConfig}
              onChange={(e) => loadConfigFile(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="package.json">package.json</option>
              <option value="tsconfig.json">tsconfig.json</option>
              <option value="README.md">README.md</option>
            </select>

            <button
              onClick={handleSaveConfig}
              disabled={configLoading}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{configLoading ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#090D16]">
          <textarea
            value={configContent}
            onChange={(e) => setConfigContent(e.target.value)}
            className="w-full h-80 bg-transparent text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-500/30"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
