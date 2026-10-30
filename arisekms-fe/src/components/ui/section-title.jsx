import { cn } from '@/lib/utils.js';

// Global section title: approvals / member-directory heading size + weight.
export function SectionTitle({ children, className }) {
  return (
    <h2 className={cn('font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]', className)}>
      {children}
    </h2>
  );
}
