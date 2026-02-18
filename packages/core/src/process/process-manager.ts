import { execaCommand } from 'execa';
import { randomUUID } from 'node:crypto';
import type { ProcessConfig, ManagedProcess } from '@mcpspec/shared';
import { ProcessRegistry } from './process-registry.js';
import { MCPSpecError } from '../errors/mcpspec-error.js';
import type { ChildProcess } from 'node:child_process';

interface InternalProcess extends ManagedProcess {
  childProcess: ChildProcess;
}

export class ProcessManagerImpl {
  private registry: ProcessRegistry;
  private readonly defaultGracePeriod = 5000;

  constructor(registry?: ProcessRegistry) {
    this.registry = registry ?? new ProcessRegistry();
  }

  async spawn(config: ProcessConfig): Promise<ManagedProcess> {
    const id = randomUUID();
    const fullCommand = [config.command, ...config.args].join(' ');

    try {
      const child = execaCommand(fullCommand, {
        cwd: config.cwd,
        env: { ...process.env, ...config.env },
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        buffer: false,
        timeout: config.timeout,
      });

      if (!child.pid || !child.stdin || !child.stdout || !child.stderr) {
        throw new MCPSpecError('PROCESS_SPAWN_FAILED', `Failed to spawn process: ${fullCommand}`, {
          command: fullCommand,
        });
      }

      const managed: InternalProcess = {
        id,
        pid: child.pid,
        command: config.command,
        args: config.args,
        startedAt: new Date(),
        stdin: child.stdin,
        stdout: child.stdout,
        stderr: child.stderr,
        childProcess: child as unknown as ChildProcess,
      };

      this.registry.register(managed);

      // Auto-cleanup on exit
      child.then(() => {
        this.registry.unregister(id);
      }).catch(() => {
        this.registry.unregister(id);
      });

      return managed;
    } catch (err) {
      if (err instanceof MCPSpecError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new MCPSpecError('PROCESS_SPAWN_FAILED', `Failed to spawn process: ${message}`, {
        command: fullCommand,
        error: message,
      });
    }
  }

  async shutdown(processId: string, gracePeriodMs?: number): Promise<void> {
    const managed = this.registry.get(processId) as InternalProcess | undefined;
    if (!managed) return;

    const grace = gracePeriodMs ?? this.defaultGracePeriod;

    try {
      managed.childProcess.kill('SIGTERM');

      await Promise.race([
        new Promise<void>((resolve) => {
          managed.childProcess.on('exit', () => resolve());
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Grace period exceeded')), grace),
        ),
      ]);
    } catch {
      // Force kill if graceful shutdown failed
      try {
        managed.childProcess.kill('SIGKILL');
      } catch {
        // Process may already be dead
      }
    } finally {
      this.registry.unregister(processId);
    }
  }

  async shutdownAll(): Promise<void> {
    const processes = this.registry.getAll() as InternalProcess[];
    await Promise.allSettled(processes.map((p) => this.shutdown(p.id)));
  }

  isAlive(processId: string): boolean {
    const managed = this.registry.get(processId) as InternalProcess | undefined;
    if (!managed) return false;
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(managed.pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  getRegistry(): ProcessRegistry {
    return this.registry;
  }
}
