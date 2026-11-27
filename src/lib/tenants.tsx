import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_PLANS, normalizePlanId, type PlanId } from "./plans";
import { guardLimit, type GuardResult } from "./entitlements";
import { applyBrandTheme } from "./theme";

export type TenantPlan = PlanId;
export type TenantStatus = "trial" | "active" | "suspended";
export type BranchType = "Hotel" | "Resort" | "Suites" | "Apartments" | "Transit hotel";

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  city: string;
  country: string;
  address: string;
  rooms: number;
  floors: number;
  status: "open" | "renovation";
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  city: string;
  country: string;
  currency: "NGN" | "USD" | "GBP" | "EUR" | "KES" | "GHS";
  timezone: string;
  plan: TenantPlan;
  status: TenantStatus;
  /** Workspace accent colour (hex). Missing means the Stayora gold default. */
  brandColor?: string;
  taxRate: number;
  serviceCharge: number;
  branches: Branch[];
  createdAt: string;
  trialEndsAt: string;
  security: {
    twoFactor: boolean;
    sso: boolean;
    ipAllowlist: boolean;
    dataResidency: string;
  };
}

export interface NewTenantInput {
  name: string;
  ownerName: string;
  ownerEmail: string;
  phone?: string;
  city: string;
  country: string;
  plan: TenantPlan;
  rooms: number;
  currency?: Tenant["currency"];
}

interface TenantValue {
  tenants: Tenant[];
  currentTenant: Tenant;
  switchTenant: (id: string) => void;
  createTenant: (input: NewTenantInput) => Tenant;
  updateTenant: (id: string, patch: Partial<Tenant>) => void;
  setTenantStatus: (id: string, status: TenantStatus) => void;
  /** Permanently remove a workspace from the platform (never the last one). */
  removeTenant: (id: string) => void;
  addBranch: (tenantId: string, branch: Omit<Branch, "id">) => GuardResult;
  updateBranch: (tenantId: string, branchId: string, patch: Partial<Branch>) => void;
  removeBranch: (tenantId: string, branchId: string) => void;
}

const TenantContext = createContext<TenantValue | null>(null);
const TENANTS_KEY = "stayora.tenants.v1";
const CURRENT_KEY = "stayora.current-tenant.v1";

export const PLAN_LIMITS: Record<TenantPlan, { rooms: number; staff: number; branches: number; price: number }> = {
  free: { rooms: DEFAULT_PLANS.free.limits.rooms, staff: DEFAULT_PLANS.free.limits.staff, branches: DEFAULT_PLANS.free.limits.properties, price: DEFAULT_PLANS.free.monthly },
  starter: { rooms: DEFAULT_PLANS.starter.limits.rooms, staff: DEFAULT_PLANS.starter.limits.staff, branches: DEFAULT_PLANS.starter.limits.properties, price: DEFAULT_PLANS.starter.monthly },
  professional: { rooms: DEFAULT_PLANS.professional.limits.rooms, staff: DEFAULT_PLANS.professional.limits.staff, branches: DEFAULT_PLANS.professional.limits.properties, price: DEFAULT_PLANS.professional.monthly },
};

export const totalRooms = (tenant: Tenant) =>
  tenant.branches.reduce((sum, branch) => sum + branch.rooms, 0);

export const totalFloors = (tenant: Tenant) =>
  tenant.branches.reduce((sum, branch) => sum + branch.floors, 0);

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const branch = (
  id: string,
  name: string,
  type: BranchType,
  city: string,
  country: string,
  address: string,
  rooms: number,
  floors: number,
  status: Branch["status"] = "open",
): Branch => ({ id, name, type, city, country, address, rooms, floors, status });

