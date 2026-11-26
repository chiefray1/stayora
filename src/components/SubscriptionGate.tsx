import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { useEntitlements, useSubscription } from "../lib/subscription";
import { useTenant } from "../lib/tenants";
import { useAuth } from "../lib/auth";
import { PLAN_ORDER, PLAN_RANK, planFor, requiredPlanFor, usd, type PlanId } from "../lib/plans";
import { Button, Modal, buttonClass } from "./ui";

const planBenefits: Record<PlanId, string[]> = {
  free: [
    "5 rooms and 2 staff accounts",
    "Reservations, guests and check-in/out",
    "Basic invoicing and daily sales reports",
  ],
  starter: [
    "30 rooms and 10 staff accounts",
    "Restaurant POS, kitchen, inventory and procurement",
    "Basic accounting, attendance and exports",
  ],
  professional: [
    "100 rooms, 30 staff and 3 properties",
    "Full accounting, payroll, CRM, loyalty and WhatsApp",
    "AI assistant, OTA channels, API and audit logs",
  ],
};

export function ModuleGate({ moduleId, children }: { moduleId: string; children?: ReactNode }) {
  const { plan, requiredFor, canModule } = useEntitlements();
  const required = requiredFor(moduleId);
  if (canModule(moduleId)) return <>{children}</>;

  const target = planFor(required);
  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="surface-card overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-[#0b1f33] to-[#123a4a] px-6 py-8 text-white sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
            <LockKeyhole className="size-3" /> Plan upgrade required
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold">This module is part of {target.name}</h1>
          <p className="mt-2 max-w-md text-sm text-white/70">
            You are currently on {plan.name}. Upgrade to unlock this module for every property in your workspace —
            your existing data stays exactly where it is.
          </p>
        </div>
        <div className="px-6 py-6 sm:px-8">
          <ul className="space-y-2.5">
            {planBenefits[required].map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {benefit}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/subscription" className={buttonClass("primary")}>
              Upgrade to {target.name} · {usd(target.monthly)}/mo <ArrowRight className="size-4" />
            </Link>
            <Link to="/pricing" className={buttonClass("outline")}>
              Compare plans
            </Link>
            <Link to="/dashboard" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Back to dashboard
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Paid plans are billed in USD. You can cancel anytime and keep read access to everything you have created.
          </p>
        </div>
      </div>
    </div>
  );
}

export interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  used: number;
  limit: number;
  unitLabel: string;
  planId: PlanId;
}

const nextPlanForLimit = (limitKey: "rooms" | "staff" | "properties" | "storageGb", current: number): PlanId => {
  const order = PLAN_ORDER.filter((planId) => planFor(planId).limits[limitKey] > current);
  return order[0] ?? "professional";
};

export function UpgradeDialog({ open, onClose, title, used, limit, unitLabel, planId }: UpgradeDialogProps) {
  const limitKey =
    title.toLowerCase().includes("staff")
      ? "staff"
      : title.toLowerCase().includes("propert")
        ? "properties"
        : title.toLowerCase().includes("storage")
          ? "storageGb"
          : "rooms";
  const nextPlan = nextPlanForLimit(limitKey, limit);
  const target = planFor(nextPlan);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="You have reached the limit included in your current plan."
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Link to="/subscription" className={buttonClass("primary")} onClick={onClose}>
            <Sparkles className="size-4" /> See upgrade options
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <span className="font-semibold">{used} of {limit} {unitLabel}</span> used on {planFor(planId).name}.
          Existing records are kept — only new additions are paused.
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium">{planFor(planId).name}</span>
            <span className="text-muted-foreground">{used} / {limit}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-amber-500"
              style={{ width: `${Math.min(100, Math.round((used / Math.max(1, limit)) * 100))}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
          <p className="font-semibold">{target.name} raises this to {target.limits[limitKey]} {unitLabel}.</p>
          <p className="mt-0.5 text-muted-foreground">
            {usd(target.monthly)}/month · or {usd(target.yearly)}/year. Add-on capacity is also available.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function RequirePlan({ moduleId, children }: { moduleId: string; children: ReactNode }) {
  const { canModule } = useEntitlements();
  if (!canModule(moduleId)) return <ModuleGate moduleId={moduleId} />;
  return <>{children}</>;
}

export function PlanBadge({ planId, className }: { planId: PlanId; className?: string }) {
  const tone =
    planId === "professional"
      ? "border-[#0f766e]/30 bg-[#0f766e]/10 text-[#0f766e]"
      : planId === "starter"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-slate-300 bg-slate-50 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone} ${className ?? ""}`}>
      {planFor(planId).name.replace("Stayora ", "")}
    </span>
  );
}

export const planRank = (planId: PlanId) => PLAN_RANK[planId];

/** Returns the cheapest plan that unlocks a module, used by nav tooltips. */
export const upgradeTarget = (moduleId: string) => {
  const required = requiredPlanFor(moduleId);
  return planFor(required);
};

export { useSubscription };

/**
 * Public booking engine gate. The direct booking website is an optional add-on,
 * so the route renders this explainer until it is activated for the workspace.
 */
export function BookingGate({ children }: { children: ReactNode }) {
  const { canModule, usable } = useEntitlements();
  const { currentTenant } = useTenant();
  const { user } = useAuth();

  if (usable && canModule("booking")) return <>{children}</>;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0b1220] text-white">
      <img
        src="/assets/stayora-slide-1.jpg"
        alt=""
        className="absolute inset-0 -z-20 size-full object-cover opacity-35"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,12,22,0.78),rgba(6,12,22,0.55)_45%,rgba(6,12,22,0.9))]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/stayora-mark.png" alt="Stayora" className="h-9 w-auto" />
          <span className="font-display text-lg text-white">Stayora</span>
        </Link>
        <Link to="/" className="text-xs font-semibold text-white/70 hover:text-white">Back to homepage</Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-lg text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80">
            <LockKeyhole className="size-3" /> {usable ? "Booking add-on not enabled" : "Workspace unavailable"}
          </span>
          <h1 className="mt-5 font-display text-3xl leading-tight sm:text-4xl">
            {usable
              ? `Online booking isn't enabled for ${currentTenant.name} yet`
              : `Booking is paused for ${currentTenant.name}`}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/75">
            {usable
              ? "The direct booking website is an optional add-on. Add it from Subscription & billing to publish live availability, instant confirmations and online payments."
              : "This workspace's subscription is not active, so the public booking engine is unavailable. The team can still sign in to review existing reservations."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link to={usable ? "/subscription" : "/dashboard"} className={buttonClass("primary", "lg")}>
                {usable ? <>Add the booking system · {usd(9)}/mo <ArrowRight className="size-4" /></> : "Open dashboard"}
              </Link>
            ) : (
              <Link to="/auth" className={buttonClass("primary", "lg")}>
                Staff sign in <ArrowRight className="size-4" />
              </Link>
            )}
            <Link to="/" className={buttonClass("white", "lg")}>Back to homepage</Link>
          </div>
          <p className="mt-5 text-[11px] text-white/55">
            Front desk staff can always create and manage reservations inside the suite.
          </p>
        </div>
      </main>
    </div>
  );
}
