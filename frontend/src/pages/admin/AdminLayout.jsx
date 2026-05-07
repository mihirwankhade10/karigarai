import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { mockApi } from '../../lib/mockApi';
import { initials, cn } from '../../lib/utils';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/candidates', icon: Users, label: 'All Candidates' },
  { to: '/admin/flagged', icon: AlertTriangle, label: 'Flagged Cases', badge: true },
  { to: '/admin/shortlisted', icon: CheckCircle, label: 'Shortlisted' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const admin = useAppStore((s) => s.adminUser);
  const logout = useAppStore((s) => s.logoutAdmin);

  const [flaggedCount, setFlaggedCount] = useState(0);

  useEffect(() => {
    let alive = true;
    mockApi.getFlaggedCandidates().then((rows) => { if (alive) setFlaggedCount(rows.length); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleLogout = async () => {
    try { await mockApi.adminLogout(); } catch (_) { /* ignore */ }
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen flex bg-bg-light">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="text-xl font-extrabold tracking-tight text-slate-900">
            Karigar<span className="text-brand">AI</span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-slate-400 mt-0.5">Admin Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && flaggedCount > 0 && (
                  <span className="rounded-full bg-danger text-white text-[10px] font-bold px-2 py-0.5">
                    {flaggedCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 h-11 mx-3 mb-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>

        {admin && (
          <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand to-brand-700 text-white font-bold flex items-center justify-center text-sm">
              {initials(admin.name)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{admin.name}</div>
              <div className="text-xs text-slate-500 truncate">{admin.district}</div>
            </div>
          </div>
        )}
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4 h-12">
        <div className="font-bold text-slate-900">
          Karigar<span className="text-brand">AI</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-slate-500">
          Logout
        </button>
      </div>

      <main className="flex-1 min-w-0 pt-12 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
