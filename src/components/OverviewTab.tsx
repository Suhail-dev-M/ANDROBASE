import React, { useState, useEffect } from 'react';
import {
  Smartphone, Database, HardDrive, ShieldCheck, Activity,
  Wifi, Sparkles, Cpu, Layers, CheckCircle2, AlertTriangle,
  ArrowRight, RefreshCw, Key, Copy, Check, UploadCloud,
  Plus, Archive, ExternalLink, Zap, Battery, Thermometer,
  Clock, ArrowUpRight, ArrowDownLeft, Network
} from 'lucide-react';
import { ServerStatusResponse, CompatibilityReport, AuditLog, LiveSystemMetrics } from '../types.ts';
import { ApiClient } from '../api.ts';

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
  const [liveMetrics, setLiveMetrics] = useState<LiveSystemMetrics | null>(null);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(5);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const fetchLiveMetrics = async () => {
    try {
      const data = await ApiClient.getLiveMetrics();
      setLiveMetrics(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    if (isPaused || refreshIntervalSec <= 0) return;
    const timer = setInterval(() => {
      fetchLiveMetrics();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(timer);
  }, [refreshIntervalSec, isPaused]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatRate = (bytesPerSec: number) => {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const copyLanUrl = () => {
    const url = status?.network.lan || 'http://127.0.0.1:3000';
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLan(true);
      setTimeout(() => setCopiedLan(false), 2000);
    }).catch(() => {});
  };

  const cpuPercent = liveMetrics?.cpu.usagePercent ?? 0;
  const memTotal = liveMetrics?.memory.totalMb ?? report?.device.totalMemoryMb ?? 1;
  const memUsed = liveMetrics?.memory.usedMb ?? (memTotal - (report?.device.freeMemoryMb ?? 0));
  const memPercent = liveMetrics?.memory.usagePercent ?? Math.min(100, Math.round((memUsed / memTotal) * 100));

  const storagePercent = liveMetrics?.storage.usagePercent ?? 0;
  const storageTotal = liveMetrics?.storage.totalBytes ?? 0;
  const storageUsed = liveMetrics?.storage.usedBytes ?? 0;

  // History for charts
  const history = liveMetrics?.history || [];

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
                    Welcome to AndroBase Home Server
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Admin Bootstrap Required
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
                  Your server is up and listening. An administrator account is required to protect your private database, applications, and files.
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-amber-300 font-mono">
                  <span>Retrieve bootstrap token:</span>
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
                    Server Online & Operational
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Protected & Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Accessible on your local area network. Access management, file hosting, and database modules from any device.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Telemetry Refresh Controls */}
              <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={isPaused ? -1 : refreshIntervalSec}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val === -1) {
                      setIsPaused(true);
                    } else {
                      setIsPaused(false);
                      setRefreshIntervalSec(val);
                    }
                  }}
                  className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
                >
                  <option value={2}>Refresh: 2s</option>
                  <option value={5}>Refresh: 5s</option>
                  <option value={10}>Refresh: 10s</option>
                  <option value={30}>Refresh: 30s</option>
                  <option value={-1}>Paused</option>
                </select>
              </div>

              <button
                onClick={copyLanUrl}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl border border-white/[0.08] transition-all flex items-center justify-center gap-2"
                title="Copy LAN address"
              >
                {copiedLan ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLan ? 'Copied' : 'Copy LAN URL'}</span>
              </button>

              <button
                onClick={() => {
                  onRefresh();
                  fetchLiveMetrics();
                }}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-white/[0.08] transition-colors"
                title="Refresh telemetry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Core Telemetry Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Processor (CPU)</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-1.5 font-mono">
                <span>{cpuPercent}%</span>
                <span className="text-xs font-normal text-slate-400">utilization</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {liveMetrics?.cpu.cores ?? status?.device.cpuCores ?? 4} Cores • {liveMetrics?.cpu.model || status?.device.arch || 'ARM'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(2, cpuPercent))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
              <span>Load: {liveMetrics?.cpu.loadAverage?.map((l) => l.toFixed(2)).join(', ') || '0.00'}</span>
              {liveMetrics?.environment.cpuTempC && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Thermometer className="w-3 h-3" />
                  {liveMetrics.environment.cpuTempC}°C
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RAM Usage */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">System Memory (RAM)</span>
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-1.5 font-mono">
                <span>{memPercent}%</span>
                <span className="text-xs font-normal text-slate-400">allocated</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {memUsed} MB used / {memTotal} MB total
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${memPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
              Free: {memTotal - memUsed} MB available
            </p>
          </div>
        </div>

        {/* Storage Drives */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Storage Drives</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-1.5 font-mono">
                <span>{storagePercent}%</span>
                <span className="text-xs font-normal text-slate-400">disk space</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatBytes(storageUsed)} used of {formatBytes(storageTotal || 10737418240)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
              {liveMetrics?.storage.drives?.length ?? 1} drive(s) mounted
            </p>
          </div>
        </div>

        {/* Network & Battery */}
        <div className="cute-card p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Network & Health</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Network className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs space-y-1 font-mono">
                <div className="flex items-center justify-between text-emerald-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> RX Speed
                  </span>
                  <span>{formatRate(liveMetrics?.network.bandwidth.rxRateBytesPerSec ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between text-cyan-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ArrowUpRight className="w-3.5 h-3.5" /> TX Speed
                  </span>
                  <span>{formatRate(liveMetrics?.network.bandwidth.txRateBytesPerSec ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
            {liveMetrics?.environment.battery?.level !== undefined ? (
              <span className="flex items-center gap-1.5 text-slate-300">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                {liveMetrics.environment.battery.level}% {liveMetrics.environment.battery.isCharging ? '⚡' : ''}
              </span>
            ) : (
              <span>Ports: {liveMetrics?.network.listeningPortsCount ?? 0}</span>
            )}
            <span className="truncate max-w-[110px] text-slate-500">
              Uptime: {Math.floor((status?.uptimeSeconds || 0) / 60)}m
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Historical Resource Usage Chart */}
      {history.length > 1 && (
        <div className="cute-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Live Resource Utilization History</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Rolling real-time 30-sample history (CPU load and Memory allocation)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                CPU ({cpuPercent}%)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                RAM ({memPercent}%)
              </span>
            </div>
          </div>

          {/* SVG Line Graph */}
          <div className="h-32 w-full relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="25" x2="500" y2="25" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeDasharray="4" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="4" />

              {/* CPU Line */}
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={history
                  .map((h, idx) => {
                    const x = (idx / (history.length - 1)) * 500;
                    const y = 100 - (h.cpuPercent / 100) * 90 - 5;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* RAM Line */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={history
                  .map((h, idx) => {
                    const x = (idx / (history.length - 1)) * 500;
                    const y = 100 - (h.ramPercent / 100) * 90 - 5;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            </svg>
          </div>
        </div>
      )}

      {/* 4. Multi-Drive Storage Breakdown */}
      {liveMetrics?.storage.drives && liveMetrics.storage.drives.length > 0 && (
        <div className="cute-card p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>Mounted Drives & Partitions</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {liveMetrics.storage.drives.map((drive, idx) => (
              <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-200 font-bold truncate max-w-[160px]">
                    {drive.mountPoint}
                  </span>
                  <span className="font-mono text-amber-400 font-bold">{drive.usedPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${drive.usedPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1.5">
                  <span>{formatBytes(drive.usedBytes)} used</span>
                  <span>{formatBytes(drive.totalBytes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Quick Navigation Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('files')}
          className="p-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/30 rounded-2xl text-left transition-all group"
        >
          <HardDrive className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-white">File Manager</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Browse & upload files</p>
        </button>

        <button
          onClick={() => onNavigate('apps')}
          className="p-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/30 rounded-2xl text-left transition-all group"
        >
          <Layers className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-white">App Hosting</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Node, Python & Static</p>
        </button>

        <button
          onClick={() => onNavigate('database')}
          className="p-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-teal-500/30 rounded-2xl text-left transition-all group"
        >
          <Database className="w-5 h-5 text-teal-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-white">Database Hub</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">PostgreSQL, SQLite, WAL</p>
        </button>

        <button
          onClick={() => onNavigate('security')}
          className="p-4 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-emerald-500/30 rounded-2xl text-left transition-all group"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
          <h4 className="text-xs font-bold text-white">Security Centre</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Sessions & audit score</p>
        </button>
      </div>
    </div>
  );
};
