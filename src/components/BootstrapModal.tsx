/**
 * AndroBase - Initial Administrator Bootstrap Modal
 * Delightful, accessible first-run setup with clear guidance and copy-paste support.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Key, ShieldAlert, CheckCircle2, AlertCircle, Copy, Check, Eye, EyeOff, Sparkles, X } from 'lucide-react';
import { ApiClient } from '../api.ts';
import { User } from '../types.ts';

interface BootstrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const BootstrapModal: React.FC<BootstrapModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@local.phone');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [bootstrapToken, setBootstrapToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hintToken, setHintToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      ApiClient.getBootstrapStatus()
        .then((res) => {
          if (res.bootstrapTokenLocation && !res.bootstrapTokenLocation.includes('/')) {
            setHintToken(res.bootstrapTokenLocation);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.bootstrapAdmin({
        username,
        email,
        password,
        bootstrapToken: bootstrapToken.trim(),
      });
      ApiClient.setAuth(res.token, res.user);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bootstrap initialization failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHint = () => {
    if (hintToken) {
      setBootstrapToken(hintToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#111827] border border-white/[0.1] rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-lg shrink-0 shadow-sm">
              ✨
            </div>
            <div>
              <h3 id="modal-title" className="text-base font-bold text-white tracking-tight">
                Initialize Admin Account
              </h3>
              <p className="text-xs text-slate-400">Your phone's private security key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security explanation note */}
        <div className="p-3 mb-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-semibold text-amber-200">How to get your Bootstrap Token:</p>
            <p className="text-amber-300/80 mt-0.5">
              Open Termux on your phone and run:
            </p>
            <code className="block mt-1 p-1 px-2 rounded bg-black/50 border border-amber-500/20 font-mono text-[11px] text-amber-200 select-all">
              cat ~/.androbase/.bootstrap_token
            </code>
          </div>
        </div>

        {hintToken && (
          <div className="mb-4 p-2.5 rounded-xl bg-slate-900 border border-white/[0.08] text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400">Local Console Token: </span>
              <code className="text-emerald-400 font-mono font-bold">{hintToken}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyHint}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Filled!' : 'Auto-fill'}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Bootstrap Token <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              required
              value={bootstrapToken}
              onChange={(e) => setBootstrapToken(e.target.value)}
              placeholder="e.g. 9kb8v6aj1tgmvuy4"
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Admin Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Admin Password <span className="text-slate-500 font-normal">(min. 8 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a strong password"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400 transition-colors"
              />
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

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Initializing...' : 'Claim Admin Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
