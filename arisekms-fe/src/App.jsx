import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';

import { TooltipProvider } from '@/components/ui/tooltip';
import { getAccessToken } from '@/api/client.js';
import { allowedRoute, effectiveRole } from '@/lib/rbac.js';
import { Dashboard } from '@/pages/Dashboard.jsx';
import { Login } from '@/pages/Login.jsx';

function decodeRoles() {
  try {
    const token = getAccessToken();
    if (!token) return [];
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.roles ?? [];
  } catch {
    return [];
  }
}

function Shell() {
  const { pathname } = useLocation();
  const [roles] = useState(decodeRoles);
  if (!getAccessToken()) return <Navigate to="/login" replace />;
  const role = effectiveRole(roles);
  // Display-only gate; the API independently enforces every permission.
  if (!allowedRoute(role, pathname)) return <Navigate to="/" replace />;
  return (
    <TooltipProvider>
      <Dashboard />
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<Shell />} />
      </Routes>
    </ThemeProvider>
  );
}
