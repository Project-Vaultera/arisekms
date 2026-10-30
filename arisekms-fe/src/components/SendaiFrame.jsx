import { cn } from '@/lib/utils.js';

// Signature four-color layered frame (Sendai palette) for primary feature
// containers only: upload interfaces, registration forms, key dashboard
// modules. Tables, gallery cards, and charts stay clean per the system rules.
// Children must sit above the bands, e.g. <Card className="relative z-10 rounded-2xl">.
export function SendaiFrame({ children, className }) {
  return (
    <div className={cn('relative', className)}>
      <div aria-hidden className="pointer-events-none absolute -top-3 -right-3 -bottom-3 -left-3 select-none sm:-top-6 sm:-right-6 sm:-bottom-6 sm:-left-6">
        <span className="absolute top-0 left-0 z-0 h-[51%] w-[51%] rounded-3xl bg-[var(--sendai-crimson)]" />
        <span className="absolute top-0 left-[49%] z-[1] h-[51%] w-[51%] rounded-3xl bg-[var(--sendai-plum)]" />
        <span className="absolute top-[49%] left-0 z-[2] h-[51%] w-[51%] rounded-3xl bg-[var(--sendai-teal)]" />
        <span className="absolute top-[49%] left-[49%] z-[3] h-[51%] w-[51%] rounded-3xl bg-[var(--sendai-orange)]" />
      </div>
      {children}
    </div>
  );
}
