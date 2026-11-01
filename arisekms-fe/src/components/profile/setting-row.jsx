// Two-column settings row (ReUI profile-2 reference): label + description on the
// left, control + hint on the right. Stacks on small screens.
export function SettingRow({ label, description, hint, children }) {
  return (
    <div className="grid gap-2 border-t border-border py-5 first:border-t-0 first:pt-1 last:pb-1 md:grid-cols-2 md:gap-6">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
