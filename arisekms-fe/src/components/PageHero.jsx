import { cn } from '@/lib/utils.js';

// PageHero with optional photographic background + color overlay.
// Pages without `bg` keep the flat navy banner.
export function PageHero({ title, subtitle, children, bg, overlayClassName = 'bg-[#0a1931]/60', className, contentClassName, titleClassName, subtitleClassName }) {
  return (
    <div className={cn('relative w-full min-w-0 overflow-hidden bg-[#0a1931] px-4 pt-12 pb-16 text-center lg:px-6', className)}>
      {bg && (
        <>
          <img src={bg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
          <div aria-hidden className={cn('absolute inset-0', overlayClassName)} />
        </>
      )}
      <div className={cn('relative mx-auto flex w-full min-w-0 flex-col items-center', contentClassName)}>
        <h1 className={cn('max-w-full font-heading text-3xl font-normal tracking-tight text-balance text-white sm:text-4xl', titleClassName)}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn('mx-auto mt-3 max-w-2xl text-sm text-white/70', subtitleClassName)}>{subtitle}</p>
        )}
        {children && <div className="mx-auto mt-6 w-full max-w-3xl">{children}</div>}
      </div>
    </div>
  );
}
