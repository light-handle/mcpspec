import { describe, it, expect, beforeEach } from 'vitest';
import { SecretMasker } from '../../src/utils/secret-masker.js';

describe('SecretMasker', () => {
  let masker: SecretMasker;

  beforeEach(() => {
    masker = new SecretMasker();
  });

  it('should mask registered secrets', () => {
    masker.register('my-secret-token');
    expect(masker.mask('The token is my-secret-token here')).toBe(
      'The token is ***REDACTED*** here',
    );
  });

  it('should mask multiple secrets', () => {
    masker.register('secret1');
    masker.register('secret2');
    const result = masker.mask('Found secret1 and secret2');
    expect(result).toBe('Found ***REDACTED*** and ***REDACTED***');
  });

  it('should not register secrets shorter than 4 chars', () => {
    masker.register('abc');
    expect(masker.size).toBe(0);
    expect(masker.mask('abc')).toBe('abc');
  });

  it('should register secrets from env vars', () => {
    masker.registerFromEnv({
      API_KEY: 'my-api-key-123',
      DATABASE_URL: 'postgres://localhost',
      SECRET_TOKEN: 'super-secret',
      NORMAL_VAR: 'nothing-special',
      PASSWORD: 'hunter2',
    });
    expect(masker.size).toBe(3); // API_KEY, SECRET_TOKEN, PASSWORD
    expect(masker.mask('my-api-key-123')).toBe('***REDACTED***');
    expect(masker.mask('super-secret')).toBe('***REDACTED***');
    expect(masker.mask('hunter2')).toBe('***REDACTED***');
    expect(masker.mask('nothing-special')).toBe('nothing-special');
  });

  it('should handle text with no matching secrets', () => {
    masker.register('my-token-xyz');
    expect(masker.mask('no secrets here')).toBe('no secrets here');
  });

  it('should clear all secrets', () => {
    masker.register('my-secret');
    masker.clear();
    expect(masker.size).toBe(0);
    expect(masker.mask('my-secret')).toBe('my-secret');
  });

  it('should mask all occurrences of a secret', () => {
    masker.register('token123');
    expect(masker.mask('token123 and token123')).toBe('***REDACTED*** and ***REDACTED***');
  });
});
