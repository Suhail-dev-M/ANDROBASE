/**
 * AndroBase - Dashboard Overview Tab
 * Live System Telemetry, Mobile Hardware Metrics & Quick Status
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Smartphone, Database, HardDrive, Shield, Activity, 
  Wifi, Battery, Cpu, Layers, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Key
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
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getProfileBadgeStyle = (profile?: string) => {
    switch (profile) {
      case 'profile_c':
        return {
          bg: 'bg-purple-950/40 border-purple-800/60',
          text: 'text-purple-400',
          badge: 'bg-purple-900/60 text-purple-300 border-purple-700',
        };
      case 'profile_b':
        return {
          bg: 'bg-emerald-950/40 border-emerald-800/60',
          text: 'text-emerald-400',
          badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
        };
      case 'profile_a':
        return {
          bg: 'bg-amber-950/40 border-amber-800/60',
          text: 'text-amber-400',
          badge: 'bg-amber-900/60 text-amber-300 border-amber-700',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800',
          text: 'text-slate-400',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const profileStyle = getProfileBadgeStyle(status?.profile);

  return (
    <div className="space-y-6">
      {/* Alert if no admin is set up */}
      {status && !status.hasAdmin && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/80 to-amber-900/40 border border-amber-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-200">First-Run Setup Required</h4>
              <p className="text-xs text-amber-300/80">
                An administrator account has not been initialized yet. Use your local bootstrap token to claim control.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenBootstrap}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            Claim Admin Account
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Device & Profile */}
        <div className={`p-4 rounded-xl border ${profileStyle.bg} relative overflow-hidden`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Device Profile</span>
            <Smartphone className={`w-4 h-4 ${profileStyle.text}`} />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-100 tracking-tight">
              {status?.profileName || 'Detecting...'}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {status?.device.arch} • {status?.device.cpuCores} Cores • API {status?.device.androidApiLevel || 'N/A'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${profileStyle.badge}`}>
              {status?.profile?.toUpperCase()}
            </span>
            <span className="text-slate-400">
              {status?.device.isTermux ? 'Termux Android' : 'POSIX Host'}
            </span>
          </div>
        </div>

        {/* Database Stats */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Database Engine</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-100 tracking-tight">
              {status?.dbStats.recordCount ?? 0} <span className="text-xs font-normal text-slate-400">Records</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Across {status?.dbStats.tableCount ?? 0} schemas & tables
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">
              Disk: {formatBytes(status?.dbStats.sizeBytes ?? 0)}
            </span>
            <button
              onClick={() => onNavigate('database')}
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 text-[11px]"
            >
              Browse <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* File Storage */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Private Storage</span>
            <HardDrive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-100 tracking-tight">
              {status?.storageStats.totalFiles ?? 0} <span className="text-xs font-normal text-slate-400">Files</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatBytes(status?.storageStats.totalSizeBytes ?? 0)} stored privately
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Executable Guard Active</span>
            <button
              onClick={() => onNavigate('storage')}
              className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 text-[11px]"
            >
              Files <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* System Memory & Heap */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">RAM & V8 Heap</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-slate-100 tracking-tight">
              {status?.device.freeMemoryMb ?? 0} MB <span className="text-xs font-normal text-slate-400">Free</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Total: {status?.device.totalMemoryMb ?? 0} MB • Heap Limit: {status?.device.heapLimitMb ?? 256} MB
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (((status?.device.totalMemoryMb || 1000) - (status?.device.freeMemoryMb || 500)) /
                        (status?.device.totalMemoryMb || 1000)) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
            <span className="text-slate-400 text-[11px]">Safe mobile bound</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Architecture & Profile Breakdown + LAN Connectivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Feature Matrix */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Active Profile: {report?.profileDetails.name || status?.profileName}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {report?.profileDetails.description || 'Target profile based on hardware verification.'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('diagnostics')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1"
            >
              Full Inspection <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Enabled Features */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Enabled Capabilities
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {report?.profileDetails.enabledFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Platform Constraints & Disabled Features */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Disabled / Restricted
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {report?.profileDetails.disabledFeatures.length ? (
                  report.profileDetails.disabledFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      <span>{feat}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-500 italic">No restrictions active. All tier features enabled.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Android Background Wakelock reminder */}
          <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Battery className="w-4 h-4 text-emerald-400" />
              <span>Android Wake-Lock Status:</span>
              <span className="font-mono text-emerald-400">
                {report?.checks.find((c) => c.id === 'background_wakelock')?.value || 'Active'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('network')}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Power Setup Guide
            </button>
          </div>
        </div>

        {/* Quick Remote Access Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span>LAN Access URL</span>
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Port {status?.device ? 3000 : 3000}
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Connect computers, tablets, or other phones on the same local Wi-Fi network:
            </p>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 break-all select-all">
              {status?.network.lan || status?.network.local || 'http://127.0.0.1:3000'}
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Restricted to your private Wi-Fi network.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Encrypted SSH tunnel available for remote work.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => onNavigate('network')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              Pairing QR & SSH Tunnel <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRefresh}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Security & Audit Events */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Recent Audit Logs & Security Events</span>
          </h3>
          <span className="text-xs text-slate-500">Flash-Safe Auto-Rotating</span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No audit records logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">User</th>
                  <th className="pb-2">IP Address</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.slice(0, 5).map((log) => (
                  <tr key={log.id} className="text-slate-300">
                    <td className="py-2 text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 font-medium text-slate-200">{log.action}</td>
                    <td className="py-2 text-slate-400">{log.username || 'system'}</td>
                    <td className="py-2 text-slate-500">{log.ip}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          log.status === 'success'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
