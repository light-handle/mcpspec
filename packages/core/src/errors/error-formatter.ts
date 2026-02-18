import { MCPSpecError } from './mcpspec-error.js';
import { ERROR_TEMPLATES } from './error-messages.js';

export interface FormattedError {
  title: string;
  description: string;
  suggestions: string[];
  docs?: string;
  code: string;
  exitCode: number;
}

export function formatError(error: unknown): FormattedError {
  if (error instanceof MCPSpecError) {
    const template = ERROR_TEMPLATES[error.code];
    if (template) {
      return {
        title: interpolate(template.title, error.context),
        description: interpolate(template.description, error.context),
        suggestions: template.suggestions.map((s) => interpolate(s, error.context)),
        docs: template.docs,
        code: error.code,
        exitCode: error.exitCode,
      };
    }
    return {
      title: error.code,
      description: error.message,
      suggestions: [],
      code: error.code,
      exitCode: error.exitCode,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Unexpected Error',
      description: error.message,
      suggestions: ['This may be a bug. Please report it at https://github.com/mcpspec/mcpspec/issues'],
      code: 'UNKNOWN_ERROR',
      exitCode: 2,
    };
  }

  return {
    title: 'Unknown Error',
    description: String(error),
    suggestions: [],
    code: 'UNKNOWN_ERROR',
    exitCode: 2,
  };
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = context[key];
    if (value === undefined) return `{{${key}}}`;
    return String(value);
  });
}
