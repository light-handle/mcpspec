import { describe, it, expect } from 'vitest';
import { ScanConfig } from '../../src/security/scan-config.js';

describe('ScanConfig', () => {
  it('should have sensible defaults', () => {
    const config = new ScanConfig();
    expect(config.mode).toBe('passive');
    expect(config.timeout).toBe(10000);
    expect(config.maxProbesPerTool).toBe(50);
    expect(config.acknowledgeRisk).toBe(false);
    expect(config.severityThreshold).toBe('info');
  });

  it('should filter rules by mode - passive', () => {
    const config = new ScanConfig({ mode: 'passive' });
    expect(config.rules).toContain('path-traversal');
    expect(config.rules).toContain('input-validation');
    expect(config.rules).toContain('information-disclosure');
    expect(config.rules).toContain('tool-poisoning');
    expect(config.rules).toContain('excessive-agency');
    expect(config.rules).not.toContain('resource-exhaustion');
    expect(config.rules).not.toContain('auth-bypass');
    expect(config.rules).not.toContain('injection');
  });

  it('should include all rules for active mode', () => {
    const config = new ScanConfig({ mode: 'active' });
    expect(config.rules).toContain('path-traversal');
    expect(config.rules).toContain('input-validation');
    expect(config.rules).toContain('information-disclosure');
    expect(config.rules).toContain('tool-poisoning');
    expect(config.rules).toContain('excessive-agency');
    expect(config.rules).toContain('resource-exhaustion');
    expect(config.rules).toContain('auth-bypass');
    expect(config.rules).toContain('injection');
  });

  it('should include all rules for aggressive mode', () => {
    const config = new ScanConfig({ mode: 'aggressive' });
    expect(config.rules.length).toBe(8);
  });

  it('should allow filtering to specific rules', () => {
    const config = new ScanConfig({ mode: 'active', rules: ['injection', 'path-traversal'] });
    expect(config.rules).toContain('injection');
    expect(config.rules).toContain('path-traversal');
    expect(config.rules.length).toBe(2);
  });

  it('should filter out rules not available for mode', () => {
    const config = new ScanConfig({ mode: 'passive', rules: ['injection', 'path-traversal'] });
    expect(config.rules).toEqual(['path-traversal']);
  });

  it('should require confirmation for active mode without acknowledgeRisk', () => {
    expect(new ScanConfig({ mode: 'active' }).requiresConfirmation()).toBe(true);
    expect(new ScanConfig({ mode: 'aggressive' }).requiresConfirmation()).toBe(true);
    expect(new ScanConfig({ mode: 'passive' }).requiresConfirmation()).toBe(false);
    expect(new ScanConfig({ mode: 'active', acknowledgeRisk: true }).requiresConfirmation()).toBe(false);
  });

  it('should check severity threshold', () => {
    const config = new ScanConfig({ severityThreshold: 'medium' });
    expect(config.meetsThreshold('critical')).toBe(true);
    expect(config.meetsThreshold('high')).toBe(true);
    expect(config.meetsThreshold('medium')).toBe(true);
    expect(config.meetsThreshold('low')).toBe(false);
    expect(config.meetsThreshold('info')).toBe(false);
  });

  it('should accept custom timeout and maxProbes', () => {
    const config = new ScanConfig({ timeout: 5000, maxProbesPerTool: 10 });
    expect(config.timeout).toBe(5000);
    expect(config.maxProbesPerTool).toBe(10);
  });
});
