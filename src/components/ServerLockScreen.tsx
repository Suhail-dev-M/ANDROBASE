/**
 * AndroBase - Complete Home Server Management Platform
 * Server Lock Screen / Authentication Access Gate
 * Enforces authentication on every visit when username & password are set.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, User as UserIcon, LogIn, Eye, EyeOff, AlertCircle, ShieldCheck, Sparkles, Cpu, Wifi } from 'lucide-react';
import { ApiClient } from '../api.ts';
import { User, ServerStatusResponse } from '../types.ts';

interface ServerLockScreenProps {
  status: ServerStatusResponse | null;
  onSuccess: (user: User) => void;
  onOpenBootstrap: () => void;
}

export const ServerLockScreen: React.FC<ServerLockScreenProps> = ({
  status,
  onSuccess,
  onOpenBootstrap,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.login(identifier.trim(), password);
      ApiClient.setAuth(res.token, res.user, rememberMe);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const primaryIp = status?.network?.lan || status?.network?.local || '127.0.0.1';
  const cleanIp = primaryIp.replace(/^https?:\/\//, '');

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="max-w-md w-full relative">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-[#0E1526] border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl">
          {/* Header Icon & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Home Server Locked
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Administrator credentials required. Every visit to this server requires authentication.
            </p>
          </div>

          {/* Quick host info pill */}
          <div className="mb-6 p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{cleanIp}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>{status?.profileName?.split('—')[0]?.trim() || 'Profile A'}</span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-cute-fade">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Username or Email</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/90 border border-white/[0.1] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/90 border border-white/[0.1] rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="lockRememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded bg-slate-950 border border-white/[0.2] text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="lockRememberMe" className="text-[11px] text-slate-400 cursor-pointer select-none leading-tight">
                Remember me on this browser <span className="text-slate-500 block text-[10px]">(Leave unchecked to require login on every visit)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Verifying Credentials...' : 'Unlock & Access Server'}</span>
            </button>
          </form>

          {/* Quick help & bootstrap link */}
          <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-[11px] text-slate-500 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Protected by PBKDF2 &amp; Rate-Limiting Lockout</span>
            </div>
            {status && !status.hasAdmin && (
              <button
                type="button"
                onClick={onOpenBootstrap}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Initialize admin account with token</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
