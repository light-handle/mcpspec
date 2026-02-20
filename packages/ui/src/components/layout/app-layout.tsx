import type { ReactNode } from 'react';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function AppLayout({ children, currentPath, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar currentPath={currentPath} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
