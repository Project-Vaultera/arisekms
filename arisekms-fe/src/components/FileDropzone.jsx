import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button.jsx';
import { ACCEPT_ATTR } from '@/lib/file-upload.js';
import { cn } from '@/lib/utils.js';

// Global single-file dropzone (submit-reports UploadCard design).
// Validation + file state stay with the parent via onPick.
export function FileDropzone({
  onPick,
  accept = ACCEPT_ATTR,
  title = 'Upload your files',
  subtitle = 'Drag and drop files here or click to browse',
  hint = 'Supports .pdf, .doc, .docx, .jpg, .png up to 100MB each',
  buttonLabel = 'Select files',
  compact = false,
  className,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list) {
    const f = list?.[0];
    if (f) onPick?.(f);
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
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-[var(--sendai-teal)]/60 text-center transition-colors',
        compact ? 'px-3 py-4' : 'px-4 py-8',
        dragging && 'border-solid bg-[#e9eff5]',
        className,
      )}
    >
      <span className={cn('grid place-items-center rounded-full bg-muted', compact ? 'size-10' : 'size-16')}>
        <HugeiconsIcon icon={CloudUploadIcon} size={compact ? 18 : 24} strokeWidth={1.8} className="text-muted-foreground" />
      </span>
      <p className={cn('mt-2 font-semibold text-[#1e3a5f]', compact ? 'text-sm' : 'text-base')}>{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <Button type="button" className="mt-2" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
        <HugeiconsIcon icon={CloudUploadIcon} size={15} strokeWidth={2} />
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
