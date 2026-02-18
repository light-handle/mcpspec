export class SecretMasker {
  private secrets = new Set<string>();
  private static readonly REDACTED = '***REDACTED***';
  private static readonly SECRET_PATTERNS = [
    /api[_-]?key/i,
    /password/i,
    /secret/i,
    /token/i,
    /credential/i,
    /auth/i,
    /private[_-]?key/i,
  ];
  private static readonly MIN_SECRET_LENGTH = 4;

  register(secret: string): void {
    if (secret.length >= SecretMasker.MIN_SECRET_LENGTH) {
      this.secrets.add(secret);
    }
  }

  registerFromEnv(env: Record<string, string>): void {
    for (const [key, value] of Object.entries(env)) {
      if (
        SecretMasker.SECRET_PATTERNS.some((p) => p.test(key)) &&
        value.length >= SecretMasker.MIN_SECRET_LENGTH
      ) {
        this.secrets.add(value);
      }
    }
  }

  mask(text: string): string {
    let masked = text;
    for (const secret of this.secrets) {
      masked = masked.replaceAll(secret, SecretMasker.REDACTED);
    }
    return masked;
  }

  clear(): void {
    this.secrets.clear();
  }

  get size(): number {
    return this.secrets.size;
  }
}
