import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaselineStore } from '../../src/testing/comparison/baseline-store.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { TestRunResult } from '@mcpspec/shared';

const TEST_DIR = join(tmpdir(), 'mcpspec-test-baselines-' + Date.now());

function makeRunResult(): TestRunResult {
  return {
    id: 'run-123',
    collectionName: 'Test Suite',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: new Date('2026-01-01T00:00:01Z'),
    duration: 1000,
    results: [
      {
        testId: 't1',
        testName: 'test 1',
        status: 'passed',
        duration: 500,
        assertions: [{ type: 'schema', passed: true, message: 'OK' }],
      },
    ],
    summary: { total: 1, passed: 1, failed: 0, skipped: 0, errors: 0, duration: 1000 },
  };
}

describe('BaselineStore', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  it('should save and load a baseline', () => {
    const store = new BaselineStore(TEST_DIR);
    const result = makeRunResult();

    store.save('main', result);
    const loaded = store.load('main');

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('run-123');
    expect(loaded!.collectionName).toBe('Test Suite');
    expect(loaded!.results.length).toBe(1);
  });

  it('should return null for non-existent baseline', () => {
    const store = new BaselineStore(TEST_DIR);
    const loaded = store.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should list saved baselines', () => {
    const store = new BaselineStore(TEST_DIR);
    store.save('main', makeRunResult());
    store.save('feature', makeRunResult());

    const list = store.list();
    expect(list).toContain('main');
    expect(list).toContain('feature');
  });

  it('should return empty list when no baselines exist', () => {
    const store = new BaselineStore(TEST_DIR);
    const list = store.list();
    expect(list).toEqual([]);
  });

  it('should sanitize baseline names to prevent path traversal', () => {
    const store = new BaselineStore(TEST_DIR);
    store.save('../../../etc/passwd', makeRunResult());

    // Should be saved with sanitized name
    const list = store.list();
    expect(list.length).toBe(1);
    expect(list[0]).not.toContain('/');
  });

  it('should deserialize dates correctly', () => {
    const store = new BaselineStore(TEST_DIR);
    store.save('dated', makeRunResult());
    const loaded = store.load('dated');

    expect(loaded!.startedAt).toBeInstanceOf(Date);
    expect(loaded!.completedAt).toBeInstanceOf(Date);
  });
});
