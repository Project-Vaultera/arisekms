import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { cn } from '@/lib/utils.js';

// Global dropdown: editorial-label + radix Select (member-directory pattern).
// options: ['All', ...] or [{ value, label }].
// hideLabel drops the visible title but keeps it as the trigger aria-label.
export function FilterSelect({
  label,
  value,
  onValueChange,
  placeholder = 'All',
  options = [],
  className,
  triggerClassName,
  hideLabel = false,
  disabled = false,
}) {
  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && !hideLabel && <p className="editorial-label text-muted-foreground">{label}</p>}
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn('w-full', triggerClassName)} aria-label={hideLabel ? (label ?? placeholder) : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* popper: fixed-positioned menu that flips above the trigger near the viewport bottom */}
        <SelectContent position="popper" side="bottom" sideOffset={4}>
          {options.map((opt) =>
            typeof opt === 'string' || typeof opt === 'number' ? (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ) : (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
