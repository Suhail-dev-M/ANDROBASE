import React, { useState, useEffect } from 'react';
import {
  Film, Music, Image as ImageIcon, Play, RefreshCw,
  Folder, HardDrive, AlertCircle, Eye, Volume2
} from 'lucide-react';
import { ApiClient } from '../api.ts';
import { MediaLibraryItem } from '../types.ts';

export const MediaServerTab: React.FC = () => {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'video' | 'audio' | 'image'>('all');

  // Active playing media
  const [activeMedia, setActiveMedia] = useState<MediaLibraryItem | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await ApiClient.scanMediaLibrary();
      setItems(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Film className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Self-Hosted Media Server</h1>
              <p className="text-xs text-slate-400">
                Audio, video, and image streaming with chunked HTTP 206 seeking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs">
              {(['all', 'video', 'audio', 'image'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                    filterType === t
                      ? 'bg-pink-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMedia}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Embedded Player when an item is selected */}
      {activeMedia && (
        <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeMedia.type === 'video' && <Film className="w-5 h-5 text-pink-400" />}
              {activeMedia.type === 'audio' && <Music className="w-5 h-5 text-emerald-400" />}
              {activeMedia.type === 'image' && <ImageIcon className="w-5 h-5 text-cyan-400" />}
              <div>
                <h3 className="text-sm font-bold text-white">{activeMedia.name}</h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatSize(activeMedia.sizeBytes)} • {activeMedia.mimeType}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveMedia(null)}
              className="text-xs text-slate-400 hover:text-white font-bold"
            >
              Close Player
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl p-4 flex items-center justify-center">
            {activeMedia.type === 'video' && (
              <video
                controls
                autoPlay
                src={`/api/v1/media/stream?path=${encodeURIComponent(activeMedia.path)}`}
                className="max-h-[60vh] max-w-full rounded-lg"
              />
            )}
            {activeMedia.type === 'audio' && (
              <audio
                controls
                autoPlay
                src={`/api/v1/media/stream?path=${encodeURIComponent(activeMedia.path)}`}
                className="w-full"
              />
            )}
            {activeMedia.type === 'image' && (
              <img
                src={`/api/v1/media/stream?path=${encodeURIComponent(activeMedia.path)}`}
                alt={activeMedia.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Film className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No media files found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Place music, videos, or photos into your server's media folder (or upload via File Manager) to stream them anywhere.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveMedia(item)}
              className="group cursor-pointer bg-slate-900/70 border border-slate-800 hover:border-pink-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.02]"
            >
              <div className="aspect-square bg-slate-950 rounded-xl flex items-center justify-center mb-3 group-hover:bg-pink-500/10 transition-colors">
                {item.type === 'video' && (
                  <Film className="w-8 h-8 text-pink-400 group-hover:scale-110 transition-transform" />
                )}
                {item.type === 'audio' && (
                  <Music className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                )}
                {item.type === 'image' && (
                  <ImageIcon className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-pink-300 transition-colors">
                  {item.name}
                </h4>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>{formatSize(item.sizeBytes)}</span>
                  <span className="uppercase">{item.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
