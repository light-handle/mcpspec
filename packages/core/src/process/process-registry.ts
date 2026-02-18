import type { ManagedProcess } from '@mcpspec/shared';

export class ProcessRegistry {
  private processes = new Map<string, ManagedProcess>();

  register(process: ManagedProcess): void {
    this.processes.set(process.id, process);
  }

  unregister(id: string): void {
    this.processes.delete(id);
  }

  get(id: string): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  has(id: string): boolean {
    return this.processes.has(id);
  }

  get size(): number {
    return this.processes.size;
  }

  clear(): void {
    this.processes.clear();
  }
}
