import clsx from "clsx";
import {
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { initials } from "../lib/format";
import { statusLabel } from "../lib/seed";

export const cn = (...parts: Parameters<typeof clsx>) => clsx(...parts);

type Variant = "primary" | "outline" | "ghost" | "dark" | "soft" | "danger" | "white";
type Size = "sm" | "md" | "lg";

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "px-3 py-1.5 text-xs",
    size === "md" && "px-3.5 py-2 text-sm",
    size === "lg" && "px-5 py-2.5 text-sm",
    variant === "primary" && "bg-primary text-primary-foreground hover:brightness-105 shadow-sm",
    variant === "outline" && "border border-border bg-white text-foreground hover:bg-muted",
    variant === "ghost" && "text-foreground hover:bg-muted",
    variant === "dark" && "bg-noir text-noir-text hover:bg-noir-2",
    variant === "soft" && "bg-accent text-accent-foreground hover:brightness-[0.98]",
    variant === "danger" && "bg-destructive text-destructive-foreground hover:brightness-105",
    variant === "white" && "border border-white/50 bg-white/15 text-white backdrop-blur hover:bg-white/25",
    className,
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-border px-3.5 py-3 sm:px-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={cn("p-3.5 sm:p-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  delta,
  up,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  up?: boolean;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "gold" | "noir" | "green" | "red" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        tone === "noir"
          ? "noir-panel"
          : tone === "gold"
            ? "border-primary/25 bg-accent"
            : tone === "green"
              ? "border-emerald-200 bg-emerald-50/60"
              : tone === "red"
                ? "border-rose-200 bg-rose-50/60"
                : tone === "amber"
                  ? "border-amber-200 bg-amber-50/60"
                  : "surface-card",
      )}
    >
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.12em]",
            tone === "noir" ? "text-noir-muted" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            tone === "noir" ? "bg-white/10 text-brand-bright" : "bg-primary/12 text-gold",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className={cn("mt-2 font-display text-2xl font-semibold leading-none", tone === "noir" && "text-white")}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center gap-2 text-[0.6875rem]">
        {delta && (
          <span
            className={cn(
              "font-semibold",
              up ? "text-success" : "text-destructive",
              tone === "noir" && (up ? "text-emerald-400" : "text-rose-400"),
            )}
          >
            {delta}
          </span>
        )}
        {hint && (
          <span className={tone === "noir" ? "text-noir-muted" : "text-muted-foreground"}>{hint}</span>
        )}
      </div>
    </div>
  );
}

const statusTones: Record<string, string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  served: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inspected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  received: "bg-emerald-50 text-emerald-700 border-emerald-200",
  occupied: "bg-sky-50 text-sky-700 border-sky-200",
  "checked-in": "bg-sky-50 text-sky-700 border-sky-200",
  "en-route": "bg-sky-50 text-sky-700 border-sky-200",
  posted: "bg-sky-50 text-sky-700 border-sky-200",
  "in-progress": "bg-sky-50 text-sky-700 border-sky-200",
  preparing: "bg-sky-50 text-sky-700 border-sky-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  open: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-violet-50 text-violet-700 border-violet-200",
  sent: "bg-violet-50 text-violet-700 border-violet-200",
  cleaning: "bg-violet-50 text-violet-700 border-violet-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  "on-leave": "bg-orange-50 text-orange-700 border-orange-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  "out-of-service": "bg-rose-50 text-rose-700 border-rose-200",
  unpaid: "bg-rose-50 text-rose-700 border-rose-200",
  refunded: "bg-rose-50 text-rose-700 border-rose-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  "checked-out": "bg-slate-100 text-slate-600 border-slate-200",
  done: "bg-slate-100 text-slate-600 border-slate-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  syncing: "bg-sky-50 text-sky-700 border-sky-200",
  manual: "bg-slate-100 text-slate-600 border-slate-200",
  disconnected: "bg-rose-50 text-rose-700 border-rose-200",
  present: "bg-emerald-50 text-emerald-700 border-emerald-200",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ready: "bg-sky-50 text-sky-700 border-sky-200",
  washing: "bg-sky-50 text-sky-700 border-sky-200",
  ironing: "bg-violet-50 text-violet-700 border-violet-200",
  booked: "bg-violet-50 text-violet-700 border-violet-200",
  late: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  expired: "bg-rose-50 text-rose-700 border-rose-200",
  absent: "bg-rose-50 text-rose-700 border-rose-200",
  error: "bg-rose-50 text-rose-700 border-rose-200",
  void: "bg-slate-100 text-slate-600 border-slate-200",
  revoked: "bg-rose-50 text-rose-700 border-rose-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  trial: "bg-violet-50 text-violet-700 border-violet-200",
  renovation: "bg-orange-50 text-orange-700 border-orange-200",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        statusTones[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {statusLabel[status] ?? status}
    </span>
  );
}

export function VipPill({ tier }: { tier: string }) {
  if (tier === "None") return <span className="text-xs text-muted-foreground">—</span>;
  const tones: Record<string, string> = {
    Platinum: "bg-noir text-brand-bright border-noir",
    Gold: "bg-amber-50 text-amber-700 border-amber-200",
    Silver: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", tones[tier])}>
      {tier}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-noir font-semibold text-brand-bright",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-12 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}

export function Progress({ value, tone = "gold" }: { value: number; tone?: "gold" | "green" | "blue" | "red" }) {
  const colors = {
    gold: "bg-primary",
    green: "bg-success",
    blue: "bg-info",
    red: "bg-destructive",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-0.5 font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.8125rem] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("field", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn("field appearance-none pr-8", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("field min-h-24 resize-y", props.className)} />;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-10 backdrop-blur-[2px]">
      <div
        className={cn(
          "animate-fade-up w-full rounded-xl border border-border bg-card shadow-2xl",
          width === "sm" && "max-w-md",
          width === "md" && "max-w-xl",
          width === "lg" && "max-w-3xl",
          width === "xl" && "max-w-5xl",
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="scroll-thin flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition",
            value === tab.id
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className={cn("ml-1.5", value === tab.id ? "text-gold" : "text-muted-foreground/70")}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
