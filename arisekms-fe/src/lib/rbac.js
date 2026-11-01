// Central role model for the KMS frontend (reestly-fnb RBAC language).
// Backend roles come from the JWT (`roles: ["ARISE_*"]`, legacy "USER"/"ADMIN"
// normalized below). FE gating is display-only; the API enforces everything.

export const ROLE = {
  IT_ADMIN: 'ARISE_IT_ADMIN',
  SECRETARIAT: 'ARISE_SECRETARIAT',
  MEMBER: 'ARISE_MEMBER',
  DATA_ANALYST: 'ARISE_DATA_ANALYST',
};

// Pre-adaptation values still present in old rows / unexpired JWTs.
const LEGACY_ROLE_MAP = {
  ADMIN: ROLE.IT_ADMIN,
  USER: ROLE.MEMBER,
};

export function normalizeRole(role) {
  return LEGACY_ROLE_MAP[role] ?? role;
}

export const ROLE_MODULES = {
  [ROLE.IT_ADMIN]: new Set(['dashboard', 'secretariat-overview', 'governance', 'reports', 'submit', 'membership', 'knowledge', 'skillsbuild', 'help', 'support', 'upload']),
  [ROLE.SECRETARIAT]: new Set(['dashboard', 'secretariat-overview', 'reports', 'submit', 'membership', 'knowledge', 'skillsbuild', 'help', 'support', 'upload']),
  [ROLE.MEMBER]: new Set(['dashboard', 'submit', 'membership', 'knowledge', 'skillsbuild', 'help', 'support']),
  [ROLE.DATA_ANALYST]: new Set(['dashboard', 'knowledge', 'skillsbuild', 'reports', 'help', 'support']),
};

export function effectiveRole(roles) {
  if (Array.isArray(roles) && roles.length > 0) return normalizeRole(roles[0]);
  return ROLE.MEMBER;
}

export function isStaffRole(role) {
  const r = normalizeRole(role);
  return r === ROLE.IT_ADMIN || r === ROLE.SECRETARIAT || r === ROLE.DATA_ANALYST;
}

export function isPrivilegedRole(role) {
  const r = normalizeRole(role);
  return r === ROLE.IT_ADMIN || r === ROLE.SECRETARIAT;
}

export function isPrivilegedRoles(roles) {
  return (roles ?? []).some((r) => isPrivilegedRole(r));
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
  '/member-directory': 'secretariat-overview',
  '/secretariat-overview': 'secretariat-overview',
  '/admin-overview': 'secretariat-overview',
  '/admin-approvals': 'secretariat-overview',
  '/governance-users': 'governance',
  '/governance-audit': 'governance',
  '/governance-support': 'governance',
  '/reports-membership': 'reports',
  '/reports-summary': 'reports',
  '/reports-performance': 'reports',
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
// Staff roles bypass the lock (see approvalLocked).
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
  return (ROLE_MODULES[normalizeRole(role)] ?? ROLE_MODULES[ROLE.MEMBER]).has(module);
}

export function canUpload(role) {
  return (ROLE_MODULES[normalizeRole(role)] ?? ROLE_MODULES[ROLE.MEMBER]).has('upload');
}
