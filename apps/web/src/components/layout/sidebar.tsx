'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  LayoutDashboard,
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
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.SCHOOL_ADMIN]: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/teachers', label: 'Teachers', icon: Users },
    { href: '/admin/classes', label: 'Classes', icon: GraduationCap },
    { href: '/admin/subjects', label: 'Subjects', icon: Bookmark },
    { href: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  [UserRole.TEACHER]: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/classes', label: 'Classes', icon: BookOpen },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
};

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, toggleSidebar } = useUiStore();

  if (!user) return null;

  const navItems = navByRole[user.role] ?? [];

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      className={cn(
        'sticky top-0 z-40 flex h-screen flex-col',
        'border-r border-white/10 bg-white/[0.02]',
        'backdrop-blur-xl',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {sidebarOpen && (
          <Link href="/" className="font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-200 via-slate-100 to-emerald-200 bg-clip-text text-transparent">
              Syllabus
            </span>
            <span className="text-slate-400">Tracker</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
          <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
                active
                  ? 'text-slate-50'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-xl opacity-0 transition-opacity',
                  'bg-[linear-gradient(135deg,rgba(99,102,241,0.22),rgba(16,185,129,0.12),rgba(168,85,247,0.16))]',
                  'group-hover:opacity-70',
                  active && 'opacity-90',
                )}
              />
              <span
                aria-hidden
                className={cn(
                  'absolute inset-0 rounded-xl opacity-0 transition-opacity',
                  'ring-1 ring-white/10',
                  'group-hover:opacity-100',
                  active && 'opacity-100 ring-white/15',
                )}
              />
              <span className="relative flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              </span>
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && user && (
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.role.replace('_', ' ')}</p>
        </div>
      )}
    </motion.aside>
  );
}
