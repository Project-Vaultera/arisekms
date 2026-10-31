import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { FileDropzone } from '@/components/FileDropzone.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { validateUploadFile } from '@/lib/file-upload.js';

const NEW_CATEGORY = '__new';

export function UploadDocumentModal({ open, onClose, onUploaded, categories = [] }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setCategory(categories[0] ?? 'Manual');
      setCustomCategory('');
      setDescription('');
      setFile(null);
      setError('');
    }
  }, [open, categories ]);

  function close() {
    if (uploading) return;
    onClose();
  }

  function pickFile(f) {
    const problem = validateUploadFile(f);
    if (problem) {
      setError(`${problem.title}. ${problem.description}`);
      return;
    }
    setError('');
    setFile(f);
  }

  function resolvedCategory() {
    return (category === NEW_CATEGORY ? customCategory.trim() : category).slice(0, 50);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!resolvedCategory()) {
      setError(category === NEW_CATEGORY ? 'Enter a name for the new category.' : 'Choose a document type.');
      return;
    }
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('category', resolvedCategory());
      if (description.trim()) form.append('description', description.trim());
      form.append('file', file);
      await api.post('/knowledge', form);
      toast.success('Document uploaded');
      onUploaded?.();
      onClose();
    } catch {
      setError('Upload failed. Check the file type and try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent showCloseButton={false} className="border-0 bg-transparent p-0 shadow-none">
        <SendaiFrame>
          <div className="relative z-10 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6">
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
              <DialogDescription>Add a new file to the knowledge repository.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Member Handbook 2026"
                  maxLength={200}
                />
              </div>
              <FilterSelect
                label="Document type"
                value={category}
                onValueChange={setCategory}
                placeholder="Manual"
                options={[...categories, { value: NEW_CATEGORY, label: '+ New category…' }]}
              />
              {category === NEW_CATEGORY && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="doc-custom-cat">New category name</Label>
                  <Input
                    id="doc-custom-cat"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Guidelines"
                    maxLength={50}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-desc">
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="doc-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this document cover?"
                  maxLength={2000}
                  rows={3}
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <p className="text-right text-xs text-muted-foreground">{description.length}/2000</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>File</Label>
                <FileDropzone compact onPick={pickFile} />
                {file && (
                  <span className="flex max-w-full items-center gap-1.5 self-start rounded-sm bg-[#e9eff5] px-2 py-1 text-xs font-medium text-[#0B4484]">
                    <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2} />
                    <span className="max-w-40 truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setFile(null)}
                      className="rounded-sm p-0.5"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
                    </button>
                  </span>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={uploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </SendaiFrame>
      </DialogContent>
    </Dialog>
  );
}
