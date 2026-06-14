import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { clearAdminToken, SIDEBAR_COLLAPSED_KEY } from '../api/client';

export const ADMIN_NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊' },
  { path: 'sports', label: 'Sports', icon: '⚽' },
  { path: 'coaches', label: 'Coaches', icon: '👥' },
  { path: 'batches', label: 'Training Batches', icon: '🏋️‍♂️' },
  { path: 'plans', label: 'Duration Plans', icon: '📅' },
  { path: 'students', label: 'Students', icon: '🎓' },
  { path: 'accounts', label: 'Accounts', icon: '💳' },
  { path: 'performance', label: 'Performance Tracker', icon: '📈' },
  { path: 'enquiries', label: 'Enquiries Desk', icon: '✉️' },
  { path: 'reports', label: 'Reports', icon: '📄' }
];

const PAGE_TITLES = Object.fromEntries(
  ADMIN_NAV_ITEMS.map((item) => [item.path, item.label])
);

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  );

  const section = location.pathname.split('/')[2] || 'dashboard';
  const pageTitle = PAGE_TITLES[section] || 'Academy Workspace';

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/');
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface-secondary transition-all duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'w-[4.5rem]' : 'w-64'}`}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-foreground no-underline">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-xs text-white">
              SA
            </span>
            {!sidebarCollapsed && <span>SAMS Admin</span>}
          </Link>
          <button
            type="button"
            className="btn-ghost hidden text-sm lg:inline-flex"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin sections">
          {ADMIN_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/admin/${item.path}`}
              end
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${sidebarCollapsed ? 'justify-center px-2' : ''}`
              }
              onClick={closeMobileSidebar}
            >
              <span aria-hidden="true">{item.icon}</span>
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Link to="/" className="btn-secondary mb-2 w-full text-center">
            Back to Home
          </Link>
          <button type="button" className="btn-danger w-full" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close sidebar"
          onClick={closeMobileSidebar}
        />
      )}

      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64'}`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-ghost lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-lg font-bold">{pageTitle}</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
