import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { NotificationType } from "./types";
import type { Tenant } from "./tenants";
import { useTenant } from "./tenants";
import { useAuth } from "./auth";
import { useStore } from "./store";
import {
  DEFAULT_PLAN_SETTINGS,
  addBillingPeriod,
  addOnMonthlyTotal,
  checkLimit,
  daysUntil,
  draftInvoice,
  effectiveStatus,
  formatLimit,
  isSubscriptionUsable,
  moduleAllowed,
  normalizePlanId,
  planFor,
  priceFor,
  requiredPlanFor,
  resolveEntitlements,
  sizeToGb,
  type AddOn,
  type BillingCycle,
  type Entitlements,
  type PlanDefinition,
  type PlanId,
  type PlanSettings,
  type SubscriptionStatus,
} from "./plans";
import { registerBillingSnapshot } from "./entitlements";

/* ------------------------------------------------------------------ *
 * Schema
 * ------------------------------------------------------------------ */

export interface Subscription {
  id: string;
  hotelId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  startedAt: string;
  expiresAt: string;
  nextBillingDate: string;
  autoRenew: boolean;
  trialEndsAt?: string;
  graceEndsAt?: string;
  cancelledAt?: string;
  previousPlanId?: PlanId;
  paymentMethodId?: string;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = "open" | "paid" | "void" | "overdue";

export interface BillingInvoice {
  id: string;
  number: string;
  hotelId: string;
  planId: PlanId;
  cycle: BillingCycle;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: "USD";
  status: InvoiceStatus;
  lines: { label: string; amount: number }[];
  provider?: string;
  reference?: string;
}

export interface BillingTransaction {
  id: string;
  hotelId: string;
  invoiceId?: string;
  at: string;
  amount: number;
  currency: "USD";
  provider: string;
  status: "succeeded" | "pending" | "failed" | "refunded";
  reference: string;
  idempotencyKey: string;
  description: string;
}

export interface AddOnSubscription {
  id: string;
  hotelId: string;
  addOnId: string;
  status: "active" | "cancelled";
  startedAt: string;
  cancelledAt?: string;
}

export type SubscriptionEventType =
  | "created"
  | "plan_assigned"
  | "upgraded"
  | "downgraded"
  | "renewed"
  | "extended"
  | "cancelled"
  | "resumed"
  | "suspended"
  | "reactivated"
  | "expired"
  | "past_due"
  | "payment_succeeded"
  | "payment_failed"
  | "invoice_issued"
  | "credit_issued"
  | "addon_added"
  | "addon_cancelled"
  | "settings_updated"
  | "limit_reached";

export interface SubscriptionEvent {
  id: string;
  hotelId: string;
  at: string;
  type: SubscriptionEventType;
  detail: string;
  actor: string;
  source: "hotel" | "platform" | "system";
  amount?: number;
}

export interface PaymentMethod {
  id: string;
  hotelId: string;
  provider: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface BillingState {
  version: number;
  subscriptions: Record<string, Subscription>;
  invoices: BillingInvoice[];
  transactions: BillingTransaction[];
  addOns: AddOnSubscription[];
  paymentMethods: PaymentMethod[];
  events: SubscriptionEvent[];
  settings: PlanSettings;
  seededAt: string;
}

const STORAGE_KEY = "stayora.billing.v1";
const DATA_VERSION = 2;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const nowISO = () => new Date().toISOString();

const invoiceNumber = (count: number) =>
  `SB-${new Date().getFullYear()}-${String(1001 + count).padStart(4, "0")}`;

const makeSubscription = (
  hotelId: string,
  planId: PlanId,
  status: SubscriptionStatus,
  cycle: BillingCycle,
  startedAt: string,
  expiresAt: string,
): Subscription => ({
  id: `sub-${hotelId}`,
  hotelId,
  planId,
  status,
  cycle,
  startedAt,
  expiresAt,
  nextBillingDate: expiresAt,
  autoRenew: planId !== "free",
  graceEndsAt: planId === "free" ? undefined : new Date(new Date(expiresAt).getTime() + 7 * 86_400_000).toISOString(),
  creditBalance: 0,
  createdAt: startedAt,
  updatedAt: startedAt,
});

const seedState = (tenants: Tenant[]): BillingState => {
  const settings = clone(DEFAULT_PLAN_SETTINGS);
  const subscriptions: Record<string, Subscription> = {};
  const invoices: BillingInvoice[] = [];
  const transactions: BillingTransaction[] = [];

  tenants.forEach((tenant, index) => {
    const planId = normalizePlanId(tenant.plan);
    const cycle: BillingCycle = index === 1 ? "yearly" : "monthly";
    const startedAt = tenant.createdAt;
    const expiresAt =
      planId === "free"
        ? addBillingPeriod(nowISO(), "yearly")
        : index === 1
          ? addBillingPeriod(nowISO(), "yearly")
          : new Date(Date.now() + 12 * 86_400_000).toISOString();

    subscriptions[tenant.id] = makeSubscription(
      tenant.id,
      planId,
      planId === "free" ? "free" : "active",
      cycle,
      startedAt,
      expiresAt,
    );
    if (planId === "free") return;

    const amount = priceFor(planId, cycle, settings);
    const paidAt = new Date(Date.now() - 24 * 86_400_000).toISOString();
    const invoice: BillingInvoice = {
      id: `inv-${tenant.id}-seed`,
      number: invoiceNumber(invoices.length),
      hotelId: tenant.id,
      planId,
      cycle,
      issuedAt: paidAt,
      dueAt: paidAt,
      paidAt,
      subtotal: amount,
      tax: 0,
      total: amount,
      currency: "USD",
      status: "paid",
      lines: [{ label: `${planFor(planId, settings).name} · ${cycle === "yearly" ? "annual" : "monthly"}`, amount }],
      provider: index === 1 ? "paystack" : "stripe",
      reference: `seed_${tenant.id.slice(-6)}`,
    };
    invoices.push(invoice);
    transactions.push({
      id: `txn-${tenant.id}-seed`,
      hotelId: tenant.id,
      invoiceId: invoice.id,
      at: paidAt,
      amount,
      currency: "USD",
      provider: invoice.provider ?? "stripe",
      status: "succeeded",
      reference: invoice.reference ?? "seed",
      idempotencyKey: `seed-${tenant.id}`,
      description: `Renewal · ${planFor(planId, settings).name}`,
    });

    if (tenant.id === "tnt-stayora-lagos") {
      const open: BillingInvoice = {
        ...invoice,
        id: `inv-${tenant.id}-open`,
        number: invoiceNumber(1),
        issuedAt: nowISO(),
        dueAt: new Date(Date.now() + 6 * 86_400_000).toISOString(),
        paidAt: undefined,
        status: "open",
        provider: undefined,
        reference: undefined,
        lines: [
          { label: `${planFor(planId, settings).name} · monthly`, amount },
          { label: "Additional 10 rooms", amount: 10 },
        ],
        subtotal: amount + 10,
        total: amount + 10,
      };
      invoices.push(open);
    }
  });

  return {
    version: DATA_VERSION,
    subscriptions,
    invoices,
    transactions,
    addOns:
      tenants[0] !== undefined
        ? [
            {
              id: `addon-sub-${tenants[0].id}-rooms`,
              hotelId: tenants[0].id,
              addOnId: "addon-rooms-10",
              status: "active",
              startedAt: tenants[0].createdAt,
            },
          ]
        : [],
    paymentMethods: tenants
      .filter((tenant) => normalizePlanId(tenant.plan) !== "free")
      .map((tenant, index) => ({
        id: `pm-${tenant.id}`,
        hotelId: tenant.id,
        provider: index === 1 ? "paystack" : "stripe",
        brand: index === 1 ? "Verve" : "Visa",
        last4: index === 1 ? "4081" : "4242",
        expiry: "09/28",
        isDefault: true,
      })),
    events: [],
    settings,
    seededAt: nowISO(),
  };
};

const readState = (tenants: Tenant[]): BillingState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BillingState>;
      if (parsed && parsed.version === DATA_VERSION && parsed.subscriptions) {
        const storedSettings = (parsed.settings ?? {}) as Partial<PlanSettings>;
        const storedAddOns = Array.isArray(storedSettings.addOns) ? storedSettings.addOns : DEFAULT_PLAN_SETTINGS.addOns;
        const missingAddOns = DEFAULT_PLAN_SETTINGS.addOns.filter(
          (addOn) => !storedAddOns.some((entry) => entry.id === addOn.id),
        );
        return {
          ...seedState(tenants),
          ...parsed,
          settings: {
            ...clone(DEFAULT_PLAN_SETTINGS),
            ...storedSettings,
            addOns: [...storedAddOns, ...missingAddOns],
          },
        } as BillingState;
      }
    }
  } catch {
    // corrupted storage — reseed
  }
  return seedState(tenants);
};

