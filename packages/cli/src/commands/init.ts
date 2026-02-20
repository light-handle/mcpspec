import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { EXIT_CODES } from '@mcpspec/shared';
import type { WizardResult } from '../wizard/onboarding.js';

const TEMPLATES = {
  minimal: `name: My MCP Tests
server: npx my-mcp-server

tests:
  - name: Basic test
    call: my_tool
    with:
      param: value
    expect:
      - exists: $.content
`,
  standard: `schemaVersion: "1.0"
name: My MCP Tests
description: Test collection for my MCP server

server:
  transport: stdio
  command: npx
  args:
    - my-mcp-server

tests:
  - name: List tools are available
    call: my_tool
    with:
      param: value
    assertions:
      - type: exists
        path: $.content
      - type: latency
        maxMs: 5000

  - name: Handle invalid input
    call: my_tool
    with:
      invalid_param: true
    expectError: true
`,
  full: `schemaVersion: "1.0"
name: My MCP Tests
description: Comprehensive test collection

server:
  name: my-server
  transport: stdio
  command: npx
  args:
    - my-mcp-server
  env:
    NODE_ENV: test

environments:
  dev:
    variables:
      API_URL: http://localhost:3000
  staging:
    variables:
      API_URL: https://staging.example.com

defaultEnvironment: dev

tests:
  - id: test-basic
    name: Basic tool call
    tags:
      - smoke
    call: my_tool
    with:
      param: value
    assertions:
      - type: schema
      - type: exists
        path: $.content
      - type: latency
        maxMs: 5000

  - id: test-error
    name: Handle error gracefully
    tags:
      - error-handling
    call: my_tool
    with:
      invalid: true
    expectError: true

  - id: test-extract
    name: Extract and reuse data
    tags:
      - integration
    call: get_data
    with:
      id: "1"
    assertions:
      - type: exists
        path: $.id
    extract:
      - name: itemId
        path: $.id

  - id: test-use-extracted
    name: Use extracted variable
    tags:
      - integration
    call: get_detail
    with:
      id: "{{itemId}}"
    assertions:
      - type: exists
        path: $.detail
`,
};

function generateFromWizard(result: WizardResult): string {
  const serverBlock = result.transport === 'stdio'
    ? `server: ${result.command}`
    : `server:\n  transport: ${result.transport}\n  url: ${result.url}`;

  // Use the template but override name and server
  const template = TEMPLATES[result.template];
  const lines = template.split('\n');
  const output: string[] = [];
  let skipServer = false;

  for (const line of lines) {
    if (line.startsWith('name:')) {
      output.push(`name: ${result.name}`);
    } else if (line.startsWith('server:') || line.startsWith('server ')) {
      output.push(serverBlock);
      // If original template had multi-line server config, skip those lines
      if (line === 'server:') {
        skipServer = true;
      }
    } else if (skipServer) {
      if (line.startsWith('  ') && !line.startsWith('  -') && !line.match(/^\w/)) {
        // Skip indented server config lines
        // But stop at "tests:" or other top-level keys
        if (line.match(/^[a-zA-Z]/)) {
          skipServer = false;
          output.push(line);
        }
        continue;
      } else {
        skipServer = false;
        output.push(line);
      }
    } else {
      output.push(line);
    }
  }

  return output.join('\n');
}

export const initCommand = new Command('init')
  .description('Initialize a new mcpspec project')
  .argument('[directory]', 'Target directory', '.')
  .option('--template <type>', 'Template type: minimal, standard, full')
  .action(async (directory: string, options: { template?: string }) => {
    const dir = resolve(directory);

    try {
      // If no template specified and stdin is TTY, run wizard
      if (!options.template && process.stdin.isTTY) {
        const { runOnboardingWizard } = await import('../wizard/onboarding.js');
        const result = await runOnboardingWizard();

        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const collectionPath = join(dir, 'mcpspec.yaml');
        if (existsSync(collectionPath)) {
          console.error(`File already exists: ${collectionPath}`);
          process.exit(EXIT_CODES.CONFIG_ERROR);
        }

        const content = generateFromWizard(result);
        writeFileSync(collectionPath, content, 'utf-8');
        console.log(`\nCreated ${collectionPath}`);
        console.log(`\nEdit the file to configure your tests, then run: mcpspec test`);
        return;
      }

      // Use specified template or default
      const template = (options.template ?? 'standard') as keyof typeof TEMPLATES;

      if (!TEMPLATES[template]) {
        console.error(`Unknown template: ${template}. Available: minimal, standard, full`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const collectionPath = join(dir, 'mcpspec.yaml');

      if (existsSync(collectionPath)) {
        console.error(`File already exists: ${collectionPath}`);
        process.exit(EXIT_CODES.CONFIG_ERROR);
      }

      writeFileSync(collectionPath, TEMPLATES[template], 'utf-8');
      console.log(`Created ${collectionPath}`);
      console.log(`\nEdit the file to configure your MCP server and tests.`);
      console.log(`Then run: mcpspec test`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to initialize: ${message}`);
      process.exit(EXIT_CODES.ERROR);
    }
  });
