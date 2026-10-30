// Central role model for the KMS frontend (reestly-fnb RBAC language).
// Backend roles come from the JWT (`roles: ["USER" | "ADMIN"]`).
// TODO: extend with workspace-scoped roles (owner/editor/viewer) when the
// workspace entity lands. FE gating is display-only; the API enforces everything.

export const ROLE_MODULES = {
  ADMIN: new Set(['dashboard', 'admin-center', 'submit', 'membership', 'knowledge', 'skillsbuild', 'help', 'support', 'upload']),
  USER: new Set(['dashboard', 'submit', 'membership', 'knowledge', 'skillsbuild', 'help', 'support']),
};

export function effectiveRole(roles) {
  if (Array.isArray(roles) && roles.includes('ADMIN')) return 'ADMIN';
  return 'USER';
}

export function getTokenUserId() {
  try {
    const token = localStorage.getItem('arisekms_access_token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1])).sub ?? null;
  } catch {
    return null;
  }
}

export function getTokenRoles() {
  try {
    const token = localStorage.getItem('arisekms_access_token');
    if (!token) return [];
    return JSON.parse(atob(token.split('.')[1])).roles ?? [];
  } catch {
    return [];
  }
}

const ROUTE_MODULE = {
  '/': 'dashboard',
  '/member-directory': 'admin-center',
  '/admin-overview': 'admin-center',
  '/admin-approvals': 'admin-center',
  '/reports-membership': 'admin-center',
  '/reports-summary': 'admin-center',
  '/reports-performance': 'admin-center',
  '/submit-reports': 'submit',
  '/membership-form': 'membership',
  '/profile': 'membership',
  '/knowledge-products': 'knowledge',
  '/activity': 'skillsbuild',
  '/skillsbuild': 'skillsbuild',
  '/leaderboards': 'skillsbuild',
  '/privacy-policy': 'help',
  '/user-manual': 'help',
  '/support': 'support',
};

// Routes a member without an approved company may still visit.
// Everything else redirects to /membership-form until approval.
const PENDING_ALLOWLIST = new Set([
  '/membership-form',
  '/profile',
  '/support',
  '/privacy-policy',
  '/user-manual',
]);

export function approvalLocked(pathname, { isAdmin, hasApproved }) {
  if (isAdmin || hasApproved) return false;
  return !PENDING_ALLOWLIST.has(pathname);
}

export function allowedRoute(role, pathname) {
  const module = ROUTE_MODULE[pathname];
  if (!module) return true;
  return (ROLE_MODULES[role] ?? ROLE_MODULES.USER).has(module);
}

export function canUpload(role) {
  return (ROLE_MODULES[role] ?? ROLE_MODULES.USER).has('upload');
}
