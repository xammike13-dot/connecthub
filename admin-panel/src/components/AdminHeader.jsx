import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, LogOut, Settings } from 'lucide-react';

const AdminHeader = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-4 md:px-6 py-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left: Hamburger & Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger Button for Mobile/Tablet */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu size={22} className="stroke-[2.5]" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 bg-blue-600 rounded-lg flex items-center justify-center shadow-blue">
              <span className="text-white font-black text-lg">A</span>
            </div>
            <span className="text-xl font-extrabold text-neutral-900 tracking-tight">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Right: Info, Settings, Logout */}
        <div className="flex items-center gap-3">
          {/* Settings icon */}
          <Link
            to="/settings"
            className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none"
            title="Settings"
          >
            <Settings size={19} />
          </Link>

          {/* Divider */}
          <span className="w-[1px] h-5 bg-neutral-200 mx-1"></span>

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2.5 pl-1.5">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-neutral-800 text-xs leading-none">{user?.name || 'Admin User'}</p>
              <p className="text-[10px] text-neutral-400 font-semibold capitalize mt-1 leading-none">{user?.role || 'admin'}</p>
            </div>
            <div
              className="w-9.5 h-9.5 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200"
              title={user?.name || 'Admin'}
            >
              <span className="text-blue-700 font-extrabold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
            title="Logout"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
