/**
 * Stayora subscription catalogue and entitlement resolution.
 *
 * This module is intentionally free of React, browser APIs and storage access so
 * the exact same rules can run in the browser, in tests, and in a server/edge
 * billing service. Everything that decides *what a hotel may do* lives here.
 */

export type PlanId = "free" | "starter" | "professional";
export type BillingCycle = "monthly" | "yearly";

export type SubscriptionStatus =
  | "free"
  | "trial"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled"
  | "expired";

export interface PlanLimits {
  rooms: number;
  staff: number;
  properties: number;
  /** null means unlimited */
  reservationsPerMonth: number | null;
  storageGb: number;
}

export interface PlanFlags {
  advancedAccounting: boolean;
  payroll: boolean;
  ai: boolean;
  ota: boolean;
  api: boolean;
  advancedAnalytics: boolean;
  whatsapp: boolean;
  exports: boolean;
  approvalWorkflows: boolean;
  auditLogs: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  tagline: string;
  audience: string;
  monthly: number;
  yearly: number;
  limits: PlanLimits;
  flags: PlanFlags;
  /** Modules unlocked by the plan itself. */
  modules: string[];
  highlight?: boolean;
}

export type AddOnKind = "capacity" | "feature" | "usage";

export interface AddOn {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  kind: AddOnKind;
  /** Extra allowances layered on top of the plan. */
  grants?: Partial<PlanLimits>;
  /** Modules unlocked by the add-on. */
  unlocks?: string[];
  usageNote?: string;
  active: boolean;
}

export interface PlanSettings {
  plans: Record<PlanId, PlanDefinition>;
  /** Superadmin override: minimum plan required for a module. */
  moduleOverrides: Partial<Record<string, PlanId>>;
  addOns: AddOn[];
  graceDays: number;
  currency: "USD";
}

export const PLAN_ORDER: PlanId[] = ["free", "starter", "professional"];

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  professional: 2,
};

export const MODULE_META: Record<string, { label: string; group: string }> = {
  dashboard: { label: "Hotel dashboard", group: "Core" },
  reservations: { label: "Reservations", group: "Core" },
  "booking-desk": { label: "Booking desk", group: "Core" },
  rooms: { label: "Rooms & categories", group: "Core" },
  guests: { label: "Guest profiles", group: "Core" },
  housekeeping: { label: "Housekeeping", group: "Operations" },
  maintenance: { label: "Maintenance", group: "Operations" },
  kitchen: { label: "Kitchen display", group: "Food & beverage" },
  laundry: { label: "Laundry", group: "Operations" },
  pos: { label: "Restaurant & bar POS", group: "Food & beverage" },
  spa: { label: "Spa & gym", group: "Operations" },
  events: { label: "Conference & events", group: "Operations" },
  transport: { label: "Transport", group: "Operations" },
  inventory: { label: "Inventory", group: "Supplies" },
  procurement: { label: "Procurement", group: "Supplies" },
  payments: { label: "Payments", group: "Finance" },
  billing: { label: "Billing & invoices", group: "Finance" },
  accounting: { label: "Accounting", group: "Finance" },
  reports: { label: "Reports & analytics", group: "Finance" },
  payroll: { label: "Payroll", group: "People" },
  hr: { label: "HR management", group: "People" },
  attendance: { label: "Attendance", group: "People" },
  roles: { label: "Roles & permissions", group: "People" },
  crm: { label: "CRM & marketing", group: "Growth" },
  loyalty: { label: "Loyalty & rewards", group: "Growth" },
  booking: { label: "Online booking system", group: "Growth" },
  whatsapp: { label: "WhatsApp agents", group: "Growth" },
  channels: { label: "OTA channel manager", group: "Growth" },
  documents: { label: "Documents", group: "Platform" },
  integrations: { label: "Integrations & API", group: "Platform" },
  security: { label: "Security & audit", group: "Platform" },
  ai: { label: "AI hotel assistant", group: "Platform" },
  properties: { label: "Properties & config", group: "Platform" },
  settings: { label: "Settings", group: "Platform" },
};

/** Modules that only an add-on can unlock, never a plan on its own. */
export const ADD_ON_ONLY_MODULES = ["booking"];

/** Minimum plan that unlocks each module. Unlisted modules are available on every plan. */
export const DEFAULT_MODULE_MIN_PLAN: Record<string, PlanId> = {
  kitchen: "starter",
  laundry: "starter",
  pos: "starter",
  inventory: "starter",
  procurement: "starter",
  accounting: "starter",
  attendance: "starter",
  documents: "starter",
  spa: "professional",
  events: "professional",
  transport: "professional",
  crm: "professional",
  loyalty: "professional",
  channels: "professional",
  hr: "professional",
  payroll: "professional",
  whatsapp: "professional",
  integrations: "professional",
  ai: "professional",
};

