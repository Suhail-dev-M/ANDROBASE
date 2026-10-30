import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { MediaLibraryItem } from '../../types';
import { generateUUID } from '../../utils/id';

const MIME_MAP: Record<string, { type: 'audio' | 'video' | 'image'; mime: string }> = {
  '.mp4': { type: 'video', mime: 'video/mp4' },
  '.webm': { type: 'video', mime: 'video/webm' },
  '.mkv': { type: 'video', mime: 'video/x-matroska' },
  '.mov': { type: 'video', mime: 'video/quicktime' },
  '.mp3': { type: 'audio', mime: 'audio/mpeg' },
  '.wav': { type: 'audio', mime: 'audio/wav' },
  '.ogg': { type: 'audio', mime: 'audio/ogg' },
  '.flac': { type: 'audio', mime: 'audio/flac' },
  '.m4a': { type: 'audio', mime: 'audio/mp4' },
  '.jpg': { type: 'image', mime: 'image/jpeg' },
  '.jpeg': { type: 'image', mime: 'image/jpeg' },
  '.png': { type: 'image', mime: 'image/png' },
  '.gif': { type: 'image', mime: 'image/gif' },
  '.webp': { type: 'image', mime: 'image/webp' },
  '.svg': { type: 'image', mime: 'image/svg+xml' }
};

export class MediaManager {
  private mediaDir: string;

  constructor(baseDataDir: string) {
    this.mediaDir = path.join(baseDataDir, 'media');
    if (!fs.existsSync(this.mediaDir)) {
      try {
        fs.mkdirSync(this.mediaDir, { recursive: true });
      } catch {
        // Fallback
      }
    }
  }

  public getMediaDirectory(): string {
    return this.mediaDir;
  }

  public scanLibrary(): MediaLibraryItem[] {
    const items: MediaLibraryItem[] = [];
    if (!fs.existsSync(this.mediaDir)) return items;

    const walk = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            const mediaType = MIME_MAP[ext];
            if (mediaType) {
              const stat = fs.statSync(fullPath);
              const relative = path.relative(this.mediaDir, fullPath);
              items.push({
                id: generateUUID(),
                name: entry.name,
                type: mediaType.type,
                path: relative,
                sizeBytes: stat.size,
                mimeType: mediaType.mime,
                createdAt: stat.birthtime.toISOString()
              });
            }
          }
        }
      } catch {
        // Skip inaccessible entries
      }
    };

    walk(this.mediaDir);
    return items;
  }

  public getAbsolutePath(relativePath: string): string | null {
    const resolved = path.resolve(this.mediaDir, relativePath);
    if (!resolved.startsWith(this.mediaDir)) {
      return null;
    }
    if (!fs.existsSync(resolved)) {
      return null;
    }
    return resolved;
  }

  /**
   * HTTP 206 Partial Content media streaming with chunking for video/audio seek
   */
  public streamMedia(filePath: string, req: http.IncomingMessage, res: http.ServerResponse) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext]?.mime || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`
        });
        res.end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }
}
