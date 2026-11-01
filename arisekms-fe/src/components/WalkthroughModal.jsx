import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, Tick01Icon, ZapIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { STEP_SHOTS } from '@/lib/quickstart-steps.js';
import { cn } from '@/lib/utils.js';

import ariseLogo from '/arise-ph_logo.png';
import apcLogo from '/apc_logo.png';
import jpcsApcLogo from '/jpcs-apc_logo.png';
import smPrimeLogo from '/sm-prime_logo.png';
import vaulteralabsLogo from '/vaulteralabs.png';

const POWERED_BY = [
  { src: apcLogo, alt: 'APC' },
  { src: smPrimeLogo, alt: 'SM Prime' },
  { src: jpcsApcLogo, alt: 'JPCS APC' },
  { src: vaulteralabsLogo, alt: 'Vaultera Labs' },
];

// First page of the tour: what ARISE KMS is and who powers it.
const INTRO = {
  id: 'intro',
  title: 'Welcome to ARISE KMS',
  summary:
    'The shared workspace of ARISE Philippines, where member companies submit reports, log performance activities, track SkillsBuild certifications, and explore membership analytics. Reviews, approvals, and support run in one place so reporting stays consistent and verifiable.',
  details: [],
};

// Closing page of the tour.
const OUTRO = {
  id: 'done',
  title: "You're all set — thank you!",
  summary:
    'You now know your way around ARISE KMS. Revisit this tour anytime from the lightning icon, or open the full manual for the complete per-role guide with screenshots.',
  details: [],
};

// Paginated guided tour: one condensed step per page with its manual
// screenshot. Pure guide — no progress tracking, just flip through.
export function WalkthroughModal({ open, onOpenChange, steps }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  // Reopening always starts at the first page.
  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  const items = [INTRO, ...steps, OUTRO];
  const step = items[Math.min(page, items.length - 1)];
  const isLast = page >= items.length - 1;
  const isIntro = step ? step.id === INTRO.id : false;
  const isOutro = step ? step.id === OUTRO.id : false;
  const media = step && !isIntro && !isOutro ? STEP_SHOTS[step.id] : undefined;

  function close() {
    onOpenChange(false);
  }

  function go(to) {
    onOpenChange(false);
    navigate(to);
  }

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto thin-scrollbar sm:max-w-5xl', (isIntro || isOutro) && 'sm:max-w-xl')}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl font-normal">
            <HugeiconsIcon icon={ZapIcon} size={20} strokeWidth={1.8} className="text-[#0B4484]" />
            {`Step ${page + 1} of ${items.length}`}
          </DialogTitle>
          <DialogDescription>A visual walkthrough of your workspace.</DialogDescription>
        </DialogHeader>

        <div className="grid items-start gap-4 sm:grid-cols-10">
          {media && (
            <figure className="overflow-hidden rounded-lg border border-border sm:col-span-7">
              <img src={`/manual/${media.shot}`} alt={media.caption} className="max-h-[44vh] w-full bg-muted/40 object-contain" loading="lazy" />
              <figcaption className="bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
                {media.caption}
              </figcaption>
            </figure>
          )}
          <div className={cn('space-y-3 sm:col-span-3', !media && !isIntro && !isOutro && 'sm:col-span-full', (isIntro || isOutro) && 'sm:col-span-10 sm:text-center')}>
            {isIntro && (
              <img src={ariseLogo} alt="ARISE Philippines" className="h-12 w-auto sm:mx-auto" />
            )}
            {isOutro && (
              <HugeiconsIcon icon={Tick01Icon} size={64} strokeWidth={1.5} className="text-[var(--sendai-teal)] sm:mx-auto" />
            )}
            <div>
              <p className="font-heading text-base font-bold text-[#1e3a5f]">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.summary}</p>
            </div>
            {step.details.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {step.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
            {isIntro ? (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold tracking-wide uppercase">Powered by</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-6">
                  {POWERED_BY.map((logo) => (
                    <img key={logo.alt} src={logo.src} alt={logo.alt} title={logo.alt} className="h-10 w-auto object-contain" />
                  ))}
                </div>
              </div>
            ) : isOutro ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => go('/user-manual')}>
                  Open full manual
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => go(step.to)}>
                  {step.cta}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
                </Button>
                <Link
                  to="/user-manual"
                  onClick={close}
                  className="text-sm font-semibold text-[#0B4484] hover:text-[var(--sendai-teal)]"
                >
                  Read it in the manual
                </Link>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 pt-1" aria-label="Tour progress">
            {items.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                onClick={() => setPage(i)}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  i === page ? 'bg-[var(--sendai-teal)]' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border pt-3 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={close} className="text-muted-foreground">
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="gap-1">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
              Back
            </Button>
            {isLast ? (
              <Button type="button" size="sm" onClick={close}>
                Done
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setPage(page + 1)} className="gap-1">
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
