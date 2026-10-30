import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, CloudUploadIcon, Download01Icon, EyeIcon, File02Icon, GridViewIcon, LeftToRightListDashIcon, Search01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { PageHeader } from '@/components/PageHeader.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { cn } from '@/lib/utils.js';

const ACCEPTED = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_BYTES = 100 * 1024 * 1024;

function checkFile(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  if (!ACCEPTED.includes(ext)) {
    toast.error('Unsupported file type', { description: `Supports ${ACCEPTED.join(', ')}. One file per category.` });
    return false;
  }
  if (f.size > MAX_FILE_BYTES) {
    toast.error('File too large', { description: 'Each file must be 100MB or less.' });
    return false;
  }
  return true;
}
const CATEGORIES = [
  { id: 'quarterly', label: 'Quarterly Accomplishment Reports' },
  { id: 'good-practices', label: 'Good Practices' },
  { id: 'annual', label: 'Annual Accomplishment Reports' },
  { id: 'success-stories', label: 'Success Stories' },
];

function UploadCard({ files, latestByCat, selectedCat, onSelectCat, submittingCat, busy, onPick, onRemove, onDiscard, onSubmit, onSubmitOne }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const entries = Object.entries(files);
  const current = latestByCat[selectedCat] || null;

  function handleFiles(list) {
    const f = list?.[0];
    if (!f || !checkFile(f)) return;
    onPick(selectedCat, f);
  }

  return (
    <SendaiFrame>
      <Card className="relative z-10 rounded-2xl bg-white">
      <CardContent className="space-y-2 p-4">
        <div className="mx-auto w-full max-w-xs">
          <Select value={selectedCat} onValueChange={onSelectCat}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 truncate text-center text-[11px] text-muted-foreground" title={current ? `${current.originalName || current.filename || ''} (${current.status || ''})` : ''}>
            {current
              ? `Current: ${current.originalName || current.filename || 'Report'} (${current.status || 'submitted'})`
              : 'Not submitted yet'}
          </p>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-[var(--sendai-teal)]/60 px-4 py-8 text-center transition-colors',
            dragging && 'border-solid bg-[#e9eff5]',
          )}
        >
          <span className="grid size-16 place-items-center rounded-full bg-muted">
            <HugeiconsIcon icon={CloudUploadIcon} size={24} strokeWidth={1.8} className="text-muted-foreground" />
          </span>
          <p className="mt-2 text-base font-semibold text-[#1e3a5f]">Upload your files</p>
          <p className="text-xs text-muted-foreground">Drag and drop files here or click to browse</p>
          <p className="text-[11px] text-muted-foreground">Supports .pdf, .jpg, .png up to 100MB each</p>
          <Button className="mt-2" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            <HugeiconsIcon icon={CloudUploadIcon} size={15} strokeWidth={2} />
            Select files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {entries.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entries.map(([catId, f]) => (
              <span key={catId} className="flex max-w-full items-center gap-1.5 rounded-sm bg-[#e9eff5] px-2 py-1 text-xs font-medium text-[#0B4484]">
                <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2} />
                <span className="font-semibold">{CATEGORY_SHORT[catId] || catId}:</span>
                <span className="max-w-40 truncate">{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => onRemove(catId)}
                  className="rounded-sm p-0.5"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-[11px] text-muted-foreground" title="Your data is handled securely — Privacy Policy">
            {entries.length} of 4 attached · handled securely
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8" onClick={onDiscard} disabled={busy || entries.length === 0}>
              Discard
            </Button>
            <Button size="sm" className="h-8" disabled={!files[selectedCat] || submittingCat === selectedCat} onClick={() => onSubmitOne(selectedCat)}>
              {submittingCat === selectedCat ? 'Submitting…' : 'Submit'}
            </Button>
            <Button size="sm" className="h-8" onClick={onSubmit} disabled={busy || entries.length === 0}>
              {busy ? 'Submitting…' : 'Submit all'}
            </Button>
          </div>
        </div>
      </CardContent>
      </Card>
    </SendaiFrame>
  );
}

const CATEGORY_LABEL = {
  quarterly: 'Quarterly Accomplishment Reports',
  annual: 'Annual Accomplishment Reports',
  'good-practices': 'Good Practices',
  'success-stories': 'Success Stories',
};

const CATEGORY_SHORT = {
  quarterly: 'Quarterly',
  annual: 'Annual',
  'good-practices': 'Good Practices',
  'success-stories': 'Success Stories',
};

