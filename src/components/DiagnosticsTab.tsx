/**
 * AndroBase - System Diagnostics & Hardware Capability Inspector
 * Cute, Modern & Production-Quality Diagnostic Dashboard
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Cpu, HardDrive, ShieldCheck, Terminal, AlertTriangle, 
  CheckCircle2, XCircle, RefreshCw, Smartphone, Layers,
  Search, Copy, Check, BatteryCharging, Zap, Gauge
} from 'lucide-react';
import { CompatibilityReport } from '../types.ts';

interface DiagnosticsTabProps {
  report: CompatibilityReport | null;
  onRefresh: () => void;
  loading: boolean;
}

export const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ report, onRefresh, loading }) => {
  const [filter, setFilter] = useState<'all' | 'passed' | 'warning' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const totalRam = report?.device.totalMemoryMb || 1;
  const freeRam = report?.device.freeMemoryMb || 0;
  const usedRam = Math.max(0, totalRam - freeRam);
  const ramPercent = Math.min(100, Math.round((usedRam / totalRam) * 100));

  const allChecks = report?.checks || [];
  const passedCount = allChecks.filter((c) => c.status === 'passed').length;
  const warnCount = allChecks.filter((c) => c.status === 'warning').length;
  const failCount = allChecks.filter((c) => c.status === 'failed').length;

  const filteredChecks = allChecks.filter((chk) => {
    if (filter !== 'all' && chk.status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        chk.name.toLowerCase().includes(q) ||
        chk.category.toLowerCase().includes(q) ||
        chk.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="cute-card p-5 sm:p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-purple-950/20 border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Hardware & Environment Diagnostics
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
              {report?.detectedProfile?.toUpperCase() || 'PROFILE C'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Real-time inspection of your physical smartphone SoC architecture, memory ceilings, Android kernel limits, and POSIX capabilities.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="cute-pill-btn px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700/80 transition-all shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Inspecting...' : 'Re-inspect System'}</span>
        </button>
      </div>

      {/* Hardware Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RAM Usage Meter */}
        <div className="cute-card p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span>RAM Allocation</span>
            </span>
            <span className="font-mono text-[11px] font-semibold text-cyan-400">{ramPercent}%</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-100">
            {usedRam} <span className="text-xs font-sans text-slate-400 font-normal">/ {totalRam} MB</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                ramPercent > 85 ? 'bg-rose-500' : ramPercent > 70 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${ramPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono tabular-nums">
            {freeRam} MB physical memory free
          </p>
        </div>

        {/* CPU Architecture */}
        <div className="cute-card p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>CPU Processor</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {report?.device.cpuCores || 4} Cores
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {report?.device.arch?.toUpperCase() || 'AARCH64'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Mobile SoC topology with multi-core clustering
          </p>
        </div>

        {/* Android Host Level */}
        <div className="cute-card p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android Host</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {report?.device.androidApiLevel ? `API ${report.device.androidApiLevel}` : 'POSIX'}
            </span>
          </div>
          <div className="text-xl font-bold text-slate-100">
            {report?.device.androidApiLevel ? `Android ${report.device.androidApiLevel >= 33 ? '13+' : report.device.androidApiLevel >= 31 ? '12' : '10-11'}` : 'Linux Termux'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono truncate" title={report?.device.osRelease}>
            Kernel: {report?.device.osRelease || 'Linux'}
          </p>
        </div>

        {/* Node.js & V8 Heap */}
        <div className="cute-card p-4 bg-slate-900/60 border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Node.js & V8</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              V8 Engine
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {report?.device.nodeVersion || 'v18.x'}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono tabular-nums">
            V8 Heap Ceiling: {report?.device.heapLimitMb || 256} MB
          </p>
        </div>
      </div>

      {/* Security Warnings / Disclosures */}
      {report?.securityWarnings && report.securityWarnings.length > 0 && (
        <div className="cute-card p-4 bg-amber-950/20 border-amber-500/30 space-y-2">
          <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2 tracking-wide">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Honest Security Disclosures</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-200/90 pl-6 list-disc">
            {report.securityWarnings.map((warn, idx) => (
              <li key={idx} className="leading-relaxed">
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Verified Capability Checks */}
      <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
        {/* Header with Search and Filter Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified System Checks</span>
              <span className="text-xs font-mono text-slate-400 font-normal">({allChecks.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Runtime capability validation results</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter checks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  filter === 'all' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({allChecks.length})
              </button>
              <button
                onClick={() => setFilter('passed')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  filter === 'passed' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Passed ({passedCount})
              </button>
              {warnCount > 0 && (
                <button
                  onClick={() => setFilter('warning')}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    filter === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Warnings ({warnCount})
                </button>
              )}
              {failCount > 0 && (
                <button
                  onClick={() => setFilter('failed')}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    filter === 'failed' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Failed ({failCount})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Checks List */}
        <div className="divide-y divide-slate-800/60">
          {filteredChecks.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No capability checks match the current filter.
            </div>
          ) : (
            filteredChecks.map((chk) => (
              <div
                key={chk.id}
                className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(chk.status)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-100">{chk.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        {chk.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{chk.message}</p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
                    {String(chk.value)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Helpful Smartphone Recommendations & CLI Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recommended Actions */}
        <div className="cute-card p-5 bg-slate-900/60 border-slate-800/80 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 tracking-wide">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Recommended Device Actions</span>
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {(report?.recommendations || [
              'Acquire Termux wake-lock before running intensive background tasks',
              'Disable Android battery optimization to prevent OS task killer from sleeping Node.js',
              'Use local Wi-Fi pairing or SSH port forwarding when managing server remotely'
            ]).map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-cyan-400 font-bold shrink-0">→</span>
                <span className="text-slate-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Handy Termux Snippets */}
        <div className="cute-card p-5 bg-slate-900/60 border-slate-800/80 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 tracking-wide">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Useful Smartphone Terminal Commands</span>
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-300 truncate">termux-wake-lock</span>
              <button
                onClick={() => copyToClipboard('termux-wake-lock', 'wake')}
                className="ml-2 text-slate-400 hover:text-emerald-400 flex items-center gap-1 shrink-0"
              >
                {copiedCmd === 'wake' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-300 truncate">termux-battery-status</span>
              <button
                onClick={() => copyToClipboard('termux-battery-status', 'batt')}
                className="ml-2 text-slate-400 hover:text-emerald-400 flex items-center gap-1 shrink-0"
              >
                {copiedCmd === 'batt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
              <span className="text-slate-300 truncate">cat ~/.androbase/.bootstrap_token</span>
              <button
                onClick={() => copyToClipboard('cat ~/.androbase/.bootstrap_token', 'token')}
                className="ml-2 text-slate-400 hover:text-emerald-400 flex items-center gap-1 shrink-0"
              >
                {copiedCmd === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
