import { useAuth } from '../context/AuthContext';
import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi';
import { HiBars3 } from 'react-icons/hi2';

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 mx-4 mt-4 flex h-16 items-center justify-between rounded-2xl border border-white/70 bg-white/75 px-4 shadow-[0_10px_35px_rgba(2,40,58,0.08)] backdrop-blur lg:mx-8 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-xl p-2 text-slate-500 transition hover:bg-cyan-50 hover:text-cyan-700 lg:hidden"
      >
        <HiBars3 className="h-6 w-6" />
      </button>

      <div className="hidden items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-inner lg:flex">
        <HiOutlineSearch className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search role, session, score..."
          className="w-64 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700">
          <HiOutlineBell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-2 py-1.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-700 text-sm font-semibold text-white">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 md:block">
            {user?.fullName || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
