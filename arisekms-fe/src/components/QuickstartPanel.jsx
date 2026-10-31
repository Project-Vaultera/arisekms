import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, CheckmarkCircle01Icon, CircleIcon, Tick01Icon, ZapIcon } from '@hugeicons/core-free-icons';
import { Accordion as AccordionPrimitive } from 'radix-ui';

import { Button } from '@/components/ui/button.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet.jsx';
import { getTokenUserId } from '@/lib/rbac.js';
import {
  loadQuickstartDone,
  resetQuickstartDone,
  toggleQuickstartDone,
} from '@/lib/quickstart-done.js';
import { cn } from '@/lib/utils.js';

// Guided checklist in a right-side panel (gamsys quickstart shape).
// Steps complete only when the user marks them done — visiting a page
// never completes anything.
export function QuickstartPanel({ open, onOpenChange, steps }) {
  const navigate = useNavigate();
  const uid = getTokenUserId();
  const [done, setDone] = useState(() => loadQuickstartDone(uid));
  const completed = steps.filter((s) => done.includes(s.id));
  const complete = steps.length > 0 && completed.length === steps.length;
  const pct = steps.length ? Math.round((completed.length / steps.length) * 100) : 0;
  const firstOpen = steps.find((s) => !done.includes(s.id))?.id;

  function go(to) {
    onOpenChange(false);
    navigate(to);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-3 sm:max-w-md">
        <SheetHeader className="pr-10">
          <SheetTitle className="flex items-center gap-2 font-heading text-xl font-normal">
            <HugeiconsIcon icon={ZapIcon} size={20} strokeWidth={1.8} className="text-[#0B4484]" />
            Quickstart guide
          </SheetTitle>
          <SheetDescription>
            {complete ? 'Checklist complete — nice work.' : 'Work through the steps to learn your way around.'}
          </SheetDescription>
          <div className="space-y-1.5 pt-1">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {completed.length} of {steps.length} complete
            </p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {complete ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <HugeiconsIcon icon={Tick01Icon} size={48} strokeWidth={1.5} className="text-[#0B4484]" />
              <p className="font-medium">Quickstart complete</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                You know where everything lives. Replay this guide anytime from the lightning icon.
              </p>
            </div>
          ) : (
            <AccordionPrimitive.Root type="single" collapsible defaultValue={firstOpen} className="space-y-2">
              {steps.map((step) => {
                const isDone = done.includes(step.id);
                return (
                  <AccordionPrimitive.Item
                    key={step.id}
                    value={step.id}
                    className={cn('overflow-hidden rounded-xl border', isDone ? 'bg-muted/40' : 'bg-card')}
                  >
                    <AccordionPrimitive.Header>
                      <AccordionPrimitive.Trigger className="flex w-full items-center gap-3 p-3 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg:last-child]:rotate-180">
                        {isDone ? (
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} strokeWidth={1.8} className="shrink-0 text-[#0B4484]" />
                        ) : (
                          <HugeiconsIcon icon={CircleIcon} size={20} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm font-semibold', isDone ? 'text-muted-foreground line-through' : 'text-foreground')}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{step.summary}</p>
                        </div>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} className="shrink-0 rotate-90 text-muted-foreground transition-transform duration-200 ease-in-out" />
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionPrimitive.Content className="overflow-hidden text-xs">
                      <div className="space-y-2.5 border-t px-3 py-3 pl-11">
                        {step.details.length > 0 && (
                          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                            {step.details.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {!isDone && (
                            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => go(step.to)}>
                              {step.cta}
                              <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant={isDone ? 'ghost' : 'default'}
                            size="sm"
                            className="gap-1"
                            onClick={() => setDone(toggleQuickstartDone(uid, step.id))}
                          >
                            {isDone ? 'Undo' : (
                              <>
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2} />
                                Mark done
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </AccordionPrimitive.Content>
                  </AccordionPrimitive.Item>
                );
              })}
            </AccordionPrimitive.Root>
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" onClick={() => setDone(resetQuickstartDone(uid))} className="text-muted-foreground">
            Reset progress
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {complete ? 'Done' : 'Close'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
