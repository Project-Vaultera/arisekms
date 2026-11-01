import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHeader } from '@/components/PageHeader.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { getTokenRoles, getTokenUserId, normalizeRole, ROLE } from '@/lib/rbac.js';

const ALL_ROLES = [ROLE.IT_ADMIN, ROLE.SECRETARIAT, ROLE.MEMBER, ROLE.DATA_ANALYST];

const ROLE_LABEL = {
  [ROLE.IT_ADMIN]: 'IT Admin',
  [ROLE.SECRETARIAT]: 'Secretariat',
  [ROLE.MEMBER]: 'Member',
  [ROLE.DATA_ANALYST]: 'Data Analyst',
};

export function GovernanceUsers() {
  const myId = getTokenUserId();
  const isItAdmin = getTokenRoles().some((r) => normalizeRole(r) === ROLE.IT_ADMIN);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ username: '', name: '', email: '', password: '', role: ROLE.MEMBER });
  const [inviting, setInviting] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  function refresh() {
    setLoading(true);
    return api
      .get('/users', { params: { limit: 100, offset: 0 } })
      .then((res) => {
        setUsers(res.data.data ?? []);
        setTotal(res.data.meta?.count ?? 0);
      })
      .catch(() => toast.error('Could not load users'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  // shortcut: client-side filter + paging over a fetch-100 snapshot; move to
  // limit/offset + BE q/role/status params if the account table outgrows it.
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && !(u.roles ?? []).includes(roleFilter)) return false;
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && !u.isAccountDisabled) ||
        (status === 'inactive' && u.isAccountDisabled);
      if (!matchesStatus) return false;
      if (!needle) return true;
      return [u.username, u.name, u.email].some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [users, q, roleFilter, status]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function updateFilter(setter, value) {
    setter(value);
    setPage(0);
  }

  async function patchUser(id, patch) {
    if (Number(id) === Number(myId) && (patch.roles !== undefined || patch.isAccountDisabled !== undefined)) {
      toast.error('You cannot change your own role or disable your own account');
      return;
    }
    if (patch.isAccountDisabled === true && !window.confirm('Disable this account?')) {
      return;
    }
    setSavingId(id);
    try {
      await api.patch(`/users/${id}`, patch);
      toast.success('User updated');
      await refresh();
    } catch {
      toast.error('Could not update user');
    } finally {
      setSavingId(null);
    }
  }

  async function inviteUser() {
    if (!invite.username.trim() || !invite.name.trim() || !invite.email.trim() || invite.password.length < 6) {
      toast.error('Fill username, name, valid email and a 6+ character password');
      return;
    }
    setInviting(true);
    try {
      await api.post('/users/invite', {
        username: invite.username.trim(),
        name: invite.name.trim(),
        email: invite.email.trim(),
        password: invite.password,
        roles: [invite.role],
        isAccountDisabled: false,
      });
      toast.success('User invited');
      closeInvite();
      await refresh();
    } catch (err) {
      toast.error('Could not invite user', {
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message,
      });
    } finally {
      setInviting(false);
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    setInvite({ username: '', name: '', email: '', password: '', role: ROLE.MEMBER });
  }

  return (
    <div className="flex flex-col gap-3 py-1.5">
      <PageHeader
        title="User Directory"
        subtitle="System accounts, role assignment (exactly one role per user), and access toggles"
      />
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Accounts ({rows.length}{total ? ` of ${total}` : ''})</CardTitle>
              <CardDescription>Governance is IT-admin only. You cannot change your own role or disable your own account.</CardDescription>
            </div>
            {isItAdmin && (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                Invite user
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search username, name, email…"
              value={q}
              onChange={(e) => updateFilter(setQ, e.target.value)}
              className="max-w-xs"
            />
            <FilterSelect
              value={roleFilter}
              onValueChange={(v) => updateFilter(setRoleFilter, v)}
              placeholder="Role"
              className="lg:w-44"
              options={[{ value: 'all', label: 'All roles' }, ...ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))]}
            />
            <FilterSelect
              value={status}
              onValueChange={(v) => updateFilter(setStatus, v)}
              placeholder="Status"
              className="lg:w-44"
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <FilterSelect
                      value={(u.roles ?? [])[0] ?? ROLE.MEMBER}
                      onValueChange={(v) => patchUser(u.id, { roles: [v] })}
                      options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                      disabled={savingId === u.id || Number(u.id) === Number(myId)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isAccountDisabled ? 'destructive' : 'default'}>
                      {u.isAccountDisabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingId === u.id || Number(u.id) === Number(myId)}
                      onClick={() => patchUser(u.id, { isAccountDisabled: !u.isAccountDisabled })}
                    >
                      {u.isAccountDisabled ? 'Enable' : 'Disable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No accounts match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {rows.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                <FilterSelect
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                  placeholder="10"
                  className="w-24"
                  options={['10', '25', '50', '100']}
                />
                <p className="text-xs text-muted-foreground">
                  Showing {safePage * pageSize + 1}–{Math.min(rows.length, safePage * pageSize + visible.length)} of {rows.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Previous
                </Button>
                <span className="px-1 text-xs text-muted-foreground">Page {safePage + 1} of {pageCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={inviteOpen} onOpenChange={(v) => !v && closeInvite()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
            <DialogDescription>Create an account with a role. Share the temporary password securely.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Username</Label>
              <Input placeholder="Username…" value={invite.username} onChange={(e) => setInvite((v) => ({ ...v, username: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Full name</Label>
              <Input placeholder="Full name…" value={invite.name} onChange={(e) => setInvite((v) => ({ ...v, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Email</Label>
              <Input placeholder="Email…" type="email" value={invite.email} onChange={(e) => setInvite((v) => ({ ...v, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Temporary password</Label>
              <Input placeholder="6+ characters…" type="password" value={invite.password} onChange={(e) => setInvite((v) => ({ ...v, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <FilterSelect label="Role" value={invite.role} onValueChange={(v) => setInvite((iv) => ({ ...iv, role: v }))} options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeInvite} disabled={inviting}>Cancel</Button>
            <Button disabled={inviting} onClick={inviteUser}>{inviting ? 'Inviting…' : 'Send invite'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
