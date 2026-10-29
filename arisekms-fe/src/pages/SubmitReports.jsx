import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, CloudUploadIcon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { PageHeader } from '@/components/PageHeader.jsx';
import { ADD_ACTIONS } from '@/lib/add-actions.js';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';

const ACCEPTED = ['pdf', 'jpg', 'jpeg', 'png'];
const CATEGORIES = [
  { id: 'quarterly', label: 'Quarterly Accomplishment Reports' },
  { id: 'good-practices', label: 'Good Practices' },
  { id: 'annual', label: 'Annual Accomplishment Reports' },
  { id: 'success-stories', label: 'Success Stories' },
];

function Tile({ category, file, onPick, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list) {
    const f = list?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      toast.error('Unsupported file type', { description: `Supports ${ACCEPTED.join(', ')}. One file per category.` });
      return;
    }
    onPick(category.id, f);
  }

  return (
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
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--sendai-teal)]/60 p-6 text-center transition-colors',
        dragging && 'border-solid bg-[#e9eff5]',
      )}
    >
      <p className="text-sm font-semibold text-[#1e3a5f]">{category.label}</p>
      {file ? (
        <span className="flex max-w-full items-center gap-2 rounded-sm bg-[#e9eff5] px-3 py-1.5 text-xs font-medium text-[#0B4484]">
          <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} />
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={() => onRemove(category.id)}
            className="rounded-sm p-0.5"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </span>
      ) : (
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <HugeiconsIcon icon={CloudUploadIcon} size={16} strokeWidth={1.8} />
          Attach file
        </Button>
      )}
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
  );
}

export function SubmitReports() {
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);

  function discard() {
    setFiles({});
    toast.info('Attachments discarded');
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
    } catch {
      toast.error('Submission failed', { description: 'Check the file type and try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#0a1931]">
      <PageHeader
        actions={[ADD_ACTIONS.certificate, ADD_ACTIONS.product]}
      />
      <PageHero
        title="Submit Reports"
        subtitle="You can drag your file to start uploading"
      />
      <div className="mx-auto max-w-4xl px-4 pb-16">
        {/* Sendai corner blocks */}
        <div className="relative">
          <span aria-hidden className="absolute -top-5 -left-5 -z-0 h-24 w-40 rounded-tl-2xl bg-[var(--sendai-crimson)]" />
          <span aria-hidden className="absolute -top-5 -right-5 -z-0 h-24 w-40 rounded-tr-2xl bg-[var(--sendai-plum)]" />
          <span aria-hidden className="absolute -bottom-5 -left-5 -z-0 h-24 w-40 rounded-bl-2xl bg-[var(--sendai-teal)]" />
          <span aria-hidden className="absolute -right-5 -bottom-5 -z-0 h-24 w-40 rounded-br-2xl bg-[var(--sendai-orange)]" />
          <Card className="relative rounded-2xl">
            <CardContent className="space-y-6 p-6 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-2">
                {CATEGORIES.map((c) => (
                  <Tile
                    key={c.id}
                    category={c}
                    file={files[c.id]}
                    onPick={(id, f) => setFiles((prev) => ({ ...prev, [id]: f }))}
                    onRemove={(id) =>
                      setFiles((prev) => {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                      })
                    }
                  />
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Supports .pdf, .jpg, and .png. One file per category.
              </p>
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-muted-foreground">
                  Your data is handled securely — <Link to="/privacy-policy" className="underline">Privacy Policy</Link>
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={discard} disabled={busy}>
                    Discard
                  </Button>
                  <Button onClick={submit} disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