const seedTenants = (): Tenant[] => [
  {
    id: "tnt-stayora-lagos",
    slug: "stayora-lagos",
    name: "Stayora Grand Lagos",
    legalName: "Stayora Hospitality Nigeria Ltd",
    ownerName: "Grace Adeyemi",
    ownerEmail: "admin@stayora.ng",
    phone: "0805 535 0960",
    city: "Lagos",
    country: "Nigeria",
    currency: "NGN",
    timezone: "Africa/Lagos",
    plan: "professional",
    status: "active",
    taxRate: 7.5,
    serviceCharge: 10,
    createdAt: daysFromNow(-420),
    trialEndsAt: daysFromNow(180),
    security: { twoFactor: true, sso: true, ipAllowlist: false, dataResidency: "Lagos, NG" },
    branches: [
      branch("br-lagos-main", "Lagos · Main Branch", "Hotel", "Lagos", "Nigeria", "12 Adeola Odeku Street, Victoria Island", 48, 4),
      branch("br-lagos-suites", "Victoria Island Suites", "Suites", "Lagos", "Nigeria", "4B Akin Adesola Street, Victoria Island", 24, 6),
      branch("br-lagos-airport", "Airport Transit Hotel", "Transit hotel", "Ikeja", "Nigeria", "Murtala Muhammed Airport Road", 18, 3),
    ],
  },
  {
    id: "tnt-stayora-abuja",
    slug: "stayora-abuja",
    name: "Stayora Marina Abuja",
    legalName: "Stayora Capital Hospitality Ltd",
    ownerName: "Ibrahim Musa",
    ownerEmail: "admin@stayora.ng",
    phone: "0902 118 4400",
    city: "Abuja",
    country: "Nigeria",
    currency: "NGN",
    timezone: "Africa/Lagos",
    plan: "starter",
    status: "active",
    taxRate: 7.5,
    serviceCharge: 7.5,
    createdAt: daysFromNow(-210),
    trialEndsAt: daysFromNow(120),
    security: { twoFactor: true, sso: false, ipAllowlist: false, dataResidency: "Abuja, NG" },
    branches: [
      branch("br-abuja-marina", "Marina · Central Business District", "Hotel", "Abuja", "Nigeria", "Plot 1049, Ahmadu Bello Way", 30, 4),
    ],
  },
  {
    id: "tnt-zuri-nairobi",
    slug: "zuri-nairobi",
    name: "Zuri House Nairobi",
    legalName: "Zuri House Collections Ltd",
    ownerName: "Wanjiku Kamau",
    ownerEmail: "admin@zurihouse.co.ke",
    phone: "+254 720 551 310",
    city: "Nairobi",
    country: "Kenya",
    currency: "KES",
    timezone: "Africa/Nairobi",
    plan: "free",
    status: "trial",
    taxRate: 16,
    serviceCharge: 5,
    createdAt: daysFromNow(-12),
    trialEndsAt: daysFromNow(18),
    security: { twoFactor: false, sso: false, ipAllowlist: false, dataResidency: "Nairobi, KE" },
    branches: [
      branch("br-nairobi-westlands", "Westlands Boutique Hotel", "Hotel", "Nairobi", "Kenya", "Ring Road Westlands", 5, 1),
    ],
  },
];

const readTenants = (): Tenant[] => {
  try {
    const raw = localStorage.getItem(TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Tenant[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrationKey = "stayora.tenants.plan-migration.v3";
        const needsMigration = localStorage.getItem(migrationKey) !== "1";
        const seededPlans: Record<string, PlanId> = {
          "tnt-stayora-lagos": "professional",
          "tnt-stayora-abuja": "starter",
          "tnt-zuri-nairobi": "free",
        };
        const next = parsed.map((tenant) => {
          const plan = needsMigration && seededPlans[tenant.id] ? seededPlans[tenant.id] : normalizePlanId(tenant.plan);
          if (
            needsMigration &&
            tenant.id === "tnt-stayora-abuja" &&
            tenant.branches.length === 2 &&
            tenant.branches.some((item) => item.id === "br-abuja-resort")
          ) {
            return {
              ...tenant,
              plan,
              branches: tenant.branches
                .filter((item) => item.id !== "br-abuja-resort")
                .map((item) => (item.id === "br-abuja-marina" ? { ...item, rooms: 30, floors: 4 } : item)),
            };
          }
          return { ...tenant, plan };
        });
        if (needsMigration) {
          localStorage.setItem(migrationKey, "1");
          localStorage.setItem(TENANTS_KEY, JSON.stringify(next));
        }
        return next;
      }
    }
  } catch {
    // fall through to seed
  }
  return seedTenants();
};

