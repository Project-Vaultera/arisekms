import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { cn } from '@/lib/utils.js';

const DOT = {
  Report: 'bg-[var(--sendai-teal)]',
  Knowledge: 'bg-[var(--sendai-crimson)]',
  Certificate: 'bg-[var(--sendai-orange)]',
};

// Minimal shadcn-style timeline built on Card + Badge + Separator
// (shadcn ships no Timeline component, so this stays dependency-free).
export function EventTimeline({ items = [], loading = false }) {
  const events = items.slice(0, 6);
  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Latest events across the workspace</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <ol className="relative space-y-0">
            {events.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                {i < events.length - 1 && (
                  <span aria-hidden className="absolute top-5 left-[5px] h-[calc(100%-1rem)] w-px bg-border" />
                )}
                <span className={cn('mt-1.5 size-[11px] shrink-0 rounded-full', DOT[e.type] ?? 'bg-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" className="px-1 py-0 text-[10px]">{e.type}</Badge>
                    {e.date ? new Date(e.date).toLocaleDateString() : '—'}
                    {e.actor ? ` · ${e.actor}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-auto">
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            Full history lives on each product page — reports, knowledge, and SkillsBuild.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
