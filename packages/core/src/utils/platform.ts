import { platform, arch, release, tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

export interface PlatformInfo {
  os: NodeJS.Platform;
  arch: string;
  release: string;
  nodeVersion: string;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  tmpDir: string;
  homeDir: string;
  dataDir: string;
}

export function getPlatformInfo(): PlatformInfo {
  const os = platform();
  return {
    os,
    arch: arch(),
    release: release(),
    nodeVersion: process.version,
    isWindows: os === 'win32',
    isMacOS: os === 'darwin',
    isLinux: os === 'linux',
    tmpDir: tmpdir(),
    homeDir: homedir(),
    dataDir: getDataDir(os),
  };
}

function getDataDir(os: NodeJS.Platform): string {
  if (os === 'win32') {
    return join(process.env['APPDATA'] ?? join(homedir(), 'AppData', 'Roaming'), 'mcpspec');
  }
  if (os === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'mcpspec');
  }
  // Linux / other: XDG
  return join(process.env['XDG_DATA_HOME'] ?? join(homedir(), '.local', 'share'), 'mcpspec');
}

/**
 * Get the correct shell command for the platform
 */
export function getShellCommand(): { shell: string; flag: string } {
  if (platform() === 'win32') {
    return { shell: 'cmd.exe', flag: '/c' };
  }
  return { shell: '/bin/sh', flag: '-c' };
}
