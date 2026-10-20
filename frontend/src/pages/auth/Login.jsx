import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setApiError('');
      setIsSubmitting(true);
      const user = await login(data.email, data.password);
      
      // Determine redirection target based on role
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'ADMIN') navigate('/admin/dashboard', { replace: true });
        else if (user.role === 'HR') navigate('/hr/dashboard', { replace: true });
        else navigate('/employee/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill helper for review and evaluation
  const setDemoCredentials = (role) => {
    setApiError('');
    if (role === 'ADMIN') {
      setValue('email', 'admin@worksphere.com');
      setValue('password', 'Admin@123');
    } else if (role === 'HR') {
      setValue('email', 'hr@worksphere.com');
      setValue('password', 'Hr@123');
    } else {
      setValue('email', 'employee@worksphere.com');
      setValue('password', 'Emp@123');
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
        <p className="text-sm text-slate-500 mt-1">
          Access your employee portal, attendance, and HR tools
        </p>
      </div>

      {apiError && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
          <div className="flex-1 font-medium">{apiError}</div>
        </div>
      )}

      {/* Demo Credentials Quick Switcher */}
      <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Quick Demo Logins:</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setDemoCredentials('ADMIN')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 rounded-lg text-xs font-medium text-slate-700 hover:text-purple-700 transition-all text-center shadow-xs"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setDemoCredentials('HR')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-700 transition-all text-center shadow-xs"
          >
            HR Manager
          </button>
          <button
            type="button"
            onClick={() => setDemoCredentials('EMPLOYEE')}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 rounded-lg text-xs font-medium text-slate-700 hover:text-emerald-700 transition-all text-center shadow-xs"
          >
            Employee
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Work Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="name@company.com"
              {...register('email', {
                required: 'Work email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address',
                },
              })}
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.email
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
              })}
              className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.password
                  ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm shadow-md shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          New employee joining the company?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
