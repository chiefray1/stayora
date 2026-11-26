import type { Role } from "./types";

const PATH_MODULE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/reservations": "reservations",
  "/booking-desk": "reservations",
  "/rooms": "rooms",
  "/guests": "guests",
  "/housekeeping": "housekeeping",
  "/maintenance": "maintenance",
  "/crm": "crm",
  "/reports": "reports",
  "/channels": "reports",
  "/payments": "payments",
  "/accounting": "accounting",
  "/pos": "pos",
  "/inventory": "inventory",
  "/procurement": "procurement",
  "/hr": "hr",
  "/payroll": "payroll",
  "/transport": "transport",
  "/whatsapp": "whatsapp",
  "/roles": "roles",
  "/kitchen": "kitchen",
  "/laundry": "laundry",
  "/loyalty": "loyalty",
  "/spa": "spa",
  "/events": "events",
  "/billing": "billing",
  "/documents": "documents",
  "/attendance": "attendance",
  "/integrations": "integrations",
  "/security": "security",
  "/ai": "ai",
  "/properties": "properties",
  "/subscription": "billing",
  "/tenants": "tenants",
  "/platform": "tenants",
};

const ACCOUNT_PATHS = ["/profile", "/settings"];

export function canAccessPath(role: string | undefined, roles: Role[], pathname: string) {
  if (!role) return false;
  if (ACCOUNT_PATHS.includes(pathname)) return true;
  if (pathname === "/tenants" || pathname === "/platform") return role === "Superadmin";
  if (pathname === "/subscription") return true;

  const moduleId = PATH_MODULE[pathname];
  if (!moduleId) return false;

  if (role === "Superadmin" || role === "Administrator") return true;

  const roleRecord = roles.find(
    (entry) => entry.name.toLowerCase() === role.toLowerCase(),
  );
  return roleRecord?.permissions.includes(moduleId) ?? false;
}

export function moduleForPath(pathname: string) {
  return PATH_MODULE[pathname];
}
