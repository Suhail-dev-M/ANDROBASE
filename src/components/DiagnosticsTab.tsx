/**
 * AndroBase - System Diagnostics & Hardware Capability Inspector
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, Wifi, Terminal, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Smartphone, Layers
} from 'lucide-react';
import { CompatibilityReport } from '../types.ts';

interface DiagnosticsTabProps {
  report: CompatibilityReport | null;
  onRefresh: () => void;
  loading: boolean;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ report, onRefresh, loading }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Universal Hardware & Capability Inspector</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              {report?.detectedProfile?.toUpperCase() || 'PROFILE'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            AndroBase inspects your physical hardware, Android API level, Node.js V8 capabilities, and Termux environment rather than assuming compatibility from device names.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-2 border border-slate-700 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-inspect System</span>
        </button>
      </div>

      {/* Security Warnings / Recommendations */}
      {report?.securityWarnings && report.securityWarnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 space-y-2">
          <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Honest Security Disclosures</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-200/90">
            {report.securityWarnings.map((warn, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span>{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hardware Specs Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">CPU Architecture</span>
          <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{report?.device.arch || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{report?.device.cpuCores} physical/logical cores</p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Total System RAM</span>
          <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{report?.device.totalMemoryMb || 0} MB</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{report?.device.freeMemoryMb || 0} MB currently free</p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Android Host Level</span>
          <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">
            {report?.device.androidApiLevel ? `API ${report.device.androidApiLevel}` : 'POSIX / Termux'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Kernel: {report?.device.osRelease || 'Linux'}</p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-medium text-slate-400">Node.js Runtime</span>
          <p className="text-sm font-bold text-slate-100 font-mono mt-0.5">{report?.device.nodeVersion || 'N/A'}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">V8 Heap: {report?.device.heapLimitMb} MB limit</p>
        </div>
      </div>

      {/* Individual Checks Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verified Capability Checks ({report?.checks.length || 0})</span>
        </h4>

        <div className="divide-y divide-slate-800/80">
          {report?.checks.map((chk) => (
            <div key={chk.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getStatusIcon(chk.status)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{chk.name}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      {chk.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{chk.message}</p>
                </div>
              </div>

              <div className="text-right sm:shrink-0 font-mono text-xs text-slate-300">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                  {String(chk.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {report?.recommendations && report.recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recommended Device Actions</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {report.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-cyan-400">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
