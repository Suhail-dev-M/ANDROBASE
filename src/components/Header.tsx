/**
 * AndroBase - Delightful, Premium Top Navigation Header
 * Modern 3-zone architecture with cute mascot, readable typography, and accessible touch targets.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sparkles, Key, LogIn, LogOut, Cpu, Wifi, Menu, X, 
  LayoutDashboard, Database, HardDrive, Users, Activity, 
  Archive, Globe, Terminal, ShieldCheck, Box, Clock, 
  Film, Layers, Sliders
} from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'files', label: 'File Manager', icon: HardDrive },
    { id: 'apps', label: 'App Hosting', icon: Layers },
    { id: 'database', label: 'Database Hub', icon: Database },
    { id: 'containers', label: 'Containers', icon: Box },
    { id: 'processes', label: 'Processes', icon: Cpu },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'tasks', label: 'Scheduler', icon: Clock },
    { id: 'media', label: 'Media', icon: Film },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'devtools', label: 'DevTools', icon: Terminal },
    { id: 'backups', label: 'Backups', icon: Archive },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'modules', label: 'Plugins', icon: Sliders },
  ];

  return (
    <header className="border-b border-white/[0.08] bg-[#090D16]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Cute Brand & Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-2.5 text-left group transition-transform active:scale-95"
            >
              {/* Playful Friendly Robot Phone Mascot Icon */}
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-300 p-0.5 shadow-md shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                <div className="w-full h-full bg-[#0E1526] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="text-lg select-none transform group-hover:scale-110 transition-transform">
                    🤖
                  </div>
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    AndroBase
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                    v{status?.version || '1.0'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  Your Phone, Your Private Cloud
                </p>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Quick Status Info */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            {status?.network.lan && (
              <div 
                title="Tap to view LAN details"
                onClick={() => setActiveTab('network')}
                className="cursor-pointer px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/[0.08] hover:border-cyan-500/30 text-slate-300 flex items-center gap-1.5 transition-all"
              >
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-[11px]">{status.network.lan.replace('http://', '')}</span>
              </div>
            )}

            {status?.profileName && (
              <div 
                onClick={() => setActiveTab('diagnostics')}
                className="cursor-pointer px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/[0.08] hover:border-emerald-500/30 text-slate-300 flex items-center gap-1.5 transition-all"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">{status.profileName.split('—')[0].trim()}</span>
              </div>
            )}

            <div className="px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
              <span className="text-[11px] font-medium font-mono tabular-nums">{formatUptime(status?.uptimeSeconds)}</span>
            </div>
          </div>

          {/* Zone 3: Actions & User Account */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Prominent Bootstrap Admin Button when no admin is set up yet */}
            {status && !status.hasAdmin && (
              <button
                onClick={onOpenBootstrap}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Set Up Admin</span>
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900/60 p-1 pl-2.5 rounded-xl border border-white/[0.08]">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white tracking-tight">{currentUser.username}</p>
                  <span className="text-[10px] text-emerald-400 font-medium capitalize flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {currentUser.role}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center uppercase shadow-sm">
                  {currentUser.username.charAt(0)}
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out of console"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/[0.1] hover:border-emerald-500/30 transition-all flex items-center gap-1.5 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile Navigation Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-white/[0.08] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Tab Navigation Bar / Lock Banner */}
        {status?.hasAdmin && !currentUser ? (
          <div className="hidden lg:flex items-center justify-between py-2 border-t border-white/[0.06] text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-slate-200 font-semibold">Server Locked</span>
              <span className="text-slate-600">•</span>
              <span>Authentication required on every visit. Sign in below with your username and password.</span>
            </div>
            <button
              onClick={onOpenLogin}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Unlock Console</span>
            </button>
          </div>
        ) : (
          <nav className="hidden lg:flex space-x-1.5 overflow-x-auto py-2.5 border-t border-white/[0.06] no-scrollbar">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[#0E1526] px-4 py-3 space-y-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          {status?.hasAdmin && !currentUser ? (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/[0.08] text-center space-y-2.5">
              <p className="text-xs font-bold text-white">Server Locked</p>
              <p className="text-[11px] text-slate-400">Authentication is required to access your home server modules.</p>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors"
              >
                Sign In to Unlock
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl text-left flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
          )}

          {status && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
              <span>Host: <strong className="text-slate-200 font-mono">{status.network.lan ? status.network.lan.replace('http://', '') : '127.0.0.1:3000'}</strong></span>
              <span>Uptime: <strong className="text-emerald-400 font-mono">{formatUptime(status.uptimeSeconds)}</strong></span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
