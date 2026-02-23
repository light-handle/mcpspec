import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getPlatformInfo } from '../utils/platform.js';
import type { Recording } from '@mcpspec/shared';

export class RecordingStore {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? join(getPlatformInfo().dataDir, 'recordings');
  }

  save(name: string, recording: Recording): string {
    this.ensureDir();
    const filePath = this.getFilePath(name);
    writeFileSync(filePath, JSON.stringify(recording, null, 2), 'utf-8');
    return filePath;
  }

  load(name: string): Recording | null {
    const filePath = this.getFilePath(name);
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Recording;
  }

  list(): string[] {
    this.ensureDir();
    return readdirSync(this.basePath)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }

  delete(name: string): boolean {
    const filePath = this.getFilePath(name);
    if (!existsSync(filePath)) return false;
    unlinkSync(filePath);
    return true;
  }

  private getFilePath(name: string): string {
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.basePath, `${safeName}.json`);
  }

  private ensureDir(): void {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }
}