const CORE_MODULES = [
  "dashboard",
  "reservations",
  "booking-desk",
  "rooms",
  "guests",
  "billing",
  "payments",
  "reports",
  "housekeeping",
  "maintenance",
  "properties",
  "roles",
  "security",
  "settings",
];

const STARTER_MODULES = [
  ...CORE_MODULES,
  "pos",
  "kitchen",
  "laundry",
  "inventory",
  "procurement",
  "accounting",
  "attendance",
  "documents",
];

const PROFESSIONAL_MODULES = [
  ...STARTER_MODULES,
  "crm",
  "loyalty",
  "whatsapp",
  "channels",
  "hr",
  "payroll",
  "events",
  "spa",
  "transport",
  "ai",
  "integrations",
];

const baseFlags: PlanFlags = {
  advancedAccounting: false,
  payroll: false,
  ai: false,
  ota: false,
  api: false,
  advancedAnalytics: false,
  whatsapp: false,
  exports: false,
  approvalWorkflows: false,
  auditLogs: false,
};

export const DEFAULT_PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Stayora Free",
    tagline: "Run a small property at no cost",
    audience: "Small hotels, guest houses and new hospitality businesses.",
    monthly: 0,
    yearly: 0,
    limits: { rooms: 5, staff: 2, properties: 1, reservationsPerMonth: 50, storageGb: 1 },
    flags: { ...baseFlags },
    modules: CORE_MODULES,
  },
  starter: {
    id: "starter",
    name: "Stayora Starter",
    tagline: "The operating system for a growing hotel",
    audience: "Small and growing hotels ready to run food, stock and finance in one place.",
    monthly: 39,
    yearly: 390,
    limits: { rooms: 30, staff: 10, properties: 1, reservationsPerMonth: null, storageGb: 10 },
    flags: {
      ...baseFlags,
      exports: true,
      advancedAnalytics: false,
    },
    modules: STARTER_MODULES,
  },
  professional: {
    id: "professional",
    name: "Stayora Professional",
    tagline: "Every department, every property, one platform",
    audience: "Established hotels and hospitality groups that need the full stack.",
    monthly: 99,
    yearly: 990,
    limits: { rooms: 100, staff: 30, properties: 3, reservationsPerMonth: null, storageGb: 50 },
    flags: {
      advancedAccounting: true,
      payroll: true,
      ai: true,
      ota: true,
      api: true,
      advancedAnalytics: true,
      whatsapp: true,
      exports: true,
      approvalWorkflows: true,
      auditLogs: true,
    },
    modules: PROFESSIONAL_MODULES,
    highlight: true,
  },
};

export const DEFAULT_ADD_ONS: AddOn[] = [
  {
    id: "addon-rooms-10",
    name: "Additional 10 rooms",
    description: "Raise the room ceiling on this workspace by ten keys.",
    priceMonthly: 10,
    kind: "capacity",
    grants: { rooms: 10 },
    active: true,
  },
  {
    id: "addon-staff-5",
    name: "Additional 5 staff accounts",
    description: "Add five more seats for front desk, housekeeping or finance.",
    priceMonthly: 5,
    kind: "capacity",
    grants: { staff: 5 },
    active: true,
  },
  {
    id: "addon-ai",
    name: "AI Assistant",
    description: "Unlock Stayora AI for revenue, sentiment and maintenance signals.",
    priceMonthly: 15,
    kind: "feature",
    unlocks: ["ai"],
    active: true,
  },
  {
    id: "addon-booking",
    name: "Online booking system",
    description:
      "Publish your direct booking engine with live availability, instant confirmation and online payments.",
    priceMonthly: 9,
    kind: "feature",
    unlocks: ["booking"],
    active: true,
  },
  {
    id: "addon-whatsapp",
    name: "Advanced WhatsApp messaging",
    description: "Automated guest journeys and broadcast campaigns. Billed on usage.",
    priceMonthly: 0,
    kind: "usage",
    unlocks: ["whatsapp"],
    usageNote: "Usage-based · $0.004 per message",
    active: true,
  },
  {
    id: "addon-property",
    name: "Additional property",
    description: "Add another branch or property to the same workspace.",
    priceMonthly: 25,
    kind: "capacity",
    grants: { properties: 1 },
    active: true,
  },
  {
    id: "addon-analytics",
    name: "Advanced analytics",
    description: "Forecasting, cohort and departmental profitability dashboards.",
    priceMonthly: 15,
    kind: "feature",
    unlocks: [],
    active: true,
  },
  {
    id: "addon-domain",
    name: "Custom booking website domain",
    description: "Serve the booking engine on your own domain with SSL.",
    priceMonthly: 5,
    kind: "feature",
    unlocks: [],
    active: true,
  },
];

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  plans: DEFAULT_PLANS,
  moduleOverrides: {},
  addOns: DEFAULT_ADD_ONS,
  graceDays: 7,
  currency: "USD",
};

