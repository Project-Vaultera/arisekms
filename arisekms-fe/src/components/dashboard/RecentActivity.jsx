import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, EyeIcon, File02Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { downloadFile } from '@/api/client.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { cn } from '@/lib/utils.js';

const TYPE_LINK = { Report: '/submit-reports', Knowledge: '/knowledge-products', Certificate: '/skillsbuild' };

const TYPE_ICON = {
  Report: File02Icon,
  Knowledge: File02Icon,
  Certificate: File02Icon,
};

function statusStyle(status) {
  if (status === 'verified' || status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted' || status === 'pending') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

export function RecentActivity({ items = [], loading = false }) {
  const navigate = useNavigate();
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);

  const statuses = useMemo(
    () => [...new Set(items.filter((i) => type === 'all' || i.type === type).map((i) => i.status).filter(Boolean))],
    [items, type],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (type === 'all' || i.type === type) &&
        (status === 'all' || i.status === status) &&
        (!needle ||
          i.title.toLowerCase().includes(needle) ||
          i.actor.toLowerCase().includes(needle) ||
          i.type.toLowerCase().includes(needle)),
    );
  }, [items, type, status, q]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

  function toggleAll() {
    setSelected(allChecked ? [] : filtered.map((r) => r.id));
  }

  function toggleOne(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function view(row) {
    navigate(TYPE_LINK[row.type] ?? '/');
  }

  function download(row) {
    if (!row.fileUrl) return;
    downloadFile(row.fileUrl, row.fileName ?? 'download').catch(() =>
      toast.error('Download failed'),
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-0.5 pt-3">
        <div className="space-y-0.5">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest reports, knowledge uploads, and certifications</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-1 pb-3">
        <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search activity…"
              className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none focus-visible:border-border"
            />
          </div>
          <FilterSelect
            label="Select Type"
            value={type}
            onValueChange={setType}
            className="sm:w-40"
            options={[
              { value: 'all', label: 'All' },
              { value: 'Report', label: 'Report' },
              { value: 'Knowledge', label: 'Knowledge' },
              { value: 'Certificate', label: 'Certificate' },
            ]}
          />
          <FilterSelect
            label="Select Status"
            value={status}
            onValueChange={setStatus}
            className="sm:w-40"
            options={[{ value: 'all', label: 'All' }, ...statuses.map((s) => ({ value: s, label: s }))]}
          />
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading activity…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border mt-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(row.id)}
                          onCheckedChange={() => toggleOne(row.id)}
                          aria-label={`Select ${row.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                            <HugeiconsIcon icon={TYPE_ICON[row.type] ?? File02Icon} size={16} strokeWidth={1.8} className="text-muted-foreground" />
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-56 truncate font-medium">{row.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.type} · {row.actor}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(row.status))}>
                          {row.status ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-32 truncate text-muted-foreground">{row.actor}</TableCell>
                      <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                        {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            aria-label={`View ${row.title}`}
                            title="View"
                            onClick={() => view(row)}
                            className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-[#0c4585]"
                          >
                            <HugeiconsIcon icon={EyeIcon} size={16} strokeWidth={1.8} />
                          </button>
                          {row.fileUrl && (
                            <button
                              type="button"
                              aria-label={`Download ${row.title}`}
                              title="Download"
                              onClick={() => download(row)}
                              className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-[#0c4585]"
                            >
                              <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={1.8} />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {selected.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {selected.length} of {filtered.length} row(s) selected.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
