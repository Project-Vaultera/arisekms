import { cn } from '@/lib/utils.js';

// PageHero with optional photographic background + color overlay.
// Pages without `bg` keep the flat navy banner.
export function PageHero({ title, subtitle, children, bg, overlayClassName = 'bg-[#0a1931]/60' }) {
  return (
    <div className="relative overflow-hidden bg-[#0a1931] px-4 pt-12 pb-16 text-center lg:px-6">
      {bg && (
        <>
          <img src={bg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className={cn('absolute inset-0', overlayClassName)} />
        </>
      )}
      <div className="relative">
        <h1 className="font-heading text-3xl font-normal tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70">{subtitle}</p>
        )}
        {children && <div className="mx-auto mt-6 max-w-3xl">{children}</div>}
      </div>
    </div>
  );
}
