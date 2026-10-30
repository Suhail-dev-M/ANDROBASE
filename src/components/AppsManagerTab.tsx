import React, { useState, useEffect } from 'react';
import {
  Layers, Play, Square, RotateCw, Trash2, Plus, Terminal,
  ExternalLink, CheckCircle2, AlertTriangle, Clock, Activity, Cpu
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { HostedAppRecord, HostedAppType } from '../types.ts';

export const AppsManagerTab: React.FC = () => {
  const [apps, setApps] = useState<HostedAppRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New App Form State
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState<HostedAppType>('node');
  const [directoryPath, setDirectoryPath] = useState('');
  const [entryPoint, setEntryPoint] = useState('index.js');
  const [port, setPort] = useState(8080);
  const [autoStart, setAutoStart] = useState(true);

  // Live Logs Viewer
  const [activeLogApp, setActiveLogApp] = useState<HostedAppRecord | null>(null);
  const [appLogs, setAppLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.listApps();
      setApps(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    const interval = setInterval(fetchApps, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleDeployApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) return;

    try {
      await ApiClient.createApp({
        name: appName.trim(),
        type: appType,
        directoryPath: directoryPath.trim() || `apps/${appName.toLowerCase().replace(/\s+/g, '-')}`,
        entryPoint: entryPoint.trim() || 'index.js',
        port: Number(port) || 8080,
        autoStart,
      });

      setIsDeployModalOpen(false);
      setAppName('');
      fetchApps();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStart = async (id: string) => {
    try {
      await ApiClient.startApp(id);
      fetchApps();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStop = async (id: string) => {
    try {
      await ApiClient.stopApp(id);
      fetchApps();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestart = async (id: string) => {
    try {
      await ApiClient.restartApp(id);
      fetchApps();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete application "${name}"?`)) return;
    try {
      await ApiClient.deleteApp(id);
      if (activeLogApp?.id === id) setActiveLogApp(null);
      fetchApps();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenLogs = async (app: HostedAppRecord) => {
    setActiveLogApp(app);
    setLogsLoading(true);
    try {
      const res = await ApiClient.getAppLogs(app.id, 100);
      setAppLogs(res.logs || []);
    } catch (err: unknown) {
      setAppLogs([`Error fetching logs: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">App & Web Hosting Manager</h1>
              <p className="text-xs text-slate-400">
                Deploy, monitor and supervise Node.js, Python, PHP, and Static applications
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Project</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Applications Grid */}
      {apps.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Layers className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No applications deployed yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Host local static websites, API services, or background worker processes directly from your server.
          </p>
          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy First App</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => {
            const isRunning = app.status === 'running';
            return (
              <div
                key={app.id}
                className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <h3 className="font-bold text-white text-base truncate max-w-[180px]">
                          {app.name}
                        </h3>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 mt-1 inline-block rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {app.type}
                      </span>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <span className="text-slate-400">Port</span>{' '}
                      <span className="text-cyan-400 font-bold">:{app.port}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <span
                        className={`font-semibold ${
                          isRunning ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {app.status.toUpperCase()}
                        {app.pid ? ` (PID ${app.pid})` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Entry point</span>
                      <span className="font-mono text-slate-300 truncate max-w-[150px]">
                        {app.entryPoint}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Auto-start</span>
                      <span className="text-slate-300">{app.autoStart ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {isRunning ? (
                      <button
                        onClick={() => handleStop(app.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                        title="Stop App"
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(app.id)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                        title="Start App"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRestart(app.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                      title="Restart App"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenLogs(app)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                      title="View App Logs"
                    >
                      <Terminal className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {isRunning && (
                      <a
                        href={`http://${window.location.hostname}:${app.port}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                        title="Open App in New Tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(app.id, app.name)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete App"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy Project Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Deploy New Server Application</span>
            </h3>

            <form onSubmit={handleDeployApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My REST API, Personal Blog"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Runtime Type
                  </label>
                  <select
                    value={appType}
                    onChange={(e) => setAppType(e.target.value as HostedAppType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="node">Node.js (node)</option>
                    <option value="python">Python (python3)</option>
                    <option value="php">PHP (php -S)</option>
                    <option value="static">Static Web Server</option>
                    <option value="custom">Custom Shell Command</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Port Number
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Directory Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. apps/my-api (defaults to apps/{name})"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Entry Point File / Command
                </label>
                <input
                  type="text"
                  placeholder="e.g. server.js, app.py, index.html"
                  value={entryPoint}
                  onChange={(e) => setEntryPoint(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoStart"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="autoStart" className="text-xs text-slate-300">
                  Automatically start process when home server boots
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-bold"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Logs Drawer / Modal */}
      {activeLogApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-white">{activeLogApp.name} Logs</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    PID {activeLogApp.pid || 'inactive'} • Port :{activeLogApp.port}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenLogs(activeLogApp)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Refresh Logs"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setActiveLogApp(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-[#090D16] overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
              {appLogs.length === 0 ? (
                <div className="text-slate-600 py-12 text-center">
                  No log output received from application process yet.
                </div>
              ) : (
                appLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-white/[0.02] px-1 rounded">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
