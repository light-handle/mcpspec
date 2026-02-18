export interface ProgressReporter {
  start(total: number, label: string): void;
  update(current: number): void;
  complete(): void;
  fail(message: string): void;
}

export class ConsoleProgressReporter implements ProgressReporter {
  private total = 0;
  private label = '';
  private startTime = 0;

  start(total: number, label: string): void {
    this.total = total;
    this.label = label;
    this.startTime = Date.now();
    process.stderr.write(`${label} [0/${total}]`);
  }

  update(current: number): void {
    const elapsed = Date.now() - this.startTime;
    process.stderr.write(`\r${this.label} [${current}/${this.total}] (${elapsed}ms)`);
  }

  complete(): void {
    const elapsed = Date.now() - this.startTime;
    process.stderr.write(`\r${this.label} [${this.total}/${this.total}] done in ${elapsed}ms\n`);
  }

  fail(message: string): void {
    process.stderr.write(`\r${this.label} FAILED: ${message}\n`);
  }
}

export class SilentProgressReporter implements ProgressReporter {
  start(_total: number, _label: string): void {}
  update(_current: number): void {}
  complete(): void {}
  fail(_message: string): void {}
}
