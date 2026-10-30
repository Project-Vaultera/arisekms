import { cn } from '@/lib/utils.js';

// Signature four-color layered frame (Sendai palette) for primary feature
// containers only: upload interfaces, registration forms, key dashboard
// modules. Tables, gallery cards, and charts stay clean per the system rules.
// Children must sit above the bands, e.g. <Card className="relative z-10 rounded-2xl">.
export function SendaiFrame({ children, className }) {
  return (
    <div className={cn('relative', className)}>
      <span aria-hidden className="pointer-events-none absolute -top-3 -left-3 z-0 h-[62%] w-[58%] rounded-3xl bg-[var(--sendai-crimson)] select-none sm:-top-6 sm:-left-6" />
      <span aria-hidden className="pointer-events-none absolute -bottom-3 -left-3 z-[1] h-[42%] w-[62%] rounded-3xl bg-[var(--sendai-teal)] select-none sm:-bottom-6 sm:-left-6" />
      <span aria-hidden className="absolute -right-3 -bottom-3 z-[2] h-[42%] w-[55%] rounded-3xl bg-[var(--sendai-orange)] pointer-events-none select-none sm:-right-6 sm:-bottom-6" />
      <span aria-hidden className="absolute -top-4 -right-3 z-[3] h-[55%] w-[52%] rounded-3xl bg-[var(--sendai-plum)] pointer-events-none select-none sm:-top-9 sm:-right-6" />
      {children}
    </div>
  );
}
