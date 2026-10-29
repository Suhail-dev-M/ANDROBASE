/**
 * AndroBase - Delightful & Modern Dashboard Overview Tab
 * Live System Telemetry, Mobile Hardware Metrics & Quick Status
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Smartphone, Database, HardDrive, ShieldCheck, Activity, 
  Wifi, Sparkles, Cpu, Layers, CheckCircle2, AlertTriangle, 
  ArrowRight, RefreshCw, Key, Copy, Check, UploadCloud, 
  Plus, Archive, ExternalLink
} from 'lucide-react';
import { ServerStatusResponse, CompatibilityReport, AuditLog } from '../types.ts';

interface OverviewTabProps {
  status: ServerStatusResponse | null;
  report: CompatibilityReport | null;
  auditLogs: AuditLog[];
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
  onOpenBootstrap: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  status,
  report,
  auditLogs,
  onRefresh,
  onNavigate,
  onOpenBootstrap,
}) => {
  const [copiedLan, setCopiedLan] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const copyLanUrl = () => {
    const url = status?.network.lan || 'http://127.0.0.1:3000';
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLan(true);
      setTimeout(() => setCopiedLan(false), 2000);
    }).catch(() => {});
  };

  const freeMemMb = report?.device.freeMemoryMb ?? (status?.device.freeMemoryMb ?? 0);
  const totalMemMb = report?.device.totalMemoryMb ?? (status?.device.totalMemoryMb ?? 1);
  const ramPercent = Math.min(100, Math.round(((totalMemMb - freeMemMb) / totalMemMb) * 100));

  const storageUsed = status?.storageStats.totalSizeBytes ?? 0;
  const storageLimit = 20 * 1024 * 1024 * 1024; // 20GB baseline
  const storagePercent = Math.min(100, Math.round((storageUsed / storageLimit) * 100));

  return (
    <div className="space-y-6">
      
      {/* 1. Welcoming Hero Banner */}
      {status && !status.hasAdmin ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#1C160C] to-amber-900/40 border border-amber-500/30 p-5 sm:p-6 shadow-xl shadow-amber-950/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                ✨
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Welcome to AndroBase! Let's Set Up Your Admin Account
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Step 1 of 1
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
                  Your server is up and listening. Because this runs on your personal phone, an administrator account is required to protect your private database and files.
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-amber-300 font-mono">
                  <span>Run in Termux:</span>
                  <code className="bg-black/40 px-2 py-0.5 rounded border border-amber-500/20 text-amber-200">
                    cat ~/.androbase/.bootstrap_token
                  </code>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenBootstrap}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <Key className="w-4 h-4" />
              <span>Enter Bootstrap Token</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F1C2E] via-[#0E1726] to-[#0A1220] border border-white/[0.08] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                🌱
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Your Mobile Cloud is Running Smoothly
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Protected &amp; Online
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Connected to your local Wi-Fi. Access this dashboard from any phone, laptop, or tablet on your network.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={copyLanUrl}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl border border-white/[0.08] transition-all flex items-center justify-center gap-2"
                title="Copy LAN address"
              >
                {copiedLan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLan ? 'Address Copied!' : 'Copy LAN URL'}</span>
              </button>
              <button
                onClick={onRefresh}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/[0.08] transition-colors"
                title="Refresh metrics"
                aria-label="Refresh telemetry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Four Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Device Hardware & Profile */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Phone Hardware</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-white tracking-tight">
                {status?.profileName?.split('—')[0].trim() || 'Profile C'}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {status?.device.arch} • {status?.device.cpuCores} Cores • {status?.device.isTermux ? 'Termux Environment' : 'Linux'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">RAM Utilization</span>
              <span className="font-mono text-slate-300 tabular-nums">{ramPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                style={{ width: `${ramPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
              {freeMemMb} MB free / {totalMemMb} MB total
            </p>
          </div>
        </div>

        {/* Card 2: Database Engine */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Database Engine</span>
              <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-white tracking-tight flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums">{status?.dbStats.recordCount ?? 0}</span>
                <span className="text-xs font-normal text-slate-400">Total Records</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Organized in {status?.dbStats.tableCount ?? 0} tables
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono text-[11px]">
              Size: {formatBytes(status?.dbStats.sizeBytes ?? 0)}
            </span>
            <button
              onClick={() => onNavigate('database')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 text-[11px] transition-colors"
            >
              <span>Explore</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Storage Engine */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">File Storage</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-white tracking-tight flex items-baseline gap-1.5">
                <span className="font-mono tabular-nums">{status?.storageStats.totalFiles ?? 0}</span>
                <span className="text-xs font-normal text-slate-400">Files Uploaded</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatBytes(status?.storageStats.totalSizeBytes ?? 0)} used on device
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium">Safe Mobile Quota</span>
              <span className="font-mono text-slate-300 tabular-nums">{storagePercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-500" 
                style={{ width: `${Math.max(4, storagePercent)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px]">
              <span className="text-slate-500">Max upload: 20 MB/file</span>
              <button
                onClick={() => onNavigate('storage')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Files</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Network & LAN Presence */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Network &amp; Access</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Wifi className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm font-bold text-white font-mono break-all tracking-tight">
                {status?.network.lan ? status.network.lan.replace('http://', '') : '127.0.0.1:3000'}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Port {status?.network.local ? status.network.local.split(':').pop() : '3000'} • LAN Active
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Accepting Requests
            </span>
            <button
              onClick={() => onNavigate('network')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 text-[11px] transition-colors"
            >
              <span>QR Code</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. Quick Action Launcher */}
      <div className="cute-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span>⚡ Quick Actions</span>
          <span className="text-slate-600 font-normal">|</span>
          <span className="text-slate-500 font-normal normal-case">Direct shortcuts to essential server features</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('database')}
            className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 text-left transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 w-fit group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">New Table</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Define JSON/SQL schema</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('storage')}
            className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/[0.06] hover:border-cyan-500/30 text-left transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 w-fit group-hover:scale-110 transition-transform">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Upload File</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Stream safe assets to phone</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('backups')}
            className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/[0.06] hover:border-purple-500/30 text-left transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 w-fit group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Create Snapshot</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant SHA-256 backup</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('api')}
            className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/30 text-left transition-all group flex flex-col justify-between"
          >
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 w-fit group-hover:scale-110 transition-transform">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div className="mt-3">
              <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Test REST API</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Live cURL &amp; JSON testing</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Two-Column System Health & Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hardware & Mobile Power Health */}
        <div className="cute-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Android Runtime Health</span>
            </h3>
            <button
              onClick={() => onNavigate('diagnostics')}
              className="text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors"
            >
              Full Diagnostics →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-300">Wakelock Protection</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Active (CPU sleep prevented)
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-300">Database Engine Integrity</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                WAL &amp; Atomic Write Ready
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-300">Memory Ceiling</span>
              <span className="text-slate-300 font-mono">
                {status?.device.heapLimitMb || 256} MB V8 Heap Cap
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-slate-300">Node Runtime</span>
              <span className="text-slate-300 font-mono">
                {status?.device.nodeVersion || process.version}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Audit Events */}
        <div className="cute-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Security &amp; Audit Log</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {auditLogs.length} events recorded
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              <div className="text-2xl mb-1">🛡️</div>
              <p>No security warnings or failed logins.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Your server is clean and secure.</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
              {auditLogs.slice(0, 5).map((log) => (
                <div 
                  key={log.id} 
                  className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    <span className="font-medium text-slate-200">{log.action}</span>
                    <span className="text-[11px] text-slate-500">{log.ip}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
