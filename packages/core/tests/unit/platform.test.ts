import { describe, it, expect } from 'vitest';
import { getPlatformInfo, getShellCommand } from '../../src/utils/platform.js';

describe('getPlatformInfo', () => {
  it('should return platform information', () => {
    const info = getPlatformInfo();
    expect(info.os).toBeDefined();
    expect(info.arch).toBeDefined();
    expect(info.nodeVersion).toMatch(/^v\d+/);
    expect(info.homeDir).toBeDefined();
    expect(info.dataDir).toBeDefined();
    expect(typeof info.isWindows).toBe('boolean');
    expect(typeof info.isMacOS).toBe('boolean');
    expect(typeof info.isLinux).toBe('boolean');
  });
});

describe('getShellCommand', () => {
  it('should return a shell and flag', () => {
    const { shell, flag } = getShellCommand();
    expect(shell).toBeDefined();
    expect(flag).toBeDefined();
  });
});
