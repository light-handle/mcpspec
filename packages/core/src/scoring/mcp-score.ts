import type { MCPScore } from '@mcpspec/shared';
import type { MCPClientInterface, ToolInfo } from '../client/mcp-client-interface.js';
import { SecurityScanner } from '../security/security-scanner.js';
import { ScanConfig } from '../security/scan-config.js';

export interface ScoreProgress {
  onCategoryStart?: (category: string) => void;
  onCategoryComplete?: (category: string, score: number) => void;
}

export class MCPScoreCalculator {
  async calculate(client: MCPClientInterface, progress?: ScoreProgress): Promise<MCPScore> {
    const tools = await client.listTools();

    let resources: Awaited<ReturnType<MCPClientInterface['listResources']>> = [];
    try {
      resources = await client.listResources();
    } catch {
      // Server may not support resources
    }

    progress?.onCategoryStart?.('documentation');
    const documentation = this.scoreDocumentation(tools, resources);
    progress?.onCategoryComplete?.('documentation', documentation);

    progress?.onCategoryStart?.('schemaQuality');
    const schemaQuality = this.scoreSchemaQuality(tools);
    progress?.onCategoryComplete?.('schemaQuality', schemaQuality);

    progress?.onCategoryStart?.('errorHandling');
    const errorHandling = await this.scoreErrorHandling(client, tools);
    progress?.onCategoryComplete?.('errorHandling', errorHandling);

    progress?.onCategoryStart?.('responsiveness');
    const responsiveness = await this.scoreResponsiveness(client, tools);
    progress?.onCategoryComplete?.('responsiveness', responsiveness);

    progress?.onCategoryStart?.('security');
    const security = await this.scoreSecurity(client);
    progress?.onCategoryComplete?.('security', security);

    const overall = Math.round(
      documentation * 0.25 +
      schemaQuality * 0.25 +
      errorHandling * 0.20 +
      responsiveness * 0.15 +
      security * 0.15,
    );

    return {
      overall,
      categories: {
        documentation,
        schemaQuality,
        errorHandling,
        responsiveness,
        security,
      },
    };
  }

  private scoreDocumentation(
    tools: ToolInfo[],
    resources: Awaited<ReturnType<MCPClientInterface['listResources']>>,
  ): number {
    const items = [...tools, ...resources];
    if (items.length === 0) return 0;

    const withDescription = items.filter((item) => {
      const desc = 'description' in item ? item.description : undefined;
      return desc && desc.trim().length > 0;
    }).length;

    return Math.round((withDescription / items.length) * 100);
  }

  private scoreSchemaQuality(tools: ToolInfo[]): number {
    if (tools.length === 0) return 0;

    let totalPoints = 0;
    for (const tool of tools) {
      totalPoints += this.scoreToolSchema(tool);
    }

    return Math.round((totalPoints / tools.length) * 100);
  }

