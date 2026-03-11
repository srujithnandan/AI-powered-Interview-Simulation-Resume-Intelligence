import { useAuth } from '../context/AuthContext';
import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi';
import { HiBars3 } from 'react-icons/hi2';

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      >
        <HiBars3 className="h-6 w-6" />
      </button>

      <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 lg:flex">
        <HiOutlineSearch className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-64 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <HiOutlineBell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
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
