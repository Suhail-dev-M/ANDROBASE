import React, { useState, useEffect } from 'react';
import {
  Folder, File, Upload, FolderPlus, ArrowLeft, RefreshCw,
  Trash2, Edit3, Download, Search, Check, AlertCircle, FileText,
  Image as ImageIcon, Music, Video, Code, HardDrive, Eye
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { FileSystemEntry } from '../types.ts';

export const FileManagerTab: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [entries, setEntries] = useState<FileSystemEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Editor
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ path: string; name: string; type: 'image' | 'video' | 'audio' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);

  const fetchDirectory = async (pathStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.listDirectory(pathStr);
      setCurrentPath(res.currentPath);
      setEntries(res.entries);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory(currentPath);
  }, []);

  const handleNavigate = (subPath: string) => {
    fetchDirectory(subPath);
  };

  const handleGoUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    fetchDirectory(parts.join('/'));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await ApiClient.createFolder(currentPath, newFolderName.trim());
      setNewFolderName('');
      setIsNewFolderOpen(false);
      fetchDirectory(currentPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDelete = async (itemPath: string) => {
    if (!window.confirm(`Are you sure you want to delete ${itemPath}?`)) return;
    try {
      await ApiClient.deleteFileManagerItem(itemPath);
      fetchDirectory(currentPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenFile = async (entry: FileSystemEntry) => {
    const ext = entry.name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      setPreviewMedia({ path: entry.path, name: entry.name, type: 'image' });
      return;
    }
    if (['mp4', 'webm'].includes(ext)) {
      setPreviewMedia({ path: entry.path, name: entry.name, type: 'video' });
      return;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      setPreviewMedia({ path: entry.path, name: entry.name, type: 'audio' });
      return;
    }

    try {
      setLoading(true);
      const res = await ApiClient.readFileContent(entry.path);
      setEditingFile({ path: res.path, content: res.content });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    try {
      setLoading(true);
      await ApiClient.writeFileContent(editingFile.path, editingFile.content);
      setEditingFile(null);
      fetchDirectory(currentPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgressMsg(`Uploading ${files.length} file(s)...`);
    try {
      await ApiClient.uploadFileManagerFiles(currentPath, files);
      setUploadProgressMsg('Upload complete!');
      setTimeout(() => setUploadProgressMsg(null), 2000);
      fetchDirectory(currentPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredEntries = entries.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (entry: FileSystemEntry) => {
    if (entry.isDirectory) return <Folder className="w-5 h-5 text-amber-400 shrink-0" />;
    const ext = entry.name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-pink-400 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return <Music className="w-5 h-5 text-emerald-400 shrink-0" />;
    }
    if (['mp4', 'webm', 'mkv'].includes(ext)) {
      return <Video className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'php', 'html', 'css', 'sh'].includes(ext)) {
      return <Code className="w-5 h-5 text-violet-400 shrink-0" />;
    }
    return <FileText className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Breadcrumb Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <HardDrive className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">File Manager</h1>
                <p className="text-xs text-slate-400">
                  Sandboxed directory storage with file inspection and instant text editing
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => fetchDirectory(currentPath)}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Directory"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Path Navigation Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-1">
            <button
              onClick={() => fetchDirectory('')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-mono font-medium shrink-0"
            >
              /root
            </button>
            {currentPath && (
              <>
                <button
                  onClick={handleGoUp}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                  title="Go to parent directory"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-500">/</span>
                <span className="font-mono text-emerald-400 truncate max-w-xs sm:max-w-md">
                  {currentPath}
                </span>
              </>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative shrink-0 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search current folder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {uploadProgressMsg && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{uploadProgressMsg}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Directory Table / Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            <Folder className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p>This folder is currently empty.</p>
            <p className="text-xs text-slate-600 mt-1">Upload files or create subdirectories above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Size</th>
                  <th className="py-3 px-4 hidden md:table-cell">Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.path}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(entry)}
                        {entry.isDirectory ? (
                          <button
                            onClick={() => handleNavigate(entry.path)}
                            className="font-medium text-slate-200 hover:text-amber-400 text-left truncate max-w-xs sm:max-w-md transition-colors"
                          >
                            {entry.name}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenFile(entry)}
                            className="font-medium text-slate-300 hover:text-emerald-400 text-left truncate max-w-xs sm:max-w-md transition-colors"
                          >
                            {entry.name}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 hidden sm:table-cell">
                      {entry.isDirectory ? '—' : formatBytes(entry.sizeBytes)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">
                      {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!entry.isDirectory && (
                          <>
                            <button
                              onClick={() => handleOpenFile(entry)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                              title="Edit / Preview"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`/api/v1/files/download?path=${encodeURIComponent(entry.path)}`}
                              download
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(entry.path)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
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

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              <span>Create New Folder</span>
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. documents, website, data"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Text / Code Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-mono text-xs text-slate-200 truncate">
                  {editingFile.path}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingFile(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFile}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold transition-colors"
                >
                  {loading ? 'Saving...' : 'Save File'}
                </button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 p-4 bg-[#0B0F19] overflow-hidden flex flex-col">
              <textarea
                value={editingFile.content}
                onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                className="w-full flex-1 bg-transparent text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Media Lightbox Preview */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white truncate max-w-md">
                {previewMedia.name}
              </h4>
              <button
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close Preview
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-950 rounded-xl p-4 min-h-[300px]">
              {previewMedia.type === 'image' && (
                <img
                  src={`/api/v1/files/download?path=${encodeURIComponent(previewMedia.path)}`}
                  alt={previewMedia.name}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain"
                />
              )}
              {previewMedia.type === 'video' && (
                <video
                  controls
                  autoPlay
                  src={`/api/v1/files/download?path=${encodeURIComponent(previewMedia.path)}`}
                  className="max-h-[60vh] max-w-full rounded-lg"
                />
              )}
              {previewMedia.type === 'audio' && (
                <audio
                  controls
                  autoPlay
                  src={`/api/v1/files/download?path=${encodeURIComponent(previewMedia.path)}`}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