export const TIER_LABEL: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
};

export const isPlanId = (value: unknown): value is PlanId =>
  value === "free" || value === "starter" || value === "professional";

/** Maps legacy workspace plans (Starter/Growth/Enterprise) onto the catalogue. */
export const normalizePlanId = (value: unknown): PlanId => {
  if (isPlanId(value)) return value;
  const legacy = String(value ?? "").toLowerCase();
  if (legacy === "growth") return "professional";
  if (legacy === "enterprise") return "professional";
  if (legacy === "starter") return "starter";
  return "free";
};

export const planFor = (planId: PlanId, settings: PlanSettings = DEFAULT_PLAN_SETTINGS): PlanDefinition =>
  settings.plans[planId] ?? DEFAULT_PLANS[planId];

export const priceFor = (
  planId: PlanId,
  cycle: BillingCycle,
  settings: PlanSettings = DEFAULT_PLAN_SETTINGS,
): number => {
  const plan = planFor(planId, settings);
  return cycle === "yearly" ? plan.yearly : plan.monthly;
};

export const annualSaving = (planId: PlanId, settings: PlanSettings = DEFAULT_PLAN_SETTINGS): number => {
  const plan = planFor(planId, settings);
  return Math.max(0, plan.monthly * 12 - plan.yearly);
};

