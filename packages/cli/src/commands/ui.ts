import { Command } from 'commander';

export const uiCommand = new Command('ui')
  .description('Launch the MCPSpec web UI')
  .option('-p, --port <port>', 'Port to listen on', '6274')
  .option('--host <host>', 'Host to bind to', '127.0.0.1')
  .option('--no-open', 'Do not auto-open browser')
  .action(async (opts: { port: string; host: string; open: boolean }) => {
    const port = parseInt(opts.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Invalid port number');
      process.exit(1);
    }

    // Dynamic import to keep CLI startup fast
    const { startServer, UI_DIST_PATH } = await import('@mcpspec/server');

    const uiDistPath = UI_DIST_PATH;

    const server = await startServer({
      port,
      host: opts.host,
      uiDistPath,
    });

    const url = `http://${server.host}:${server.port}`;

    if (opts.open) {
      try {
        const { default: open } = await import('open');
        await open(url);
      } catch {
        console.log(`Open ${url} in your browser`);
      }
    }

    // Keep process running
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      server.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      server.close();
      process.exit(0);
    });
  });
