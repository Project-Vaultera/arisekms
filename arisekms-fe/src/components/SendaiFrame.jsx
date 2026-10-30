import { cn } from '@/lib/utils.js';

// Signature four-color layered frame (Sendai palette) for primary feature
// containers only: upload interfaces, registration forms, key dashboard
// modules. Tables, gallery charts stay clean per the system rules.
// Children must sit above the bands, e.g. <Card className="relative z-10 rounded-2xl">.
// `tight` shrinks the bands to hug small targets (e.g. a button hover border);
// `slim` is the in-between regular weight for side panels and rails;
// `decorClassName` can hide/reveal the bands (e.g. `opacity-0 group-hover:opacity-100`).
export function SendaiFrame({ children, className, tight = false, slim = false, decorClassName }) {
  const offsets = tight
    ? '-top-1 -right-1 -bottom-1 -left-1'
    : slim
      ? '-top-1.5 -right-1.5 -bottom-1.5 -left-1.5 sm:-top-2 sm:-right-2 sm:-bottom-2 sm:-left-2'
      : '-top-3 -right-3 -bottom-3 -left-3 sm:-top-6 sm:-right-6 sm:-bottom-6 sm:-left-6';
  const radius = tight ? 'rounded-sm' : slim ? 'rounded-lg' : 'rounded-3xl';
  return (
    <div className={cn('relative', className)}>
      <div aria-hidden className={cn('pointer-events-none absolute select-none', offsets, decorClassName)}>
        <span className={cn('absolute top-0 left-0 z-0 h-[51%] w-[51%] bg-[var(--sendai-crimson)]', radius)} />
        <span className={cn('absolute top-0 left-[49%] z-[1] h-[51%] w-[51%] bg-[var(--sendai-plum)]', radius)} />
        <span className={cn('absolute top-[49%] left-0 z-[2] h-[51%] w-[51%] bg-[var(--sendai-teal)]', radius)} />
        <span className={cn('absolute top-[49%] left-[49%] z-[3] h-[51%] w-[51%] bg-[var(--sendai-orange)]', radius)} />
      </div>
      {children}
    </div>
  );
}
