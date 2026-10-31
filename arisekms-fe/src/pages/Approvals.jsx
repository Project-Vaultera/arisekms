import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, Download01Icon, EyeIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Card, CardContent, CardHeader } from '@/components/ui/card.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { cn } from '@/lib/utils.js';

const CATEGORY_SHORT = {
  quarterly: 'Quarterly',
  annual: 'Annual',
  'good-practices': 'Good Practices',
  'success-stories': 'Success Stories',
};

function statusStyle(status) {
  if (status === 'approved' || status === 'verified' || status === 'Resolved') {
    return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  }
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted' || status === 'pending' || status === 'Open' || status === 'In progress') {
    return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  }
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

export function Approvals() {
  const [tab, setTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [companyNames, setCompanyNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [selected, setSelected] = useState([]);

  const selectedIds = (kind) =>
    selected.filter((k) => k.startsWith(`${kind}-`)).map((k) => Number(k.slice(kind.length + 1)));

  function toggleOne(kind, id) {
    const key = `${kind}-${id}`;
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleAll(kind, rows) {
    const keys = rows.map((r) => `${kind}-${r.id}`);
    const allChecked = keys.length > 0 && keys.every((k) => selected.includes(k));
    setSelected((prev) =>
      allChecked ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])],
    );
  }

  async function decideMany(kind, ids, status, label) {
    if (ids.length === 0) return;
    setActing('bulk');
    try {
      for (const id of ids) {
        if (kind === 'report') {
          await api.patch(`/reports/${id}`, { status });
        } else {
          await api.patch(`/certificates/${id}`, { status });
        }
      }
      toast.success(label);
      setSelected((prev) => prev.filter((k) => !k.startsWith(`${kind}-`)));
      await refresh();
    } catch {
      toast.error('Action failed', { description: 'Please try again.' });
    } finally {
      setActing(null);
    }
  }
  const [preview, setPreview] = useState(null);
  const [certPreview, setCertPreview] = useState(null);

  function refresh() {
    setLoading(true);
    return Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }).then((res) => setReports(res.data.data ?? [])),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }).then((res) => setCertificates(res.data.data ?? [])),
      api.get('/companies/membership/submissions').then((res) => setMemberships(res.data.data ?? [])).catch(() => setMemberships([])),
      api
        .get('/companies')
        .then((res) => {
          const map = {};
          for (const company of res.data.data ?? []) {
            for (const member of company.members ?? []) {
              map[member.id] = company.name;
            }
          }
          setCompanyNames(map);
        }),
    ])
      .catch(() => toast.error('Could not load approval queues'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  const pendingReports = useMemo(
    () => reports.filter((r) => (r.status || 'submitted') === 'submitted'),
    [reports],
  );
  const pendingCertificates = useMemo(
    () => certificates.filter((c) => (c.status || 'pending') === 'pending'),
    [certificates],
  );
  function authorOf(row) {
    const author = row.author ?? row.submittedBy;
    return {
      name: author?.name ?? row.memberName ?? '—',
      company: companyNames[author?.id] ?? null,
    };
  }

  async function decide(kind, id, status, label) {
    const key = `${kind}-${id}`;
    setActing(key);
    try {
      if (kind === 'report') {
        await api.patch(`/reports/${id}`, { status });
      } else {
        await api.patch(`/certificates/${id}`, { status });
      }
      toast.success(label);
      await refresh();
    } catch {
      toast.error('Action failed', { description: 'Please try again.' });
    } finally {
      setActing(null);
    }
  }

  async function decideMembership(id, status, label, reason) {
    setActing(`membership-${id}`);
    try {
      await api.post(`/companies/${id}/review`, { status, ...(reason ? { reason } : {}) });
      toast.success(label);
      setRejectId(null);
      setRejectReason('');
      await refresh();
    } catch (err) {
      const message = err?.response?.data?.error?.message ?? err?.response?.data?.message;
      toast.error('Action failed', { description: typeof message === 'string' ? message : 'Please try again.' });
    } finally {
      setActing(null);
    }
  }

  function downloadReport(report) {    if (!report?.id) return;
    downloadFile(`/reports/${report.id}/file`, report.originalName || 'report').catch(() =>
      toast.error('Download failed'),
    );
  }

  async function previewReport(report) {
    if (!report?.id) return;
    try {
      const res = await api.get(`/reports/${report.id}/file`, { responseType: 'blob' });
      const mime = res.data?.type || report.mimeType || '';
      const url = URL.createObjectURL(res.data);
      setPreview({ url, mime, name: report.originalName || 'Report' });
    } catch {
      toast.error('Preview failed', { description: 'Try downloading instead.' });
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  const tabs = [
    { id: 'reports', label: 'Reports', count: pendingReports.length },
    { id: 'certificates', label: 'Certificates', count: pendingCertificates.length },
    { id: 'membership', label: 'Membership', count: memberships.length },
  ];

  return (
    <div className="flex flex-col gap-2.5 overflow-x-clip py-1.5 md:gap-3 md:py-2">
      <div className="space-y-3 px-4 lg:px-6">
        <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
            <CardHeader className="pb-0.5 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">Approvals</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Review pending reports and certificates</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-1">
                  {tabs.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={tab === t.id ? 'default' : 'ghost'}
                      onClick={() => setTab(t.id)}
                    >
                      {t.label}
                      <Badge variant={tab === t.id ? 'secondary' : 'default'} className="ml-1">
                        {t.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </div>
              ) : (
                <>
                  {tab === 'reports' && (
                    pendingReports.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">All caught up — no pending reports.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        {selectedIds('report').length > 0 && (
                          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              {selectedIds('report').length} selected
                            </span>
                            <Button
                              size="sm"
                              disabled={acting !== null}
                              onClick={() => decideMany('report', selectedIds('report'), 'approved', 'Reports approved')}
                            >
                              Approve selected
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                              disabled={acting !== null}
                              onClick={() => decideMany('report', selectedIds('report'), 'rejected', 'Reports rejected')}
                            >
                              Reject selected
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelected((prev) => prev.filter((k) => !k.startsWith('report-')))}>
                              Clear
                            </Button>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={pendingReports.length > 0 && pendingReports.every((r) => selected.includes(`report-${r.id}`))}
                                  onCheckedChange={() => toggleAll('report', pendingReports)}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Submitted by</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingReports.map((report) => {
                              const author = authorOf(report);
                              const busy = acting === `report-${report.id}` || acting === 'bulk';
                              return (
                                <TableRow key={report.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selected.includes(`report-${report.id}`)}
                                      onCheckedChange={() => toggleOne('report', report.id)}
                                      aria-label={`Select report ${report.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className="block max-w-56 truncate font-medium">
                                      {report.originalName || `Report #${report.id}`}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {CATEGORY_SHORT[report.category] || report.category || '—'}
                                  </TableCell>
                                  <TableCell className="font-medium">{author.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{author.company || '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{fmtDate(report.createdAt)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => decide('report', report.id, 'approved', 'Report approved')}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                                        disabled={busy}
                                        onClick={() => decide('report', report.id, 'rejected', 'Report rejected')}
                                      >
                                        Reject
                                      </Button>
                                      <Button variant="ghost" size="icon" className="size-8" onClick={() => previewReport(report)} aria-label="Preview">
                                        <HugeiconsIcon icon={EyeIcon} size={16} strokeWidth={1.8} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="size-8" onClick={() => downloadReport(report)} aria-label="Download">
                                        <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={1.8} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  )}

                  {tab === 'certificates' && (
                    pendingCertificates.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">All caught up — no pending certificates.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        {selectedIds('certificate').length > 0 && (
                          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">
                              {selectedIds('certificate').length} selected
                            </span>
                            <Button
                              size="sm"
                              disabled={acting !== null}
                              onClick={() => decideMany('certificate', selectedIds('certificate'), 'verified', 'Certificates verified')}
                            >
                              Verify selected
                            </Button>
                            <Button
                              size="sm"
                              className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                              disabled={acting !== null}
                              onClick={() => decideMany('certificate', selectedIds('certificate'), 'rejected', 'Certificates rejected')}
                            >
                              Reject selected
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelected((prev) => prev.filter((k) => !k.startsWith('certificate-')))}>
                              Clear
                            </Button>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={pendingCertificates.length > 0 && pendingCertificates.every((c) => selected.includes(`certificate-${c.id}`))}
                                  onCheckedChange={() => toggleAll('certificate', pendingCertificates)}
                                  aria-label="Select all"
                                />
                              </TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Issuer</TableHead>
                              <TableHead>Submitted by</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Date issued</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingCertificates.map((cert) => {
                              const author = authorOf(cert);
                              const busy = acting === `certificate-${cert.id}` || acting === 'bulk';
                              return (
                                <TableRow key={cert.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selected.includes(`certificate-${cert.id}`)}
                                      onCheckedChange={() => toggleOne('certificate', cert.id)}
                                      aria-label={`Select certificate ${cert.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className="block max-w-56 truncate font-medium">{cert.course}</span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{cert.issuer || '—'}</TableCell>
                                  <TableCell className="font-medium">{author.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{author.company || '—'}</TableCell>
                                  <TableCell className="text-muted-foreground">{fmtDate(cert.dateIssued)}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => decide('certificate', cert.id, 'verified', 'Certificate verified')}
                                      >
                                        Verify
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                                        disabled={busy}
                                        onClick={() => decide('certificate', cert.id, 'rejected', 'Certificate rejected')}
                                      >
                                        Reject
                                      </Button>
                                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setCertPreview(cert)} aria-label="Preview">
                                        <HugeiconsIcon icon={EyeIcon} size={16} strokeWidth={1.8} />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  )}


                  {tab === 'membership' && (
                    memberships.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">All caught up — no pending membership applications.</p>
                    ) : (
                      <div className="space-y-2">
                        {memberships.map((m) => {
                          const busy = acting === `membership-${m.id}`;
                          const primary = (m.contacts ?? []).find((c) => c.isPrimary);
                          return (
                            <div key={m.id} className="rounded-lg border px-3 py-2.5 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{m.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {primary ? `${[primary.firstName, primary.lastName].filter(Boolean).join(' ')} · ${primary.email ?? ''}` : 'No primary contact'}
                                    {` · ${m.city ?? '—'}, ${m.country ?? '—'}`}
                                    {` · ${fmtDate(m.updatedAt)}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => decideMembership(m.id, 'approved', 'Membership approved')}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                                    disabled={busy}
                                    onClick={() => { setRejectId(m.id); setRejectReason(''); }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              </div>
                              {rejectId === m.id && (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                  <input
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Reject reason (required)…"
                                    className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground"
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
                                      disabled={busy || !rejectReason.trim()}
                                      onClick={() => decideMembership(m.id, 'rejected', 'Membership rejected', rejectReason.trim())}
                                    >
                                      Confirm reject
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                </>
              )}
            </CardContent>
          </Card>
        </SendaiFrame>
      </div>
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closePreview}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <p className="truncate text-sm font-medium">{preview.name}</p>
              <Button variant="outline" size="sm" onClick={closePreview}>Close</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {preview.mime?.startsWith('image/') ? (
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] object-contain" />
              ) : preview.mime === 'application/pdf' ? (
                <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full" />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Preview not available for this file type — use Download instead.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {certPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setCertPreview(null)}>
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <p className="truncate text-sm font-medium">{certPreview.course || `Certificate #${certPreview.id}`}</p>
              <Button variant="outline" size="sm" onClick={() => setCertPreview(null)}>Close</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Course</dt><dd className="text-right font-medium">{certPreview.course || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Issuer</dt><dd className="text-right font-medium">{certPreview.issuer || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Member</dt><dd className="text-right font-medium">{certPreview.memberName || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Credential ID</dt><dd className="text-right font-medium">{certPreview.credentialId || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Date issued</dt><dd className="text-right font-medium">{fmtDate(certPreview.dateIssued)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Submitted by</dt><dd className="text-right font-medium">{authorOf(certPreview).name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Company</dt><dd className="text-right font-medium">{authorOf(certPreview).company || '—'}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="text-right font-medium">{certPreview.status || 'pending'}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
