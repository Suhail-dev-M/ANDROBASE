import React, { useState, useEffect } from 'react';
import {
  Cpu, RefreshCw, AlertCircle, Search, Power,
  Play, Square, RotateCw, CheckCircle2, Shield
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { RunningProcessItem, SystemServiceItem } from '../types.ts';

export const ProcessesTab: React.FC = () => {
  const [subView, setSubView] = useState<'processes' | 'services'>('processes');
  const [processes, setProcesses] = useState<RunningProcessItem[]>([]);
  const [services, setServices] = useState<SystemServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (subView === 'processes') {
        const procs = await ApiClient.listProcesses();
        setProcesses(procs);
      } else {
        const svcs = await ApiClient.listServices();
        setServices(svcs);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [subView]);

  const handleKillProcess = async (pid: number, name: string) => {
    if (!window.confirm(`Are you sure you want to terminate process ${pid} (${name})?`)) return;
    try {
      await ApiClient.killProcess(pid);
      setSuccessMsg(`Process ${pid} terminated`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleControlService = async (serviceName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      await ApiClient.controlService(serviceName, action);
      setSuccessMsg(`Service ${serviceName} ${action} command executed`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredProcesses = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.pid).includes(searchQuery)
  );

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Process & Service Manager</h1>
              <p className="text-xs text-slate-400">
                Supervise host PID execution, memory allocation and system services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
              <button
                onClick={() => setSubView('processes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subView === 'processes'
                    ? 'bg-purple-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Processes ({processes.length})
              </button>
              <button
                onClick={() => setSubView('services')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  subView === 'services'
                    ? 'bg-purple-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Services ({services.length})
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${subView}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>PID 1 & Server self-PID are protected from termination</span>
          </div>
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

      {/* Main Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {subView === 'processes' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">PID</th>
                  <th className="py-3 px-4">Process Name</th>
                  <th className="py-3 px-4">CPU %</th>
                  <th className="py-3 px-4">Memory</th>
                  <th className="py-3 px-4 hidden md:table-cell">User</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredProcesses.map((p) => {
                  const isProtected = p.pid === 1 || p.pid === process.pid;
                  return (
                    <tr key={p.pid} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-purple-400 font-bold">{p.pid}</td>
                      <td className="py-3 px-4 font-sans text-slate-200 truncate max-w-xs sm:max-w-md">
                        {p.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            p.cpuPercent > 30
                              ? 'text-red-400'
                              : p.cpuPercent > 10
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {p.cpuPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.memoryMb} MB</td>
                      <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{p.user}</td>
                      <td className="py-3 px-4 text-right">
                        {isProtected ? (
                          <span className="text-[10px] text-slate-600 font-sans uppercase font-bold">
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleKillProcess(p.pid, p.name)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                            title="Kill Process"
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredServices.map((s) => {
                  const isActive = s.status === 'active';
                  return (
                    <tr key={s.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{s.name}</div>
                        <div className="text-[11px] text-slate-400">{s.description}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {s.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isActive ? (
                            <button
                              onClick={() => handleControlService(s.name, 'stop')}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-red-400"
                              title="Stop Service"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleControlService(s.name, 'start')}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-emerald-400"
                              title="Start Service"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={() => handleControlService(s.name, 'restart')}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300"
                            title="Restart Service"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
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
    </div>
  );
};
