import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="px-10 py-8 flex items-end justify-between gap-8">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="text-[38px] leading-tight mt-2">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground max-w-2xl text-[15px]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "brass" | "default" }) {
  return (
    <div className="card-editorial p-6">
      <div className="eyebrow">{label}</div>
      <div className={`mt-3 text-4xl font-normal font-mono-tabular ${tone === "brass" ? "text-accent" : "text-foreground"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatusPill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "brass" | "warn" | "ok" }) {
  const map = {
    default: "bg-muted text-muted-foreground",
    brass:   "bg-accent text-accent-foreground",
    warn:    "bg-secondary text-secondary-foreground",
    ok:      "bg-primary text-primary-foreground",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] uppercase tracking-widest ${map[tone]}`}>{children}</span>;
}

export function Section({ eyebrow, title, children, actions }: { eyebrow?: string; title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="px-10 py-8">
      {(eyebrow || title || actions) && (
        <div className="flex items-end justify-between mb-5">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="text-2xl mt-1">{title}</h2>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card-editorial p-10 text-center">
      <div className="eyebrow mb-2">Nothing here yet</div>
      <div className="text-lg">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-2">{hint}</div>}
    </div>
  );
}
