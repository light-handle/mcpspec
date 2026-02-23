import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RecordingStore } from '../../src/recording/recording-store.js';
import type { Recording } from '@mcpspec/shared';

function makeRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-1',
    name: 'test-recording',
    serverName: 'mock-server',
    tools: [{ name: 'get_weather', description: 'Gets weather' }],
    steps: [
      {
        tool: 'get_weather',
        input: { city: 'London' },
        output: [{ type: 'text', text: 'Sunny' }],
        durationMs: 50,
      },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('RecordingStore', () => {
  let tempDir: string;
  let store: RecordingStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mcpspec-rec-'));
    store = new RecordingStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should save and load a recording', () => {
    const recording = makeRecording();
    store.save('my-recording', recording);
    const loaded = store.load('my-recording');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('rec-1');
    expect(loaded!.steps).toHaveLength(1);
  });

  it('should return null for missing recordings', () => {
    const loaded = store.load('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should list saved recordings', () => {
    store.save('first', makeRecording({ id: 'r1' }));
    store.save('second', makeRecording({ id: 'r2' }));
    const list = store.list();
    expect(list).toContain('first');
    expect(list).toContain('second');
    expect(list).toHaveLength(2);
  });

  it('should delete a recording', () => {
    store.save('to-delete', makeRecording());
    expect(store.delete('to-delete')).toBe(true);
    expect(store.load('to-delete')).toBeNull();
  });

  it('should return false when deleting nonexistent recording', () => {
    expect(store.delete('nonexistent')).toBe(false);
  });

  it('should sanitize names for file safety', () => {
    const recording = makeRecording();
    store.save('my/../evil', recording);
    const loaded = store.load('my/../evil');
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('rec-1');
  });

  it('should return empty list when no recordings exist', () => {
    const list = store.list();
    expect(list).toHaveLength(0);
  });
});
