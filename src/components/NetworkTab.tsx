/**
 * AndroBase - LAN Remote Access, Pairing QR & SSH Tunnel Guide Tab
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, Terminal, Shield, Copy, Check, QrCode, 
  Smartphone, Battery, AlertTriangle, ExternalLink, RefreshCw 
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400" />
            <span>Local Network Access & Device Pairing</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Access your phone's database and dashboard from your laptop or PC on the same Wi-Fi network, or establish an encrypted SSH tunnel.
          </p>
        </div>

        <button
          onClick={loadNetwork}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors shrink-0"
          title="Refresh Network Interfaces"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pairing URL & QR Code */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Pairing URL
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              LAN Active
            </span>
          </div>

          {/* SVG QR Code Simulation for instant visual pairing */}
          <div className="p-3 bg-white rounded-xl shadow-lg inline-block">
            <div className="w-36 h-36 border-2 border-slate-900 flex flex-col items-center justify-center p-2 relative">
              <QrCode className="w-24 h-24 text-slate-900" />
              <span className="text-[9px] font-bold text-slate-900 mt-1 font-mono">PORT 3000</span>
            </div>
          </div>

          <div className="w-full">
            <p className="text-xs text-slate-400 mb-1.5">Open in any browser on the same Wi-Fi:</p>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-400 flex items-center justify-between">
              <span className="truncate">{primaryUrl}</span>
              <button
                onClick={() => handleCopy(primaryUrl, 'url')}
                className="p-1 hover:text-slate-100 text-slate-400"
                title="Copy URL"
              >
                {copiedCmd === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* SSH Port Forwarding Guide (Security Best Practice) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Encrypted SSH Port Forwarding (Recommended for Public Wi-Fi)</span>
            </h4>
          </div>

          <p className="text-xs text-slate-400">
            Plain HTTP on untrusted networks exposes credentials. You can tunnel port 3000 securely over SSH from your laptop:
          </p>

          <div className="space-y-3 text-xs">
            {/* Linux & macOS Command */}
            <div>
              <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                <span>Linux & macOS Terminal:</span>
                <button
                  onClick={() => handleCopy(networkInfo?.sshGuide?.commandLinuxMac || 'ssh -N -L 3000:localhost:3000 ...', 'ssh_nix')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
                >
                  {copiedCmd === 'ssh_nix' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                {networkInfo?.sshGuide?.commandLinuxMac || `ssh -N -L 3000:localhost:3000 -p 8022 u0_a... @${networkInfo?.urls.lan?.replace('http://', '').split(':')[0] || '192.168.1.100'}`}
              </pre>
            </div>

            {/* Windows PowerShell Command */}
            <div>
              <div className="flex items-center justify-between text-slate-300 font-medium mb-1">
                <span>Windows PowerShell:</span>
                <button
                  onClick={() => handleCopy(networkInfo?.sshGuide?.commandWindowsPowershell || 'ssh -N -L 3000:localhost:3000 ...', 'ssh_win')}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
                >
                  {copiedCmd === 'ssh_win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                {networkInfo?.sshGuide?.commandWindowsPowershell || `ssh -N -L 3000:localhost:3000 -p 8022 <termux_user>@${networkInfo?.urls.lan?.replace('http://', '').split(':')[0] || '192.168.1.100'}`}
              </pre>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Once active, navigate to <code className="text-emerald-400 font-mono">http://localhost:3000</code> in your laptop browser. All communications will be end-to-end encrypted through your Termux OpenSSH daemon.
            </span>
          </div>
        </div>
      </div>

      {/* Detected Network Interfaces */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Detected Host Network Interfaces ({networkInfo?.interfaces.length || 0})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {networkInfo?.interfaces.map((iface, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 font-mono">{iface.name}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${
                    iface.type === 'lan'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : iface.type === 'hotspot'
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {iface.type}
                </span>
              </div>
              <p className="font-mono text-slate-400 text-[11px]">{iface.address}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {iface.internal ? 'Internal Loopback' : 'Network Reachable'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Android Wakelock & Battery Bypass Checklist */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider">
          <Battery className="w-4 h-4 text-emerald-400" />
          <span>Android Sleep Prevention Checklist (Crucial for 24/7 Availability)</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">1. Acquire Wakelock</span>
            <p className="text-slate-400 text-[11px] mb-2">Keeps the phone CPU running even when the screen shuts off.</p>
            <code className="text-[11px] text-emerald-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">termux-wake-lock</code>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">2. Disable Battery Optimization</span>
            <p className="text-slate-400 text-[11px]">
              Settings &gt; Apps &gt; Termux &gt; Battery &gt; Set to <strong>Unrestricted</strong>.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-1">3. Wi-Fi Hotspot Mode</span>
            <p className="text-slate-400 text-[11px]">
              If no router is available, turn on Portable Hotspot and access via <code className="text-cyan-400 font-mono">192.168.43.1:3000</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
