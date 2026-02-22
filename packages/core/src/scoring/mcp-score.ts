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
      const schema = tool.inputSchema;
      if (!schema) continue;

      let toolPoints = 0;
      if (schema.type) toolPoints += 1 / 3;
      if (schema.properties && typeof schema.properties === 'object') toolPoints += 1 / 3;
      if (schema.required && Array.isArray(schema.required)) toolPoints += 1 / 3;
      totalPoints += toolPoints;
    }

    return Math.round((totalPoints / tools.length) * 100);
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
