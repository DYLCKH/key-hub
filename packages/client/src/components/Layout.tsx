import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Key,
  Globe,
  Ticket,
  FileText,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/channels', icon: Server, label: 'Channels' },
  { to: '/keys', icon: Key, label: 'Keys' },
  { to: '/proxies', icon: Globe, label: 'Proxies' },
  { to: '/tokens', icon: Ticket, label: 'Tokens' },
  { to: '/logs', icon: FileText, label: 'Logs' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <KeyRound className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Key Hub</span>
          </div>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t text-xs text-muted-foreground">
          Key Hub v1.0.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
