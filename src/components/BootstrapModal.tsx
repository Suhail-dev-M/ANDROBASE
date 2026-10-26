/**
 * AndroBase - Initial Administrator Bootstrap Modal
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Key, ShieldAlert, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Initialize Administrator</h3>
            <p className="text-xs text-slate-400">First-run secure local setup</p>
          </div>
        </div>

        <div className="p-3 mb-4 rounded-lg bg-amber-950/40 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Local-Only Security Requirement</p>
            <p className="text-amber-300/80 mt-0.5">
              To prevent unauthorized remote takeover over LAN, entering the local bootstrap token generated in your Termux console or <code className="bg-amber-950 px-1 py-0.5 rounded text-[11px]">.bootstrap_token</code> file is strictly required.
            </p>
          </div>
        </div>

        {hintToken && (
          <div className="mb-4 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400">Local Console Token: </span>
              <code className="text-emerald-400 font-mono font-semibold">{hintToken}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyHint}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-xs flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Filled' : 'Auto-fill'}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Local Bootstrap Token</label>
            <input
              type="text"
              required
              value={bootstrapToken}
              onChange={(e) => setBootstrapToken(e.target.value)}
              placeholder="e.g. 8x4b9a12c8e3..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Admin Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Admin Password (min. 8 characters)</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Bootstrapping...' : 'Complete Bootstrap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
