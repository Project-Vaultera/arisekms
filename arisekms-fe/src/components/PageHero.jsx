export function PageHero({ title, subtitle, children }) {
  return (
    <div className="bg-[#0a1931] px-4 pt-12 pb-16 text-center lg:px-6">
      <h1 className="font-heading text-3xl font-black tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70">{subtitle}</p>
      )}
      {children && <div className="mx-auto mt-6 max-w-3xl">{children}</div>}
    </div>
  );
}
