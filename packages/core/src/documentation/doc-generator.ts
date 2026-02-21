import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { MCPClientInterface } from '../client/mcp-client-interface.js';
import { MarkdownGenerator } from './markdown-generator.js';
import type { ServerDocData } from './markdown-generator.js';
import { HtmlDocGenerator } from './html-generator.js';

export type { ServerDocData } from './markdown-generator.js';

export interface DocGeneratorOptions {
  format: 'markdown' | 'html';
  outputDir?: string;
}

export class DocGenerator {
  async introspect(client: MCPClientInterface): Promise<ServerDocData> {
    const serverInfo = client.getServerInfo();
    const tools = await client.listTools();

    let resources: Awaited<ReturnType<MCPClientInterface['listResources']>> = [];
    try {
      resources = await client.listResources();
    } catch {
      // Server may not support resources
    }

    return {
      serverName: serverInfo?.name ?? 'Unknown Server',
      serverVersion: serverInfo?.version,
      tools,
      resources,
      generatedAt: new Date(),
    };
  }

  async generate(client: MCPClientInterface, options: DocGeneratorOptions): Promise<string> {
    const data = await this.introspect(client);

    let content: string;
    if (options.format === 'html') {
      const generator = new HtmlDocGenerator();
      content = generator.generate(data);
    } else {
      const generator = new MarkdownGenerator();
      content = generator.generate(data);
    }

    if (options.outputDir) {
      mkdirSync(options.outputDir, { recursive: true });
      const filename = options.format === 'html' ? 'index.html' : 'README.md';
      writeFileSync(join(options.outputDir, filename), content, 'utf-8');
    }

    return content;
  }
}
