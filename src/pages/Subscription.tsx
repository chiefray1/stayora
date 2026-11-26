import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CreditCard,
  Download,
  Gauge,
  HardDrive,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import { useEntitlements, useSubscription, type BillingInvoice } from "../lib/subscription";
import {
  PLAN_ORDER,
  addOnMonthlyTotal,
  annualSaving,
  formatLimit,
  monthlyEquivalent,
  planFor,
  usd,
  type AddOn,
  type BillingCycle,
  type PlanId,
} from "../lib/plans";
import { BILLING_MODE, createIdempotencyKey, providerLabel, providersFor, startCheckout, verifyPayment } from "../lib/payments";
import { downloadCsv, prettyDate, shortDate, timeAgo } from "../lib/format";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  SectionCard,
  Select,
  StatusPill,
  Tabs,
  buttonClass,
  cn,
} from "../components/ui";
import { PlanBadge } from "../components/SubscriptionGate";

type Tab = "overview" | "plans" | "addons" | "invoices" | "settings";

const statusCopy: Record<string, { label: string; tone: string; blurb: string }> = {
  free: { label: "Free plan", tone: "bg-slate-100 text-slate-700 border-slate-200", blurb: "You are on the free plan. Upgrade any time to unlock more capacity." },
  trial: { label: "Trial", tone: "bg-sky-50 text-sky-700 border-sky-200", blurb: "You are inside your trial. Add a payment method to keep access when it ends." },
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-700 border-emerald-200", blurb: "Your subscription is active and renews automatically." },
  past_due: { label: "Past due", tone: "bg-amber-50 text-amber-700 border-amber-200", blurb: "A renewal payment failed. You are inside the grace period — settle the invoice to avoid suspension." },
  suspended: { label: "Suspended", tone: "bg-rose-50 text-rose-700 border-rose-200", blurb: "This workspace is suspended. Data is safe, but changes are blocked until you reactivate." },
  cancelled: { label: "Cancelling", tone: "bg-amber-50 text-amber-800 border-amber-200", blurb: "Auto-renewal is off. You keep access until the end of the current period." },
  expired: { label: "Expired", tone: "bg-rose-50 text-rose-700 border-rose-200", blurb: "Your subscription has expired. Existing data is safe, but new records are blocked." },
};

