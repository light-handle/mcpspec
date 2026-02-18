import type { ErrorTemplate } from '@mcpspec/shared';

export const ERROR_TEMPLATES: Record<string, ErrorTemplate> = {
  CONNECTION_TIMEOUT: {
    title: 'Connection Timed Out',
    description: 'Could not connect to the MCP server within {{timeout}}ms.',
    suggestions: [
      'Verify the server is running',
      'Check the command/URL is correct',
      'Increase timeout with --timeout flag',
    ],
    docs: 'https://mcpspec.dev/docs/troubleshooting#connection-timeout',
  },
  CONNECTION_REFUSED: {
    title: 'Connection Refused',
    description: 'The MCP server at {{target}} refused the connection.',
    suggestions: [
      'Verify the server is running and accepting connections',
      'Check the port number is correct',
      'Ensure no firewall is blocking the connection',
    ],
    docs: 'https://mcpspec.dev/docs/troubleshooting#connection-refused',
  },
  PROCESS_SPAWN_FAILED: {
    title: 'Failed to Start Server',
    description: 'Could not spawn process: {{command}}',
    suggestions: [
      'Verify the command exists and is in PATH',
      'Check that all required dependencies are installed',
      'Try running the command directly in your terminal',
    ],
  },
  PROCESS_CRASHED: {
    title: 'Server Process Crashed',
    description: 'The MCP server process exited unexpectedly with code {{exitCode}}.',
    suggestions: [
      'Check the server logs for errors',
      'Ensure the server has the required environment variables',
      'Try running the server command directly to see errors',
    ],
  },
  TOOL_NOT_FOUND: {
    title: 'Tool Not Found',
    description: 'The tool "{{toolName}}" does not exist on this server.',
    suggestions: [
      'Available tools: {{availableTools}}',
      'Run `mcpspec inspect` to see all available tools',
      'Check for typos in the tool name',
    ],
  },
  COLLECTION_PARSE_ERROR: {
    title: 'Collection Parse Error',
    description: 'Failed to parse collection file: {{filePath}}',
    suggestions: [
      'Check YAML syntax is valid',
      'Ensure the file is UTF-8 encoded',
      'Validate against the collection schema',
    ],
  },
  COLLECTION_VALIDATION_ERROR: {
    title: 'Collection Validation Error',
    description: 'Collection file has invalid structure: {{details}}',
    suggestions: [
      'Check required fields: name, server, tests',
      'Ensure each test has a name and a tool/call',
      'See collection docs for the correct format',
    ],
    docs: 'https://mcpspec.dev/docs/collections',
  },
  YAML_TOO_LARGE: {
    title: 'YAML File Too Large',
    description: 'The YAML file exceeds the maximum size of {{maxSize}} bytes.',
    suggestions: [
      'Split large collections into multiple files',
      'Remove unused tests or data',
    ],
  },
  TIMEOUT: {
    title: 'Operation Timed Out',
    description: 'The operation did not complete within {{timeout}}ms.',
    suggestions: [
      'Increase the timeout in your collection or CLI flags',
      'Check if the server is responding slowly',
      'Reduce the complexity of the test',
    ],
  },
};
