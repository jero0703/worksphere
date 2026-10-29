import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationApi } from '../../api/notificationApi';
import { Bell, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationApi.getUnreadCount();
        if (isMounted && res?.unread_count !== undefined) {
          setUnreadCount(res.unread_count);
        }
      } catch (err) {
        // Silently ignore background polling errors
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // refresh every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'HR':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'EMPLOYEE':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          type="button"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden focus:outline-none"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight">
            WorkSphere HRMS
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell */}
        <button
          type="button"
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 ? (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-slate-300 rounded-full" />
          )}
        </button>

        {/* User Badge & Profile */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity focus:outline-none"
            title="View Profile & Settings"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">
                {user?.employee?.full_name || user?.username}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadge(user?.role)}`}>
                  {user?.role}
                </span>
                <span className="text-xs text-slate-500">
                  {user?.employee?.department || 'Staff'}
                </span>
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-semibold text-sm shadow-sm hover:ring-2 hover:ring-indigo-400 transition-all">
              {user?.employee?.full_name ? user.employee.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
          </button>

          {/* Quick Logout */}
          <button
            onClick={handleLogout}
            type="button"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors focus:outline-none"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
