import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';

const PAGE_SIZE = 10;

export function MemberDirectory() {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/users', { params: { limit: 100, offset: 0 } })
      .then((res) => {
        setMembers(res.data.data ?? []);
        setTotal(res.data.meta?.count ?? (res.data.data ?? []).length);
      })
      .catch(() => toast.error('Could not load members'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && !m.isAccountDisabled) ||
        (status === 'inactive' && m.isAccountDisabled);
      const matchesQ =
        !needle ||
        m.name?.toLowerCase().includes(needle) ||
        m.email?.toLowerCase().includes(needle) ||
        m.username?.toLowerCase().includes(needle);
      return matchesStatus && matchesQ;
    });
  }, [members, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <PageHero title="Member Directory" subtitle={`${total.toLocaleString()} registered members`} />
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Search by name, email, or username"
                  className="pl-9"
                />
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                aria-label="Status"
                className="h-9 rounded-md border border-input bg-card px-2 text-sm font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading members…</p>
            ) : visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No members match your filters.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name ?? m.username}</TableCell>
                      <TableCell className="text-muted-foreground">{m.email}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {(m.roles ?? []).join(', ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {m.isAccountDisabled ? (
                          <Badge variant="secondary">Inactive</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                {filtered.length} of {total.toLocaleString()} members
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-muted-foreground">Page {safePage + 1} of {pages}</span>
                <button
                  type="button"
                  disabled={safePage >= pages - 1}
                  onClick={() => setPage(safePage + 1)}
                  className="rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
