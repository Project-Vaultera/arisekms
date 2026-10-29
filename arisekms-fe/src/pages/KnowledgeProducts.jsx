import { useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, PlusSignIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { PageHero } from '@/components/PageHero.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { canUpload, effectiveRole, getTokenRoles } from '@/lib/rbac.js';

// TODO: replace with GET /api/v1/knowledge (workspace-scoped, paginated).
const DOCS = [
  { id: 1, title: 'Employee Manual', category: 'Manual', kind: 'PDF', desc: 'A list of guides and policies for ARISE employees.' },
  { id: 2, title: 'Emergency Response & Evacuation Manual', category: 'ECE', kind: 'PDF', desc: 'A step-by-step operational guide detailing emergency protocols, assembly points, and designated roles.' },
  { id: 3, title: 'Data Privacy & Security Policy', category: 'ECE', kind: 'PDF', desc: 'A formal framework governing the collection, storage, and processing of sensitive information.' },
  { id: 4, title: 'Employee Onboarding Manual', category: 'Manual', kind: 'PDF', desc: 'A step-by-step guide to welcome new hires, introducing culture, tools, and training workflows.' },
  { id: 5, title: 'Terms of Reference', category: 'Policies', kind: 'PDF', desc: 'Defines the purpose, scope, responsibilities, and structure of a project, committee, or task.' },
  { id: 6, title: 'Strategic Plan 2024-2026', category: 'Policies', kind: 'PDF', desc: 'A roadmap outlining goals, priorities, and initiatives for 2024 to 2026.' },
  { id: 7, title: 'Business Continuity Guide', category: 'Manual', kind: 'PDF', desc: 'Keeping critical functions running before, during, and after disruptive events.' },
  { id: 8, title: 'Rapid Needs Assessment Template', category: 'Policies', kind: 'PDF', desc: 'Standard template for post-disaster rapid needs assessment reporting.' },
];

const CATEGORIES = ['All', 'ECE', 'Manual', 'Policies', 'Terms'];
const PAGE_SIZE = 6;

export function KnowledgeProducts() {
  const [category, setCategory] = useState('All');
  const [qTitle, setQTitle] = useState('');
  const [qDesc, setQDesc] = useState('');
  const [qId, setQId] = useState('');
  const [page, setPage] = useState(0);
  const role = effectiveRole(getTokenRoles());

  const counts = useMemo(() => {
    const c = { All: DOCS.length };
    for (const d of DOCS) c[d.category] = (c[d.category] ?? 0) + 1;
    for (const cat of CATEGORIES) c[cat] ??= 0;
    return c;
  }, []);

  const filtered = useMemo(() => {
    const t = qTitle.trim().toLowerCase();
    const d = qDesc.trim().toLowerCase();
    const id = qId.trim();
    return DOCS.filter(
      (doc) =>
        (category === 'All' || doc.category === category) &&
        (!t || doc.title.toLowerCase().includes(t)) &&
        (!d || doc.desc.toLowerCase().includes(d)) &&
        (!id || String(doc.id) === id),
    );
  }, [category, qTitle, qDesc, qId]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function selectCategory(cat) {
    setCategory(cat);
    setPage(0);
  }

  function download(doc) {
    // TODO: GET /api/v1/knowledge/:id/file (signed URL, audit the download).
    toast.success('Download started', { description: `${doc.title}.${doc.kind.toLowerCase()}` });
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
            <Button onClick={() => toast.info('Upload coming soon', { description: 'TODO: POST /api/v1/knowledge (admin only).' })}>
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2} />
              Upload Document
            </Button>
          )}
        </div>
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
                  <p className="min-h-16 text-xs leading-relaxed text-muted-foreground">{doc.desc}</p>
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
                No documents match your filters.
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
