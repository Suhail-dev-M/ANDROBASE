/**
 * AndroBase - Backups, Integrity Verification & Safe Restore Tab
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Archive, Download, RotateCcw, ShieldCheck, CheckCircle2, 
  AlertCircle, RefreshCw, FileText, Check, Copy
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-200">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-slate-400 hover:text-slate-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Archive className="w-4 h-4 text-emerald-400" />
            <span>Automated Snapshot & Disaster Recovery</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Atomic database snapshots with SHA-256 integrity verification. Every restore operation automatically creates a safety rollback point before replacing data.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadBackups}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title="Refresh Backups"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {creating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Capturing Snapshot...</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Create Snapshot Backup</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backup Roster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Stored Snapshot Archives ({backups.length})
        </h4>

        {backups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <Archive className="w-8 h-8 mb-2 mx-auto text-slate-600" />
            <p>No snapshot backups found.</p>
            <button
              onClick={handleCreateBackup}
              className="mt-2 text-emerald-400 hover:underline"
            >
              Generate an initial snapshot now
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/40">
                <tr>
                  <th className="py-2.5 px-3">Filename / Date</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Tables</th>
                  <th className="py-2.5 px-3">Files</th>
                  <th className="py-2.5 px-3">SHA-256 Digest</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2.5 px-3">
                      <p className="font-sans font-medium text-slate-200">{b.filename}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(b.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{formatBytes(b.sizeBytes)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{b.tablesCount} tables</td>
                    <td className="py-2.5 px-3 text-slate-400">{b.filesCount} files</td>
                    <td className="py-2.5 px-3 text-slate-500 truncate max-w-[140px]" title={b.sha256}>
                      {b.sha256.substring(0, 16)}...
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/v1/backup/download/${b.filename}`}
                          download={b.filename}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-xs flex items-center gap-1 transition-colors"
                          title="Download Backup"
                        >
                          <Download className="w-3 h-3 text-cyan-400" />
                          <span>Export</span>
                        </a>
                        <button
                          onClick={() => setRestoreConfirmFile(b.filename)}
                          className="px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 font-sans text-xs flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl text-slate-100">
            <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Confirm Database Restoration</span>
            </h3>
            <p className="text-xs text-slate-300 mt-2">
              Are you sure you want to restore from:
            </p>
            <p className="text-xs font-mono bg-slate-950 p-2 rounded border border-slate-800 text-amber-400 my-2">
              {restoreConfirmFile}
            </p>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Rollback Protection Active
              </p>
              <p>
                An automatic pre-restore safety snapshot will be taken immediately prior to restore. If any error occurs, the server will safely revert.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRestoreConfirmFile(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleRestore}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Yes, Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