  /** Score a single tool's schema from 0.0 to 1.0 across 6 weighted criteria. */
  private scoreToolSchema(tool: ToolInfo): number {
    const schema = tool.inputSchema;
    if (!schema) return 0;

    // Weight: structure 20%, types 20%, descriptions 20%, required 15%, constraints 15%, naming 10%
    let score = 0;

    // 1. Structure (20%): has type + properties
    const hasType = !!schema.type;
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    const hasProperties = properties && typeof properties === 'object' && Object.keys(properties).length > 0;
    score += (hasType ? 0.1 : 0) + (hasProperties ? 0.1 : 0);

    if (!hasProperties || !properties) return score;

    const propEntries = Object.entries(properties);

    // 2. Property types (20%): every property should have a `type` field
    const withType = propEntries.filter(([, prop]) => !!prop.type).length;
    score += (withType / propEntries.length) * 0.2;

    // 3. Property descriptions (20%): every property should have a `description`
    const withDesc = propEntries.filter(([, prop]) => {
      const desc = prop.description;
      return typeof desc === 'string' && desc.trim().length > 0;
    }).length;
    score += (withDesc / propEntries.length) * 0.2;

    // 4. Required array (15%): present and non-empty
    const required = schema.required;
    if (Array.isArray(required) && required.length > 0) {
      score += 0.15;
    }

    // 5. Constraints (15%): properties use enum, pattern, min/max, minLength, etc.
    const constraintKeys = ['enum', 'pattern', 'minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'format', 'default'];
    const withConstraints = propEntries.filter(([, prop]) => {
      // Direct constraints
      if (constraintKeys.some((k) => prop[k] !== undefined)) return true;
      // Nested object with own properties
      if (prop.type === 'object' && prop.properties && typeof prop.properties === 'object') {
        const nested = prop.properties as Record<string, Record<string, unknown>>;
        return Object.keys(nested).length > 0 &&
          Object.values(nested).some((np) => !!np.type);
      }
      // Array with items schema
      if (prop.type === 'array' && prop.items && typeof prop.items === 'object') return true;
      return false;
    }).length;
    score += (withConstraints / propEntries.length) * 0.15;

    // 6. Naming conventions (10%): consistent camelCase or snake_case
    const names = propEntries.map(([name]) => name);
    const camelCount = names.filter((n) => /^[a-z][a-zA-Z0-9]*$/.test(n)).length;
    const snakeCount = names.filter((n) => /^[a-z][a-z0-9_]*$/.test(n)).length;
    const bestConvention = Math.max(camelCount, snakeCount);
    score += (bestConvention / names.length) * 0.1;

    return score;
  }

  private async scoreErrorHandling(client: MCPClientInterface, tools: ToolInfo[]): Promise<number> {
    if (tools.length === 0) return 0;

    const testTools = tools.slice(0, 5);
    let totalScore = 0;

    for (const tool of testTools) {
      try {
        const result = await client.callTool(tool.name, {});
        if (result.isError) {
          // Check if the error response is structured (has meaningful content)
          const content = result.content;
          let isStructured = false;
          if (Array.isArray(content) && content.length > 0) {
            isStructured = content.some((c) => {
              const item = c as Record<string, unknown>;
              const text = item['text'];
              if (typeof text !== 'string') return false;
              try {
                const parsed = JSON.parse(text);
                return typeof parsed === 'object' && parsed !== null &&
                  ('code' in parsed || 'message' in parsed || 'error' in parsed);
              } catch {
                return false; // Plain text — not structured
              }
            });
          }
          // Structured JSON error = 100, plain text error = 80
          totalScore += isStructured ? 100 : 80;
        } else {
          // Tool succeeded with empty args — may be legitimate (e.g. list operations)
          // Check if the tool actually requires parameters
          const schema = tool.inputSchema;
          const hasRequired = schema && Array.isArray(schema.required) && schema.required.length > 0;
          totalScore += hasRequired ? 30 : 50; // Lower score if it should have rejected empty args
        }
      } catch {
        totalScore += 0; // Connection crash or unhandled error
      }
    }

    return Math.round(totalScore / testTools.length);
  }

  private async scoreResponsiveness(client: MCPClientInterface, tools: ToolInfo[]): Promise<number> {
    if (tools.length === 0) return 20;

    const tool = tools[0]!;
    const latencies: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      try {
        await client.callTool(tool.name, {});
      } catch {
        // Still measure latency even if call fails
      }
      latencies.push(performance.now() - start);
    }

    // Sort and take median
    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)]!;

    if (median < 100) return 100;
    if (median < 500) return 80;
    if (median < 1000) return 60;
    if (median < 5000) return 40;
    return 20;
  }

  private async scoreSecurity(client: MCPClientInterface): Promise<number> {
    try {
      const scanner = new SecurityScanner();
      const config = new ScanConfig({ mode: 'passive' });
      const result = await scanner.scan(client, config);
      const findingCount = result.summary.totalFindings;

      if (findingCount === 0) return 100;
      if (findingCount <= 2) return 70;
      if (findingCount <= 5) return 40;
      return 20;
    } catch {
      return 50; // Cannot determine; give middle score
    }
  }
}
