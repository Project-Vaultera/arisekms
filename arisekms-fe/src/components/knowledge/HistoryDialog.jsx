import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { HistoryIcon } from '@hugeicons/core-free-icons';

import { api } from '@/api/client.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { cn } from '@/lib/utils.js';

const ACTION_LABEL = {
  KNOWLEDGE_UPLOADED: 'Uploaded',
  KNOWLEDGE_EDITED: 'Edited',
  KNOWLEDGE_RESUBMITTED: 'Resubmitted for review',
  KNOWLEDGE_APPROVED: 'Approved',
  KNOWLEDGE_REJECTED: 'Rejected',
};

const ACTION_TINT = {
  KNOWLEDGE_APPROVED: 'bg-[var(--sendai-teal)]',
  KNOWLEDGE_REJECTED: 'bg-[var(--sendai-crimson)]',
  KNOWLEDGE_RESUBMITTED: 'bg-[var(--sendai-orange)]',
  KNOWLEDGE_UPLOADED: 'bg-[var(--sendai-plum)]',
  KNOWLEDGE_EDITED: 'bg-[#0B4484]',
};

function timeAgo(raw) {
  if (!raw) return '';
  const d = new Date(raw).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(raw).toLocaleDateString();
}

// Version-control-lite timeline for a knowledge document: who did what, when,
// and (for rejections) why. Visible to the author and to reviewers.
export function HistoryDialog({ open, onClose, docId, title }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !docId) return;
    setLoading(true);
    api
      .get(`/knowledge/${docId}/history`)
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, docId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={HistoryIcon} size={18} strokeWidth={1.8} className="text-[#0c4585]" />
            Activity
          </DialogTitle>
          <DialogDescription className="truncate">{title ?? `Document #${docId ?? ''}`}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="max-h-80 space-y-0 overflow-y-auto">
            {items.map((it, i) => (
              <li key={`${it.action}-${it.createdAt}-${i}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', ACTION_TINT[it.action] ?? 'bg-muted-foreground')} aria-hidden />
                  {i < items.length - 1 && <span className="w-px flex-1 bg-border" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <p className="text-sm font-semibold text-foreground">
                    {ACTION_LABEL[it.action] ?? it.action}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{timeAgo(it.createdAt)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.actorName ? `${it.actorName} (@${it.actorUsername ?? '—'})` : 'System'}
                    {it.createdAt ? ` · ${new Date(it.createdAt).toLocaleString()}` : ''}
                  </p>
                  {it.metadata?.reason && (
                    <p className="mt-1 rounded-sm bg-[var(--sendai-crimson)]/10 px-2 py-1 text-xs text-[var(--sendai-crimson)]">
                      {it.metadata.reason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
