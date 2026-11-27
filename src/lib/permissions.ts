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
  "/team": "roles",
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
  "/admin": "tenants",
};

const ACCOUNT_PATHS = ["/profile", "/settings"];

/**
 * Platform operators may switch between every hotel workspace and open the
 * tenant console. A hotel's own Superadmin is scoped to that hotel only.
 */
export const PLATFORM_ADMIN_EMAILS = ["admin@stayora.ng"];

export const isPlatformAdmin = (email?: string) =>
  Boolean(email && PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase()));

export function canAccessPath(role: string | undefined, roles: Role[], pathname: string, email?: string) {
  if (!role) return false;
  if (ACCOUNT_PATHS.includes(pathname)) return true;
  if (pathname === "/tenants" || pathname === "/platform" || pathname === "/admin") {
    return role === "Superadmin" && isPlatformAdmin(email);
  }
  if (pathname === "/team") return role === "Superadmin";
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
