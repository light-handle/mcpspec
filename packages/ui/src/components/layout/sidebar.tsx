import { LayoutDashboard, Server, FileText, Play, Search, Shield, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/servers', label: 'Servers', icon: Server },
  { href: '/collections', label: 'Collections', icon: FileText },
  { href: '/runs', label: 'Runs', icon: Play },
  { href: '/inspect', label: 'Inspect', icon: Search },
  { href: '/audit', label: 'Audit', icon: Shield },
  { href: '/benchmark', label: 'Benchmark', icon: Timer },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-bold text-primary">MCPSpec</h1>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
          return (
            <button
              key={item.href}
              onClick={() => onNavigate(item.href)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">v0.3.0</div>
    </aside>
  );
}
