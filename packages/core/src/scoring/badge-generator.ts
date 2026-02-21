import type { MCPScore } from '@mcpspec/shared';

export class BadgeGenerator {
  generate(score: MCPScore): string {
    const color = this.getColor(score.overall);
    const label = 'MCP Score';
    const value = `${score.overall}/100`;
    const labelWidth = 70;
    const valueWidth = 50;
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
  }

  getColor(score: number): string {
    if (score >= 80) return '#4c1';
    if (score >= 60) return '#dfb317';
    return '#e05d44';
  }
}
