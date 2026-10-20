import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const RoleRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'HR') {
    return <Navigate to="/hr/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
};

export default RoleRedirect;