/* ------------------------------------------------------------------ *
 * Context
 * ------------------------------------------------------------------ */

export interface SubscriptionValue {
  state: BillingState;
  subscription: Subscription;
  plan: PlanDefinition;
  settings: PlanSettings;
  addOnIds: string[];
  addOns: AddOnSubscription[];
  invoices: BillingInvoice[];
  transactions: BillingTransaction[];
  events: SubscriptionEvent[];
  paymentMethods: PaymentMethod[];
  effective: SubscriptionStatus;
  usable: boolean;
  outstanding: number;
  monthlyTotal: number;
  changePlan: (hotelId: string, planId: PlanId, cycle: BillingCycle) => BillingInvoice | null;
  assignPlan: (hotelId: string, planId: PlanId, cycle: BillingCycle, days?: number) => void;
  cancelSubscription: (hotelId: string) => void;
  resumeSubscription: (hotelId: string) => void;
  renewSubscription: (hotelId: string) => BillingInvoice | null;
  extendSubscription: (hotelId: string, days: number) => void;
  suspendSubscription: (hotelId: string, reason?: string) => void;
  reactivateSubscription: (hotelId: string) => void;
  issueCredit: (hotelId: string, amount: number, note: string) => void;
  addAddOn: (hotelId: string, addOnId: string) => void;
  cancelAddOn: (hotelId: string, addOnId: string) => void;
  addPaymentMethod: (hotelId: string, provider: string, brand: string, last4: string, expiry: string) => void;
  recordPayment: (input: {
    invoiceId: string;
    provider: string;
    reference: string;
    idempotencyKey: string;
  }) => BillingTransaction | null;
  recordFailedPayment: (invoiceId: string, provider: string, reason: string) => void;
  updateSettings: (patch: Partial<PlanSettings>) => void;
  subscriptionFor: (hotelId: string) => Subscription;
  invoiceById: (id: string) => BillingInvoice | undefined;
}

