const VARIABLE_PATTERN = /\{\{(\w+(?:\.\w+)*)\}\}/g;

export function resolveVariables(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(VARIABLE_PATTERN, (match, path: string) => {
    const value = getNestedValue(variables, path);
    if (value === undefined) {
      return match; // Leave unresolved variables as-is
    }
    return String(value);
  });
}

export function resolveObjectVariables(
  obj: unknown,
  variables: Record<string, unknown>,
): unknown {
  if (typeof obj === 'string') {
    return resolveVariables(obj, variables);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveObjectVariables(item, variables));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveObjectVariables(value, variables);
    }
    return result;
  }
  return obj;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