function formatBytes(bytes) {
  if (!bytes) return '—';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i <= 0) return `${bytes} B`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

export function SubmitReports() {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [selectedCat, setSelectedCat] = useState('quarterly');
  const [submittingCat, setSubmittingCat] = useState(null);
  const [preview, setPreview] = useState(null);

  function refreshReports() {
    setLoading(true);
    setLoadError(false);
    return api
      .get('/reports', { params: { limit: 100, offset: 0 } })
      .then((res) => setReports(res.data.data ?? []))
      .catch(() => {
        setLoadError(true);
        toast.error('Could not load submitted reports');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refreshReports();
  }, []);

  function discard() {
    setFiles({});
    toast.info('Attachments discarded');
  }

  async function submitOne(category) {
    const file = files[category];
    if (!file) {
      toast.error('Nothing to submit', { description: 'Attach a file first.' });
      return;
    }
    setSubmittingCat(category);
    try {
      const form = new FormData();
      form.append('category', category);
      form.append('file', file);
      await api.post('/reports', form);
      toast.success('Report submitted', { description: `${CATEGORY_SHORT[category] || category} queued for review.` });
      setFiles((prev) => {
        const next = { ...prev };
        delete next[category];
        return next;
      });
      await refreshReports();
    } catch {
      toast.error('Submission failed', { description: 'Check the file type and try again.' });
    } finally {
      setSubmittingCat(null);
    }
  }

  async function submit() {
    const entries = Object.entries(files);
    if (entries.length === 0) {
      toast.error('Nothing to submit', { description: 'Attach at least one file first.' });
      return;
    }
    setBusy(true);
    try {
      for (const [category, file] of entries) {
        const form = new FormData();
        form.append('category', category);
        form.append('file', file);
        await api.post('/reports', form);
      }
      toast.success('Reports submitted', { description: `${entries.length} file(s) queued for review.` });
      setFiles({});
      await refreshReports();
    } catch {
      toast.error('Submission failed', { description: 'Check the file type and try again.' });
    } finally {
      setBusy(false);
    }
  }

  const uploaded = useMemo(() => {
    return reports.slice().sort((a, b) => {
      const da = new Date(b.createdAt || b.created_at || 0).getTime();
      const db = new Date(a.createdAt || a.created_at || 0).getTime();
      return da - db;
    });
  }, [reports]);

  const stats = useMemo(() => {
    const total = uploaded.length;
    let submitted = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of uploaded) {
      const s = r.status || '';
      if (s === 'submitted') submitted += 1;
      else if (s === 'approved') approved += 1;
      else if (s === 'rejected') rejected += 1;
    }
    return { total, submitted, approved, rejected };
  }, [uploaded]);

  const latestByCat = useMemo(() => {
    const byCat = {};
    for (const r of uploaded) {
      const c = r.category || r.type;
      if (!c) continue;
      if (!byCat[c] || new Date(r.createdAt || r.created_at || 0) > new Date(byCat[c].createdAt || byCat[c].created_at || 0)) {
        byCat[c] = r;
      }
    }
    return byCat;
  }, [uploaded]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return uploaded.filter((r) => {
      const cat = r.category || r.type;
      if (filterCat !== 'all' && cat !== filterCat) return false;
      if (statusFilter === 'awaiting' && r.status !== 'submitted') return false;
      if (statusFilter === 'approved' && r.status !== 'approved') return false;
      if (statusFilter === 'rejected' && r.status !== 'rejected') return false;
      if (!needle) return true;
      const name = (r.originalName || r.filename || r.title || '').toLowerCase();
      return name.includes(needle);
    });
  }, [uploaded, filterCat, statusFilter, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function updateFilter(setter, value) {
    setter(value);
    setPage(0);
  }

  function downloadReport(report) {
    if (!report?.id) return;
    downloadFile(`/reports/${report.id}/file`, report.originalName || report.filename || 'report').catch(() => toast.error('Download failed'));
  }

  async function previewReport(report) {
    if (!report?.id) return;
    try {
      const res = await api.get(`/reports/${report.id}/file`, { responseType: 'blob' });
      const mime = res.data?.type || report.mimeType || '';
      const url = URL.createObjectURL(res.data);
      setPreview({ url, mime, name: report.originalName || report.filename || 'Report' });
    } catch {
      toast.error('Preview failed', { description: 'Try downloading instead.' });
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <div className="flex flex-col gap-2.5 overflow-x-clip py-1.5 md:gap-3 md:py-2">
      <PageHeader title="Submit Reports" subtitle="Upload and track your quarterly, annual, good practices, and success story reports" />
      <div className="space-y-3 px-4 pt-6 lg:px-6 lg:pt-9">
        <UploadCard
          files={files}
          latestByCat={latestByCat}
          selectedCat={selectedCat}
          onSelectCat={setSelectedCat}
          submittingCat={submittingCat}
          onPick={(id, f) => setFiles((prev) => ({ ...prev, [id]: f }))}
          onRemove={(id) =>
            setFiles((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            })
          }
          busy={busy}
          onDiscard={discard}
          onSubmit={submit}
          onSubmitOne={submitOne}
        />
      </div>

      <div className="px-4 lg:px-6">
        <Card className="h-full">
          <CardHeader className="pb-0.5 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle>My Submissions</CardTitle>
                <CardDescription>
                  {stats.total} total · {stats.submitted} awaiting · {stats.approved} approved · {stats.rejected} rejected
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 rounded-lg border p-1">
                <Button size="sm" variant={viewMode === 'gallery' ? 'default' : 'ghost'} onClick={() => setViewMode('gallery')}>
                  <HugeiconsIcon icon={GridViewIcon} size={16} strokeWidth={1.8} />
                  Gallery
                </Button>
                <Button size="sm" variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => setViewMode('list')}>
                  <HugeiconsIcon icon={LeftToRightListDashIcon} size={16} strokeWidth={1.8} />
                  List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end">
              <div className="relative flex-1">
                <HugeiconsIcon icon={Search01Icon} size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search file name..." className="h-9 w-full pl-8" />
              </div>
              <div className="w-full space-y-1.5 lg:w-52">
                <p className="editorial-label text-muted-foreground">Report type</p>
                <Select value={filterCat} onValueChange={(v) => updateFilter(setFilterCat, v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{CATEGORY_SHORT[c.id]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full space-y-1.5 lg:w-44">
                <p className="editorial-label text-muted-foreground">Status</p>
                <Select value={statusFilter} onValueChange={(v) => updateFilter(setStatusFilter, v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="awaiting">Awaiting</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full space-y-1.5 lg:w-32">
                <p className="editorial-label text-muted-foreground">Show</p>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                ))}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">Failed to load submissions</p>
                <Button size="sm" variant="outline" onClick={refreshReports}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {uploaded.length === 0 ? 'No reports submitted yet. Attach files above and submit all.' : 'No reports match your filters.'}
              </p>
            ) : viewMode === 'gallery' ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((report) => {
                  const cat = report.category || report.type || '';
                  const status = report.status || 'submitted';
                  return (
                    <Card key={report.id} className="h-full">
                      <CardContent className="flex h-full flex-col gap-1.5 p-3 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                            <HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} className="text-muted-foreground" />
                          </span>
                          <p className="line-clamp-1 min-w-0 flex-1 text-sm font-medium">{report.originalName || report.filename || report.title || 'Report'}</p>
                          <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                            {status}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                          {CATEGORY_SHORT[cat] || cat || 'Report'}
                        </Badge>
                        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                          <span>
                            {report.createdAt || report.created_at
                              ? new Date(report.createdAt || report.created_at).toLocaleDateString()
                              : '—'}
                          </span>
                          <span>{formatBytes(report.size)}</span>
                        </div>
                        <div className="min-h-4 flex-1" />
                        <div className="mt-auto flex gap-2 border-t pt-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1"
                            onClick={() => previewReport(report)}
                          >
                            <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} />
                            Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 flex-1"
                            onClick={() => downloadReport(report)}
                          >
                            <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((report) => {
                      const cat = report.category || report.type || '';
                      const status = report.status || 'submitted';
                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                                <HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} className="text-muted-foreground" />
                              </span>
                              <span className="min-w-0">
                                <span className="block max-w-56 truncate font-medium">{report.originalName || report.filename || report.title || 'Report'}</span>
                                <span className="block truncate text-xs text-muted-foreground">Report</span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{CATEGORY_LABEL[cat] || cat || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {report.createdAt || report.created_at
                              ? new Date(report.createdAt || report.created_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatBytes(report.size)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
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
            )}
            {filtered.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Showing {safePage * pageSize + 1}–{Math.min(filtered.length, safePage * pageSize + visible.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                    Previous
                  </Button>
                  <span className="px-1 text-xs text-muted-foreground">Page {safePage + 1} of {pageCount}</span>
                  <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
    </div>
  );
}
