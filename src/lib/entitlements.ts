/**
 * Mutation-level entitlement guards.
 *
 * The store and tenant registry mutate data; the billing layer knows the plan,
 * add-ons and live usage. To keep a single source of truth without coupling the
 * two providers, the billing layer registers a snapshot here and every mutation
 * asks this module before writing.
 *
 * This is the "backend enforcement" boundary of the frontend build: UI gates are
 * cosmetic, these guards are authoritative.
 */

import {
  checkLimit,
  requiredPlanFor,
  moduleAllowed,
  type PlanId,
  type PlanLimits,
  type PlanSettings,
  type SubscriptionStatus,
} from "./plans";

export type LimitKind = "rooms" | "staff" | "properties" | "reservations" | "storage";

export interface UsageSnapshotLike {
  rooms: number;
  staff: number;
  properties: number;
  reservationsThisMonth: number;
  storageGb: number;
}

export interface BillingSnapshot {
  hotelId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  usable: boolean;
  limits: PlanLimits;
  usage: UsageSnapshotLike;
  modules: string[];
  settings: PlanSettings;
}

let snapshot: BillingSnapshot | null = null;

export const registerBillingSnapshot = (next: BillingSnapshot | null) => {
  snapshot = next;
};

export const billingSnapshot = (): BillingSnapshot | null => snapshot;

export type GuardResult =
  | { ok: true }
  | {
      ok: false;
      code: "subscription" | "limit";
      message: string;
      kind?: LimitKind;
      used?: number;
      limit?: number;
      planId?: PlanId;
      requiredPlan?: PlanId;
    };

const LIMIT_COPY: Record<LimitKind, { noun: string; plural: string; usageKey: keyof PlanLimits }> = {
  rooms: { noun: "room", plural: "rooms", usageKey: "rooms" },
  staff: { noun: "staff account", plural: "staff accounts", usageKey: "staff" },
  properties: { noun: "property", plural: "properties", usageKey: "properties" },
  reservations: { noun: "reservation this month", plural: "reservations this month", usageKey: "reservationsPerMonth" },
  storage: { noun: "GB of storage", plural: "GB of storage", usageKey: "storageGb" },
};

const usedFor = (kind: LimitKind, usage: UsageSnapshotLike): number =>
  kind === "rooms"
    ? usage.rooms
    : kind === "staff"
      ? usage.staff
      : kind === "properties"
        ? usage.properties
        : kind === "reservations"
          ? usage.reservationsThisMonth
          : usage.storageGb;

/**
 * Checks whether the workspace may create `quantity` more records of a kind.
 * Over-limit workspaces stay readable: only *new* records are refused.
 */
export const guardLimit = (kind: LimitKind, quantity = 1, additional = 0): GuardResult => {
  if (!snapshot) return { ok: true };

  if (!snapshot.usable) {
    return {
      ok: false,
      code: "subscription",
      message:
        snapshot.status === "suspended"
          ? "This workspace is suspended. Reactivate your subscription to make changes."
          : "Your subscription has expired. Existing data is safe, but new records are blocked until you renew.",
      planId: snapshot.planId,
    };
  }

  const limit = snapshot.limits[LIMIT_COPY[kind].usageKey];
  if (limit === null) return { ok: true };

  const used = usedFor(kind, snapshot.usage) + additional;
  const result = checkLimit(used, limit, snapshot.planId);
  if (result.allowed && used + quantity <= limit) return { ok: true };

  const required = (["free", "starter", "professional"] as PlanId[]).find((planId) => {
    const candidate = snapshot?.settings.plans[planId];
    const candidateLimit = candidate?.limits[LIMIT_COPY[kind].usageKey];
    return candidateLimit === null || (typeof candidateLimit === "number" && candidateLimit >= used + quantity);
  });

  return {
    ok: false,
    code: "limit",
    message: `You have reached the ${limit} ${LIMIT_COPY[kind].plural} included in ${snapshot.planId === "free" ? "the Free plan" : `your ${snapshot.planId} plan`}. Upgrade or add capacity to create more.`,
    kind,
    used,
    limit,
    planId: snapshot.planId,
    requiredPlan: required ?? "professional",
  };
};

/** Guards any write in a suspended/expired workspace. */
export const guardWrite = (): GuardResult => guardLimit("rooms", 0);

export const canUseModule = (moduleId: string): boolean =>
  snapshot ? moduleAllowed(snapshot.planId, moduleId, snapshot.settings) : true;

export const moduleRequiredPlan = (moduleId: string): PlanId =>
  snapshot ? requiredPlanFor(moduleId, snapshot.settings) : requiredPlanFor(moduleId);

export const snapshotLimit = (kind: LimitKind): number | null =>
  snapshot ? snapshot.limits[LIMIT_COPY[kind].usageKey] : null;
