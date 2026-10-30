/**
 * AndroBase - Complete Home Server Management Platform
 * Advanced Web File Manager Engine
 * Features: Directory navigation, path-traversal prevention, multi-file ops, text editing, preview, metadata
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FileSystemEntry } from '../../types.ts';
import { config } from '../../config.ts';
import { AuditLogger } from '../../audit/logger.ts';

// Allowed root for general file management: defaults to the server data directory
const BASE_ALLOWED_ROOT = path.resolve(config.dataDir);

export class ServerFileManager {
  public static getRoot(): string {
    return BASE_ALLOWED_ROOT;
  }

  // Security: Normalize and verify that requested path never escapes the allowed base root
  public static resolveSafePath(relativePath: string = ''): string {
    const clean = (relativePath || '').replace(/\0/g, '').trim();
    if (!clean || clean === '/' || clean === '.') return BASE_ALLOWED_ROOT;

    let resolved: string;
    if (path.isAbsolute(clean)) {
      resolved = path.resolve(clean);
    } else {
      resolved = path.resolve(BASE_ALLOWED_ROOT, clean);
    }

    // Boundary check: must be inside or equal to BASE_ALLOWED_ROOT
    if (resolved !== BASE_ALLOWED_ROOT && !resolved.startsWith(BASE_ALLOWED_ROOT + path.sep)) {
      throw new Error('Access denied: Path traversal detected outside allowed directory boundary.');
    }

    return resolved;
  }

  public static listDirectory(relativeSubPath: string = ''): { currentPath: string; entries: FileSystemEntry[] } {
    const targetDir = this.resolveSafePath(relativeSubPath);

    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory does not exist: ${relativeSubPath}`);
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${relativeSubPath}`);
    }

    const rawNames = fs.readdirSync(targetDir);
    const entries: FileSystemEntry[] = [];

    for (const name of rawNames) {
      // Hide internal volatile wal or lock files
      if (name.endsWith('.wal') || name.startsWith('.upload.')) continue;

      const fullPath = path.join(targetDir, name);
      try {
        const itemStat = fs.statSync(fullPath);
        const rel = path.relative(BASE_ALLOWED_ROOT, fullPath);

        entries.push({
          name,
          path: rel,
          isDirectory: itemStat.isDirectory(),
          sizeBytes: itemStat.isDirectory() ? 0 : itemStat.size,
          updatedAt: itemStat.mtime.toISOString(),
          mimeType: itemStat.isDirectory() ? 'inode/directory' : this.guessMimeType(name),
          isProtected: name.startsWith('.bootstrap_token'),
        });
      } catch {
        // Skip inaccessible items
      }
    }

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    const currentRel = path.relative(BASE_ALLOWED_ROOT, targetDir);
    return {
      currentPath: currentRel || '/',
      entries,
    };
  }

  public static createFolder(parentPath: string, folderName: string, username: string = 'system'): string {
    const cleanName = folderName.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!cleanName) throw new Error('Invalid folder name.');

    const targetDir = path.join(this.resolveSafePath(parentPath), cleanName);
    if (fs.existsSync(targetDir)) {
      throw new Error(`Folder "${cleanName}" already exists.`);
    }

    fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    AuditLogger.log({
      action: 'files.folder_created',
      username,
      status: 'success',
      details: { folderName: cleanName, parentPath },
    });

    return path.relative(BASE_ALLOWED_ROOT, targetDir);
  }

  public static createDirectory(parentPath: string, folderName: string, username: string = 'system'): string {
    return this.createFolder(parentPath, folderName, username);
  }

  public static deleteItem(relativeItemPath: string, username: string = 'system'): void {
    const target = this.resolveSafePath(relativeItemPath);
    if (!fs.existsSync(target)) throw new Error('File or folder not found.');

    // Protect root and bootstrap token
    if (target === BASE_ALLOWED_ROOT) throw new Error('Cannot delete the root storage directory.');
    if (path.basename(target) === '.bootstrap_token') throw new Error('Cannot delete security bootstrap token.');

    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      fs.rmSync(target, { recursive: true, force: true });
    } else {
      fs.unlinkSync(target);
    }

    AuditLogger.log({
      action: 'files.deleted',
      username,
      status: 'success',
      details: { path: relativeItemPath },
    });
  }

  public static deletePath(relativeItemPath: string, username: string = 'system'): void {
    return this.deleteItem(relativeItemPath, username);
  }

  public static renameItem(oldRelativePath: string, newName: string, username: string = 'system'): string {
    const cleanName = newName.replace(/[/\\?%*:|"<>]/g, '_').trim();
    if (!cleanName) throw new Error('Invalid new name.');

    const source = this.resolveSafePath(oldRelativePath);
    if (!fs.existsSync(source)) throw new Error('Source file or folder not found.');

    const parentDir = path.dirname(source);
    const destination = path.join(parentDir, cleanName);

    if (fs.existsSync(destination)) {
      throw new Error(`An item named "${cleanName}" already exists in this folder.`);
    }

    fs.renameSync(source, destination);
    AuditLogger.log({
      action: 'files.renamed',
      username,
      status: 'success',
      details: { from: oldRelativePath, to: cleanName },
    });

    return path.relative(BASE_ALLOWED_ROOT, destination);
  }

  public static renamePath(oldRelativePath: string, newPath: string, username: string = 'system'): string {
    const newName = path.basename(newPath);
    return this.renameItem(oldRelativePath, newName, username);
  }

  public static copyOrMoveItem(sourceRel: string, destFolderRel: string, isMove: boolean, username: string = 'system'): void {
    const source = this.resolveSafePath(sourceRel);
    const destDir = this.resolveSafePath(destFolderRel);

    if (!fs.existsSync(source)) throw new Error('Source item does not exist.');
    if (!fs.existsSync(destDir) || !fs.statSync(destDir).isDirectory()) {
      throw new Error('Destination is not a valid directory.');
    }

    const fileName = path.basename(source);
    const destination = path.join(destDir, fileName);

    if (isMove) {
      fs.renameSync(source, destination);
    } else {
      fs.cpSync(source, destination, { recursive: true });
    }

    AuditLogger.log({
      action: isMove ? 'files.moved' : 'files.copied',
      username,
      status: 'success',
      details: { from: sourceRel, to: destFolderRel },
    });
  }

  public static copyPath(sourceRel: string, destFolderRel: string, username: string = 'system'): void {
    return this.copyOrMoveItem(sourceRel, destFolderRel, false, username);
  }

  public static movePath(sourceRel: string, destFolderRel: string, username: string = 'system'): void {
    return this.copyOrMoveItem(sourceRel, destFolderRel, true, username);
  }

  public static readFileContent(relativeFilePath: string): { content: string; mimeType: string; size: number } {
    const target = this.resolveSafePath(relativeFilePath);
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      throw new Error('File not found or is a directory.');
    }

    const stat = fs.statSync(target);
    // Limit preview to 5MB to avoid memory blowouts on low-RAM phones
    if (stat.size > 5 * 1024 * 1024) {
      throw new Error('File is larger than 5 MB. Please download it directly to view.');
    }

    const mime = this.guessMimeType(target);
    const content = fs.readFileSync(target, 'utf8');

    return {
      content,
      mimeType: mime,
      size: stat.size,
    };
  }

  public static writeFileContent(relativeFilePath: string, content: string, username: string = 'system'): void {
    const target = this.resolveSafePath(relativeFilePath);
    const parentDir = path.dirname(target);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(target, content, { encoding: 'utf8', mode: 0o600 });
    AuditLogger.log({
      action: 'files.edited',
      username,
      status: 'success',
      details: { path: relativeFilePath, sizeBytes: Buffer.byteLength(content) },
    });
  }

  public static searchFiles(query: string, maxResults: number = 30): FileSystemEntry[] {
    const results: FileSystemEntry[] = [];
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) return [];

    const walk = (currentDir: string) => {
      if (results.length >= maxResults) return;

      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          if (results.length >= maxResults) break;
          if (item.startsWith('.')) continue;

          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);

          if (item.toLowerCase().includes(cleanQuery)) {
            results.push({
              name: item,
              path: path.relative(BASE_ALLOWED_ROOT, fullPath),
              isDirectory: stat.isDirectory(),
              sizeBytes: stat.isDirectory() ? 0 : stat.size,
              updatedAt: stat.mtime.toISOString(),
              mimeType: stat.isDirectory() ? 'inode/directory' : this.guessMimeType(item),
            });
          }

          if (stat.isDirectory()) {
            walk(fullPath);
          }
        }
      } catch {
        // Skip restricted directories
      }
    };

    walk(BASE_ALLOWED_ROOT);
    return results;
  }

  private static guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const map: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.sh': 'application/x-sh',
      '.py': 'text/x-python',
      '.php': 'application/x-php',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    return map[ext] || 'application/octet-stream';
  }
}
