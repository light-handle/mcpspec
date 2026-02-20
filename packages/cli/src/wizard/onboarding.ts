import { input, select, confirm } from '@inquirer/prompts';

export interface WizardResult {
  name: string;
  transport: 'stdio' | 'sse' | 'streamable-http';
  command?: string;
  url?: string;
  template: 'minimal' | 'standard' | 'full';
}

export async function runOnboardingWizard(): Promise<WizardResult> {
  console.log('\n  Welcome to MCPSpec! Let\'s set up your test collection.\n');

  const name = await input({
    message: 'Collection name:',
    default: 'My MCP Tests',
  });

  const transport = await select({
    message: 'How does your MCP server communicate?',
    choices: [
      { name: 'stdio (command-line process)', value: 'stdio' as const },
      { name: 'SSE (Server-Sent Events)', value: 'sse' as const },
      { name: 'Streamable HTTP', value: 'streamable-http' as const },
    ],
  });

  let command: string | undefined;
  let url: string | undefined;

  if (transport === 'stdio') {
    command = await input({
      message: 'Server command (e.g., npx @modelcontextprotocol/server-filesystem /tmp):',
      default: 'npx my-mcp-server',
    });
  } else {
    url = await input({
      message: 'Server URL:',
      default: 'http://localhost:3000/mcp',
    });
  }

  const template = await select({
    message: 'Template complexity:',
    choices: [
      { name: 'Minimal - simple tests to get started', value: 'minimal' as const },
      { name: 'Standard - tests with assertions (Recommended)', value: 'standard' as const },
      { name: 'Full - environments, tags, extraction', value: 'full' as const },
    ],
  });

  return { name, transport, command, url, template };
}
