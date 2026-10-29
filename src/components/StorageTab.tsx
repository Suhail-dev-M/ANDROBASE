/**
 * AndroBase - Private File Storage Management Tab
 * Upload, Download, Metadata Verification & Executable Payload Guard
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, Upload, Download, Trash2, File, FileText, Image, 
  ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Lock, 
  Copy, Check, X, Sparkles, FolderDown
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { StoredFile } from '../types.ts';

export const StorageTab: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    try {
      const data = await ApiClient.listFiles();
      setFiles(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const stored = await ApiClient.uploadFile(selectedFile, description);
      setSuccessMsg(`File "${stored.originalName}" securely uploaded.`);
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string, name: string) => {
    if (!window.confirm(`Delete file "${name}" from mobile storage?`)) return;
    try {
      await ApiClient.deleteFile(fileId);
      loadFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyLink = (fileId: string) => {
    const url = `${window.location.origin}/api/v1/storage/${fileId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(fileId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image className="w-4 h-4 text-emerald-400" />;
    if (mime.includes('text') || mime.includes('json') || mime.includes('pdf')) {
      return <FileText className="w-4 h-4 text-cyan-400" />;
    }
    return <File className="w-4 h-4 text-indigo-400" />;
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const maxStorage = 20 * 1024 * 1024 * 1024; // 20GB safe cap
  const usedPercent = Math.min(100, Math.round((totalBytes / maxStorage) * 100));

  // Drag and drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner: Storage Guard Info */}
      <div className="cute-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-xl shrink-0">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Sandboxed Mobile Storage
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Safe &amp; Isolated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Files are stored outside web roots with SHA-256 integrity validation and strict path traversal guards. Executable binaries (.apk, .sh) are prohibited.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs font-mono shrink-0 bg-black/30 p-3 rounded-xl border border-white/[0.06]">
          <div>
            <span className="text-slate-500 text-[11px] block font-sans">Files Stored</span>
            <span className="text-white font-bold text-sm tabular-nums">{files.length}</span>
          </div>
          <div className="h-7 w-px bg-white/[0.08]" />
          <div>
            <span className="text-slate-500 text-[11px] block font-sans">Space Used</span>
            <span className="text-cyan-400 font-bold text-sm tabular-nums">{formatBytes(totalBytes)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upload Form Box */}
        <div className="cute-card p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 pb-2 border-b border-white/[0.06]">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload New File</span>
          </h4>

          <form onSubmit={handleUpload} className="space-y-4 text-xs">
            {/* Cute Drag & Drop Zone */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.02]'
                  : 'border-white/[0.12] hover:border-cyan-400/50 bg-black/20 hover:bg-black/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mx-auto mb-2.5">
                <FolderDown className="w-6 h-6 animate-cute-float" />
              </div>
              <p className="font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Tap or drop a file here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedFile ? `${formatBytes(selectedFile.size)} selected` : 'Images, JSON, PDFs, logs up to 20 MB'}
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Description / Tag (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Telemetry snapshot, report export"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Security Policy</span>
              </div>
              <p>• Max single file limit: 20 MB</p>
              <p>• Executable payloads (.apk, .sh, .dex) prohibited</p>
              <p>• Automatic SHA-256 fingerprinting on disk</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Streaming to phone...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload to Storage</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Files List / Explorer */}
        <div className="lg:col-span-2 cute-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>Stored Files ({files.length})</span>
              </h4>
              <button
                onClick={loadFiles}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/[0.08] transition-colors"
                title="Refresh Files"
                aria-label="Refresh files"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-slate-400 text-xs text-center p-6 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-2xl mb-2">
                  🗂️
                </div>
                <p className="font-semibold text-slate-300">No files stored on this device yet.</p>
                <p className="text-slate-500 text-[11px] mt-0.5">Use the upload box on the left to send your first file.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.08] bg-white/[0.02]">
                    <tr>
                      <th className="py-2.5 px-3.5">File Name</th>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-[11px]">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-white/[0.03] transition-colors text-slate-300">
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-800 shrink-0">
                              {getFileIcon(file.mimeType)}
                            </div>
                            <div className="truncate max-w-[220px]">
                              <p className="font-semibold text-white truncate">{file.originalName}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate" title={file.sha256}>
                                SHA: {file.sha256 ? file.sha256.substring(0, 12) + '...' : 'Verified'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-mono tabular-nums">{formatBytes(file.sizeBytes)}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono truncate max-w-[120px]">{file.mimeType}</td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopyLink(file.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              title="Copy URL"
                              aria-label="Copy file URL"
                            >
                              {copiedId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a
                              href={`/api/v1/storage/${file.id}`}
                              download={file.originalName}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors inline-block"
                              title="Download File"
                              aria-label="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDelete(file.id, file.originalName)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete File"
                              aria-label="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Storage Footer */}
          <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>
              Total: <strong className="text-white font-mono">{formatBytes(totalBytes)}</strong>
            </span>
            <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Storage Protected</span>
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
