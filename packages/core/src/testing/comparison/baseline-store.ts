import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPlatformInfo } from '../../utils/platform.js';
import type { TestRunResult } from '@mcpspec/shared';

export class BaselineStore {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? join(getPlatformInfo().dataDir, 'baselines');
  }

  save(name: string, result: TestRunResult): string {
    this.ensureDir();
    const filePath = this.getFilePath(name);
    const serialized = JSON.stringify(
      {
        id: result.id,
        collectionName: result.collectionName,
        startedAt: result.startedAt.toISOString(),
        completedAt: result.completedAt.toISOString(),
        duration: result.duration,
        results: result.results,
        summary: result.summary,
      },
      null,
      2,
    );
    writeFileSync(filePath, serialized, 'utf-8');
    return filePath;
  }

  load(name: string): TestRunResult | null {
    const filePath = this.getFilePath(name);
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);
    return {
      ...raw,
      startedAt: new Date(raw.startedAt),
      completedAt: new Date(raw.completedAt),
    };
  }

  list(): string[] {
    this.ensureDir();
    return readdirSync(this.basePath)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  }

  private getFilePath(name: string): string {
    // Sanitize name to prevent path traversal
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.basePath, `${safeName}.json`);
  }

  private ensureDir(): void {
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }
}