const readCurrentId = (tenants: Tenant[]) => {
  try {
    const stored = localStorage.getItem(CURRENT_KEY);
    if (stored && tenants.some((tenant) => tenant.id === stored)) return stored;
  } catch {
    // ignore
  }
  return tenants[0]?.id ?? "";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>(readTenants);
  const [currentId, setCurrentId] = useState<string>(() => readCurrentId(readTenants()));

  useEffect(() => {
    try {
      localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    } catch {
      // keep running in memory
    }
  }, [tenants]);

  useEffect(() => {
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
  }, [currentId]);

  const currentTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === currentId) ?? tenants[0],
    [tenants, currentId],
  );

  useEffect(() => {
    applyBrandTheme(currentTenant?.brandColor);
  }, [currentTenant?.brandColor]);

  const switchTenant = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const createTenant = useCallback((input: NewTenantInput): Tenant => {
    const baseSlug = slugify(input.name) || `workspace-${Date.now().toString(36)}`;
    const suffix = Date.now().toString(36).slice(-3);
    const id = `tnt-${baseSlug}-${suffix}`;
    const tenant: Tenant = {
      id,
      slug: baseSlug,
      name: input.name.trim(),
      legalName: input.name.trim(),
      ownerName: input.ownerName.trim(),
      ownerEmail: input.ownerEmail.trim().toLowerCase(),
      phone: input.phone?.trim() ?? "",
      city: input.city.trim(),
      country: input.country.trim(),
      currency: input.currency ?? "NGN",
      timezone: input.country.trim().toLowerCase() === "kenya" ? "Africa/Nairobi" : "Africa/Lagos",
      plan: input.plan,
      status: "trial",
      taxRate: 7.5,
      serviceCharge: 10,
      branches: [
        {
          id: `br-${baseSlug}-main`,
          name: `${input.city.trim()} · Main Branch`,
          type: "Hotel",
          city: input.city.trim(),
          country: input.country.trim(),
          address: "",
          rooms: input.rooms,
          floors: Math.max(1, Math.ceil(input.rooms / 12)),
          status: "open",
        },
      ],
      createdAt: new Date().toISOString(),
      trialEndsAt: daysFromNow(30),
      security: { twoFactor: false, sso: false, ipAllowlist: false, dataResidency: `${input.city.trim()}, ${input.country.trim()}` },
    };
    setTenants((prev) => [...prev, tenant]);
    return tenant;
  }, []);

  const updateTenant = useCallback((id: string, patch: Partial<Tenant>) => {
    setTenants((prev) => prev.map((tenant) => (tenant.id === id ? { ...tenant, ...patch } : tenant)));
  }, []);

  const setTenantStatus = useCallback((id: string, status: TenantStatus) => {
    setTenants((prev) => prev.map((tenant) => (tenant.id === id ? { ...tenant, status } : tenant)));
  }, []);

  const removeTenant = useCallback((id: string) => {
    if (tenants.length <= 1) return;
    const remaining = tenants.filter((tenant) => tenant.id !== id);
    if (remaining.length === tenants.length) return;
    setTenants(remaining);
    if (currentId === id) setCurrentId(remaining[0].id);
  }, [tenants, currentId]);

  const addBranch = useCallback((tenantId: string, input: Omit<Branch, "id">): GuardResult => {
    const guard = guardLimit("properties", 1);
    if (!guard.ok) return guard;
    setTenants((prev) =>
      prev.map((tenant) =>
        tenant.id === tenantId
          ? {
              ...tenant,
              branches: [
                ...tenant.branches,
                { ...input, id: `br-${slugify(input.name) || Date.now().toString(36)}` },
              ],
            }
          : tenant,
      ),
    );
    return { ok: true };
  }, []);

  const updateBranch = useCallback((tenantId: string, branchId: string, patch: Partial<Branch>) => {
    setTenants((prev) =>
      prev.map((tenant) =>
        tenant.id === tenantId
          ? {
              ...tenant,
              branches: tenant.branches.map((item) =>
                item.id === branchId ? { ...item, ...patch } : item,
              ),
            }
          : tenant,
      ),
    );
  }, []);

  const removeBranch = useCallback((tenantId: string, branchId: string) => {
    setTenants((prev) =>
      prev.map((tenant) =>
        tenant.id === tenantId
          ? { ...tenant, branches: tenant.branches.filter((item) => item.id !== branchId) }
          : tenant,
      ),
    );
  }, []);

  const value = useMemo<TenantValue>(
    () => ({
      tenants,
      currentTenant: currentTenant ?? tenants[0],
      switchTenant,
      createTenant,
      updateTenant,
      setTenantStatus,
      removeTenant,
      addBranch,
      updateBranch,
      removeBranch,
    }),
    [tenants, currentTenant, switchTenant, createTenant, updateTenant, setTenantStatus, removeTenant, addBranch, updateBranch, removeBranch],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside TenantProvider");
  return ctx;
}
