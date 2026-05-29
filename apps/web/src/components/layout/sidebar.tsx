'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Settings,
  Users,
  CreditCard,
  ChevronLeft,
} from 'lucide-react';
import { UserRole } from '@school-syllabus/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import { Button } from '@/components/ui/button';

const navByRole: Record<UserRole, { href: string; label: string; icon: React.ElementType }[]> = {
  [UserRole.SUPER_ADMIN]: [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/schools', label: 'Schools', icon: School },
    { href: '/super-admin/plans', label: 'Plans', icon: CreditCard },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.SCHOOL_ADMIN]: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: Bookmark },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.TEACHER]: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'Classes', icon: BookOpen },
    { href: '/teacher/settings', label: 'Settings', icon: Settings },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const router = useRouter();

  const handleLogout = () => {
    clearAuth();
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/login');
  };

  if (!user) return null;

  const navItems = navByRole[user.role] ?? [];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 68 }}
      className="sticky top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white"
    >
      {/* Logo row */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {sidebarOpen && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a73e8] to-[#1558b0]">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#1a73e8]">SyllabusTracker</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/30',
                active
                  ? 'bg-[#E8EEFF] text-[#1a73e8]'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-xs font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="truncate text-xs text-gray-400">{user.role.replace('_', ' ')}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
