import yaml from 'js-yaml';
import { MCPSpecError } from '../errors/mcpspec-error.js';

export const YAML_LIMITS = {
  maxFileSize: 1024 * 1024, // 1MB
  maxNestingDepth: 10,
  maxTests: 1000,
};

export function loadYamlSafely(content: string): unknown {
  if (content.length > YAML_LIMITS.maxFileSize) {
    throw new MCPSpecError('YAML_TOO_LARGE', `YAML content exceeds maximum size of ${YAML_LIMITS.maxFileSize} bytes`, {
      maxSize: YAML_LIMITS.maxFileSize,
      actualSize: content.length,
    });
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(content, {
      schema: yaml.FAILSAFE_SCHEMA,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new MCPSpecError('YAML_PARSE_ERROR', `Failed to parse YAML: ${message}`, {
      parseError: message,
    });
  }

  validateNestingDepth(parsed, 0);

  return parsed;
}

function validateNestingDepth(value: unknown, depth: number): void {
  if (depth > YAML_LIMITS.maxNestingDepth) {
    throw new MCPSpecError('YAML_TOO_DEEP', `YAML nesting exceeds maximum depth of ${YAML_LIMITS.maxNestingDepth}`, {
      maxDepth: YAML_LIMITS.maxNestingDepth,
    });
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      validateNestingDepth(item, depth + 1);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const val of Object.values(value as Record<string, unknown>)) {
      validateNestingDepth(val, depth + 1);
    }
  }
}
