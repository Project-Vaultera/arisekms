import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';

export const DATE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

function iso(d) {
  return d.toISOString().slice(0, 10);
}

export function presetRange(preset) {
  const now = new Date();
  if (preset === '30d') {
    const f = new Date(now);
    f.setDate(f.getDate() - 30);
    return { from: iso(f), to: iso(now) };
  }
  if (preset === '90d') {
    const f = new Date(now);
    f.setDate(f.getDate() - 90);
    return { from: iso(f), to: iso(now) };
  }
  if (preset === '6m') {
    const f = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    return { from: iso(f), to: iso(now) };
  }
  if (preset === '12m') {
    const f = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    return { from: iso(f), to: iso(now) };
  }
  if (preset === 'ytd') {
    return { from: `${now.getFullYear()}-01-01`, to: iso(now) };
  }
  return { from: '', to: '' };
}

// Consistent date dropdown used by all three report pages.
export function DateRangeFilter({ preset, onPreset, from, to, onFrom, onTo, hideLabel = false }) {
  return (
    <>
      <FilterSelect
        label="Date"
        value={preset}
        onValueChange={(v) => onPreset(v)}
        className="lg:w-48"
        options={DATE_PRESETS}
        hideLabel={hideLabel}
      />
      {preset === 'custom' && (
        <>
          <div className="space-y-1.5">
            {!hideLabel && <p className="editorial-label text-muted-foreground">From</p>}
            <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="h-9" aria-label="From" />
          </div>
          <div className="space-y-1.5">
            {!hideLabel && <p className="editorial-label text-muted-foreground">To</p>}
            <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} className="h-9" aria-label="To" />
          </div>
        </>
      )}
    </>
  );
}
