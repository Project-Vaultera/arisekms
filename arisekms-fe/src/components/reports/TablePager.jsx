import { Button } from '@/components/ui/button.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';

// Shared table footer: Show N + Showing X–Y of Z + Previous/Next.
export function TablePager({ page, pageCount, pageSize, onPageSize, total, fromIdx, toIdx, onPage }) {
  if (total === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2">
        <FilterSelect
          label="Show"
          value={String(pageSize)}
          onValueChange={(v) => { onPageSize(Number(v)); onPage(0); }}
          placeholder="10"
          className="w-28"
          options={['10', '25', '50', '100']}
        />
        <p className="text-xs text-muted-foreground">
          Showing {fromIdx}–{toIdx} of {total}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="px-1 text-xs text-muted-foreground">Page {page + 1} of {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
