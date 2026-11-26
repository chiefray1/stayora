import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarPlus,
  Check,
  CreditCard,
  Download,
  Gauge,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "../lib/store";
import { useTenant } from "../lib/tenants";
import { useSubscription, type BillingInvoice, type Subscription } from "../lib/subscription";
import {
  PLAN_ORDER,
  addBillingPeriod,
  annualSaving,
  formatLimit,
  monthlyEquivalent,
  planFor,
  usd,
  type BillingCycle,
  type PlanId,
  type PlanSettings,
} from "../lib/plans";
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
  StatCard,
  StatusPill,
  Tabs,
  cn,
} from "../components/ui";

type Tab = "overview" | "subscriptions" | "configuration" | "audit";
type RowAction = { kind: "assign" | "extend" | "credit" | "suspend"; hotelId: string } | null;

const statusTone: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-sky-50 text-sky-700 border-sky-200",
  free: "bg-slate-100 text-slate-600 border-slate-200",
  past_due: "bg-amber-50 text-amber-800 border-amber-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-amber-50 text-amber-800 border-amber-200",
  expired: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function PlatformSubscriptions() {
  const { tenants } = useTenant();
  const { db } = useStore();
  const {
    state,
    settings,
    assignPlan,
    extendSubscription,
    suspendSubscription,
    reactivateSubscription,
    issueCredit,
    subscriptionFor,
    updateSettings,
  } = useSubscription();

  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [action, setAction] = useState<RowAction>(null);
  const [actionPlan, setActionPlan] = useState<PlanId>("starter");
  const [actionCycle, setActionCycle] = useState<BillingCycle>("monthly");
  const [actionDays, setActionDays] = useState(30);
  const [actionAmount, setActionAmount] = useState(25);
  const [actionNote, setActionNote] = useState("");
  const [draft, setDraft] = useState<PlanSettings>(settings);
  const [saved, setSaved] = useState(false);

  const subscriptions = useMemo(
    () => tenants.map((tenant) => ({ tenant, sub: state.subscriptions[tenant.id] ?? subscriptionFor(tenant.id) })),
    [tenants, state.subscriptions, subscriptionFor],
  );

  const enriched = useMemo(
    () =>
      subscriptions.map(({ tenant, sub }) => {
        const plan = planFor(sub.planId, settings);
        const planMonthly = sub.cycle === "yearly" ? plan.yearly / 12 : plan.monthly;
        const addOnMonthly = state.addOns
          .filter((entry) => entry.hotelId === tenant.id && entry.status === "active")
          .reduce((sum, entry) => sum + (settings.addOns.find((item) => item.id === entry.addOnId)?.priceMonthly ?? 0), 0);
        return { tenant, sub, plan, mrr: Math.max(0, planMonthly + addOnMonthly) };
      }),
    [subscriptions, settings, state.addOns],
  );

  const mrr = enriched.reduce((sum, row) => sum + row.mrr, 0);
  const paying = enriched.filter((row) => row.mrr > 0);
  const overdue = enriched.filter((row) => row.sub.status === "past_due" || row.sub.status === "expired");
  const suspended = enriched.filter((row) => row.sub.status === "suspended");

  const distribution = PLAN_ORDER.map((planId) => ({
    planId,
    count: enriched.filter((row) => row.sub.planId === planId).length,
    revenue: enriched.filter((row) => row.sub.planId === planId).reduce((sum, row) => sum + row.mrr, 0),
  }));

  const filtered = enriched.filter((row) => {
    if (statusFilter !== "all" && row.sub.status !== statusFilter) return false;
    if (planFilter !== "all" && row.sub.planId !== planFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        row.tenant.name.toLowerCase().includes(q) ||
        row.tenant.city.toLowerCase().includes(q) ||
        row.tenant.ownerEmail.toLowerCase().includes(q) ||
        row.tenant.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const platformActivity = state.events.slice(0, 40);
  const currentRow = action ? enriched.find((row) => row.tenant.id === action.hotelId) : null;
  const openInvoices = state.invoices.filter((invoice) => invoice.status === "open" || invoice.status === "overdue");

  const saveConfiguration = () => {
    updateSettings(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const patchPlan = (planId: PlanId, patch: Partial<PlanSettings["plans"][PlanId]>) => {
    setDraft((prev) => ({
      ...prev,
      plans: { ...prev.plans, [planId]: { ...prev.plans[planId], ...patch } },
    }));
  };

  const patchLimit = (planId: PlanId, key: keyof PlanSettings["plans"][PlanId]["limits"], value: number | null) => {
    setDraft((prev) => ({
      ...prev,
      plans: {
        ...prev.plans,
        [planId]: { ...prev.plans[planId], limits: { ...prev.plans[planId].limits, [key]: value } },
      },
    }));
  };

  const exportPlatform = () => {
    downloadCsv("stayora-platform-subscriptions.csv", [
      ["Hotel", "Hotel ID", "Plan", "Status", "Cycle", "MRR (USD)", "Renews", "Owner"],
      ...enriched.map((row) => [
        row.tenant.name,
        row.tenant.id,
        row.sub.planId,
        row.sub.status,
        row.sub.cycle,
        row.mrr.toFixed(2),
        row.sub.expiresAt.slice(0, 10),
        row.tenant.ownerEmail,
      ]),
    ]);
  };

  const runAction = () => {
    if (!action) return;
    if (action.kind === "assign") {
      assignPlan(action.hotelId, actionPlan, actionCycle, actionDays);
    } else if (action.kind === "extend") {
      extendSubscription(action.hotelId, actionDays);
    } else if (action.kind === "credit") {
      issueCredit(action.hotelId, actionAmount, actionNote || "Platform credit");
    } else if (action.kind === "suspend") {
      const row = enriched.find((entry) => entry.tenant.id === action.hotelId);
      if (row?.sub.status === "suspended") reactivateSubscription(action.hotelId);
      else suspendSubscription(action.hotelId, actionNote || "Suspended by platform");
    }
    setAction(null);
    setActionNote("");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Superadmin"
        title="Subscription control"
        description="Platform-wide revenue, plan configuration, workspace assignments and billing audit."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPlatform}>
              <Download className="size-4" /> Export
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="size-3" /> Platform mode
            </span>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="MRR" value={usd(mrr)} delta={`${paying.length} paying workspaces`} up icon={BadgeDollarSign} />
        <StatCard label="ARR" value={usd(mrr * 12)} delta="Recurring subscription revenue" up icon={TrendingUp} tone="green" />
        <StatCard label="Overdue / expired" value={String(overdue.length)} delta={`${openInvoices.length} open invoices`} icon={AlertTriangle} tone={overdue.length ? "red" : "default"} />
        <StatCard label="Suspended" value={String(suspended.length)} delta="Awaiting reactivation" icon={PauseCircle} tone={suspended.length ? "amber" : "default"} />
      </div>

      <div className="mt-4">
        <Tabs
          value={tab}
          onChange={(next) => setTab(next as Tab)}
          tabs={[
            { id: "overview", label: "Revenue overview" },
            { id: "subscriptions", label: `Subscriptions (${enriched.length})` },
            { id: "configuration", label: "Plans & pricing" },
            { id: "audit", label: "Audit log" },
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <SectionCard title="Plan distribution" subtitle="Workspaces and revenue by plan" className="xl:col-span-2">
            <div className="space-y-4">
              {distribution.map((row) => {
                const plan = planFor(row.planId, settings);
                const pct = enriched.length ? Math.round((row.count / enriched.length) * 100) : 0;
                return (
                  <div key={row.planId}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium">{plan.name.replace("Stayora ", "")}</span>
                      <span className="text-muted-foreground">
                        {row.count} workspace{row.count === 1 ? "" : "s"} · {usd(row.revenue)}/mo
                      </span>
                    </div>
                    <Progress value={pct} tone={row.planId === "professional" ? "blue" : row.planId === "starter" ? "gold" : "green"} />
                  </div>
                );
              })}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {PLAN_ORDER.map((planId) => {
                const plan = planFor(planId, settings);
                const count = distribution.find((row) => row.planId === planId)?.count ?? 0;
                return (
                  <div key={planId} className="rounded-lg border border-border px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{plan.name.replace("Stayora ", "")}</p>
                    <p className="mt-0.5 font-display text-lg font-semibold">{usd(plan.monthly)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
                    <p className="text-[10px] text-muted-foreground">{count} active · {usd(plan.yearly)}/yr</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Needs attention" subtitle="Overdue, expired and suspended workspaces" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {[...overdue, ...suspended].slice(0, 6).map((row) => (
                <li key={row.tenant.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold">{row.tenant.name}</p>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase", statusTone[row.sub.status] ?? statusTone.free)}>
                      {row.sub.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {planFor(row.sub.planId, settings).name} · ends {shortDate(row.sub.expiresAt)} · {usd(row.mrr)}/mo
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => { setAction({ kind: "extend", hotelId: row.tenant.id }); setActionDays(14); }}>Extend</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: "suspend", hotelId: row.tenant.id }); setActionNote(""); }}>
                      {row.sub.status === "suspended" ? "Reactivate" : "Suspend"}
                    </Button>
                  </div>
                </li>
              ))}
              {overdue.length + suspended.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">Every workspace is healthy.</li>
              )}
            </ul>
          </SectionCard>

          <SectionCard title="Recent billing activity" subtitle="Plan changes, payments and platform actions" className="xl:col-span-3" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {platformActivity.slice(0, 10).map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
                  <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary">
                    <CreditCard className="size-3" />
                  </span>
                  <span className="font-medium">
                    {tenants.find((tenant) => tenant.id === event.hotelId)?.name ?? (event.hotelId === "platform" ? "Platform" : event.hotelId)}
                  </span>
                  <span className="text-muted-foreground">{event.detail}</span>
                  <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                    {typeof event.amount === "number" && event.amount > 0 && <span className="font-semibold text-foreground">{usd(event.amount, 2)}</span>}
                    {event.actor} · {timeAgo(event.at)}
                  </span>
                </li>
              ))}
              {platformActivity.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">No platform activity yet.</li>
              )}
            </ul>
          </SectionCard>
        </div>
      )}

      {tab === "subscriptions" && (
        <SectionCard
          title="All workspace subscriptions"
          subtitle="Assign plans, extend periods, apply credits or suspend access."
          className="mt-4"
          bodyClassName="p-0"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspace…" className="w-44 pl-8" />
              </div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
                {["all", "active", "trial", "free", "past_due", "suspended", "cancelled", "expired"].map((status) => (
                  <option key={status} value={status}>{status === "all" ? "All statuses" : status.replace("_", " ")}</option>
                ))}
              </Select>
              <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="w-32">
                <option value="all">All plans</option>
                {PLAN_ORDER.map((planId) => <option key={planId} value={planId}>{planFor(planId, settings).name.replace("Stayora ", "")}</option>)}
              </Select>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="table-base min-w-[980px]">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Cycle</th>
                  <th>Next billing</th>
                  <th className="text-right">MRR</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.tenant.id}>
                    <td>
                      <p className="text-xs font-semibold">{row.tenant.name}</p>
                      <p className="text-[10px] text-muted-foreground">{row.tenant.city} · {row.tenant.id}</p>
                    </td>
                    <td><span className="text-xs font-medium">{row.plan.name.replace("Stayora ", "")}</span></td>
                    <td>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase", statusTone[row.sub.status] ?? statusTone.free)}>
                        {row.sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="text-xs capitalize text-muted-foreground">{row.sub.cycle}</td>
                    <td className="text-xs text-muted-foreground">{shortDate(row.sub.nextBillingDate)}</td>
                    <td className="text-right text-xs font-semibold tabular-nums">{usd(row.mrr)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setAction({ kind: "assign", hotelId: row.tenant.id }); setActionPlan(row.sub.planId); setActionCycle(row.sub.cycle); setActionDays(30); }}>
                          Assign
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: "extend", hotelId: row.tenant.id }); setActionDays(14); }}>Extend</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: "credit", hotelId: row.tenant.id }); setActionAmount(25); }}>Credit</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAction({ kind: "suspend", hotelId: row.tenant.id }); setActionNote(""); }}>
                          {row.sub.status === "suspended" ? "Activate" : "Suspend"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-xs text-muted-foreground">No workspaces match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "configuration" && (
        <div className="mt-4 space-y-4">
          <SectionCard
            title="Plan pricing & limits"
            subtitle="Changes apply to every workspace immediately. Existing data is never removed."
            action={
              <div className="flex items-center gap-2">
                {saved && <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><Check className="size-3" /> Saved</span>}
                <Button size="sm" variant="outline" onClick={() => setDraft(settings)}>Reset</Button>
                <Button size="sm" onClick={saveConfiguration}><Settings2 className="size-4" /> Save configuration</Button>
              </div>
            }
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {PLAN_ORDER.map((planId) => {
                const plan = draft.plans[planId];
                return (
                  <div key={planId} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-base font-semibold">{planFor(planId, settings).name.replace("Stayora ", "")}</h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">Plan ID {planId}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Field label="Monthly (USD)">
                        <Input type="number" min={0} value={plan.monthly} onChange={(e) => patchPlan(planId, { monthly: Number(e.target.value) })} />
                      </Field>
                      <Field label="Yearly (USD)">
                        <Input type="number" min={0} value={plan.yearly} onChange={(e) => patchPlan(planId, { yearly: Number(e.target.value) })} />
                      </Field>
                      <Field label="Rooms">
                        <Input type="number" min={1} value={plan.limits.rooms} onChange={(e) => patchLimit(planId, "rooms", Number(e.target.value))} />
                      </Field>
                      <Field label="Staff">
                        <Input type="number" min={1} value={plan.limits.staff} onChange={(e) => patchLimit(planId, "staff", Number(e.target.value))} />
                      </Field>
                      <Field label="Properties">
                        <Input type="number" min={1} value={plan.limits.properties} onChange={(e) => patchLimit(planId, "properties", Number(e.target.value))} />
                      </Field>
                      <Field label="Storage (GB)">
                        <Input type="number" min={1} value={plan.limits.storageGb} onChange={(e) => patchLimit(planId, "storageGb", Number(e.target.value))} />
                      </Field>
                      <Field label="Reservations / month" hint="Blank = unlimited">
                        <Input
                          type="number"
                          min={0}
                          value={plan.limits.reservationsPerMonth ?? ""}
                          placeholder="Unlimited"
                          onChange={(e) => patchLimit(planId, "reservationsPerMonth", e.target.value === "" ? null : Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Annual saving">
                        <Input value={usd(annualSaving(planId, draft))} readOnly className="bg-muted/40" />
                      </Field>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {monthlyEquivalent(planId, "yearly", draft) ? `${usd(monthlyEquivalent(planId, "yearly", draft), 2)}/mo on annual billing` : "Free plan"}
                    </p>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title="Grace period" subtitle="Days of read/write access after a failed renewal">
              <Field label="Grace days">
                <Input type="number" min={0} max={30} value={draft.graceDays} onChange={(e) => setDraft({ ...draft, graceDays: Number(e.target.value) })} />
              </Field>
              <p className="mt-2 text-[10px] text-muted-foreground">
                After the grace period the workspace becomes read-only until payment is collected. Data is preserved.
              </p>
            </SectionCard>

            <SectionCard title="Module overrides" subtitle="Raise the minimum plan for a module when needed">
              <div className="space-y-2">
                {Object.entries(draft.moduleOverrides).length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No overrides. Default plan requirements apply.</p>
                )}
                {Object.entries(draft.moduleOverrides).map(([moduleId, planId]) => (
                  <div key={moduleId} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs">{moduleId}</span>
                    <Select
                      value={planId}
                      className="w-32"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          moduleOverrides: { ...draft.moduleOverrides, [moduleId]: e.target.value as PlanId },
                        })
                      }
                    >
                      {PLAN_ORDER.map((option) => <option key={option} value={option}>{option}</option>)}
                    </Select>
                    <button
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const next = { ...draft.moduleOverrides };
                        delete next[moduleId];
                        setDraft({ ...draft, moduleOverrides: next });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Add-on catalogue" subtitle="Active add-ons available to every workspace">
              <ul className="space-y-2">
                {draft.addOns.map((addOn) => (
                  <li key={addOn.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
                    <span className="truncate text-[11px] font-medium">{addOn.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{addOn.priceMonthly ? `${usd(addOn.priceMonthly)}/mo` : "Usage"}</span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="Open invoices" subtitle="Across all workspaces" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="table-base min-w-[760px]">
                <thead>
                  <tr><th>Invoice</th><th>Workspace</th><th>Issued</th><th>Due</th><th>Status</th><th className="text-right">Total</th></tr>
                </thead>
                <tbody>
                  {openInvoices.map((invoice) => {
                    const tenant = tenants.find((entry) => entry.id === invoice.hotelId);
                    return (
                      <tr key={invoice.id}>
                        <td className="text-xs font-semibold">{invoice.number}</td>
                        <td className="text-xs">{tenant?.name ?? invoice.hotelId}</td>
                        <td className="text-xs text-muted-foreground">{shortDate(invoice.issuedAt)}</td>
                        <td className="text-xs text-muted-foreground">{shortDate(invoice.dueAt)}</td>
                        <td><StatusPill status={invoice.status} /></td>
                        <td className="text-right text-xs font-semibold tabular-nums">{usd(invoice.total, 2)}</td>
                      </tr>
                    );
                  })}
                  {openInvoices.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No open invoices.</td></tr>}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "audit" && (
        <SectionCard title="Subscription audit log" subtitle="Every platform and hotel-initiated billing event" className="mt-4" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {platformActivity.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
                <span className="w-32 shrink-0 text-[10px] text-muted-foreground">{new Date(event.at).toLocaleString("en-GB")}</span>
                <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">{event.type.replace(/_/g, " ")}</span>
                <span className="font-medium">{tenants.find((tenant) => tenant.id === event.hotelId)?.name ?? (event.hotelId === "platform" ? "Platform" : event.hotelId)}</span>
                <span className="text-muted-foreground">{event.detail}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{event.actor} · {event.source}</span>
              </li>
            ))}
            {platformActivity.length === 0 && <li className="px-4 py-10 text-center text-xs text-muted-foreground">No events recorded.</li>}
          </ul>
        </SectionCard>
      )}

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action?.kind === "assign"
            ? "Assign a plan"
            : action?.kind === "extend"
              ? "Extend subscription"
              : action?.kind === "credit"
                ? "Issue account credit"
                : currentRow?.sub.status === "suspended"
                  ? "Reactivate workspace"
                  : "Suspend workspace"
        }
        description={currentRow ? `${currentRow.tenant.name} · ${currentRow.tenant.id}` : undefined}
        width="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            <Button onClick={runAction}>
              {action?.kind === "assign" ? <RefreshCw className="size-4" /> : action?.kind === "extend" ? <CalendarPlus className="size-4" /> : action?.kind === "credit" ? <Wallet className="size-4" /> : <PauseCircle className="size-4" />}
              Confirm
            </Button>
          </>
        }
      >
        {action?.kind === "assign" && (
          <div className="space-y-3">
            <Field label="Plan">
              <Select value={actionPlan} onChange={(e) => setActionPlan(e.target.value as PlanId)}>
                {PLAN_ORDER.map((planId) => <option key={planId} value={planId}>{planFor(planId, settings).name}</option>)}
              </Select>
            </Field>
            <Field label="Billing cycle">
              <Select value={actionCycle} onChange={(e) => setActionCycle(e.target.value as BillingCycle)}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
            <Field label="Access period (days)">
              <Input type="number" min={1} value={actionDays} onChange={(e) => setActionDays(Number(e.target.value))} />
            </Field>
            <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              Assigning a plan does not create a charge. Use the invoice workflow for comped or offline payments.
            </p>
          </div>
        )}
        {action?.kind === "extend" && (
          <div className="space-y-3">
            <Field label="Extend by (days)">
              <Input type="number" min={1} value={actionDays} onChange={(e) => setActionDays(Number(e.target.value))} />
            </Field>
            <p className="text-[11px] text-muted-foreground">
              New expiry: {prettyDate(new Date(Date.now() + actionDays * 86_400_000).toISOString())}. Extending also reactivates a suspended workspace.
            </p>
          </div>
        )}
        {action?.kind === "credit" && (
          <div className="space-y-3">
            <Field label="Credit amount (USD)">
              <Input type="number" min={1} value={actionAmount} onChange={(e) => setActionAmount(Number(e.target.value))} />
            </Field>
            <Field label="Reason">
              <Input value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="e.g. service credit for downtime" />
            </Field>
          </div>
        )}
        {action?.kind === "suspend" && (
          <div className="space-y-3">
            {currentRow?.sub.status === "suspended" ? (
              <p className="text-xs text-muted-foreground">
                Reactivating restores write access immediately and keeps the existing plan and expiry date.
              </p>
            ) : (
              <>
                <Field label="Reason shown to the hotel">
                  <Input value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="e.g. repeated failed payments" />
                </Field>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  Suspending blocks all writes. Existing data stays intact and becomes accessible again on reactivation.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