const SubscriptionContext = createContext<SubscriptionValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { tenants, currentTenant, updateTenant } = useTenant();
  const { user } = useAuth();
  const { db, addNotification, logAudit } = useStore();
  const [state, setState] = useState<BillingState>(() => readState(tenants));
  const stateRef = useRef(state);
  stateRef.current = state;

  const actor = user?.name ?? "System";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full — keep running in memory
    }
  }, [state]);

  /* Keep every workspace represented, even ones created after seeding. */
  useEffect(() => {
    setState((prev) => {
      const missing = tenants.filter((tenant) => !prev.subscriptions[tenant.id]);
      if (missing.length === 0) return prev;
      const subscriptions = { ...prev.subscriptions };
      missing.forEach((tenant) => {
        const planId = normalizePlanId(tenant.plan);
        subscriptions[tenant.id] = makeSubscription(
          tenant.id,
          planId,
          planId === "free" ? "free" : "trial",
          "monthly",
          tenant.createdAt,
          tenant.trialEndsAt,
        );
      });
      return { ...prev, subscriptions };
    });
  }, [tenants]);

  const notify = useCallback(
    (hotelId: string, title: string, message: string, type: NotificationType = "system", link = "/subscription") => {
      if (hotelId !== currentTenant.id) return;
      addNotification({ type, title, message, audience: "all", link, actor: "Stayora Billing" });
    },
    [addNotification, currentTenant.id],
  );

  const auditTenant = useCallback(
    (hotelId: string, action: string) => {
      if (hotelId !== currentTenant.id) return;
      logAudit(action, "Subscription");
    },
    [currentTenant.id, logAudit],
  );

  const pushEvent = (
    prev: BillingState,
    event: Omit<SubscriptionEvent, "id" | "at">,
  ): SubscriptionEvent[] => [{ ...event, id: uid("evt"), at: nowISO() }, ...prev.events].slice(0, 500);

  /** Derived helpers ------------------------------------------------- */

  const subscriptionFor = useCallback(
    (hotelId: string): Subscription => {
      const existing = stateRef.current.subscriptions[hotelId];
      if (existing) return existing;
      const tenant = tenants.find((item) => item.id === hotelId);
      const planId = normalizePlanId(tenant?.plan);
      return makeSubscription(
        hotelId,
        planId,
        planId === "free" ? "free" : "trial",
        "monthly",
        tenant?.createdAt ?? nowISO(),
        tenant?.trialEndsAt ?? nowISO(),
      );
    },
    [tenants],
  );

  const subscription = useMemo(() => {
    const base = subscriptionFor(currentTenant.id);
    return { ...base, status: effectiveStatus(base) };
  }, [subscriptionFor, currentTenant.id]);

  const plan = useMemo(() => planFor(subscription.planId, state.settings), [subscription.planId, state.settings]);

  const addOns = useMemo(
    () => state.addOns.filter((entry) => entry.hotelId === currentTenant.id),
    [state.addOns, currentTenant.id],
  );

  const addOnIds = useMemo(
    () => addOns.filter((entry) => entry.status === "active").map((entry) => entry.addOnId),
    [addOns],
  );

  const invoices = useMemo(
    () => state.invoices.filter((invoice) => invoice.hotelId === currentTenant.id),
    [state.invoices, currentTenant.id],
  );

  const transactions = useMemo(
    () => state.transactions.filter((txn) => txn.hotelId === currentTenant.id),
    [state.transactions, currentTenant.id],
  );

  const events = useMemo(
    () => state.events.filter((event) => event.hotelId === currentTenant.id),
    [state.events, currentTenant.id],
  );

  const paymentMethods = useMemo(
    () => state.paymentMethods.filter((method) => method.hotelId === currentTenant.id),
    [state.paymentMethods, currentTenant.id],
  );

  const outstanding = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === "open" || invoice.status === "overdue")
        .reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices],
  );

  const monthlyTotal = useMemo(
    () =>
      subscription.planId === "free"
        ? addOnMonthlyTotal(addOnIds, state.settings)
        : (subscription.cycle === "yearly"
            ? Math.round((priceFor(subscription.planId, "yearly", state.settings) / 12) * 100) / 100
            : priceFor(subscription.planId, "monthly", state.settings)) + addOnMonthlyTotal(addOnIds, state.settings),
    [subscription.planId, subscription.cycle, addOnIds, state.settings],
  );

  const usable = isSubscriptionUsable(subscription.status) && subscription.status !== "suspended";

  /* Publish the authoritative snapshot for mutation-level guards. */
  const liveEntitlements = useMemo(
    () => resolveEntitlements(subscription.planId, addOnIds, state.settings),
    [subscription.planId, addOnIds, state.settings],
  );

  const liveUsage = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      rooms: db.rooms.length,
      staff: db.staff.length,
      properties: currentTenant.branches.length,
      reservationsThisMonth: db.reservations.filter(
        (reservation) => reservation.createdAt.slice(0, 7) === month && reservation.status !== "cancelled",
      ).length,
      storageGb: Math.round(db.documents.reduce((sum, doc) => sum + sizeToGb(doc.size), 0) * 100) / 100,
    };
  }, [db.rooms, db.staff, db.documents, db.reservations, currentTenant.branches.length]);

  useEffect(() => {
    registerBillingSnapshot({
      hotelId: currentTenant.id,
      planId: subscription.planId,
      status: subscription.status,
      usable,
      limits: liveEntitlements.limits,
      usage: liveUsage,
      modules: liveEntitlements.modules,
      settings: state.settings,
    });
    return () => registerBillingSnapshot(null);
  }, [currentTenant.id, subscription.planId, subscription.status, usable, liveEntitlements, liveUsage, state.settings]);

  /* Lifecycle ------------------------------------------------------- */

  const changePlan = useCallback(
    (hotelId: string, planId: PlanId, cycle: BillingCycle): BillingInvoice | null => {
      const previous = subscriptionFor(hotelId);
      const previousPlan = previous.planId;
      if (previousPlan === planId && previous.cycle === cycle) return null;

      const settings = stateRef.current.settings;
      const target = planFor(planId, settings);
      const now = nowISO();
      const isFree = planId === "free";
      const expiresAt = isFree
        ? addBillingPeriod(now, "yearly")
        : addBillingPeriod(now, cycle);
      const activeAddOns = stateRef.current.addOns
        .filter((entry) => entry.hotelId === hotelId && entry.status === "active")
        .map((entry) => entry.addOnId);
      const draft = draftInvoice(planId, cycle, activeAddOns, settings, 0);
      const upgrade = planId !== "free" && draft.total > 0;

      const invoice: BillingInvoice | null = upgrade
        ? {
            id: uid("inv"),
            number: invoiceNumber(stateRef.current.invoices.length),
            hotelId,
            planId,
            cycle,
            issuedAt: now,
            dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
            subtotal: draft.subtotal,
            tax: draft.tax,
            total: draft.total,
            currency: "USD",
            status: "open",
            lines: draft.lines,
          }
        : null;

      setState((prev) => {
        const next: Subscription = {
          ...prev.subscriptions[hotelId],
          ...previous,
          planId,
          cycle,
          status: isFree ? "free" : "active",
          startedAt: now,
          expiresAt,
          nextBillingDate: expiresAt,
          autoRenew: !isFree,
          graceEndsAt: isFree ? undefined : new Date(new Date(expiresAt).getTime() + settings.graceDays * 86_400_000).toISOString(),
          cancelledAt: undefined,
          previousPlanId: previousPlan,
          updatedAt: now,
        };
        return {
          ...prev,
          subscriptions: { ...prev.subscriptions, [hotelId]: next },
          invoices: invoice ? [invoice, ...prev.invoices] : prev.invoices,
          events: pushEvent(prev, {
            hotelId,
            type: previousPlan === "free" ? "created" : planId === "free" ? "cancelled" : isDowngrade(previousPlan, planId) ? "downgraded" : "upgraded",
            detail: `${target.name} · ${cycle}${previousPlan !== planId ? ` · was ${planFor(previousPlan, settings).name}` : ""}`,
            actor,
            source: hotelId === currentTenant.id ? "hotel" : "platform",
            amount: draft.total,
          }),
        };
      });

      updateTenant(hotelId, { plan: planId });
      auditTenant(hotelId, `Subscription changed to ${target.name} (${cycle})`);
      notify(
        hotelId,
        previousPlan === "free" ? "Subscription activated" : "Plan updated",
        `Your workspace is now on ${target.name} (${cycle}). ${upgrade ? `Invoice ${invoice?.number ?? ""} is ready.` : ""}`.trim(),
        "payment",
      );
      return invoice;
    },
    [actor, auditTenant, currentTenant.id, notify, subscriptionFor, updateTenant],
  );

  const assignPlan = useCallback(
    (hotelId: string, planId: PlanId, cycle: BillingCycle, days = 30) => {
      const settings = stateRef.current.settings;
      const now = nowISO();
      const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
      setState((prev) => {
        const previous = prev.subscriptions[hotelId] ?? subscriptionFor(hotelId);
        const next: Subscription = {
          ...previous,
          planId,
          cycle,
          status: planId === "free" ? "free" : "active",
          expiresAt: planId === "free" ? addBillingPeriod(now, "yearly") : expiresAt,
          nextBillingDate: planId === "free" ? addBillingPeriod(now, "yearly") : expiresAt,
          autoRenew: planId !== "free",
          cancelledAt: undefined,
          graceEndsAt: new Date(new Date(expiresAt).getTime() + settings.graceDays * 86_400_000).toISOString(),
          previousPlanId: previous.planId,
          updatedAt: now,
        };
        return {
          ...prev,
          subscriptions: { ...prev.subscriptions, [hotelId]: next },
          events: pushEvent(prev, {
            hotelId,
            type: "plan_assigned",
            detail: `Platform assigned ${planFor(planId, settings).name} for ${days} days`,
            actor,
            source: "platform",
          }),
        };
      });
      updateTenant(hotelId, { plan: planId, status: planId === "free" ? "trial" : "active" });
      notify(hotelId, "Plan assigned", `The platform team moved this workspace to ${planFor(planId, settings).name}.`, "system");
    },
    [actor, notify, subscriptionFor, updateTenant],
  );

  const cancelSubscription = useCallback(
    (hotelId: string) => {
      const now = nowISO();
      const current = subscriptionFor(hotelId);
      setState((prev) => ({
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [hotelId]: { ...current, status: "cancelled", autoRenew: false, cancelledAt: now, updatedAt: now },
        },
        events: pushEvent(prev, {
          hotelId,
          type: "cancelled",
          detail: `Auto-renewal cancelled · access until ${new Date(current.expiresAt).toLocaleDateString("en-GB")}`,
          actor,
          source: "hotel",
        }),
      }));
      notify(hotelId, "Subscription cancelled", "Auto-renewal is off. You keep access until the end of the paid period.", "system");
      auditTenant(hotelId, "Cancelled subscription auto-renewal");
    },
    [actor, auditTenant, notify, subscriptionFor],
  );

  const resumeSubscription = useCallback(
    (hotelId: string) => {
      const current = subscriptionFor(hotelId);
      setState((prev) => ({
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [hotelId]: { ...current, status: current.planId === "free" ? "free" : "active", autoRenew: current.planId !== "free", cancelledAt: undefined, updatedAt: nowISO() },
        },
        events: pushEvent(prev, {
          hotelId,
          type: "resumed",
          detail: "Auto-renewal restored",
          actor,
          source: "hotel",
        }),
      }));
      notify(hotelId, "Subscription resumed", "Auto-renewal is back on for this workspace.", "system");
    },
    [actor, notify, subscriptionFor],
  );

  const renewSubscription = useCallback(
    (hotelId: string): BillingInvoice | null => {
      const current = subscriptionFor(hotelId);
      if (current.planId === "free") return null;
      const settings = stateRef.current.settings;
      const activeAddOns = stateRef.current.addOns
        .filter((entry) => entry.hotelId === hotelId && entry.status === "active")
        .map((entry) => entry.addOnId);
      const draft = draftInvoice(current.planId, current.cycle, activeAddOns, settings, 0);
      const base = new Date(current.expiresAt).getTime() > Date.now() ? current.expiresAt : nowISO();
      const expiresAt = addBillingPeriod(base, current.cycle);
      const invoice: BillingInvoice = {
        id: uid("inv"),
        number: invoiceNumber(stateRef.current.invoices.length),
        hotelId,
        planId: current.planId,
        cycle: current.cycle,
        issuedAt: nowISO(),
        dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
        currency: "USD",
        status: "open",
        lines: draft.lines,
      };

      setState((prev) => {
        return {
          ...prev,
          invoices: [invoice, ...prev.invoices],
          subscriptions: {
            ...prev.subscriptions,
            [hotelId]: {
              ...current,
              status: "active",
              expiresAt,
              nextBillingDate: expiresAt,
              graceEndsAt: new Date(new Date(expiresAt).getTime() + settings.graceDays * 86_400_000).toISOString(),
              cancelledAt: undefined,
              autoRenew: true,
              updatedAt: nowISO(),
            },
          },
          events: pushEvent(prev, {
            hotelId,
            type: "renewed",
            detail: `Renewed ${planFor(current.planId, settings).name} until ${new Date(expiresAt).toLocaleDateString("en-GB")}`,
            actor,
            source: "hotel",
            amount: draft.total,
          }),
        };
      });
      notify(hotelId, "Renewal invoice issued", `Invoice ${invoice.number} is ready for payment.`, "payment");
      return invoice;
    },
    [actor, notify, subscriptionFor],
  );

  const extendSubscription = useCallback(
    (hotelId: string, days: number) => {
      const current = subscriptionFor(hotelId);
      const base = new Date(current.expiresAt).getTime() > Date.now() ? current.expiresAt : nowISO();
      const expiresAt = new Date(new Date(base).getTime() + days * 86_400_000).toISOString();
      setState((prev) => ({
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [hotelId]: { ...current, status: "active", expiresAt, nextBillingDate: expiresAt, updatedAt: nowISO() },
        },
        events: pushEvent(prev, {
          hotelId,
          type: "extended",
          detail: `Extended by ${days} days to ${new Date(expiresAt).toLocaleDateString("en-GB")}`,
          actor,
          source: "platform",
        }),
      }));
      notify(hotelId, "Subscription extended", `Access extended by ${days} days.`, "system");
    },
    [actor, notify, subscriptionFor],
  );

  const suspendSubscription = useCallback(
    (hotelId: string, reason = "Payment failed") => {
      const current = subscriptionFor(hotelId);
      setState((prev) => ({
        ...prev,
        subscriptions: { ...prev.subscriptions, [hotelId]: { ...current, status: "suspended", updatedAt: nowISO() } },
        events: pushEvent(prev, {
          hotelId,
          type: "suspended",
          detail: reason,
          actor,
          source: "platform",
        }),
      }));
      updateTenant(hotelId, { status: "suspended" });
      notify(hotelId, "Workspace suspended", reason, "system");
    },
    [actor, notify, subscriptionFor, updateTenant],
  );

  const reactivateSubscription = useCallback(
    (hotelId: string) => {
      const current = subscriptionFor(hotelId);
      const status: SubscriptionStatus = current.planId === "free" ? "free" : "active";
      const expiresAt = new Date(current.expiresAt).getTime() > Date.now() ? current.expiresAt : addBillingPeriod(nowISO(), current.cycle);
      setState((prev) => ({
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [hotelId]: { ...current, status, expiresAt, nextBillingDate: expiresAt, graceEndsAt: new Date(new Date(expiresAt).getTime() + prev.settings.graceDays * 86_400_000).toISOString(), updatedAt: nowISO() },
        },
        events: pushEvent(prev, {
          hotelId,
          type: "reactivated",
          detail: "Workspace reactivated",
          actor,
          source: "platform",
        }),
      }));
      updateTenant(hotelId, { status: "active" });
      notify(hotelId, "Workspace reactivated", "Your team can sign in and use every module on the plan.", "system");
    },
    [actor, notify, subscriptionFor, updateTenant],
  );

  const issueCredit = useCallback(
    (hotelId: string, amount: number, note: string) => {
      const current = subscriptionFor(hotelId);
      setState((prev) => ({
        ...prev,
        subscriptions: {
          ...prev.subscriptions,
          [hotelId]: { ...current, creditBalance: current.creditBalance + amount, updatedAt: nowISO() },
        },
        events: pushEvent(prev, {
          hotelId,
          type: "credit_issued",
          detail: note || `$${amount} credit issued`,
          actor,
          source: "platform",
          amount,
        }),
      }));
      notify(hotelId, "Credit applied", `$${amount} was credited to this workspace.`, "payment");
    },
    [actor, notify, subscriptionFor],
  );

  const addAddOn = useCallback(
    (hotelId: string, addOnId: string) => {
      const addOn = stateRef.current.settings.addOns.find((item) => item.id === addOnId);
      if (!addOn) return;
      setState((prev) => {
        const existing = prev.addOns.find(
          (entry) => entry.hotelId === hotelId && entry.addOnId === addOnId && entry.status === "active",
        );
        if (existing) return prev;
        return {
          ...prev,
          addOns: [
            { id: uid("addon-sub"), hotelId, addOnId, status: "active", startedAt: nowISO() },
            ...prev.addOns,
          ],
          events: pushEvent(prev, {
            hotelId,
            type: "addon_added",
            detail: `${addOn.name} activated`,
            actor,
            source: "hotel",
            amount: addOn.priceMonthly,
          }),
        };
      });
      notify(hotelId, "Add-on activated", `${addOn.name} is now part of this workspace.`, "payment");
    },
    [actor, notify],
  );

  const cancelAddOn = useCallback(
    (hotelId: string, addOnId: string) => {
      const addOn = stateRef.current.settings.addOns.find((item) => item.id === addOnId);
      setState((prev) => ({
        ...prev,
        addOns: prev.addOns.map((entry) =>
          entry.hotelId === hotelId && entry.addOnId === addOnId && entry.status === "active"
            ? { ...entry, status: "cancelled", cancelledAt: nowISO() }
            : entry,
        ),
        events: pushEvent(prev, {
          hotelId,
          type: "addon_cancelled",
          detail: `${addOn?.name ?? "Add-on"} cancelled`,
          actor,
          source: "hotel",
        }),
      }));
    },
    [actor],
  );

  const addPaymentMethod = useCallback(
    (hotelId: string, provider: string, brand: string, last4: string, expiry: string) => {
      setState((prev) => ({
        ...prev,
        paymentMethods: [
          ...prev.paymentMethods.filter((method) => method.hotelId !== hotelId).map((method) => ({ ...method, isDefault: false })),
          { id: uid("pm"), hotelId, provider, brand, last4, expiry, isDefault: true },
        ],
      }));
    },
    [],
  );

  const recordPayment = useCallback(
    (input: { invoiceId: string; provider: string; reference: string; idempotencyKey: string }): BillingTransaction | null => {
      const existing = stateRef.current.transactions.find(
        (txn) => txn.idempotencyKey === input.idempotencyKey,
      );
      if (existing) return existing;

      const invoice = stateRef.current.invoices.find((item) => item.id === input.invoiceId);
      if (!invoice) return null;
      const txn: BillingTransaction = {
        id: uid("txn"),
        hotelId: invoice.hotelId,
        invoiceId: invoice.id,
        at: nowISO(),
        amount: invoice.total,
        currency: "USD",
        provider: input.provider,
        status: "succeeded",
        reference: input.reference,
        idempotencyKey: input.idempotencyKey,
        description: `${invoice.number} · ${planFor(invoice.planId, stateRef.current.settings).name}`,
      };

      setState((prev) => {
        const current = prev.subscriptions[invoice.hotelId] ?? subscriptionFor(invoice.hotelId);
        return {
          ...prev,
          invoices: prev.invoices.map((item) =>
            item.id === invoice.id ? { ...item, status: "paid", paidAt: nowISO(), provider: input.provider, reference: input.reference } : item,
          ),
          transactions: [txn, ...prev.transactions],
          subscriptions: {
            ...prev.subscriptions,
            [invoice.hotelId]: {
              ...current,
              status: current.planId === "free" ? "free" : "active",
              graceEndsAt: undefined,
              updatedAt: nowISO(),
            },
          },
          events: pushEvent(prev, {
            hotelId: invoice.hotelId,
            type: "payment_succeeded",
            detail: `${invoice.number} paid via ${input.provider}`,
            actor,
            source: invoice.hotelId === currentTenant.id ? "hotel" : "platform",
            amount: invoice.total,
          }),
        };
      });

      notify(invoice.hotelId, "Payment received", `Invoice ${invoice.number} was paid successfully.`, "payment");
      auditTenant(invoice.hotelId, `Paid subscription invoice ${invoice.number}`);
      return txn;
    },
    [actor, auditTenant, currentTenant.id, notify, subscriptionFor],
  );

  const recordFailedPayment = useCallback(
    (invoiceId: string, provider: string, reason: string) => {
      const invoice = stateRef.current.invoices.find((item) => item.id === invoiceId);
      if (!invoice) return;
      const txn: BillingTransaction = {
        id: uid("txn"),
        hotelId: invoice.hotelId,
        invoiceId,
        at: nowISO(),
        amount: invoice.total,
        currency: "USD",
        provider,
        status: "failed",
        reference: `fail_${Date.now().toString(36)}`,
        idempotencyKey: uid("attempt"),
        description: reason,
      };
      setState((prev) => {
        const current = prev.subscriptions[invoice.hotelId] ?? subscriptionFor(invoice.hotelId);
        return {
          ...prev,
          transactions: [txn, ...prev.transactions],
          invoices: prev.invoices.map((item) => (item.id === invoiceId ? { ...item, status: "overdue" } : item)),
          subscriptions: {
            ...prev.subscriptions,
            [invoice.hotelId]: { ...current, status: "past_due", updatedAt: nowISO() },
          },
          events: pushEvent(prev, {
            hotelId: invoice.hotelId,
            type: "payment_failed",
            detail: `${invoice.number} · ${reason}`,
            actor,
            source: "system",
            amount: invoice.total,
          }),
        };
      });
      notify(invoice.hotelId, "Payment failed", `We could not collect payment for ${invoice.number}. ${reason}`, "payment");
    },
    [actor, notify, subscriptionFor],
  );

  const updateSettings = useCallback(
    (patch: Partial<PlanSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
        events: pushEvent(prev, {
          hotelId: "platform",
          type: "settings_updated",
          detail: "Plan configuration updated",
          actor,
          source: "platform",
        }),
      }));
    },
    [actor],
  );

  /* Automatic status reconciliation -------------------------------- */

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const throttleKey = `stayora.billing.notice.${currentTenant.id}.${today}`;
    let alreadyNotified = false;
    try {
      alreadyNotified = localStorage.getItem(throttleKey) === "1";
    } catch {
      // ignore
    }

    const updates: Record<string, Subscription> = {};
    const notifications: { title: string; message: string; type: NotificationType }[] = [];

    Object.values(stateRef.current.subscriptions).forEach((sub) => {
      const next = effectiveStatus(sub);
      if (next === sub.status || (next !== "past_due" && next !== "expired")) return;
      updates[sub.hotelId] = { ...sub, status: next, updatedAt: nowISO() };
      if (sub.hotelId === currentTenant.id) {
        notifications.push({
          title: next === "past_due" ? "Payment past due" : "Subscription expired",
          message:
            next === "past_due"
              ? "We could not renew your plan. Update payment details during the grace period to avoid suspension."
              : "Your subscription has expired. Existing data is safe, but new records are blocked.",
          type: "payment",
        });
      }
    });

    if (Object.keys(updates).length > 0) {
      setState((prev) => ({ ...prev, subscriptions: { ...prev.subscriptions, ...updates } }));
    }

    if (!alreadyNotified && notifications.length > 0) {
      notifications.forEach((entry) =>
        addNotification({ ...entry, audience: "all", link: "/subscription", actor: "Stayora Billing" }),
      );
      try {
        localStorage.setItem(throttleKey, "1");
      } catch {
        // ignore
      }
    }
  }, [currentTenant.id, addNotification]);

  useEffect(() => {
    const sub = subscriptionFor(currentTenant.id);
    const days = daysUntil(sub.expiresAt);
    if (sub.planId === "free" || sub.status === "cancelled" || sub.status === "suspended") return;
    if (days < 0 || days > 7) return;
    const key = `stayora.billing.renewal.${sub.hotelId}.${sub.expiresAt.slice(0, 10)}`;
    try {
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    addNotification({
      type: "payment",
      title: "Upcoming renewal",
      message: `Your ${planFor(sub.planId, state.settings).name} plan renews in ${days} day${days === 1 ? "" : "s"} (${new Date(sub.expiresAt).toLocaleDateString("en-GB")}).`,
      audience: "all",
      link: "/subscription",
      actor: "Stayora Billing",
    });
  }, [addNotification, currentTenant.id, state.settings, subscriptionFor]);

  const invoiceById = useCallback(
    (id: string) => state.invoices.find((invoice) => invoice.id === id),
    [state.invoices],
  );

  const value = useMemo<SubscriptionValue>(
    () => ({
      state,
      subscription,
      plan,
      settings: state.settings,
      addOnIds,
      addOns,
      invoices,
      transactions,
      events,
      paymentMethods,
      effective: subscription.status,
      usable,
      outstanding,
      monthlyTotal,
      changePlan,
      assignPlan,
      cancelSubscription,
      resumeSubscription,
      renewSubscription,
      extendSubscription,
      suspendSubscription,
      reactivateSubscription,
      issueCredit,
      addAddOn,
      cancelAddOn,
      addPaymentMethod,
      recordPayment,
      recordFailedPayment,
      updateSettings,
      subscriptionFor,
      invoiceById,
    }),
    [
      state,
      subscription,
      plan,
      addOnIds,
      addOns,
      invoices,
      transactions,
      events,
      paymentMethods,
      usable,
      outstanding,
      monthlyTotal,
      changePlan,
      assignPlan,
      cancelSubscription,
      resumeSubscription,
      renewSubscription,
      extendSubscription,
      suspendSubscription,
      reactivateSubscription,
      issueCredit,
      addAddOn,
      cancelAddOn,
      addPaymentMethod,
      recordPayment,
      recordFailedPayment,
      updateSettings,
      subscriptionFor,
      invoiceById,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside SubscriptionProvider");
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Entitlements (plan + add-ons + live usage)
 * ------------------------------------------------------------------ */

export interface UsageSnapshot {
  rooms: number;
  staff: number;
  properties: number;
  reservationsThisMonth: number;
  storageGb: number;
}

export function useEntitlements() {
  const { db } = useStore();
  const { currentTenant } = useTenant();
  const { subscription, addOnIds, settings, effective, usable } = useSubscription();

  const entitlements: Entitlements = useMemo(
    () => resolveEntitlements(subscription.planId, addOnIds, settings),
    [subscription.planId, addOnIds, settings],
  );

  const usage = useMemo<UsageSnapshot>(() => {
    const month = new Date().toISOString().slice(0, 7);
    const storage = db.documents.reduce((sum, doc) => sum + sizeToGb(doc.size), 0);
    return {
      rooms: db.rooms.length,
      staff: db.staff.length,
      properties: currentTenant.branches.length,
      reservationsThisMonth: db.reservations.filter(
        (reservation) => reservation.createdAt.slice(0, 7) === month && reservation.status !== "cancelled",
      ).length,
      storageGb: Math.round(storage * 100) / 100,
    };
  }, [db.rooms, db.staff, db.documents, db.reservations, currentTenant.branches.length]);

  const checks = useMemo(
    () => ({
      rooms: checkLimit(usage.rooms, entitlements.limits.rooms, entitlements.planId),
      staff: checkLimit(usage.staff, entitlements.limits.staff, entitlements.planId),
      properties: checkLimit(usage.properties, entitlements.limits.properties, entitlements.planId),
      storage: checkLimit(usage.storageGb, entitlements.limits.storageGb, entitlements.planId),
      reservations:
        entitlements.limits.reservationsPerMonth === null
          ? null
          : checkLimit(usage.reservationsThisMonth, entitlements.limits.reservationsPerMonth, entitlements.planId),
    }),
    [entitlements, usage],
  );

  const planModules = useMemo(
    () => new Set(planFor(entitlements.planId, settings).modules),
    [entitlements.planId, settings],
  );

  const canModule = useCallback(
    (moduleId: string) =>
      moduleAllowed(entitlements.planId, moduleId, settings) ||
      (!planModules.has(moduleId) && entitlements.modules.includes(moduleId)),
    [entitlements.planId, entitlements.modules, settings, planModules],
  );

  const requiredFor = useCallback(
    (moduleId: string) => requiredPlanFor(moduleId, settings),
    [settings],
  );

  return {
    ...entitlements,
    subscription,
    effective,
    usable,
    usage,
    checks,
    canModule,
    requiredFor,
    plan: planFor(entitlements.planId, settings),
    settings,
    formatLimit,
  };
}

export const isDowngrade = (from: PlanId, to: PlanId): boolean =>
  ["free", "starter", "professional"].indexOf(to) < ["free", "starter", "professional"].indexOf(from);

export const planList = (settings: PlanSettings): PlanDefinition[] =>
  (["free", "starter", "professional"] as PlanId[]).map((planId) => planFor(planId, settings));

export type { AddOn, PlanDefinition, PlanId, PlanSettings };
