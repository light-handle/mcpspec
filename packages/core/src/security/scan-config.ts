import type { SecurityScanConfig, SecurityScanMode, SeverityLevel } from '@mcpspec/shared';

const SEVERITY_ORDER: SeverityLevel[] = ['info', 'low', 'medium', 'high', 'critical'];

const PASSIVE_RULES = [
  'path-traversal',
  'input-validation',
  'information-disclosure',
];

const ACTIVE_RULES = [
  ...PASSIVE_RULES,
  'resource-exhaustion',
  'auth-bypass',
  'injection',
];

const AGGRESSIVE_RULES = [...ACTIVE_RULES];

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAX_PROBES = 50;

export class ScanConfig {
  readonly mode: SecurityScanMode;
  readonly rules: string[];
  readonly severityThreshold: SeverityLevel;
  readonly acknowledgeRisk: boolean;
  readonly timeout: number;
  readonly maxProbesPerTool: number;

  constructor(config: Partial<SecurityScanConfig> = {}) {
    this.mode = config.mode ?? 'passive';
    this.severityThreshold = config.severityThreshold ?? 'info';
    this.acknowledgeRisk = config.acknowledgeRisk ?? false;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxProbesPerTool = config.maxProbesPerTool ?? DEFAULT_MAX_PROBES;

    const allRulesForMode = this.getRulesForMode(this.mode);
    if (config.rules && config.rules.length > 0) {
      this.rules = config.rules.filter((r) => allRulesForMode.includes(r));
    } else {
      this.rules = allRulesForMode;
    }
  }

  requiresConfirmation(): boolean {
    return this.mode !== 'passive' && !this.acknowledgeRisk;
  }

  meetsThreshold(severity: SeverityLevel): boolean {
    const thresholdIdx = SEVERITY_ORDER.indexOf(this.severityThreshold);
    const severityIdx = SEVERITY_ORDER.indexOf(severity);
    return severityIdx >= thresholdIdx;
  }

  private getRulesForMode(mode: SecurityScanMode): string[] {
    switch (mode) {
      case 'passive':
        return PASSIVE_RULES;
      case 'active':
        return ACTIVE_RULES;
      case 'aggressive':
        return AGGRESSIVE_RULES;
    }
  }
}
