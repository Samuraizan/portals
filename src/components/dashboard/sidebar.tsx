'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import {
  LayoutDashboard,
  Monitor,
  Upload,
  ListVideo,
  Calendar,
  BarChart3,
  Settings,
  Users,
  LogOut,
  Shield,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    permission: null,
  },
  {
    name: 'Players',
    href: '/players',
    icon: Monitor,
    permission: 'canViewPlayers' as const,
  },
  {
    name: 'Content',
    href: '/content',
    icon: Upload,
    permission: 'canViewPlayers' as const,
  },
  {
    name: 'Playlists',
    href: '/playlists',
    icon: ListVideo,
    permission: 'canViewPlayers' as const,
  },
  {
    name: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    permission: 'canScheduleContent' as const,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permission: 'canViewAnalytics' as const,
  },
];

const adminNavigation = [
  {
    name: 'Access Control',
    href: '/admin/access',
    icon: Shield,
    permission: 'canManageUsers' as const,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    permission: 'canManageUsers' as const,
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    permission: 'canManageUsers' as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { hasPermission } = usePermissions();

  const filteredNavigation = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const filteredAdminNavigation = adminNavigation.filter(
    (item) => hasPermission(item.permission)
  );

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Monitor className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold">Zo Portals</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {filteredAdminNavigation.length > 0 && (
          <>
            <div className="my-4 border-t pt-4">
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </p>
              <ul className="space-y-1">
                {filteredAdminNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {user?.first_name?.[0] || user?.mobile_number?.[0] || '?'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`
                : user?.mobile_number}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.membership || 'Member'}
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