export const usd = (value: number, decimals = 0): string =>
  `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const monthlyEquivalent = (planId: PlanId, cycle: BillingCycle, settings?: PlanSettings): number =>
  cycle === "yearly" ? Math.round((priceFor(planId, "yearly", settings) / 12) * 100) / 100 : priceFor(planId, "monthly", settings);

/** Minimum plan required for a module, honouring Superadmin overrides. */
export const requiredPlanFor = (
  moduleId: string,
  settings: PlanSettings = DEFAULT_PLAN_SETTINGS,
): PlanId => settings.moduleOverrides[moduleId] ?? DEFAULT_MODULE_MIN_PLAN[moduleId] ?? "free";

export const moduleAllowed = (
  planId: PlanId,
  moduleId: string,
  settings: PlanSettings = DEFAULT_PLAN_SETTINGS,
): boolean => {
  if (ADD_ON_ONLY_MODULES.includes(moduleId)) return false;
  return PLAN_RANK[planId] >= PLAN_RANK[requiredPlanFor(moduleId, settings)];
};

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  planId: PlanId;
  overLimit: boolean;
}

export const checkLimit = (used: number, limit: number, planId: PlanId): LimitCheck => {
  const unlimited = false;
  const allowed = used < limit;
  return {
    allowed,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlimited,
    planId,
    overLimit: used > limit,
  };
};

export interface Entitlements {
  planId: PlanId;
  limits: PlanLimits;
  modules: string[];
  flags: PlanFlags;
}

export const resolveEntitlements = (
  planId: PlanId,
  addOnIds: string[] = [],
  settings: PlanSettings = DEFAULT_PLAN_SETTINGS,
): Entitlements => {
  const plan = planFor(planId, settings);
  const limits: PlanLimits = { ...plan.limits };
  const modules = new Set(plan.modules);
  const flags: PlanFlags = { ...plan.flags };

  settings.addOns
    .filter((addOn) => addOn.active && addOnIds.includes(addOn.id))
    .forEach((addOn) => {
      if (addOn.grants) {
        if (typeof addOn.grants.rooms === "number") limits.rooms += addOn.grants.rooms;
        if (typeof addOn.grants.staff === "number") limits.staff += addOn.grants.staff;
        if (typeof addOn.grants.properties === "number") limits.properties += addOn.grants.properties;
        if (typeof addOn.grants.storageGb === "number") limits.storageGb += addOn.grants.storageGb;
        if (typeof addOn.grants.reservationsPerMonth === "number") {
          limits.reservationsPerMonth =
            limits.reservationsPerMonth === null
              ? null
              : limits.reservationsPerMonth + addOn.grants.reservationsPerMonth;
        }
      }
      addOn.unlocks?.forEach((moduleId) => modules.add(moduleId));
      if (addOn.id === "addon-ai") flags.ai = true;
      if (addOn.id === "addon-analytics") flags.advancedAnalytics = true;
      if (addOn.id === "addon-whatsapp") flags.whatsapp = true;
    });

  return { planId, limits, modules: Array.from(modules), flags };
};

export const addOnMonthlyTotal = (addOnIds: string[], settings: PlanSettings = DEFAULT_PLAN_SETTINGS): number =>
  settings.addOns
    .filter((addOn) => addOn.active && addOnIds.includes(addOn.id))
    .reduce((sum, addOn) => sum + addOn.priceMonthly, 0);

/** Adds a billing period to a date, in ISO form. */
export const addBillingPeriod = (dateISO: string, cycle: BillingCycle): string => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  if (cycle === "yearly") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString();
};

export const daysUntil = (dateISO: string, now = Date.now()): number =>
  Math.ceil((new Date(dateISO).getTime() - now) / 86_400_000);

export interface SubscriptionLike {
  planId: PlanId;
  status: SubscriptionStatus;
  cycle: BillingCycle;
  startedAt: string;
  expiresAt: string;
  nextBillingDate: string;
  autoRenew: boolean;
  graceEndsAt?: string;
  cancelledAt?: string;
}

export type EffectiveStatus = SubscriptionStatus;

/**
 * Derives the status a subscription should have right now, taking the grace
 * period into account. This is the single source of truth for access.
 */
export const effectiveStatus = (
  subscription: Pick<SubscriptionLike, "status" | "expiresAt" | "graceEndsAt">,
  now = Date.now(),
): EffectiveStatus => {
  if (subscription.status === "suspended") return "suspended";
  if (subscription.status === "free") return "free";
  const expires = new Date(subscription.expiresAt).getTime();
  if (Number.isNaN(expires)) return subscription.status;
  const graceEnds = subscription.graceEndsAt ? new Date(subscription.graceEndsAt).getTime() : expires;
  if (subscription.status === "cancelled") return now <= expires ? "cancelled" : "expired";
  if (subscription.status === "past_due") return now <= graceEnds ? "past_due" : "expired";
  if (now <= expires) return subscription.status === "trial" ? "trial" : "active";
  if (now <= graceEnds) return "past_due";
  return "expired";
};

export const isSubscriptionUsable = (status: EffectiveStatus): boolean =>
  status === "free" ||
  status === "trial" ||
  status === "active" ||
  status === "past_due" ||
  status === "cancelled";

export interface InvoiceDraft {
  subtotal: number;
  tax: number;
  total: number;
  lines: { label: string; amount: number }[];
}

export const draftInvoice = (
  planId: PlanId,
  cycle: BillingCycle,
  addOnIds: string[] = [],
  settings: PlanSettings = DEFAULT_PLAN_SETTINGS,
  taxRate = 0,
): InvoiceDraft => {
  const lines: { label: string; amount: number }[] = [];
  const plan = planFor(planId, settings);
  const planPrice = priceFor(planId, cycle, settings);
  if (planPrice > 0) {
    lines.push({
      label: `${plan.name} · ${cycle === "yearly" ? "annual" : "monthly"}`,
      amount: planPrice,
    });
  }
  settings.addOns
    .filter((addOn) => addOn.active && addOnIds.includes(addOn.id) && addOn.priceMonthly > 0)
    .forEach((addOn) => {
      const amount = cycle === "yearly" ? addOn.priceMonthly * 12 : addOn.priceMonthly;
      lines.push({ label: `${addOn.name}${cycle === "yearly" ? " · annual" : ""}`, amount });
    });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const tax = Math.round(subtotal * taxRate) / 100;
  return { subtotal, tax, total: subtotal + tax, lines };
};

/** Parses document sizes such as "1.2 MB" into gigabytes. */
export const sizeToGb = (size: string): number => {
  const match = /([\d.]+)\s*(TB|GB|MB|KB|B)/i.exec(size);
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2].toUpperCase();
  const factor: Record<string, number> = { B: 1 / 1_073_741_824, KB: 1 / 1_048_576, MB: 1 / 1024, GB: 1, TB: 1024 };
  return value * (factor[unit] ?? 0);
};

export const formatLimit = (limit: number | null, unit = ""): string =>
  limit === null ? "Unlimited" : `${limit.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}`;
