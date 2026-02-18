/**
 * Simple JSONPath implementation supporting basic dot notation.
 * Supports: $.foo.bar, $.foo[0], $.foo[0].bar
 */
export function queryJsonPath(data: unknown, path: string): unknown {
  if (!path.startsWith('$')) {
    throw new Error(`Invalid JSONPath: must start with $. Got: ${path}`);
  }

  // Remove leading $
  const remaining = path.slice(1);
  if (remaining === '' || remaining === '.') {
    return data;
  }

  // Remove leading dot if present
  const normalizedPath = remaining.startsWith('.') ? remaining.slice(1) : remaining;

  const segments = parseSegments(normalizedPath);
  let current: unknown = data;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (segment.type === 'property') {
      if (typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment.key];
    } else if (segment.type === 'index') {
      if (!Array.isArray(current)) {
        return undefined;
      }
      current = current[segment.index];
    }
  }

  return current;
}

interface PropertySegment {
  type: 'property';
  key: string;
}

interface IndexSegment {
  type: 'index';
  index: number;
}

type Segment = PropertySegment | IndexSegment;

function parseSegments(path: string): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < path.length) {
    if (path[i] === '[') {
      // Array index
      const end = path.indexOf(']', i);
      if (end === -1) {
        throw new Error(`Invalid JSONPath: unclosed bracket at position ${i}`);
      }
      const indexStr = path.slice(i + 1, end);
      const index = parseInt(indexStr, 10);
      if (isNaN(index)) {
        throw new Error(`Invalid JSONPath: non-numeric array index "${indexStr}"`);
      }
      segments.push({ type: 'index', index });
      i = end + 1;
      if (i < path.length && path[i] === '.') {
        i++; // Skip dot after bracket
      }
    } else {
      // Property
      let end = i;
      while (end < path.length && path[end] !== '.' && path[end] !== '[') {
        end++;
      }
      const key = path.slice(i, end);
      if (key.length > 0) {
        segments.push({ type: 'property', key });
      }
      i = end;
      if (i < path.length && path[i] === '.') {
        i++; // Skip dot separator
      }
    }
  }

  return segments;
}

/**
 * Check if a path exists in the data (value is not undefined).
 */
export function jsonPathExists(data: unknown, path: string): boolean {
  return queryJsonPath(data, path) !== undefined;
}
