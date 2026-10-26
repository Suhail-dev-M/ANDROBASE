/**
 * AndroBase - Top Navigation & Server Header
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Smartphone, ShieldCheck, Wifi, User as UserIcon, LogOut, LogIn, Key, Cpu } from 'lucide-react';
import { ServerStatusResponse, User } from '../types.ts';

interface HeaderProps {
  status: ServerStatusResponse | null;
  currentUser: User | null;
  onOpenLogin: () => void;
  onOpenBootstrap: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  currentUser,
  onOpenLogin,
  onOpenBootstrap,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getProfileBadgeColor = (profile?: string) => {
    switch (profile) {
      case 'profile_c':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/50';
      case 'profile_b':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
      case 'profile_a':
        return 'bg-amber-900/60 text-amber-300 border-amber-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'database', label: 'Database' },
    { id: 'storage', label: 'Storage' },
    { id: 'users', label: 'Users & Auth' },
    { id: 'diagnostics', label: 'Diagnostics' },
    { id: 'backups', label: 'Backups' },
    { id: 'network', label: 'LAN & Remote' },
    { id: 'api', label: 'API Explorer' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">AndroBase</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  v{status?.version || '1.0'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online ({formatUptime(status?.uptimeSeconds)})
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Open-Source Mobile Server Platform</p>
            </div>
          </div>

          {/* Quick Hardware Status Indicators */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            {status?.profile && (
              <div className={`px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 ${getProfileBadgeColor(status.profile)}`}>
                <Cpu className="w-3.5 h-3.5" />
                <span>{status.profileName || status.profile.toUpperCase()}</span>
              </div>
            )}

            {status?.network.lan && (
              <div className="px-2.5 py-1 rounded-md border border-slate-800 bg-slate-950 text-slate-300 font-mono flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>{status.network.lan.replace('http://', '')}</span>
              </div>
            )}
          </div>

          {/* Auth Controls */}
          <div className="flex items-center gap-3">
            {status && !status.hasAdmin && (
              <button
                onClick={onOpenBootstrap}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-sm shadow-amber-500/20"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Bootstrap Admin</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-slate-200">{currentUser.username}</p>
                  <span className="text-[10px] uppercase font-mono text-emerald-400">{currentUser.role}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
