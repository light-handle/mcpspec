import type { ProcessManagerImpl } from './process-manager.js';

let registered = false;

export function registerCleanupHandlers(manager: ProcessManagerImpl): void {
  if (registered) return;
  registered = true;

  const cleanup = async (signal: string) => {
    process.stderr.write(`\nReceived ${signal}, cleaning up processes...\n`);
    await manager.shutdownAll();
    process.exit(signal === 'SIGINT' ? 130 : 0);
  };

  process.on('SIGINT', () => { void cleanup('SIGINT'); });
  process.on('SIGTERM', () => { void cleanup('SIGTERM'); });

  process.on('uncaughtException', (err) => {
    process.stderr.write(`Uncaught exception: ${err.message}\n`);
    void manager.shutdownAll().finally(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    process.stderr.write(`Unhandled rejection: ${message}\n`);
  });

  // Synchronous cleanup on normal exit
  process.on('exit', () => {
    // Can't do async here, but try to kill remaining processes
    void manager.shutdownAll();
  });
}

export function resetCleanupHandlers(): void {
  registered = false;
}
