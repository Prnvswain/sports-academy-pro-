import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Navbar, { NavbarActions } from '../components/Navbar';
import { clearCoachToken } from '../api/client';
import { CoachBatchesProvider } from '../context/CoachBatchesContext';

const COACH_NAV = [
  { path: 'dashboard', label: 'Dashboard' },
  { path: 'attendance', label: 'Attendance' },
  { path: 'performance', label: 'Performance Tracker' },
  { path: 'notes', label: 'Daily Notes' },
  { path: 'fees', label: 'Fees' },
  { path: 'my-attendance', label: 'My Attendance' }
];

function CoachLayoutShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearCoachToken();
    navigate('/coach/login');
  };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar brandTo="/coach/dashboard">
        <nav className="hidden items-center gap-4 md:flex">
          {COACH_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={`/coach/${item.path}`}
              end
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-accent' : 'text-muted hover:text-foreground'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavbarActions>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            Sign Out
          </button>
        </NavbarActions>
      </Navbar>

      <div className="border-b border-border bg-surface-secondary px-4 py-2 md:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {COACH_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={`/coach/${item.path}`}
              end
              className={({ isActive }) =>
                `shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  isActive ? 'bg-accent text-white' : 'bg-surface text-muted'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        SAMS Coach Portal
      </footer>
    </div>
  );
}

export default function CoachLayout() {
  return (
    <CoachBatchesProvider>
      <CoachLayoutShell />
    </CoachBatchesProvider>
  );
}
