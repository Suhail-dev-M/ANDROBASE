import React, { useState, useEffect } from 'react';
import {
  Layers, CheckCircle2, AlertCircle, RefreshCw,
  Activity, Folder, Database, Box, Wifi, Cpu, Shield,
  Clock, Film, Terminal, Archive
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { ServerModuleDefinition } from '../types.ts';

const ICON_MAP: Record<string, React.ElementType> = {
  Activity, Folder, Layers, Database, Box, Wifi,
  Cpu, Shield, Clock, Film, Terminal, Archive
};

export const ModulesTab: React.FC = () => {
  const [modules, setModules] = useState<ServerModuleDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.listModules();
      setModules(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggle = async (mod: ServerModuleDefinition) => {
    if (mod.isCore) return;
    try {
      const updated = await ApiClient.toggleModule(mod.id, !mod.enabled);
      setSuccessMsg(`Module "${mod.name}" ${updated.enabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchModules();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Plugin & Module Architecture</h1>
              <p className="text-xs text-slate-400">
                Dynamically customize and activate server modules for low-resource efficiency
              </p>
            </div>
          </div>

          <button
            onClick={fetchModules}
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

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const IconComponent = ICON_MAP[mod.icon] || Layers;
          return (
            <div
              key={mod.id}
              className={`bg-slate-900/60 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                mod.enabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        mod.enabled
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{mod.name}</h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {mod.category}
                      </span>
                    </div>
                  </div>

                  {mod.isCore ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      CORE
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggle(mod)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        mod.enabled ? 'bg-teal-500 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>v{mod.version}</span>
                <span>{mod.enabled ? 'Active' : 'Disabled'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
