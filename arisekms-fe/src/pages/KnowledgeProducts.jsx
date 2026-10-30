import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, Cancel01Icon, Certificate01Icon, Download01Icon, EyeIcon, File02Icon, GridViewIcon, PlusSignIcon, Search01Icon, Shield01Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { PageHeader } from '@/components/PageHeader.jsx';
import { UploadDocumentModal } from '@/components/UploadDocumentModal.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { canUpload, effectiveRole, getTokenRoles } from '@/lib/rbac.js';
import knowledgeBg from '/bg-arise.jpg';

const KNOWN_CATEGORIES = ['ECE', 'Manual', 'Policies', 'Terms'];
const CATEGORY_ICONS = {
  All: GridViewIcon,
  ECE: Certificate01Icon,
  Manual: BookOpen01Icon,
  Policies: Shield01Icon,
  Terms: File02Icon,
};
const PAGE_SIZE = 6;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// shortcut: single fetch capped at 100 docs, client-side filter; add server
// search + pagination (?q, limit/offset) when the library outgrows it.

export function KnowledgeProducts() {
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [customCats, setCustomCats] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('arisekms_custom_categories') ?? '[]');
      return Array.isArray(raw) ? raw.filter((c) => typeof c === 'string') : [];
    } catch {
      return [];
    }
  });
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

  const categories = useMemo(() => {
    const seen = [...new Set(docs.map((d) => d.category).filter(Boolean))];
    const extra = customCats.filter((c) => !KNOWN_CATEGORIES.includes(c) && !seen.includes(c));
    return ['All', ...KNOWN_CATEGORIES, ...seen.filter((c) => !KNOWN_CATEGORIES.includes(c)), ...extra];
  }, [docs, customCats]);

  function addCategory(e) {
    e?.preventDefault();
    const name = newCat.trim().slice(0, 50);
    if (!name) {
      toast.error('Enter a category name');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    const next = [...customCats, name];
    setCustomCats(next);
    try {
      localStorage.setItem('arisekms_custom_categories', JSON.stringify(next));
    } catch {
      // shortcut: session-only when storage is unavailable; syncs once a doc uses it.
    }
    setNewCat('');
    setAddingCat(false);
    toast.success(`Category "${name}" added`);
  }

  const counts = useMemo(() => {
    const c = { All: docs.length };
    for (const d of docs) c[d.category] = (c[d.category] ?? 0) + 1;
    for (const cat of categories) c[cat] ??= 0;
    return c;
  }, [docs, categories]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const idNeedle = q.trim();
    return docs.filter(
      (doc) =>
        (category === 'All' || doc.category === category) &&
        (!needle ||
          doc.title.toLowerCase().includes(needle) ||
          (doc.description ?? '').toLowerCase().includes(needle) ||
          String(doc.id).includes(idNeedle)),
    );
  }, [docs, category, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function selectCategory(cat) {
    setCategory(cat);
    setPage(0);
  }

  function download(doc) {
    downloadFile(`/knowledge/${doc.id}/file`, doc.originalName || doc.title).catch(() =>
      toast.error('Download failed'),
    );
  }

  async function previewDoc(doc) {
    try {
      const res = await api.get(`/knowledge/${doc.id}/file`, { responseType: 'blob' });
      const mime = res.data?.type || doc.mimeType || '';
      const name = doc.originalName || doc.title;
      const url = URL.createObjectURL(res.data);
      if (mime === DOCX_MIME || /\.docx$/i.test(doc.originalName ?? '')) {
        try {
          const { default: mammoth } = await import('mammoth');
          const buf = await res.data.arrayBuffer();
          const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
          setPreview({ url, mime, name, html: value });
        } catch {
          setPreview({ url, mime, name, html: null });
        }
        return;
      }
      setPreview({ url, mime, name });
    } catch {
      toast.error('Preview failed', { description: 'Try downloading instead.' });
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  return (
    <div>
      <PageHeader />
      <PageHero
        title="Knowledge Products"
        subtitle="Secure repository of manuals, guides, and organizational knowledge."
        bg={knowledgeBg}
        overlayClassName="bg-[#0B4484]/50"
      >
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-lg sm:flex-row">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="Search by title, description, or ID"
              className="h-12 pl-10 text-base"
            />
          </div>
          {canUpload(role) && (
            <Button onClick={() => setModalOpen(true)} className="h-12 bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-plum)] hover:text-white">
              <HugeiconsIcon icon={Upload01Icon} size={16} strokeWidth={2} />
              Upload Document
            </Button>
          )}
        </div>
      </PageHero>
      <UploadDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUploaded={refresh}
        categories={categories.filter((c) => c !== 'All')}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 lg:w-56">
          <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
            <CardContent className="p-4">
              <p className="editorial-label mb-3 text-[#1e3a5f]">Categories</p>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] ?? File02Icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => selectCategory(cat)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors',
                        category === cat
                          ? 'bg-[#0B4484] font-semibold text-white'
                          : 'text-[#1e3a5f] hover:text-[#0B4484]',
                      )}
                    >
                      <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.8} />
                      <span className="flex-1 text-left">{cat}</span>
                      <span className={cn('text-xs', category === cat ? 'text-white/70' : 'text-muted-foreground')}>
                        {counts[cat]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {canUpload(role) &&
                (addingCat ? (
                  <form onSubmit={addCategory} className="mt-2 flex gap-1.5">
                    <Input
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      placeholder="New category"
                      maxLength={50}
                      autoFocus
                      className="h-8"
                    />
                    <Button type="submit" size="sm" className="h-8 shrink-0">
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAddingCat(false); setNewCat(''); }}
                      className="h-8 shrink-0"
                      aria-label="Cancel add category"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                    </Button>
                  </form>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setAddingCat(true)} className="mt-2 w-full">
                    <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2} />
                    Add category
                  </Button>
                ))}
            </CardContent>
          </Card>
          </SendaiFrame>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
            {visible.map((doc) => (
              <Card key={doc.id} className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex flex-wrap gap-1.5">
                    {doc.kind && <Badge className="bg-[var(--sendai-plum)] text-white uppercase tracking-wide">{doc.kind}</Badge>}
                    <Badge className="bg-[var(--sendai-teal)] text-white uppercase tracking-wide">{doc.category}</Badge>
                  </div>
                  <p className="font-heading min-w-0 text-base font-bold break-words text-[#1e3a5f]">{doc.title}</p>
                  <p className="line-clamp-3 min-w-0 text-xs leading-relaxed break-words text-muted-foreground">{doc.description || 'No description provided.'}</p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => previewDoc(doc)} className="flex-1">
                      <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2} />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => download(doc)}
                      className="flex-1 border-[var(--sendai-crimson)]/30 bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]"
                    >
                      <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                      Download
                    </Button>
                  </div>
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
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closePreview}>
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <p className="truncate text-sm font-medium">{preview.name}</p>
              <Button variant="outline" size="sm" onClick={closePreview}>Close</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {preview.mime?.startsWith('image/') ? (
                <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70vh] object-contain" />
              ) : preview.mime === 'application/pdf' ? (
                <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full" />
              ) : preview.html ? (
                <div className="text-sm leading-relaxed [&_img]:max-w-full [&_table]:w-full" dangerouslySetInnerHTML={{ __html: preview.html }} />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Preview not available for this file type — download it to view.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-[var(--sendai-crimson)]/30 bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]"
                  >
                    <a href={preview.url} download={preview.name}>
                      <HugeiconsIcon icon={Download01Icon} size={15} strokeWidth={2} />
                      Download instead
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
