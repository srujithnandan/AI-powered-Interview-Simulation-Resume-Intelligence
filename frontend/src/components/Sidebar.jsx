import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout as logoutApi } from '../services/authService';
import {
  HiOutlineHome,
  HiOutlineDocumentText,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChartBar,
  HiOutlineUser,
  HiOutlineArrowRightOnRectangle,
  HiOutlineXMark,
} from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { to: '/resume', label: 'Resume Analyzer', icon: HiOutlineDocumentText },
  { to: '/interview', label: 'Interview Simulator', icon: HiOutlineChatBubbleLeftRight },
  { to: '/analytics', label: 'Analytics', icon: HiOutlineChartBar },
  { to: '/profile', label: 'Profile', icon: HiOutlineUser },
];

export default function Sidebar({ open, onClose }) {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    logoutUser();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
      isActive
        ? 'bg-gradient-to-r from-cyan-50 to-sky-100 text-sky-800 shadow-sm ring-1 ring-cyan-200/70'
        : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white/95 shadow-[0_14px_35px_rgba(2,40,58,0.1)] backdrop-blur transition-transform lg:static lg:w-72 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-700 text-sm font-bold text-white shadow-sm">
              AI
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-900">Interview & Resume</span>
              <span className="block text-[11px] font-medium text-slate-500">Career Flight Deck</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} onClick={onClose}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-200 px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
