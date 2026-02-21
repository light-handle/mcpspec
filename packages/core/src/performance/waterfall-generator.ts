import type { ProfileEntry, WaterfallEntry } from '@mcpspec/shared';

export class WaterfallGenerator {
  generate(entries: ProfileEntry[]): WaterfallEntry[] {
    if (entries.length === 0) return [];

    const minStart = Math.min(...entries.map((e) => e.startMs));

    return entries.map((entry) => ({
      label: `${entry.toolName}${entry.success ? '' : ' (ERR)'}`,
      startMs: entry.startMs - minStart,
      durationMs: entry.durationMs,
    }));
  }

  toAscii(entries: WaterfallEntry[], width: number = 60): string {
    if (entries.length === 0) return '';

    const maxEnd = Math.max(...entries.map((e) => e.startMs + e.durationMs));
    if (maxEnd === 0) return '';

    const maxLabelLen = Math.max(...entries.map((e) => e.label.length));
    const barWidth = width - maxLabelLen - 12; // space for label + duration text

    const lines: string[] = [];

    for (const entry of entries) {
      const label = entry.label.padEnd(maxLabelLen);
      const startCol = Math.floor((entry.startMs / maxEnd) * barWidth);
      const endCol = Math.max(startCol + 1, Math.floor(((entry.startMs + entry.durationMs) / maxEnd) * barWidth));

      const prefix = ' '.repeat(startCol);
      const bar = '\u2588'.repeat(endCol - startCol);
      const suffix = ` ${entry.durationMs.toFixed(1)}ms`;

      lines.push(`${label} |${prefix}${bar}${suffix}`);
    }

    return lines.join('\n');
  }
}
