import { cn } from '@/lib/utils.js';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Button } from '@/components/ui/button.jsx';

// Button with the Sendai four-color frame revealed as its border on hover.
// Color scheme stays with the caller via `className`; this owns the shared
// frame wrapper, sizing, sharp geometry, and hover behavior.
export function SendaiHoverButton({ children, className, ...props }) {
  return (
    <SendaiFrame tight className="group max-w-full" decorClassName="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
      <Button
        size="lg"
        className={cn(
          'relative z-10 h-12 w-full max-w-full rounded-none px-8 text-base transition hover:border-transparent',
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    </SendaiFrame>
  );
}