export default function Subscription() {
  const { user } = useAuth();
  const { db } = useStore();
  const { currentTenant } = useTenant();
  const subscriptionApi = useSubscription();
  const entitlements = useEntitlements();
  const {
    subscription,
    plan,
    settings,
    addOns,
    addOnIds,
    invoices,
    transactions,
    events,
    paymentMethods,
    monthlyTotal,
    outstanding,
    effective,
    changePlan,
    cancelSubscription,
    resumeSubscription,
    renewSubscription,
    addAddOn,
    cancelAddOn,
    addPaymentMethod,
    recordPayment,
    recordFailedPayment,
  } = subscriptionApi;
  const { usage, checks } = entitlements;

  const [tab, setTab] = useState<Tab>("overview");
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle);
  const [payInvoice, setPayInvoice] = useState<BillingInvoice | null>(null);
  const [provider, setProvider] = useState(providersFor(currentTenant.country)[0]?.id ?? "stripe");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [payDone, setPayDone] = useState(false);
  const [confirm, setConfirm] = useState<{ planId: PlanId; mode: "upgrade" | "downgrade" } | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [methodForm, setMethodForm] = useState({ provider: "stripe", brand: "Visa", last4: "4242", expiry: "12/29" });

  const statusInfo = statusCopy[effective] ?? statusCopy.active;
  const providers = providersFor(currentTenant.country);
  const addOnCatalogue = settings.addOns.filter((entry) => entry.active);
  const activeAddOns = addOns.filter((entry) => entry.status === "active");
  const savings = annualSaving(subscription.planId, settings);
  const isSuperadmin = user?.role === "Superadmin";

  const usageRows = useMemo(
    () => [
      { key: "rooms", label: "Rooms", icon: Layers, used: usage.rooms, limit: entitlements.limits.rooms, unit: "rooms" },
      { key: "staff", label: "Staff accounts", icon: Users, used: usage.staff, limit: entitlements.limits.staff, unit: "accounts" },
      { key: "properties", label: "Properties", icon: Gauge, used: usage.properties, limit: entitlements.limits.properties, unit: "properties" },
      {
        key: "reservations",
        label: "Reservations this month",
        icon: CalendarClock,
        used: usage.reservationsThisMonth,
        limit: entitlements.limits.reservationsPerMonth,
        unit: "reservations",
      },
      { key: "storage", label: "Document storage", icon: HardDrive, used: usage.storageGb, limit: entitlements.limits.storageGb, unit: "GB" },
    ],
    [usage, entitlements.limits],
  );

  const nextInvoice = invoices.find((invoice) => invoice.status === "open" || invoice.status === "overdue");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");

  const startPayment = async () => {
    if (!payInvoice) return;
    setPaying(true);
    setPayError("");
    const idempotencyKey = createIdempotencyKey("sub");
    const result = await startCheckout({
      hotelId: currentTenant.id,
      hotelName: currentTenant.name,
      invoiceId: payInvoice.id,
      amount: payInvoice.total,
      currency: "USD",
      provider: provider === "sandbox" ? "sandbox" : provider,
      cycle: payInvoice.cycle,
      customerEmail: currentTenant.ownerEmail || user?.email || "billing@stayora.app",
      idempotencyKey,
    });
    if (!result.ok || !result.reference) {
      setPaying(false);
      setPayError(result.error ?? "The payment did not complete. No charge was made.");
      recordFailedPayment(payInvoice.id, result.provider, result.error ?? "Checkout failed");
      return;
    }
    const verified = await verifyPayment(result.provider, result.reference, idempotencyKey);
    setPaying(false);
    if (!verified.ok) {
      setPayError(verified.error ?? "We could not verify this payment with the provider.");
      return;
    }
    recordPayment({
      invoiceId: payInvoice.id,
      provider: result.provider,
      reference: result.reference,
      idempotencyKey,
    });
    setPayDone(true);
  };

  const handlePlanSelect = (planId: PlanId) => {
    if (planId === subscription.planId && cycle === subscription.cycle) return;
    const mode = PLAN_ORDER.indexOf(planId) >= PLAN_ORDER.indexOf(subscription.planId) ? "upgrade" : "downgrade";
    setConfirm({ planId, mode });
  };

  const applyPlan = () => {
    if (!confirm) return;
    const invoice = changePlan(currentTenant.id, confirm.planId, cycle);
    setConfirm(null);
    setTab("overview");
    if (invoice) {
      setPayInvoice(invoice);
      setPayDone(false);
      setPayError("");
    }
  };

  const downloadInvoice = (invoice: BillingInvoice) => {
    const rows: (string | number)[][] = [
      ["Stayora subscription invoice", invoice.number],
      ["Hotel", currentTenant.name],
      ["Hotel ID", currentTenant.id],
      ["Issued", prettyDate(invoice.issuedAt)],
      ["Status", invoice.status],
      ["Currency", invoice.currency],
      [],
      ["Description", "Amount (USD)"],
      ...invoice.lines.map((line) => [line.label, line.amount.toFixed(2)]),
      [],
      ["Subtotal", invoice.subtotal.toFixed(2)],
      ["Tax", invoice.tax.toFixed(2)],
      ["Total", invoice.total.toFixed(2)],
    ];
    downloadCsv(`${invoice.number}.csv`, rows);
  };

  const openPayment = (invoice: BillingInvoice) => {
    setPayInvoice(invoice);
    setPayDone(false);
    setPayError("");
    setPaying(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Subscription & billing"
        description="Manage your Stayora plan, capacity add-ons, invoices and payment methods."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", statusInfo.tone)}>
              <span className="size-1.5 rounded-full bg-current" /> {statusInfo.label}
            </span>
            <PlanBadge planId={subscription.planId} />
            <Link to="/pricing" className={buttonClass("outline", "sm")}>Compare plans</Link>
          </div>
        }
      />

      {!entitlements.usable && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">{statusInfo.blurb} Changes are blocked until the workspace is reactivated.</span>
          {nextInvoice && (
            <Button size="sm" onClick={() => openPayment(nextInvoice)}>
              <Wallet className="size-4" /> Pay {usd(nextInvoice.total)} now
            </Button>
          )}
        </div>
      )}

      {effective === "past_due" && entitlements.usable && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">
            Payment is past due{subscription.graceEndsAt ? ` — grace period ends ${prettyDate(subscription.graceEndsAt)}` : ""}. Settle{" "}
            {nextInvoice ? `${nextInvoice.number} (${usd(nextInvoice.total)})` : "the outstanding invoice"} to keep your workspace running.
          </span>
          {nextInvoice && <Button size="sm" onClick={() => openPayment(nextInvoice)}>Pay now</Button>}
        </div>
      )}

      {effective === "cancelled" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">{statusInfo.blurb} Access ends {prettyDate(subscription.expiresAt)}.</span>
          <Button size="sm" onClick={() => resumeSubscription(currentTenant.id)}>
            <RefreshCw className="size-4" /> Resume auto-renewal
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={BadgeCheck}
          label="Current plan"
          value={plan.name.replace("Stayora ", "")}
          hint={`${subscription.cycle === "yearly" ? "Annual" : "Monthly"} billing · ${subscription.autoRenew ? "auto-renews" : "auto-renew off"}`}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Next payment"
          value={usd(monthlyTotal, monthlyTotal % 1 === 0 ? 0 : 2)}
          hint={
            subscription.planId === "free"
              ? activeAddOns.length > 0
                ? "Add-on charges only"
                : "No payment required"
              : `Due ${prettyDate(subscription.nextBillingDate)}`
          }
        />
        <SummaryCard
          icon={Wallet}
          label="Outstanding"
          value={usd(outstanding, 0)}
          hint={nextInvoice ? `${nextInvoice.number} · ${nextInvoice.status}` : "No open invoices"}
          tone={outstanding > 0 ? "amber" : undefined}
        />
        <SummaryCard
          icon={HardDrive}
          label="Seats & keys"
          value={`${usage.rooms} · ${usage.staff}`}
          hint={`Rooms ${usage.rooms}/${formatLimit(entitlements.limits.rooms)} · staff ${usage.staff}/${formatLimit(entitlements.limits.staff)}`}
        />
      </div>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={(next) => setTab(next as Tab)}
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "plans", label: "Plans & capacity" },
            { id: "addons", label: "Add-ons" },
            { id: "invoices", label: `Invoices (${invoices.length})` },
            { id: "settings", label: "Billing settings" },
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <SectionCard
              title="Plan usage"
              subtitle={`Live consumption against the ${plan.name} allowances.`}
              action={<Link to="/subscription" onClick={() => setTab("plans")} className="text-[11px] font-semibold text-primary hover:underline">Increase capacity</Link>}
            >
              <div className="space-y-4">
                {usageRows.map((row) => {
                  const limit = row.limit;
                  const pct = limit === null ? Math.min(100, row.used > 0 ? 18 : 0) : Math.min(100, Math.round((row.used / Math.max(1, limit)) * 100));
                  const over = limit !== null && row.used > limit;
                  const near = limit !== null && row.used >= limit;
                  return (
                    <div key={row.key}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium">
                          <row.icon className="size-3.5 text-muted-foreground" /> {row.label}
                        </span>
                        <span className={cn("tabular-nums", over ? "font-semibold text-rose-600" : near ? "font-semibold text-amber-600" : "text-muted-foreground")}>
                          {row.used} / {limit === null ? "Unlimited" : limit} {row.unit}
                        </span>
                      </div>
                      <Progress value={pct} tone={over ? "red" : near ? "gold" : "green"} />
                    </div>
                  );
                })}
              </div>
              {entitlements.limits.reservationsPerMonth === null && (
                <p className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                  Reservations are unlimited on {plan.name}. Room, staff and property ceilings still apply.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Subscription timeline" subtitle="Every plan, payment and platform action on this workspace." bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {events.slice(0, 8).map((event) => (
                  <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      {event.type.startsWith("payment") || event.type === "renewed" ? <CreditCard className="size-3.5" /> : <Sparkles className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{event.detail}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {event.actor} · {event.source} · {timeAgo(event.at)}
                      </p>
                    </div>
                    {typeof event.amount === "number" && event.amount > 0 && (
                      <span className="text-xs font-semibold tabular-nums">{usd(event.amount, 2)}</span>
                    )}
                  </li>
                ))}
                {events.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">Plan changes and payments will appear here.</li>
                )}
              </ul>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Renewal" subtitle="Keep your workspace running without interruption.">
              <dl className="space-y-2 text-xs">
                <Row label="Billing cycle" value={subscription.cycle === "yearly" ? "Annual" : "Monthly"} />
                <Row label="Started" value={prettyDate(subscription.startedAt)} />
                <Row label="Renews / ends" value={prettyDate(subscription.expiresAt)} />
                <Row label="Auto-renew" value={subscription.autoRenew ? "On" : "Off"} />
                <Row label="Add-ons" value={activeAddOns.length ? `${activeAddOns.length} active` : "None"} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {nextInvoice ? (
                  <Button size="sm" onClick={() => openPayment(nextInvoice)}>
                    <Wallet className="size-4" /> Pay {usd(nextInvoice.total)}
                  </Button>
                ) : subscription.planId !== "free" ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const invoice = renewSubscription(currentTenant.id);
                      if (invoice) openPayment(invoice);
                    }}
                  >
                    <RefreshCw className="size-4" /> Renew now
                  </Button>
                ) : null}
                {subscription.planId !== "free" && (subscription.autoRenew ? (
                  <Button size="sm" variant="outline" onClick={() => cancelSubscription(currentTenant.id)}>
                    Cancel auto-renew
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => resumeSubscription(currentTenant.id)}>
                    Resume auto-renew
                  </Button>
                ))}
              </div>
              {subscription.creditBalance > 0 && (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
                  Account credit: {usd(subscription.creditBalance, 2)} — applied to your next invoice.
                </p>
              )}
            </SectionCard>

            <SectionCard title="Payment method" subtitle="Card details are tokenised by the provider and never stored by Stayora.">
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payment method on file.</p>
              ) : (
                <ul className="space-y-2">
                  {paymentMethods.map((method) => (
                    <li key={method.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <div className="flex-1 text-xs">
                        <p className="font-semibold">{method.brand} ···· {method.last4}</p>
                        <p className="text-[10px] text-muted-foreground">{providerLabel(method.provider as never)} · expires {method.expiry}</p>
                      </div>
                      {method.isDefault && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">Default</span>}
                    </li>
                  ))}
                </ul>
              )}
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setMethodOpen(true)}>
                <Plus className="size-4" /> Update payment method
              </Button>
            </SectionCard>

            <SectionCard title="Billing contact" subtitle="Invoices and receipts are sent here.">
              <div className="space-y-1 text-xs">
                <p className="font-semibold">{currentTenant.legalName || currentTenant.name}</p>
                <p className="text-muted-foreground">{currentTenant.ownerName} · {currentTenant.ownerEmail}</p>
                <p className="text-muted-foreground">{currentTenant.city}, {currentTenant.country}</p>
                <p className="text-muted-foreground">Hotel ID {currentTenant.id}</p>
                <p className="text-muted-foreground">Plan ID {subscription.id}</p>
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                Need to change the legal entity or VAT number? Contact support and the platform team will update it.
              </p>
            </SectionCard>
          </div>
        </div>
      )}

      {tab === "plans" && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Prices in USD. Downgrading never deletes data — over-limit records become read-only until you free capacity or upgrade again.
            </p>
            <div className="inline-flex rounded-lg border border-border bg-white p-0.5">
              {(["monthly", "yearly"] as BillingCycle[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setCycle(option)}
                  className={cn(
                    "rounded-md px-3 py-1 text-[11px] font-semibold capitalize transition",
                    cycle === option ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option}{option === "yearly" && savings > 0 ? " · save" : ""}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const option = planFor(planId, settings);
              const current = planId === subscription.planId;
              const cheaper = PLAN_ORDER.indexOf(planId) < PLAN_ORDER.indexOf(subscription.planId);
              return (
                <div
                  key={planId}
                  className={cn(
                    "surface-card flex flex-col overflow-hidden",
                    current && "ring-2 ring-primary",
                    option.highlight && !current && "ring-1 ring-[#0f766e]/30",
                  )}
                >
                  <div className="border-b border-border px-5 py-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-lg font-semibold">{option.name.replace("Stayora ", "")}</h3>
                      {current ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">Current</span>
                      ) : option.highlight ? (
                        <span className="rounded-full bg-[#0f766e]/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-[#0f766e]">Most popular</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{option.tagline}</p>
                    <p className="mt-3 font-display text-3xl font-semibold">
                      {usd(cycle === "yearly" ? option.yearly : option.monthly)}
                      <span className="text-xs font-normal text-muted-foreground">/{cycle === "yearly" ? "year" : "month"}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {option.monthly === 0
                        ? "Free forever"
                        : cycle === "yearly"
                          ? `${usd(monthlyEquivalent(planId, "yearly", settings), 2)}/mo equivalent · save ${usd(annualSaving(planId, settings))}`
                          : `${usd(option.yearly)} billed annually`}
                    </p>
                  </div>
                  <div className="flex-1 px-5 py-4">
                    <ul className="space-y-2 text-[11px]">
                      <PlanLine>{formatLimit(option.limits.rooms)} rooms</PlanLine>
                      <PlanLine>{formatLimit(option.limits.staff)} staff accounts</PlanLine>
                      <PlanLine>{formatLimit(option.limits.properties)} propert{option.limits.properties === 1 ? "y" : "ies"}</PlanLine>
                      <PlanLine>{option.limits.reservationsPerMonth === null ? "Unlimited reservations" : `${option.limits.reservationsPerMonth} reservations / month`}</PlanLine>
                      <PlanLine>{option.limits.storageGb} GB document storage</PlanLine>
                      <PlanLine>{option.modules.length} modules including {option.id === "free" ? "core front desk" : option.id === "starter" ? "POS & inventory" : "AI, payroll & CRM"}</PlanLine>
                    </ul>
                  </div>
                  <div className="px-5 pb-5">
                    <Button
                      className="w-full"
                      variant={current ? "outline" : cheaper ? "outline" : "primary"}
                      disabled={current && cycle === subscription.cycle}
                      onClick={() => handlePlanSelect(planId)}
                    >
                      {current && cycle === subscription.cycle
                        ? "Current plan"
                        : cheaper
                          ? <>Switch to {option.name.replace("Stayora ", "")} <ArrowDownRight className="size-4" /></>
                          : <>Choose {option.name.replace("Stayora ", "")} <ArrowUpRight className="size-4" /></>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "addons" && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Add-ons stack on top of your plan and are billed monthly. Deactivating an add-on never deletes existing data.
            </p>
            <span className="text-xs font-semibold">
              Add-on spend: {usd(addOnMonthlyTotal(addOnIds, settings))}/mo
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {addOnCatalogue.map((addOn) => (
              <AddOnCard
                key={addOn.id}
                addOn={addOn}
                active={addOnIds.includes(addOn.id)}
                onActivate={() => addAddOn(currentTenant.id, addOn.id)}
                onCancel={() => cancelAddOn(currentTenant.id, addOn.id)}
              />
            ))}
          </div>
          {activeAddOns.length > 0 && (
            <SectionCard title="Active add-ons" subtitle="What is currently contributing to your monthly bill." className="mt-4" bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {activeAddOns.map((entry) => {
                  const addOn = settings.addOns.find((item) => item.id === entry.addOnId);
                  return (
                    <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                      <div>
                        <p className="font-semibold">{addOn?.name ?? entry.addOnId}</p>
                        <p className="text-[10px] text-muted-foreground">Active since {prettyDate(entry.startedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{addOn?.priceMonthly ? `${usd(addOn.priceMonthly)}/mo` : "Usage-based"}</span>
                        <Button size="sm" variant="ghost" onClick={() => cancelAddOn(currentTenant.id, entry.addOnId)}>Cancel</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <SectionCard title="Invoices" subtitle="Download any invoice as CSV for your accountant." className="xl:col-span-2" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="table-base min-w-[680px]">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="text-xs font-semibold">{invoice.number}</td>
                      <td className="text-xs text-muted-foreground">{shortDate(invoice.issuedAt)}</td>
                      <td className="text-xs text-muted-foreground">{shortDate(invoice.dueAt)}</td>
                      <td><StatusPill status={invoice.status === "paid" ? "paid" : invoice.status === "overdue" ? "overdue" : invoice.status} /></td>
                      <td className="text-right text-xs font-semibold tabular-nums">{usd(invoice.total, 2)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => downloadInvoice(invoice)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Download invoice">
                            <Download className="size-3.5" />
                          </button>
                          {invoice.status !== "paid" && invoice.status !== "void" && (
                            <Button size="sm" variant="outline" onClick={() => openPayment(invoice)}>Pay</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">No invoices yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Payment history" subtitle="Provider references and receipts." bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {transactions.map((txn) => (
                <li key={txn.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{usd(txn.amount, 2)}</p>
                    <StatusPill status={txn.status === "succeeded" ? "paid" : txn.status === "failed" ? "failed" : txn.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{txn.description}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {providerLabel(txn.provider as never)} · {txn.reference} · {shortDate(txn.at)}
                  </p>
                </li>
              ))}
              {transactions.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">No payments recorded yet.</li>
              )}
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <SectionCard title="Billing profile" subtitle="Details printed on every invoice.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Legal name"><Input defaultValue={currentTenant.legalName || currentTenant.name} /></Field>
              <Field label="Billing email"><Input defaultValue={currentTenant.ownerEmail} type="email" /></Field>
              <Field label="VAT / tax number"><Input placeholder="e.g. NG-12345678" /></Field>
              <Field label="Country"><Input defaultValue={currentTenant.country} /></Field>
              <Field label="Address" ><Input placeholder="Street address" /></Field>
              <Field label="City"><Input defaultValue={currentTenant.city} /></Field>
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              Billing profile edits are reviewed by the platform team before they change issued invoices.
            </p>
          </SectionCard>

          <SectionCard title="Payment providers" subtitle="How Stayora collects subscription payments.">
            <ul className="space-y-2">
              {providers.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
                  <CreditCard className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.blurb}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase", item.configured ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground")}>
                    {item.configured ? "Configured" : "Not configured"}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
              Billing mode: <span className="font-semibold uppercase">{BILLING_MODE}</span>.{" "}
              {BILLING_MODE === "sandbox"
                ? "Sandbox payments are simulated in development only — no card is charged."
                : BILLING_MODE === "live"
                  ? "Checkout is handled by the Stayora billing service; card data never touches the browser."
                  : "Live billing is not configured. Payments are disabled until provider keys are set on the billing service."}
            </div>
            {!isSuperadmin && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Need a different currency or invoicing entity? Contact support.
              </p>
            )}
          </SectionCard>
        </div>
      )}

      {/* Checkout modal */}
      <Modal
        open={!!payInvoice}
        onClose={() => { setPayInvoice(null); setPayDone(false); setPayError(""); }}
        title={payDone ? "Payment confirmed" : `Pay invoice ${payInvoice?.number ?? ""}`}
        description={payDone ? "Your workspace has been updated." : "Choose a provider to complete this USD payment."}
        width="md"
        footer={
          payDone ? (
            <Button onClick={() => { setPayInvoice(null); setPayDone(false); }}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setPayInvoice(null)}>Cancel</Button>
              <Button onClick={startPayment} disabled={paying}>
                {paying ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
                {paying ? "Processing…" : `Pay ${usd(payInvoice?.total ?? 0, 2)}`}
              </Button>
            </>
          )
        }
      >
        {payDone ? (
          <div className="space-y-3 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="size-6" />
            </span>
            <p className="text-sm font-semibold">Invoice {payInvoice?.number} is paid.</p>
            <p className="text-xs text-muted-foreground">
              A receipt has been added to your billing history and the workspace is active.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {payError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{payError}</div>
            )}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{payInvoice?.lines[0]?.label}</span>
                <span className="font-semibold">{usd(payInvoice?.subtotal ?? 0, 2)}</span>
              </div>
              {(payInvoice?.lines.length ?? 0) > 1 &&
                payInvoice?.lines.slice(1).map((line) => (
                  <div key={line.label} className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{line.label}</span>
                    <span>{usd(line.amount, 2)}</span>
                  </div>
                ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                <span>Total due</span>
                <span>{usd(payInvoice?.total ?? 0, 2)}</span>
              </div>
            </div>
            <Field label="Payment provider">
              <Select value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
                {providers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}{item.configured ? "" : " (not configured)"}
                  </option>
                ))}
              </Select>
            </Field>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Card details are captured by the provider's hosted checkout. Stayora never receives or stores raw card numbers.
              {BILLING_MODE === "sandbox" && " This development build simulates the provider response."}
            </p>
          </div>
        )}
      </Modal>

      {/* Plan change confirmation */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.mode === "downgrade" ? "Confirm downgrade" : "Confirm plan change"}
        description={confirm ? `Move this workspace to ${planFor(confirm.planId, settings).name} on ${cycle} billing.` : undefined}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button onClick={applyPlan}>{confirm?.mode === "downgrade" ? "Downgrade plan" : "Continue"}</Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <p className="font-semibold text-foreground">{planFor(confirm.planId, settings).name}</p>
              <p>{usd(cycle === "yearly" ? planFor(confirm.planId, settings).yearly : planFor(confirm.planId, settings).monthly)} per {cycle === "yearly" ? "year" : "month"}, billed in USD.</p>
            </div>
            {confirm.mode === "downgrade" ? (
              <ul className="space-y-1.5">
                <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> All existing rooms, staff, bookings and invoices are kept.</li>
                <li className="flex gap-2"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600" /> Anything above the new limit becomes read-only until you free capacity or upgrade.</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> Add-ons that no longer fit your plan are cancelled at the end of the period.</li>
              </ul>
            ) : (
              <ul className="space-y-1.5">
                <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> Your new limits apply immediately.</li>
                <li className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" /> An invoice for the new period is created and can be paid now.</li>
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Payment method modal */}
      <Modal
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title="Update payment method"
        description="Only the provider token and last four digits are stored."
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMethodOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                addPaymentMethod(currentTenant.id, methodForm.provider, methodForm.brand, methodForm.last4, methodForm.expiry);
                setMethodOpen(false);
              }}
            >
              Save method
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provider">
            <Select value={methodForm.provider} onChange={(e) => setMethodForm({ ...methodForm, provider: e.target.value })}>
              {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
          </Field>
          <Field label="Card brand">
            <Select value={methodForm.brand} onChange={(e) => setMethodForm({ ...methodForm, brand: e.target.value })}>
              {["Visa", "Mastercard", "Verve", "Amex"].map((brand) => <option key={brand} value={brand}>{brand}</option>)}
            </Select>
          </Field>
          <Field label="Last 4 digits">
            <Input
              value={methodForm.last4}
              maxLength={4}
              onChange={(e) => setMethodForm({ ...methodForm, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </Field>
          <Field label="Expiry">
            <Input value={methodForm.expiry} placeholder="MM/YY" onChange={(e) => setMethodForm({ ...methodForm, expiry: e.target.value })} />
          </Field>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          In production this form is replaced by the provider's secure card element. Full card numbers, CVV and PINs are never
          entered into or stored by the Stayora app.
        </p>
      </Modal>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
  hint: string;
  tone?: "amber";
}) {
  return (
    <div className={cn("surface-card flex items-start gap-3 p-4", tone === "amber" && "border-amber-200 bg-amber-50/40")}>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-gold")}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-semibold leading-tight">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function PlanLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5 text-muted-foreground">
      <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" /> {children}
    </li>
  );
}

function AddOnCard({
  addOn,
  active,
  onActivate,
  onCancel,
}: {
  addOn: AddOn;
  active: boolean;
  onActivate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className={cn("surface-card flex flex-col p-4", active && "ring-1 ring-primary/40")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{addOn.name}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{addOn.description}</p>
        </div>
        {active && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">Active</span>}
      </div>
      <div className="mt-3 flex-1">
        <p className="font-display text-lg font-semibold">
          {addOn.priceMonthly > 0 ? `${usd(addOn.priceMonthly)}/mo` : "Usage-based"}
        </p>
        {addOn.usageNote && <p className="text-[10px] text-muted-foreground">{addOn.usageNote}</p>}
        {addOn.grants && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Adds {addOn.grants.rooms ? `${addOn.grants.rooms} rooms` : addOn.grants.staff ? `${addOn.grants.staff} staff seats` : `${addOn.grants.properties} property`}
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {active ? (
          <Button size="sm" variant="outline" className="flex-1" onClick={onCancel}>
            <X className="size-3.5" /> Deactivate
          </Button>
        ) : (
          <Button size="sm" className="flex-1" onClick={onActivate}>
            <Plus className="size-3.5" /> Activate add-on
          </Button>
        )}
      </div>
    </div>
  );
}
