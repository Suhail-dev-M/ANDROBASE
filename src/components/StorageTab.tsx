/**
 * AndroBase - Private File Storage Management Tab
 * Upload, Download, Metadata Verification & Executable Payload Guard
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Upload, Download, Trash2, File, FileText, Image, 
  ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Lock
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const stored = await ApiClient.uploadFile(selectedFile, description);
      setSuccessMsg(`File "${stored.originalName}" securely uploaded.`);
      setSelectedFile(null);
      setDescription('');
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
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

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

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner: Storage Guard Info */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Private Mobile Filesystem Storage</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Sandboxed
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Files are isolated outside the public web root. Strict traversal guards prevent unauthorized directory access.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0">
          <div>
            <span className="text-slate-500">Total: </span>
            <span className="text-slate-200 font-semibold">{files.length} files</span>
          </div>
          <div>
            <span className="text-slate-500">Used: </span>
            <span className="text-cyan-400 font-semibold">{formatBytes(totalBytes)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload File</span>
          </h4>

          <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Select File</label>
              <input
                type="file"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Description / Tag (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. System report, backup export"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Security Protections</span>
              </div>
              <p>• Max single file limit: 20 MB</p>
              <p>• Dangerous binaries (.apk, .sh, .dex, .so) blocked</p>
              <p>• SHA-256 calculated on ingest</p>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading to phone...</span>
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

        {/* Files Roster */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stored Files ({files.length})
            </h4>
            <button
              onClick={loadFiles}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              title="Refresh Files"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs">
              <HardDrive className="w-8 h-8 mb-2 text-slate-600" />
              <p>No files uploaded yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Upload files using the panel on the left.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 bg-slate-950/40">
                  <tr>
                    <th className="py-2.5 px-3">File Name</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-800/30 text-slate-300">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.mimeType)}
                          <div className="truncate max-w-[200px]">
                            <p className="font-sans font-medium text-slate-200 truncate">{file.originalName}</p>
                            <p className="text-[10px] text-slate-500 truncate" title={file.sha256}>
                              SHA: {file.sha256.substring(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{formatBytes(file.sizeBytes)}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">{file.mimeType}</td>
                      <td className="py-2.5 px-3 text-slate-400">{file.uploadedBy}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/api/v1/files/${file.id}/download`}
                            download={file.originalName}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors inline-block"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(file.id, file.originalName)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete File"
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
      </div>
    </div>
  );
};
