export enum ROLE {
  ARISE_IT_ADMIN = 'ARISE_IT_ADMIN',
  ARISE_SECRETARIAT = 'ARISE_SECRETARIAT',
  ARISE_MEMBER = 'ARISE_MEMBER',
  ARISE_DATA_ANALYST = 'ARISE_DATA_ANALYST',
}

// Pre-adaptation values still stored in old rows / unexpired JWTs.
export const LEGACY_ROLE_MAP: Record<string, ROLE> = {
  ADMIN: ROLE.ARISE_IT_ADMIN,
  USER: ROLE.ARISE_MEMBER,
};

export function normalizeRole(role: string): string {
  return LEGACY_ROLE_MAP[role] ?? role;
}

export function normalizeRoles(roles: string[] = []): string[] {
  return roles.map(normalizeRole);
}

// Staff roles that manage content and membership operations.
export function isPrivilegedRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === ROLE.ARISE_IT_ADMIN || r === ROLE.ARISE_SECRETARIAT;
}

export function isPrivileged(roles: string[] = []): boolean {
  return roles.some(isPrivilegedRole);
}
