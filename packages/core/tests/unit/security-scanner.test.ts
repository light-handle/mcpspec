import { describe, it, expect, vi } from 'vitest';
import { SecurityScanner } from '../../src/security/security-scanner.js';
import { ScanConfig } from '../../src/security/scan-config.js';
import { MockMCPClient } from '../fixtures/mock-mcp-client.js';
import type { SecurityRule } from '../../src/security/rule-interface.js';

// Helper to create a ScanConfig that includes custom rule IDs
function configWithRules(rules: string[]): ScanConfig {
  const config = new ScanConfig({ mode: 'passive' });
  // Override the readonly rules for testing
  Object.defineProperty(config, 'rules', { value: rules });
  return config;
}

describe('SecurityScanner', () => {
  it('should scan and return results', async () => {
    const client = new MockMCPClient({
      tools: [
        { name: 'read_file', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
      ],
    });
    await client.connect();

    const scanner = new SecurityScanner();
    const config = new ScanConfig({ mode: 'passive' });
    const result = await scanner.scan(client, config);

    expect(result.id).toBeDefined();
    expect(result.serverName).toBe('mock-server');
    expect(result.mode).toBe('passive');
    expect(result.startedAt).toBeInstanceOf(Date);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.summary.totalFindings).toBe(result.findings.length);
  });

  it('should sort findings by severity (critical first)', async () => {
    const client = new MockMCPClient({ tools: [] });
    await client.connect();

    const scanner = new SecurityScanner();
    const mockRule: SecurityRule = {
      id: 'test-rule',
      name: 'Test Rule',
      description: 'Test',
      scan: async () => [
        { id: '1', rule: 'test-rule', severity: 'low', title: 'Low', description: 'Low' },
        { id: '2', rule: 'test-rule', severity: 'critical', title: 'Crit', description: 'Crit' },
        { id: '3', rule: 'test-rule', severity: 'medium', title: 'Med', description: 'Med' },
      ],
    };
    scanner.registerRule(mockRule);

    const config = configWithRules(['test-rule']);
    const result = await scanner.scan(client, config);

    expect(result.findings.length).toBe(3);
    expect(result.findings[0].severity).toBe('critical');
    expect(result.findings[1].severity).toBe('medium');
    expect(result.findings[2].severity).toBe('low');
  });

  it('should handle rule failures gracefully', async () => {
    const client = new MockMCPClient({ tools: [] });
    await client.connect();

    const scanner = new SecurityScanner();
    const failingRule: SecurityRule = {
      id: 'failing-rule',
      name: 'Failing Rule',
      description: 'Always fails',
      scan: async () => { throw new Error('Rule crashed'); },
    };
    scanner.registerRule(failingRule);

    const config = configWithRules(['failing-rule']);
    const result = await scanner.scan(client, config);

    expect(result.findings.length).toBe(1);
    expect(result.findings[0].severity).toBe('info');
    expect(result.findings[0].title).toContain('failed to complete');
  });

  it('should call progress callbacks', async () => {
    const client = new MockMCPClient({ tools: [] });
    await client.connect();

    const scanner = new SecurityScanner();
    const mockRule: SecurityRule = {
      id: 'progress-rule',
      name: 'Progress Rule',
      description: 'Test',
      scan: async () => [
        { id: '1', rule: 'progress-rule', severity: 'info', title: 'Info', description: 'Info' },
      ],
    };
    scanner.registerRule(mockRule);

    const onRuleStart = vi.fn();
    const onRuleComplete = vi.fn();
    const onFinding = vi.fn();

    const config = configWithRules(['progress-rule']);
    await scanner.scan(client, config, { onRuleStart, onRuleComplete, onFinding });

    expect(onRuleStart).toHaveBeenCalledWith('progress-rule', 'Progress Rule');
    expect(onRuleComplete).toHaveBeenCalledWith('progress-rule', 1);
    expect(onFinding).toHaveBeenCalledTimes(1);
  });

  it('should build summary with correct counts', async () => {
    const client = new MockMCPClient({ tools: [] });
    await client.connect();

    const scanner = new SecurityScanner();
    const mockRule: SecurityRule = {
      id: 'summary-rule',
      name: 'Summary',
      description: 'Test',
      scan: async () => [
        { id: '1', rule: 'summary-rule', severity: 'high', title: 'A', description: 'A' },
        { id: '2', rule: 'summary-rule', severity: 'high', title: 'B', description: 'B' },
        { id: '3', rule: 'summary-rule', severity: 'low', title: 'C', description: 'C' },
      ],
    };
    scanner.registerRule(mockRule);

    const config = configWithRules(['summary-rule']);
    const result = await scanner.scan(client, config);

    expect(result.summary.totalFindings).toBe(3);
    expect(result.summary.bySeverity.high).toBe(2);
    expect(result.summary.bySeverity.low).toBe(1);
    expect(result.summary.bySeverity.critical).toBe(0);
    expect(result.summary.byRule['summary-rule']).toBe(3);
  });
});
