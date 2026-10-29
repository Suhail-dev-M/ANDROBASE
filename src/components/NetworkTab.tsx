/**
 * AndroBase - LAN Remote Access, Pairing QR & SSH Tunnel Guide Tab
 * Cute, Modern & Production-Quality Network Connectivity Hub
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, Terminal, Shield, Copy, Check, QrCode, 
  Smartphone, Battery, AlertTriangle, ExternalLink, RefreshCw,
  Usb, Laptop, Cable, Globe
} from 'lucide-react';
import { ApiClient } from '../api.ts';

export const NetworkTab: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState<{
    interfaces: any[];
    urls: { local: string; lan: string | null; allLanUrls: string[] };
    sshGuide: any;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [sshClientTab, setSshClientTab] = useState<'nix' | 'win' | 'adb' | 'termux'>('nix');

  const loadNetwork = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.getNetworkInfo();
      setNetworkInfo(data);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const primaryUrl = networkInfo?.urls.lan || networkInfo?.urls.local || 'http://127.0.0.1:3000';
  const cleanIp = primaryUrl.replace('http://', '').replace('https://', '').split(':')[0] || '192.168.1.100';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="cute-card p-5 sm:p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/20 border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wifi className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              LAN Access & Remote Pairing Hub
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Port 3000 Open
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Connect any computer, tablet, or phone on your local Wi-Fi to this mobile server. Or tunnel securely through encrypted SSH and ADB.
          </p>
        </div>

        <button
          onClick={loadNetwork}
          disabled={loading}
          className="cute-pill-btn px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700/80 transition-all shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Scanning...' : 'Refresh Interfaces'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pairing URL & Cute QR Visualizer */}
        <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Instant Phone Pairing
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
              Wi-Fi Online
            </span>
          </div>

          {/* Cute Styled QR Frame */}
          <div className="p-4 bg-white rounded-2xl shadow-xl inline-block transition-transform hover:scale-105 duration-200">
            <div className="w-36 h-36 border-2 border-slate-900 rounded-xl flex flex-col items-center justify-center p-2 relative bg-slate-50">
              <QrCode className="w-20 h-20 text-slate-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="p-1 rounded-md bg-white border border-slate-300 shadow-sm text-base">
                  🤖
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-900 mt-1 font-mono tracking-wider">
                PORT 3000
              </span>
            </div>
          </div>

          <div className="w-full space-y-2 text-left">
            <p className="text-xs text-slate-400 text-center">
              Scan with smartphone camera or open in your browser:
            </p>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400 flex items-center justify-between gap-2">
              <span className="truncate">{primaryUrl}</span>
              <button
                onClick={() => handleCopy(primaryUrl, 'url')}
                className="p-1.5 hover:text-slate-100 text-slate-400 transition-colors shrink-0"
                title="Copy Primary URL"
              >
                {copiedCmd === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {networkInfo?.urls.lan && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>LAN Host: <code className="text-slate-300 font-mono">{cleanIp}</code></span>
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Open URL</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* SSH Port Forwarding & ADB Tunnel Guide */}
        <div className="lg:col-span-2 cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Encrypted Tunnel & Remote Forwarding</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">End-to-end encrypted connection from your PC</p>
            </div>

            {/* Client Tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80 text-xs">
              <button
                onClick={() => setSshClientTab('nix')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  sshClientTab === 'nix' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mac / Linux
              </button>
              <button
                onClick={() => setSshClientTab('win')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  sshClientTab === 'win' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Windows
              </button>
              <button
                onClick={() => setSshClientTab('adb')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  sshClientTab === 'adb' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                USB Cable (ADB)
              </button>
            </div>
          </div>

          {/* Active Tab Content */}
          {sshClientTab === 'nix' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  Terminal Command (macOS &amp; Linux):
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      networkInfo?.sshGuide?.commandLinuxMac ||
                        `ssh -N -L 3000:localhost:3000 -p 8022 u0_a...@${cleanIp}`,
                      'ssh_nix'
                    )
                  }
                  className="cute-pill-btn text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCmd === 'ssh_nix' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Command</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                {networkInfo?.sshGuide?.commandLinuxMac ||
                  `ssh -N -L 3000:localhost:3000 -p 8022 <termux_user>@${cleanIp}`}
              </pre>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Creates an encrypted local tunnel. Once connected, open <code className="text-emerald-400 font-mono">http://localhost:3000</code> in your computer browser.
              </p>
            </div>
          )}

          {sshClientTab === 'win' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Windows PowerShell Command:
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      networkInfo?.sshGuide?.commandWindowsPowershell ||
                        `ssh -N -L 3000:localhost:3000 -p 8022 <user>@${cleanIp}`,
                      'ssh_win'
                    )
                  }
                  className="cute-pill-btn text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCmd === 'ssh_win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Command</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                {networkInfo?.sshGuide?.commandWindowsPowershell ||
                  `ssh -N -L 3000:localhost:3000 -p 8022 <termux_user>@${cleanIp}`}
              </pre>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Paste directly into PowerShell or Windows Terminal without needing any third-party clients.
              </p>
            </div>
          )}

          {sshClientTab === 'adb' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-medium flex items-center gap-1.5">
                  <Usb className="w-3.5 h-3.5 text-purple-400" />
                  USB Tethering &amp; ADB Port Forwarding:
                </span>
                <button
                  onClick={() => handleCopy('adb forward tcp:3000 tcp:3000', 'adb')}
                  className="cute-pill-btn text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 transition-colors"
                >
                  {copiedCmd === 'adb' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Command</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                adb forward tcp:3000 tcp:3000
              </pre>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                No Wi-Fi needed! Plug your phone into your laptop via USB with USB Debugging enabled, run the ADB command above, and open <code className="text-emerald-400 font-mono">http://localhost:3000</code>.
              </p>
            </div>
          )}

          {/* Trust notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              When traveling or connected to coffee shop Wi-Fi, SSH tunneling ensures your database requests, tokens, and file transfers are fully encrypted.
            </span>
          </div>
        </div>
      </div>

      {/* Detected Host Network Interfaces */}
      <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span>Detected Host Network Interfaces</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                ({networkInfo?.interfaces.length || 0})
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Physical and virtual network adapters on this smartphone</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(networkInfo?.interfaces || [
            { name: 'wlan0', type: 'lan', address: cleanIp, internal: false },
            { name: 'lo', type: 'loopback', address: '127.0.0.1', internal: true }
          ]).map((iface, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 font-mono">{iface.name}</span>
                <span
                  className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-mono font-bold ${
                    iface.type === 'lan'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : iface.type === 'hotspot'
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {iface.type}
                </span>
              </div>
              <p className="font-mono text-slate-300 text-xs font-semibold">{iface.address}</p>
              <p className="text-[10px] text-slate-400 font-sans">
                {iface.internal ? 'Internal Loopback (Device Only)' : 'Reachable over Local Network'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Android Wakelock & Battery Bypass Checklist */}
      <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Battery className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Android 24/7 Availability Checklist
            </h3>
            <p className="text-xs text-slate-400">Prevent OS task killer from sleeping your server</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">1. Acquire CPU Wakelock</span>
              <button
                onClick={() => handleCopy('termux-wake-lock', 'wklock')}
                className="text-slate-400 hover:text-emerald-400 transition-colors"
                title="Copy Command"
              >
                {copiedCmd === 'wklock' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Keeps phone CPU running even when screen is locked or turned off.
            </p>
            <code className="inline-block text-[11px] text-emerald-300 font-mono bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
              termux-wake-lock
            </code>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <span className="font-bold text-emerald-400 block">2. Battery Optimization</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Navigate to <strong>Settings &gt; Apps &gt; Termux &gt; Battery</strong> and set to <strong>Unrestricted / Do not optimize</strong>.
            </p>
            <span className="inline-block text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Prevents Android Doze kill
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <span className="font-bold text-emerald-400 block">3. Portable Hotspot Mode</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              If no Wi-Fi router is nearby, turn on Android Personal Hotspot and connect your laptop to the phone directly via <code className="text-cyan-400 font-mono">192.168.43.1:3000</code>.
            </p>
            <span className="inline-block text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Offline field operations
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
