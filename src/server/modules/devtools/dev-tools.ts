import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { GitRepositoryStatus } from '../../types';

export class DevToolsManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  public async getGitStatus(): Promise<GitRepositoryStatus> {
    const gitDir = path.join(this.workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return { isRepo: false };
    }

    try {
      const branch = await this.execCommand('git rev-parse --abbrev-ref HEAD');
      const remote = await this.execCommand('git config --get remote.origin.url').catch(() => '');
      const porcelain = await this.execCommand('git status --porcelain');
      const uncommitted = porcelain.trim() ? porcelain.trim().split('\n').length : 0;

      let lastCommit: GitRepositoryStatus['lastCommit'];
      try {
        const logLine = await this.execCommand('git log -1 --format="%h|%an|%s|%cd" --date=iso');
        const [hash, author, message, date] = logLine.split('|');
        if (hash) {
          lastCommit = {
            hash: hash.trim(),
            author: author?.trim() || 'Unknown',
            message: message?.trim() || '',
            date: date?.trim() || ''
          };
        }
      } catch {
        // No commits yet
      }

      return {
        isRepo: true,
        currentBranch: branch.trim(),
        remoteUrl: remote.trim() || undefined,
        isClean: uncommitted === 0,
        uncommittedCount: uncommitted,
        lastCommit
      };
    } catch {
      return { isRepo: false };
    }
  }

  public async gitPull(): Promise<{ success: boolean; output: string }> {
    try {
      const out = await this.execCommand('git pull');
      return { success: true, output: out };
    } catch (err: unknown) {
      return {
        success: false,
        output: err instanceof Error ? err.message : String(err)
      };
    }
  }

  public readConfigFile(relativePath: string): string {
    const resolved = path.resolve(this.workspaceRoot, relativePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error('Access denied: path outside workspace root');
    }
    if (!fs.existsSync(resolved)) {
      throw new Error('File not found');
    }
    return fs.readFileSync(resolved, 'utf8');
  }

  public writeConfigFile(relativePath: string, content: string): void {
    const resolved = path.resolve(this.workspaceRoot, relativePath);
    if (!resolved.startsWith(this.workspaceRoot)) {
      throw new Error('Access denied: path outside workspace root');
    }
    // Block editing critical system credentials/keys
    const forbidden = ['.git', '.env', 'id_rsa', 'authorized_keys'];
    if (forbidden.some((f) => resolved.includes(f))) {
      throw new Error('Direct editing of sensitive files is restricted');
    }
    fs.writeFileSync(resolved, content, 'utf8');
  }

  private execCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(cmd, { cwd: this.workspaceRoot, timeout: 15000 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }
}
