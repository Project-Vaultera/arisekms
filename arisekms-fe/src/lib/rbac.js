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
  '/submit-reports': 'submit',
  '/membership-form': 'membership',
  '/knowledge-products': 'knowledge',
  '/skillsbuild': 'skillsbuild',
  '/leaderboards': 'skillsbuild',
  '/privacy-policy': 'help',
  '/user-manual': 'help',
  '/support': 'support',
};

export function allowedRoute(role, pathname) {
  const module = ROUTE_MODULE[pathname];
  if (!module) return true;
  return (ROLE_MODULES[role] ?? ROLE_MODULES.USER).has(module);
}

export function canUpload(role) {
  return (ROLE_MODULES[role] ?? ROLE_MODULES.USER).has('upload');
}
