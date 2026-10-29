import { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, PlusSignIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { canUpload, effectiveRole, getTokenRoles } from '@/lib/rbac.js';

const CATEGORIES = ['All', 'ECE', 'Manual', 'Policies', 'Terms'];
const PAGE_SIZE = 6;

// shortcut: single fetch capped at 100 docs, client-side filter; add server
// search + pagination (?q, limit/offset) when the library outgrows it.

export function KnowledgeProducts() {
  const [category, setCategory] = useState('All');
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qId, setQId] = useState('');
  const [page, setPage] = useState(0);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const role = effectiveRole(getTokenRoles());

  function refresh() {
    setLoading(true);
    return api
      .get('/knowledge', { params: { limit: 100, offset: 0 } })
      .then((res) => setDocs(res.data.data ?? []))
      .catch(() => toast.error('Could not load documents'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload() {
    if (!pending?.file || !pending.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', pending.title.trim());
      form.append('category', pending.category);
      form.append('file', pending.file);
      await api.post('/knowledge', form);
      toast.success('Document uploaded');
      setPending(null);
      await refresh();
    } catch {
      toast.error('Upload failed', { description: 'Check the file type and try again.' });
    } finally {
      setUploading(false);
    }
  }

  const counts = useMemo(() => {
    const c = { All: docs.length };
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1;
    for (const cat of CATEGORIES) c[cat] ??= 0;
    return c;
  }, [docs]);

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase();
    const d = (qDesc.trim() || '').toLowerCase();
    const id = qId.trim();
    return docs.filter(
      (doc) =>
        (category === 'All' || doc.category === category) &&
        (!t || doc.title.toLowerCase().includes(t)) &&
        (!d || (doc.description ?? '').toLowerCase().includes(d)) &&
        (!id || String(doc.id) === id),
    );
  }, [docs, category, qTitle, qDesc, qId]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function selectCategory(cat) {
    setCategory(cat);
    setPage(0);
  }

  function download(doc) {
    downloadFile(`/knowledge/${doc.id}/file`, `${doc.title}.pdf`).catch(() =>
      toast.error('Download failed'),
    );
  }

  return (
    <div>
      <PageHero
        title="Knowledge Products"
        subtitle="Secure repository of manuals, guides, and organizational knowledge."
      >
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-lg sm:flex-row">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="Search by Title" className="pl-9" />
          </div>
          <Input value={qDesc} onChange={(e) => setQDesc(e.target.value)} placeholder="Search by Description" className="flex-1" />
          <Input value={qId} onChange={(e) => setQId(e.target.value)} placeholder="Search by ID" className="sm:w-36" />
          {canUpload(role) && (
            <Button onClick={() => fileRef.current?.click()}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
              Upload Document
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                const f = e.target.files[0];
                setPending({ file: f, title: f.name.replace(/\.[^.]+$/, ''), category: 'Manual' });
              }
              e.target.value = '';
            }}
          />
        </div>
        {pending && (
          <div className="mx-auto mt-3 flex max-w-3xl flex-col gap-2 rounded-lg bg-white p-3 shadow-lg sm:flex-row">
            <Input value={pending.title} onChange={(e) => setPending({ ...pending, title: e.target.value })} placeholder="Title" className="flex-1" />
            <select value={pending.category} onChange={(e) => setPending({ ...pending, category: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button onClick={upload} disabled={uploading}>{uploading ? 'Uploading…' : 'Confirm upload'}</Button>
          </div>
        )}
      </PageHero>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 lg:w-56">
          <Card>
            <CardContent className="p-4">
              <p className="editorial-label mb-3 text-[#1e3a5f]">Categories</p>
              <div className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => selectCategory(cat)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm transition-colors',
                      category === cat
                        ? 'bg-[#0a1931] font-semibold text-white'
                        : 'text-[#1e3a5f] hover:bg-[#e9f7ef] hover:text-[#15803d]',
                    )}
                  >
                    {cat}
                    <span className={cn('text-xs', category === cat ? 'text-white/70' : 'text-muted-foreground')}>
                      {counts[cat]}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex flex-col gap-2 p-5">
                  <div className="flex gap-1.5">
                    <Badge className="bg-[var(--sendai-crimson)] text-white">{doc.kind}</Badge>
                    <Badge className="bg-[var(--sendai-teal)] text-white">{doc.category}</Badge>
                  </div>
                  <p className="font-heading text-base font-bold text-[#1e3a5f]">{doc.title}</p>
                  <p className="min-h-16 text-xs leading-relaxed text-muted-foreground">{doc.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(doc)}
                    className="mt-1 border-[var(--sendai-crimson)]/30 bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)] hover:bg-[var(--sendai-crimson)] hover:text-white"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
            {visible.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
                {loading ? 'Loading documents…' : 'No documents match your filters.'}
              </p>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Previous
            </Button>
            <span className="px-2 text-muted-foreground">Page {safePage + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
