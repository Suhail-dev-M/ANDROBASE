import React, { useState, useEffect } from 'react';
import {
  Box, Play, Square, RotateCw, Trash2, Terminal,
  AlertCircle, CheckCircle2, RefreshCw, Cpu, Layers
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { DockerHostStatus, DockerContainerItem } from '../types.ts';

export const ContainersTab: React.FC = () => {
  const [status, setStatus] = useState<DockerHostStatus | null>(null);
  const [containers, setContainers] = useState<DockerContainerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logs modal
  const [selectedContainer, setSelectedContainer] = useState<DockerContainerItem | null>(null);
  const [containerLogs, setContainerLogs] = useState<string[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchDocker = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await ApiClient.getDockerStatus();
      setStatus(s);
      if (s.isAvailable) {
        const c = await ApiClient.listDockerContainers();
        setContainers(c);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocker();
  }, []);

  const handleStart = async (id: string) => {
    try {
      await ApiClient.startDockerContainer(id);
      fetchDocker();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStop = async (id: string) => {
    try {
      await ApiClient.stopDockerContainer(id);
      fetchDocker();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRestart = async (id: string) => {
    try {
      await ApiClient.restartDockerContainer(id);
      fetchDocker();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove container "${name}"?`)) return;
    try {
      await ApiClient.removeDockerContainer(id);
      fetchDocker();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleViewLogs = async (item: DockerContainerItem) => {
    setSelectedContainer(item);
    setLogsLoading(true);
    try {
      const res = await ApiClient.getDockerContainerLogs(item.id);
      setContainerLogs(res.logs || []);
    } catch (err: unknown) {
      setContainerLogs([`Error fetching logs: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Box className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Docker & Container Manager</h1>
              <p className="text-xs text-slate-400">
                Container lifecycle, image inspection, logs and compose project manager
              </p>
            </div>
          </div>

          <button
            onClick={fetchDocker}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
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

      {/* Docker Unavailable Notification Card */}
      {status && !status.isAvailable && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Box className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Docker Not Active on this Host</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {status.message}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              Native App Hosting is active
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              Low-resource devices do not require Docker
            </div>
          </div>
        </div>
      )}

      {/* When Docker is available */}
      {status && status.isAvailable && (
        <>
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Running Containers</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {status.containersRunning ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Containers</span>
              <p className="text-xl font-bold text-slate-200 mt-1">
                {status.containersTotal ?? 0}
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">Docker Version</span>
              <p className="text-base font-bold text-blue-400 mt-1 font-mono truncate">
                {status.version || 'Active'}
              </p>
            </div>
          </div>

          {/* Containers Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
            {containers.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No containers found on host.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Container</th>
                      <th className="py-3 px-4 hidden sm:table-cell">Image</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4 hidden md:table-cell">Ports</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {containers.map((c) => {
                      const isRunning = c.state === 'running';
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-200">{c.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                              {c.id}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300 hidden sm:table-cell truncate max-w-[160px]">
                            {c.image}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRunning
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.state}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 hidden md:table-cell truncate max-w-[140px]">
                            {c.ports?.join(', ') || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isRunning ? (
                                <button
                                  onClick={() => handleStop(c.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-800 text-red-400"
                                  title="Stop"
                                >
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStart(c.id)}
                                  className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400"
                                  title="Start"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRestart(c.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                                title="Restart"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleViewLogs(c)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-blue-400"
                                title="Logs"
                              >
                                <Terminal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemove(c.id, c.name)}
                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Logs Modal */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400 shrink-0" />
                <h4 className="text-sm font-bold text-white">
                  {selectedContainer.name} Container Logs
                </h4>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
            <div className="flex-1 p-4 bg-[#090D16] overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
              {containerLogs.length === 0 ? (
                <div className="text-slate-600 py-12 text-center">No logs available.</div>
              ) : (
                containerLogs.map((l, i) => <div key={i}>{l}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
