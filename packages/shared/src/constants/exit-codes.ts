export const EXIT_CODES = {
  SUCCESS: 0,
  TEST_FAILURE: 1,
  ERROR: 2,
  CONFIG_ERROR: 3,
  CONNECTION_ERROR: 4,
  TIMEOUT: 5,
  SECURITY_FINDINGS: 6,
  VALIDATION_ERROR: 7,
  INTERRUPTED: 130,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
