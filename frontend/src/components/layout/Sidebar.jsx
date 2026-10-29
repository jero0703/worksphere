import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Bell,
  Shield,
  Briefcase,
  Clock,
  X,
  FileText,
  Award,
  BarChart3,
  CheckSquare,
  ListTodo,
  Megaphone,
  LogOut,
  MessageSquareHeart,
  UserCog,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;

  const getDashboardPath = () => {
    if (role === 'ADMIN') return '/admin/dashboard';
    if (role === 'HR') return '/hr/dashboard';
    return '/employee/dashboard';
  };

  const navSections = [
    {
      title: 'Main',
      items: [
        {
          name: 'Dashboard',
          path: getDashboardPath(),
          icon: LayoutDashboard,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Profile & Settings',
          path: '/profile',
          icon: UserCog,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Notifications',
          path: '/notifications',
          icon: Bell,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
      ],
    },
    {
      title: 'Operations & People',
      items: [
        {
          name: 'Employees',
          path: '/employees',
          icon: Users,
          roles: ['ADMIN', 'HR'],
        },
        {
          name: 'Attendance',
          path: '/attendance',
          icon: CalendarCheck,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Shifts & Schedule',
          path: '/shifts',
          icon: Clock,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Leave Management',
          path: '/leaves',
          icon: CalendarDays,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Payroll & Payslips',
          path: '/payroll',
          icon: CreditCard,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
      ],
    },
    {
      title: 'Workplace & Engagement',
      items: [
        {
          name: 'Onboarding',
          path: '/onboarding',
          icon: CheckSquare,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Tasks',
          path: '/tasks',
          icon: ListTodo,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Announcements',
          path: '/announcements',
          icon: Megaphone,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Documents',
          path: '/documents',
          icon: FileText,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Performance',
          path: '/performance',
          icon: Award,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Resignations',
          path: '/resignations',
          icon: LogOut,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
        {
          name: 'Feedback',
          path: '/feedback',
          icon: MessageSquareHeart,
          roles: ['ADMIN', 'HR', 'EMPLOYEE'],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          name: 'User Management',
          path: '/admin/users',
          icon: Shield,
          roles: ['ADMIN'],
        },
        {
          name: 'Analytics & Reports',
          path: '/analytics',
          icon: BarChart3,
          roles: ['ADMIN', 'HR'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header branding */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">WorkSphere</span>
              <span className="text-[10px] block uppercase font-semibold text-indigo-400 -mt-1 tracking-wider">
                HR Enterprise
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list with sections */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.roles.includes(role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Card at bottom of sidebar */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <div className="bg-slate-800/60 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
              {user?.employee?.employee_code || 'EMP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.employee?.full_name || user?.username}
              </p>
              <p className="text-[10px] text-slate-400 truncate capitalize">
                {user?.role?.toLowerCase()} Portal
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
