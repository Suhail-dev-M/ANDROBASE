/**
 * AndroBase - Backups, Integrity Verification & Safe Restore Tab
 * Cute, Modern & Production-Quality Disaster Recovery Dashboard
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Archive, Download, RotateCcw, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, Copy, Check, Search, Database, FileText,
  Clock, HardDrive, Sparkles
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { BackupItem } from '../types.ts';

export const BackupsTab: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await ApiClient.listBackups();
      setBackups(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const item = await ApiClient.createBackup();
      setSuccess(`Snapshot backup "${item.filename}" created with verified SHA-256.`);
      loadBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreConfirmFile) return;
    setRestoring(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await ApiClient.restoreBackup(restoreConfirmFile);
      setSuccess(res.message);
      setRestoreConfirmFile(null);
      loadBackups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRestoring(false);
    }
  };

  const copySha = (sha: string, id: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(id);
    setTimeout(() => setCopiedSha(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredBackups = backups.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return b.filename.toLowerCase().includes(q) || b.sha256.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {error && (
        <div className="cute-card p-4 bg-rose-950/40 border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-cute-fade">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-rose-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="cute-card p-4 bg-emerald-950/40 border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-cute-fade">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded bg-emerald-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="cute-card p-5 sm:p-6 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-emerald-950/20 border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Archive className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Snapshots & Disaster Recovery
            </h2>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Verified
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
            Atomic snapshot backups that capture your tables, records, and files. Restoring any backup creates a guaranteed pre-restore safety checkpoint first.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={loadBackups}
            disabled={loading}
            className="cute-pill-btn p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs border border-slate-700/80 transition-all active:scale-95"
            title="Refresh Backups"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="cute-pill-btn px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Capturing Snapshot...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Snapshot Backup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Snapshot Archives List */}
      <div className="cute-card p-5 sm:p-6 bg-slate-900/60 border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-400" />
              <span>Stored Snapshot Archives</span>
              <span className="text-xs font-mono text-slate-400 font-normal">({backups.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Immutable point-in-time state packages</p>
          </div>

          {backups.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search snapshots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
              />
            </div>
          )}
        </div>

        {backups.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Archive className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">No Snapshots Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              Protect your database and uploaded assets against accidental changes by generating your first backup.
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={creating}
              className="cute-pill-btn px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Capture First Snapshot</span>
            </button>
          </div>
        ) : filteredBackups.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No snapshots match "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/40">
                <tr>
                  <th className="py-3 px-3">Archive Filename</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Payload Content</th>
                  <th className="py-3 px-3">SHA-256 Digest</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredBackups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 text-slate-300 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-slate-800 text-emerald-400">
                          <Archive className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <p className="font-sans font-semibold text-slate-100">{b.filename}</p>
                          <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(b.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-200 tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        {formatBytes(b.sizeBytes)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-sans">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-purple-300">
                          <Database className="w-3 h-3" /> {b.tablesCount} tables
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-cyan-300">
                          <FileText className="w-3 h-3" /> {b.filesCount} files
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 truncate max-w-[120px]" title={b.sha256}>
                          {b.sha256.substring(0, 12)}...
                        </span>
                        <button
                          onClick={() => copySha(b.sha256, b.id)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Copy Full SHA-256"
                        >
                          {copiedSha === b.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/v1/backup/download/${b.filename}`}
                          download={b.filename}
                          className="cute-pill-btn px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
                          title="Download Snapshot to PC/Device"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Export</span>
                        </a>

                        <button
                          onClick={() => setRestoreConfirmFile(b.filename)}
                          className="cute-pill-btn px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                          title="Restore Database from Snapshot"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Restore */}
      {restoreConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-cute-fade">
          <div className="cute-card bg-slate-900 border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <RotateCcw className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100">Confirm Database Restoration</h3>
                <p className="text-xs text-slate-400">Point-in-time rollback protection</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to restore the entire database state from this snapshot?
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 break-all">
              {restoreConfirmFile}
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 space-y-1">
              <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Automatic Pre-Restore Rollback Guarantee
              </p>
              <p className="text-[11px] leading-relaxed">
                Before overwriting any tables, the server will capture an automatic checkpoint snapshot. If restoration encounters any error, your current data will remain completely intact.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setRestoreConfirmFile(null)}
                className="cute-pill-btn px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleRestore}
                className="cute-pill-btn px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 shadow-md transition-all active:scale-95"
              >
                {restoring ? 'Restoring Snapshot...' : 'Yes, Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
