import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';

import { TooltipProvider } from '@/components/ui/tooltip';
import { api, getAccessToken } from '@/api/client.js';
import { allowedRoute, approvalLocked, effectiveRole } from '@/lib/rbac.js';
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
  const [approval, setApproval] = useState({ loading: true, hasApproved: false });
  const hasToken = !!getAccessToken();
  const role = effectiveRole(roles);
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    if (!hasToken || isAdmin) {
      setApproval({ loading: false, hasApproved: isAdmin });
      return;
    }
    let cancelled = false;
    // Refetch on navigation so an approval granted while the form is open
    // unlocks the portal without a manual refresh.
    api
      .get('/companies')
      .then((res) => {
        if (cancelled) return;
        const rows = res.data.data ?? [];
        setApproval({ loading: false, hasApproved: rows.some((c) => c.status === 'approved') });
      })
      .catch(() => {
        if (!cancelled) setApproval({ loading: false, hasApproved: false });
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, isAdmin, hasToken]);

  if (!hasToken) return <Navigate to="/login" replace />;
  // Display-only gate; the API independently enforces every permission.
  if (!allowedRoute(role, pathname)) return <Navigate to="/" replace />;

  const locked = !approval.loading && approvalLocked(pathname, { isAdmin, hasApproved: approval.hasApproved });
  if (locked) return <Navigate to="/membership-form" replace />;
  return (
    <TooltipProvider>
      <Dashboard locked={!approval.loading && !isAdmin && !approval.hasApproved} />
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
